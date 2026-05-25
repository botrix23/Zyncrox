import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyCancelToken } from "@/lib/cancelToken";
import { formatEmailDate, formatEmailTime } from "@/lib/emailI18n";
import { redirect } from "next/navigation";

interface CancelPageProps {
  params: { locale: string; bookingId: string };
  searchParams: { token?: string; confirmed?: string };
}

async function cancelBookingById(bookingId: string) {
  "use server";
  await db.update(bookings)
    .set({ status: 'CANCELLED' })
    .where(eq(bookings.id, bookingId));
}

export default async function CancelBookingPage({ params, searchParams }: CancelPageProps) {
  const { locale, bookingId } = params;
  const token = searchParams.token || '';
  const confirmed = searchParams.confirmed === '1';

  // Verify the token
  if (!token || !verifyCancelToken(bookingId, token)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-black">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl text-center space-y-4 border border-slate-200 dark:border-white/5">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Enlace inválido</h1>
          <p className="text-slate-500 dark:text-zinc-400">
            Este enlace de cancelación no es válido o ha sido alterado. Por favor contáctanos directamente si necesitas cancelar tu cita.
          </p>
        </div>
      </div>
    );
  }

  // Fetch the booking
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { service: true, branch: true, staff: true, tenant: true },
  });

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-black">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl text-center space-y-4 border border-slate-200 dark:border-white/5">
          <div className="text-4xl">🔍</div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Cita no encontrada</h1>
          <p className="text-slate-500 dark:text-zinc-400">
            No pudimos encontrar esta cita. Es posible que ya haya sido eliminada.
          </p>
        </div>
      </div>
    );
  }

  // Already cancelled
  if (booking.status === 'CANCELLED') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-black">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl text-center space-y-4 border border-slate-200 dark:border-white/5">
          <div className="text-4xl">✅</div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Cita ya cancelada</h1>
          <p className="text-slate-500 dark:text-zinc-400">
            Esta cita ya fue cancelada previamente. No se requiere ninguna acción adicional.
          </p>
        </div>
      </div>
    );
  }

  // Already finalized
  if (booking.status === 'FINALIZADA') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-black">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl text-center space-y-4 border border-slate-200 dark:border-white/5">
          <div className="text-4xl">✅</div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Cita ya finalizada</h1>
          <p className="text-slate-500 dark:text-zinc-400">
            Esta cita ya fue completada y no puede cancelarse.
          </p>
        </div>
      </div>
    );
  }

  // If confirmed=1 in the URL, cancel the booking
  if (confirmed) {
    await cancelBookingById(bookingId);
    const tenantName = (booking.tenant as any)?.name || 'el negocio';
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-black">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl text-center space-y-4 border border-slate-200 dark:border-white/5">
          <div className="text-5xl">🗑️</div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Cita cancelada</h1>
          <p className="text-slate-500 dark:text-zinc-400">
            Tu cita ha sido cancelada exitosamente. Si deseas reagendarla, comunícate con <strong>{tenantName}</strong>.
          </p>
        </div>
      </div>
    );
  }

  // Show confirmation page
  const localeKey = (locale === 'en' ? 'en' : 'es') as 'es' | 'en';
  const dateStr = formatEmailDate(booking.startTime, localeKey);
  const timeStr = formatEmailTime(booking.startTime);
  const tenantName = (booking.tenant as any)?.name || '';
  const tenantLogo = (booking.tenant as any)?.logoUrl || null;
  const staffName = (booking.staff as any)?.name || null;
  const branchName = (booking.branch as any)?.name || '';
  const serviceName = (booking.service as any)?.name || '';
  const confirmUrl = `/${locale}/cancel/${bookingId}?token=${token}&confirmed=1`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-black">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl space-y-6 border border-slate-200 dark:border-white/5">
        {tenantLogo && (
          <div className="flex justify-center">
            <img src={tenantLogo} alt={tenantName} className="h-10 object-contain" />
          </div>
        )}
        <div className="text-center space-y-1">
          <div className="text-4xl">📅</div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            ¿Cancelar tu cita?
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">
            Esta acción no se puede deshacer.
          </p>
        </div>

        {/* Booking details */}
        <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 space-y-2 border border-slate-100 dark:border-white/5">
          <DetailRow label="Servicio" value={serviceName} />
          <DetailRow label="Fecha" value={dateStr} />
          <DetailRow label="Hora" value={timeStr} />
          <DetailRow label="Sucursal" value={branchName} />
          {staffName && <DetailRow label="Especialista" value={staffName} />}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <a
            href={confirmUrl}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold text-center py-3 px-6 rounded-xl transition-colors"
          >
            Sí, cancelar mi cita
          </a>
          <a
            href="/"
            className="w-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-zinc-300 font-semibold text-center py-3 px-6 rounded-xl transition-colors"
          >
            No, mantener cita
          </a>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-zinc-600">
          {tenantName && `Si tienes dudas, contáctanos directamente con ${tenantName}.`}
        </p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-500 dark:text-zinc-400 font-medium">{label}</span>
      <span className="text-slate-800 dark:text-zinc-200 font-semibold text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
