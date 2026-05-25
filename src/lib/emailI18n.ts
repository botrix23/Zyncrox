import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

export type EmailLocale = 'es' | 'en';

export function formatEmailDate(date: Date, locale: EmailLocale): string {
  return format(
    date,
    locale === 'en' ? "EEEE, MMMM d" : "EEEE, d 'de' MMMM",
    { locale: locale === 'en' ? enUS : es }
  );
}

export function formatEmailTime(date: Date): string {
  return format(date, 'hh:mm a');
}

// ── Common labels ─────────────────────────────────────────────────────────────
export const t = {
  service:    (l: EmailLocale) => l === 'en' ? 'Service:'    : 'Servicio:',
  date:       (l: EmailLocale) => l === 'en' ? 'Date:'       : 'Fecha:',
  time:       (l: EmailLocale) => l === 'en' ? 'Time:'       : 'Hora:',
  branch:     (l: EmailLocale) => l === 'en' ? 'Branch:'     : 'Sucursal:',
  specialist: (l: EmailLocale) => l === 'en' ? 'Specialist:' : 'Especialista:',

  // ── Confirmation ────────────────────────────────────────────────────────────
  confirmationSubject: (tenantName: string, count: number, l: EmailLocale) => {
    if (l === 'en') return count > 1 ? `Session confirmed - ${tenantName}` : `Appointment confirmed - ${tenantName}`;
    return count > 1 ? `Sesión de reservas confirmada - ${tenantName}` : `Cita confirmada - ${tenantName}`;
  },
  confirmationPreview: (tenantName: string, l: EmailLocale) =>
    l === 'en' ? `Your appointment at ${tenantName} has been confirmed` : `Tu cita en ${tenantName} ha sido confirmada`,
  confirmationHeading: (name: string, hasCustomBody: boolean, l: EmailLocale) =>
    hasCustomBody
      ? (l === 'en' ? 'Booking Confirmation' : 'Confirmación de tu reserva')
      : (l === 'en' ? `Hello ${name}!` : `¡Hola ${name}!`),
  confirmationBody: (tenantName: string, l: EmailLocale) =>
    l === 'en'
      ? `Your appointment at ${tenantName} has been confirmed successfully. Here are the details:`
      : `Tu cita en ${tenantName} ha sido confirmada satisfactoriamente. Aquí tienes los detalles:`,
  confirmationSpecialistTbd: (l: EmailLocale) =>
    l === 'en' ? 'Will be assigned based on availability' : 'Se asignará según disponibilidad',
  confirmationFooter: (tenantName: string, l: EmailLocale) =>
    l === 'en'
      ? `Thank you for choosing ${tenantName}. If you need to make any changes, please contact us.`
      : `Gracias por confiar en ${tenantName}. Si necesitas realizar algún cambio, por favor contáctanos.`,

  // ── Reminder ────────────────────────────────────────────────────────────────
  reminderSubject: (tenantName: string, l: EmailLocale) =>
    l === 'en' ? `Reminder: your appointment tomorrow at ${tenantName}` : `Recordatorio: tu cita mañana en ${tenantName}`,
  reminderPreview: (tenantName: string, l: EmailLocale) =>
    l === 'en' ? `Reminder: your appointment at ${tenantName} is tomorrow` : `Recordatorio: tu cita en ${tenantName} es mañana`,
  reminderHeading: (l: EmailLocale) =>
    l === 'en' ? 'Your appointment is tomorrow! 🗓️' : '¡Tu cita es mañana! 🗓️',
  reminderBody: (customerName: string, tenantName: string, l: EmailLocale) =>
    l === 'en'
      ? `Hello ${customerName}, this is a reminder of your upcoming appointment at `
      : `Hola ${customerName}, este es un recordatorio de tu próxima cita en `,
  reminderFooter: (tenantName: string, l: EmailLocale) =>
    l === 'en'
      ? `If you need to reschedule, please contact us in advance. We look forward to seeing you at ${tenantName}!`
      : `Si necesitas reagendar, por favor contáctanos con anticipación. ¡Te esperamos en ${tenantName}!`,
  reminderCancelButton: (l: EmailLocale) =>
    l === 'en' ? 'Cancel appointment' : 'Cancelar cita',
  reminderCancelNote: (l: EmailLocale) =>
    l === 'en'
      ? 'If you cannot attend, you can cancel your appointment by clicking the button above.'
      : 'Si no puedes asistir, puedes cancelar tu cita haciendo clic en el botón de arriba.',

  // ── Cancellation ────────────────────────────────────────────────────────────
  cancellationSubject: (tenantName: string, l: EmailLocale) =>
    l === 'en' ? `Appointment cancelled - ${tenantName}` : `Cita cancelada - ${tenantName}`,
  cancellationPreview: (tenantName: string, l: EmailLocale) =>
    l === 'en' ? `Your appointment at ${tenantName} has been cancelled` : `Tu cita en ${tenantName} ha sido cancelada`,
  cancellationHeading: (l: EmailLocale) =>
    l === 'en' ? 'Appointment Cancelled' : 'Cita cancelada',
  cancellationBody: (customerName: string, tenantName: string, l: EmailLocale) =>
    l === 'en'
      ? `Hello ${customerName}, we inform you that your appointment at ${tenantName} has been cancelled.`
      : `Hola ${customerName}, te informamos que tu cita en ${tenantName} ha sido cancelada.`,
  cancellationFooter: (tenantName: string, l: EmailLocale) =>
    l === 'en'
      ? `If you have any questions, please contact us directly. We hope to see you soon at ${tenantName}!`
      : `Si tienes alguna pregunta, por favor contáctanos directamente. ¡Esperamos verte pronto en ${tenantName}!`,

  // ── Reschedule ──────────────────────────────────────────────────────────────
  rescheduleSubject: (tenantName: string, l: EmailLocale) =>
    l === 'en' ? `Appointment rescheduled - ${tenantName}` : `Cita reagendada - ${tenantName}`,
  reschedulePreview: (tenantName: string, l: EmailLocale) =>
    l === 'en' ? `Your appointment at ${tenantName} has been rescheduled` : `Tu cita en ${tenantName} ha sido reagendada`,
  rescheduleHeading: (l: EmailLocale) =>
    l === 'en' ? 'Appointment Rescheduled' : 'Cita reagendada',
  rescheduleBody: (customerName: string, tenantName: string, l: EmailLocale) =>
    l === 'en'
      ? `Hello ${customerName}, your appointment at ${tenantName} has been updated. Here are the new details:`
      : `Hola ${customerName}, tu cita en ${tenantName} ha sido modificada. Aquí están los nuevos detalles:`,
  rescheduleNewLabel: (l: EmailLocale) => l === 'en' ? 'NEW DATE AND TIME' : 'NUEVA FECHA Y HORA',
  rescheduleOldLabel: (l: EmailLocale) => l === 'en' ? 'PREVIOUS DATE' : 'FECHA ANTERIOR',
  rescheduleOldAt:   (l: EmailLocale) => l === 'en' ? 'at' : 'a las',
  rescheduleFooter: (tenantName: string, l: EmailLocale) =>
    l === 'en'
      ? `If you have any questions about this change, please contact us. We look forward to seeing you at ${tenantName}!`
      : `Si tienes alguna pregunta sobre este cambio, por favor contáctanos. ¡Te esperamos en ${tenantName}!`,

  // ── Trial Warning ───────────────────────────────────────────────────────────
  trialSubject: (daysLeft: number, l: EmailLocale) =>
    l === 'en'
      ? daysLeft <= 0 ? 'Your Zyncrox trial has expired' : `Your Zyncrox trial expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
      : daysLeft <= 0 ? 'Tu período de prueba en Zyncrox ha vencido' : `Tu trial en Zyncrox vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`,
  trialPreview: (daysLeft: number, l: EmailLocale) =>
    l === 'en'
      ? daysLeft <= 0 ? 'Your Zyncrox trial has expired' : `Your Zyncrox trial expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
      : daysLeft <= 0 ? 'Tu período de prueba en Zyncrox ha vencido' : `Tu trial en Zyncrox vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`,
  trialHeading: (daysLeft: number, l: EmailLocale) =>
    l === 'en'
      ? daysLeft <= 0 ? 'Your trial has expired' : `Your trial expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
      : daysLeft <= 0 ? 'Tu trial ha vencido' : `Tu trial vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`,
  trialBody: (businessName: string, adminName: string | undefined, daysLeft: number, l: EmailLocale) =>
    l === 'en'
      ? `Hello${adminName ? ` ${adminName}` : ''}, the trial period for ${businessName} on Zyncrox ${daysLeft <= 0 ? 'has expired' : `will expire in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}.`
      : `Hola${adminName ? ` ${adminName}` : ''}, el período de prueba de ${businessName} en Zyncrox ${daysLeft <= 0 ? 'ha vencido' : `vencerá en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`}.`,
  trialBoxText: (daysLeft: number, l: EmailLocale) =>
    l === 'en'
      ? daysLeft <= 0
        ? 'Your access has been suspended. Choose a plan to reactivate your account and continue managing your bookings.'
        : 'To continue without interruptions, contact support and choose the plan that best suits your business.'
      : daysLeft <= 0
        ? 'Tu acceso ha sido suspendido. Elige un plan para reactivar tu cuenta y seguir gestionando tus reservas.'
        : 'Para continuar sin interrupciones, contacta a soporte y elige el plan que mejor se adapte a tu negocio.',
  trialButton:  (l: EmailLocale) => l === 'en' ? 'Contact support' : 'Contactar soporte',
  trialFooter:  (l: EmailLocale) => l === 'en' ? 'Zyncrox · Premium booking management' : 'Zyncrox · Gestión de reservas premium',

  // ── Survey ──────────────────────────────────────────────────────────────────
  surveySubject: (tenantName: string, l: EmailLocale) =>
    l === 'en' ? `How was your experience? - ${tenantName}` : `¿Cómo fue tu experiencia? - ${tenantName}`,
  surveyPreview: (tenantName: string, l: EmailLocale) =>
    l === 'en' ? `How was your experience at ${tenantName}?` : `¿Cómo fue tu experiencia en ${tenantName}?`,
  surveyHeading: (customerName: string, l: EmailLocale) =>
    l === 'en' ? `Thank you for visiting, ${customerName}!` : `¡Gracias por visitarnos, ${customerName}!`,
  surveyBody: (tenantName: string, l: EmailLocale) =>
    l === 'en'
      ? `Your opinion matters to us. Could you take a moment to tell us how your experience was at `
      : `Nos importa mucho tu opinión. ¿Podrías tomarte un momento para contarnos cómo fue tu experiencia en `,
  surveyButton: (l: EmailLocale) => l === 'en' ? 'Complete Survey' : 'Completar encuesta',
  surveyFooter: (tenantName: string, l: EmailLocale) =>
    l === 'en'
      ? `Thank you for choosing ${tenantName}. Your feedback helps us improve.`
      : `Gracias por confiar en ${tenantName}. Tu opinión nos ayuda a mejorar.`,
};
