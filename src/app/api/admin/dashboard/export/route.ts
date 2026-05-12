import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-session';
import { db } from '@/db';
import { bookings, absenceRequests, reviews } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function GET() {
  const session = await getSession();

  let tenantId: string | null = null;
  if (session?.role === 'SUPER_ADMIN' && session.impersonatedTenantId) {
    tenantId = session.impersonatedTenantId;
  } else if (session?.tenantId) {
    tenantId = session.tenantId;
  }

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthLabel = format(now, "MMMM yyyy", { locale: es }).toUpperCase();

  const [bookingsThisMonth, absencesThisMonth, reviewsThisMonth] = await Promise.all([
    db.query.bookings.findMany({
      where: and(
        eq(bookings.tenantId, tenantId),
        gte(bookings.startTime, monthStart),
        lte(bookings.startTime, monthEnd)
      ),
      with: { service: true, staff: true, branch: true },
      orderBy: [bookings.startTime]
    }),
    db.query.absenceRequests.findMany({
      where: and(
        eq(absenceRequests.tenantId, tenantId),
        gte(absenceRequests.startTime, monthStart),
        lte(absenceRequests.startTime, monthEnd)
      ),
      with: { staff: true }
    }),
    db.query.reviews.findMany({
      where: and(
        eq(reviews.tenantId, tenantId),
        gte(reviews.createdAt, monthStart),
        lte(reviews.createdAt, monthEnd)
      ),
      with: { booking: { with: { service: true } } },
      orderBy: [desc(reviews.createdAt)]
    })
  ]);

  const total = bookingsThisMonth.length;
  const confirmed = bookingsThisMonth.filter(b => b.status === 'CONFIRMED').length;
  const cancelled = bookingsThisMonth.filter(b => b.status === 'CANCELLED').length;
  const completed = bookingsThisMonth.filter(b => b.status === 'FINALIZADA').length;
  const pending = bookingsThisMonth.filter(b => b.status === 'PENDING').length;
  const cancelRate = total > 0 ? ((cancelled / total) * 100).toFixed(1) : '0.0';

  // Staff performance map
  const staffMap = new Map<string, { name: string; attended: number; cancelled: number; pending: number; absenceCount: number; absenceMinutes: number }>();
  for (const b of bookingsThisMonth) {
    const key = b.staffId ?? '__unassigned__';
    const name = b.staff?.name || 'Sin asignar';
    if (!staffMap.has(key)) staffMap.set(key, { name, attended: 0, cancelled: 0, pending: 0, absenceCount: 0, absenceMinutes: 0 });
    const e = staffMap.get(key)!;
    if (b.status === 'FINALIZADA') e.attended++;
    else if (b.status === 'CANCELLED') e.cancelled++;
    else e.pending++;
  }
  for (const abs of absencesThisMonth) {
    const key = abs.staffId;
    const name = abs.staff?.name || 'N/A';
    if (!staffMap.has(key)) staffMap.set(key, { name, attended: 0, cancelled: 0, pending: 0, absenceCount: 0, absenceMinutes: 0 });
    const e = staffMap.get(key)!;
    e.absenceCount++;
    e.absenceMinutes += Math.floor((abs.endTime.getTime() - abs.startTime.getTime()) / 60000);
  }

  // Service performance map
  const svcMap = new Map<string, { name: string; total: number; cancelled: number }>();
  for (const b of bookingsThisMonth) {
    const key = b.serviceId;
    const name = b.service?.name || 'N/A';
    if (!svcMap.has(key)) svcMap.set(key, { name, total: 0, cancelled: 0 });
    const e = svcMap.get(key)!;
    e.total++;
    if (b.status === 'CANCELLED') e.cancelled++;
  }

  const lines: string[] = [];

  lines.push(`REPORTE DE DASHBOARD - ${monthLabel}`);
  lines.push(`Generado el ${format(now, "dd/MM/yyyy 'a las' HH:mm")}`);
  lines.push('');

  // ── RESUMEN DEL MES ──
  lines.push('RESUMEN DEL MES');
  lines.push('Métrica,Valor');
  lines.push(`Total de citas,${total}`);
  lines.push(`Confirmadas,${confirmed}`);
  lines.push(`Finalizadas,${completed}`);
  lines.push(`Pendientes,${pending}`);
  lines.push(`Canceladas,${cancelled}`);
  lines.push(`Tasa de cancelación,${cancelRate}%`);
  lines.push('');

  // ── DETALLE DE CITAS ──
  lines.push('DETALLE DE CITAS');
  lines.push('Fecha,Hora,Cliente,Teléfono,Servicio,Staff,Sucursal,Estado');
  for (const b of bookingsThisMonth) {
    const sanitize = (s: string) => `"${(s || '').replace(/"/g, "'")}"`;
    lines.push([
      format(b.startTime, 'dd/MM/yyyy'),
      format(b.startTime, 'HH:mm'),
      sanitize(b.customerName),
      b.customerPhone || '',
      sanitize(b.service?.name || ''),
      sanitize(b.staff?.name || ''),
      sanitize(b.branch?.name || ''),
      b.status
    ].join(','));
  }
  lines.push('');

  // ── RENDIMIENTO DE STAFF ──
  lines.push('RENDIMIENTO DE STAFF');
  lines.push('Staff,Finalizadas,Canceladas,Activas/Pendientes,Ausencias (cant),Horas Ausente');
  for (const [, s] of staffMap) {
    const hours = s.absenceMinutes > 0 ? (s.absenceMinutes / 60).toFixed(1) : '0';
    lines.push([
      `"${s.name}"`,
      s.attended,
      s.cancelled,
      s.pending,
      s.absenceCount,
      `${hours}h`
    ].join(','));
  }
  lines.push('');

  // ── RENDIMIENTO DE SERVICIOS ──
  lines.push('RENDIMIENTO DE SERVICIOS');
  lines.push('Servicio,Total Citas,Canceladas,Tasa Cancelación');
  const sortedSvcs = Array.from(svcMap.values()).sort((a, b) => b.total - a.total);
  for (const s of sortedSvcs) {
    const rate = s.total > 0 ? ((s.cancelled / s.total) * 100).toFixed(1) : '0.0';
    lines.push([
      `"${s.name}"`,
      s.total,
      s.cancelled,
      `${rate}%`
    ].join(','));
  }
  lines.push('');

  // ── ENCUESTAS ──
  if (reviewsThisMonth.length > 0) {
    lines.push('ENCUESTAS / SATISFACCIÓN');
    lines.push('Fecha,Calificación,Servicio,Comentario');
    for (const r of reviewsThisMonth) {
      const sanitize = (s: string) => `"${(s || '').replace(/"/g, "'")}"`;
      lines.push([
        format(r.createdAt, 'dd/MM/yyyy'),
        parseFloat(r.rating).toFixed(1),
        sanitize(r.booking?.service?.name || ''),
        sanitize(r.comment || '')
      ].join(','));
    }
  }

  // BOM for Excel UTF-8 compatibility
  const csvContent = '﻿' + lines.join('\r\n');
  const filename = `reporte-dashboard-${format(now, 'yyyy-MM')}.csv`;

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store'
    }
  });
}
