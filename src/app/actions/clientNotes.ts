"use server";

import { db } from "@/db";
import { clientNotes } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth-session";

function getEffectiveTenantId(session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
  if (session.role === 'SUPER_ADMIN') return session.impersonatedTenantId || null;
  return session.tenantId || null;
}

function normalizeEmail(email: string | null | undefined) {
  return email ? email.trim().toLowerCase() : null;
}

// ─── Get notes for a client ─────────────────────────────────────────────────
export async function getClientNotesAction(clientEmail: string | null, clientName: string) {
  const session = await getSession();
  if (!session) return { notes: [], error: 'Unauthorized' as const };

  const tenantId = getEffectiveTenantId(session);
  if (!tenantId) return { notes: [], error: 'No tenant' as const };

  const email = normalizeEmail(clientEmail);

  const notes = await db.select().from(clientNotes)
    .where(
      email
        ? and(eq(clientNotes.tenantId, tenantId), eq(clientNotes.clientEmail, email))
        : and(eq(clientNotes.tenantId, tenantId), eq(clientNotes.clientName, clientName))
    )
    .orderBy(desc(clientNotes.createdAt));

  return { notes };
}

// ─── Get latest N notes for a client (for booking modal preview) ─────────────
export async function getClientNotesPreviewAction(clientEmail: string | null, clientName: string, limit = 3) {
  const session = await getSession();
  if (!session) return { notes: [] };

  const tenantId = getEffectiveTenantId(session);
  if (!tenantId) return { notes: [] };

  const email = normalizeEmail(clientEmail);

  const notes = await db.select().from(clientNotes)
    .where(
      email
        ? and(eq(clientNotes.tenantId, tenantId), eq(clientNotes.clientEmail, email))
        : and(eq(clientNotes.tenantId, tenantId), eq(clientNotes.clientName, clientName))
    )
    .orderBy(desc(clientNotes.createdAt))
    .limit(limit);

  return { notes };
}

// ─── Get note counts per client email (for badges in list) ──────────────────
export async function getClientNotesCountsAction() {
  const session = await getSession();
  if (!session) return {};

  const tenantId = getEffectiveTenantId(session);
  if (!tenantId) return {};

  const rows = await db
    .select({
      clientEmail: clientNotes.clientEmail,
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(clientNotes)
    .where(eq(clientNotes.tenantId, tenantId))
    .groupBy(clientNotes.clientEmail);

  const map: Record<string, number> = {};
  for (const row of rows) {
    if (row.clientEmail) map[row.clientEmail] = row.count;
  }
  return map;
}

// ─── Create a note ───────────────────────────────────────────────────────────
export async function createClientNoteAction(
  clientEmail: string | null,
  clientName: string,
  content: string,
) {
  const session = await getSession();
  if (!session || !session.userId) return { error: 'Unauthorized' as const };

  const tenantId = getEffectiveTenantId(session);
  if (!tenantId) return { error: 'No tenant' as const };

  const trimmed = content.trim();
  if (!trimmed) return { error: 'empty' as const };
  if (trimmed.length > 500) return { error: 'too_long' as const };

  const [note] = await db.insert(clientNotes).values({
    tenantId,
    clientEmail: normalizeEmail(clientEmail),
    clientName,
    authorId: session.userId,
    authorName: session.name || session.email,
    authorRole: session.role,
    content: trimmed,
  }).returning();

  return { note };
}

// ─── Update a note ────────────────────────────────────────────────────────────
export async function updateClientNoteAction(noteId: string, content: string) {
  const session = await getSession();
  if (!session || !session.userId) return { error: 'Unauthorized' as const };

  const tenantId = getEffectiveTenantId(session);
  if (!tenantId) return { error: 'No tenant' as const };

  const trimmed = content.trim();
  if (!trimmed) return { error: 'empty' as const };
  if (trimmed.length > 500) return { error: 'too_long' as const };

  // Verify note belongs to tenant
  const existing = await db.select().from(clientNotes)
    .where(and(eq(clientNotes.id, noteId), eq(clientNotes.tenantId, tenantId)))
    .limit(1);

  if (!existing[0]) return { error: 'not_found' as const };

  // STAFF can only edit their own notes
  if (session.role === 'STAFF' && existing[0].authorId !== session.userId) {
    return { error: 'forbidden' as const };
  }

  const [updated] = await db.update(clientNotes)
    .set({ content: trimmed, updatedAt: new Date() })
    .where(eq(clientNotes.id, noteId))
    .returning();

  return { note: updated };
}

// ─── Delete a note (ADMIN only) ───────────────────────────────────────────────
export async function deleteClientNoteAction(noteId: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' as const };

  // Only ADMIN and SUPER_ADMIN can delete
  if (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') {
    return { error: 'forbidden' as const };
  }

  const tenantId = getEffectiveTenantId(session);
  if (!tenantId) return { error: 'No tenant' as const };

  await db.delete(clientNotes)
    .where(and(eq(clientNotes.id, noteId), eq(clientNotes.tenantId, tenantId)));

  return { success: true };
}
