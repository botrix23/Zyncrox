/**
 * Internal helper for creating Super Admin notifications without requiring
 * SUPER_ADMIN session (usable from crons, webhooks, and server actions).
 *
 * Notification types:
 *   TENANT_REGISTERED    LOW    — new tenant signed up
 *   TRIAL_EXPIRING_SOON  HIGH   — trial expires in ≤1 day
 *   TRIAL_EXPIRED        MEDIUM — trial just expired
 *   PAYMENT_FAILED       HIGH   — payment webhook failed
 *   PAYMENT_RECEIVED     LOW    — successful payment received
 *   TENANT_INACTIVE      MEDIUM — no bookings in 14+ days
 *   PLAN_LIMIT_REACHED   MEDIUM — tenant hit plan limit
 *   TENANT_SUSPENDED     MEDIUM — tenant manually suspended
 */

import { db } from '@/db';
import { superAdminNotifications } from '@/db/schema';

export type NotificationType =
  | 'TENANT_REGISTERED'
  | 'TRIAL_EXPIRING_SOON'
  | 'TRIAL_EXPIRED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_RECEIVED'
  | 'TENANT_INACTIVE'
  | 'PLAN_LIMIT_REACHED'
  | 'TENANT_SUSPENDED';

export type NotificationUrgency = 'LOW' | 'MEDIUM' | 'HIGH';

const defaultUrgency: Record<NotificationType, NotificationUrgency> = {
  TENANT_REGISTERED:   'LOW',
  TRIAL_EXPIRING_SOON: 'HIGH',
  TRIAL_EXPIRED:       'MEDIUM',
  PAYMENT_FAILED:      'HIGH',
  PAYMENT_RECEIVED:    'LOW',
  TENANT_INACTIVE:     'MEDIUM',
  PLAN_LIMIT_REACHED:  'MEDIUM',
  TENANT_SUSPENDED:    'MEDIUM',
};

export async function createNotification(input: {
  type: NotificationType;
  message: string;
  link?: string;
  tenantId?: string | null;
  tenantName?: string | null;
  urgency?: NotificationUrgency;
}): Promise<void> {
  const urgency = input.urgency ?? defaultUrgency[input.type] ?? 'MEDIUM';

  try {
    await db.insert(superAdminNotifications).values({
      type: input.type,
      message: input.message,
      link: input.link ?? null,
      tenantId: input.tenantId ?? null,
      tenantName: input.tenantName ?? null,
      urgency,
    });

    // Send email for HIGH-urgency events
    if (urgency === 'HIGH') {
      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
      if (superAdminEmail && process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: process.env.EMAIL_FROM ?? 'Zyncrox <no-reply@zyncrox.com>',
            to: superAdminEmail,
            subject: `🚨 [Zyncrox] ${input.type.replace(/_/g, ' ')}`,
            html: [
              `<p><strong>${input.message}</strong></p>`,
              input.tenantName ? `<p>Empresa: ${input.tenantName}</p>` : '',
              input.link ? `<p><a href="${process.env.NEXT_PUBLIC_APP_URL}${input.link}">Ver en el panel →</a></p>` : '',
            ].join(''),
          });
        } catch (emailErr) {
          console.error('[createNotification] Failed to send HIGH-urgency email:', emailErr);
        }
      }
    }
  } catch (err) {
    // Notifications are non-blocking — never throw to callers
    console.error('[createNotification] Failed to insert notification:', err);
  }
}
