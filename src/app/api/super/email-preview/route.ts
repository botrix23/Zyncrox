import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-session';
import { render } from '@react-email/render';
import React from 'react';
import { BookingConfirmationEmail } from '@/components/emails/BookingConfirmationEmail';
import { BookingReminderEmail } from '@/components/emails/BookingReminderEmail';
import { BookingCancellationEmail } from '@/components/emails/BookingCancellationEmail';
import { BookingRescheduleEmail } from '@/components/emails/BookingRescheduleEmail';
import { TrialWarningEmail } from '@/components/emails/TrialWarningEmail';
import { SurveyInviteEmail } from '@/components/emails/SurveyInviteEmail';
import { db } from '@/db';
import { platformConfig } from '@/db/schema';
import { type EmailLocale } from '@/lib/emailI18n';

function replaceVars(html: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value ?? '');
  }, html);
}

const SAMPLE: Record<EmailLocale, Record<string, string>> = {
  es: {
    customerName: 'María González',
    serviceName: 'Corte y Peinado Premium',
    date: 'lunes, 15 de enero',
    time: '10:00 AM',
    branchName: 'Sucursal Central',
    staffName: 'Ana López',
    tenantName: 'Salón Bella',
    oldDate: 'viernes, 12 de enero',
    oldTime: '02:00 PM',
    newDate: 'lunes, 15 de enero',
    newTime: '10:00 AM',
    businessName: 'Salón Bella',
    daysLeft: '3',
    adminName: 'Carlos Rodríguez',
    surveyUrl: 'https://zyncrox.com/survey/demo',
    phone: '+503 7000-0000',
    contactEmail: 'contacto@salonbella.com',
    cancelUrl: 'https://zyncrox.com/es/cancel/demo-booking-id?token=demo-token',
  },
  en: {
    customerName: 'Mary Johnson',
    serviceName: 'Premium Cut & Style',
    date: 'Monday, January 15',
    time: '10:00 AM',
    branchName: 'Main Branch',
    staffName: 'Anne Lopez',
    tenantName: 'Bella Salon',
    oldDate: 'Friday, January 12',
    oldTime: '02:00 PM',
    newDate: 'Monday, January 15',
    newTime: '10:00 AM',
    businessName: 'Bella Salon',
    daysLeft: '3',
    adminName: 'Charles Rodriguez',
    surveyUrl: 'https://zyncrox.com/survey/demo',
    phone: '+1 (555) 000-0000',
    contactEmail: 'contact@bellasalon.com',
    cancelUrl: 'https://zyncrox.com/en/cancel/demo-booking-id?token=demo-token',
  },
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const template = req.nextUrl.searchParams.get('template');
  const localeParam = req.nextUrl.searchParams.get('locale');
  const locale: EmailLocale = localeParam === 'en' ? 'en' : 'es';
  const sample = SAMPLE[locale];
  const cfg = await db.select().from(platformConfig).limit(1).then(rows => rows[0] ?? null);

  let html = '';

  switch (template) {
    case 'confirmation': {
      if (cfg?.emailTplConfirmation) {
        html = replaceVars(cfg.emailTplConfirmation, sample);
      } else {
        // Sample data with multiple services to preview multi-service layout
        const sampleServices = locale === 'en'
          ? [
              { name: 'Premium Cut & Style', date: 'Monday, January 15', time: '10:00 AM', staffName: 'Anne Lopez' },
              { name: 'Deep Conditioning', date: 'Monday, January 15', time: '11:30 AM', staffName: '' },
            ]
          : [
              { name: 'Corte y Peinado Premium', date: 'lunes, 15 de enero', time: '10:00 AM', staffName: 'Ana López' },
              { name: 'Tratamiento Capilar', date: 'lunes, 15 de enero', time: '11:30 AM', staffName: '' },
            ];
        html = await render(React.createElement(BookingConfirmationEmail, {
          customerName: sample.customerName,
          serviceName: sampleServices.map(s => s.name).join(', '),
          date: sample.date,
          time: sample.time,
          branchName: sample.branchName,
          staffName: sample.staffName,
          tenantName: sample.tenantName,
          phone: sample.phone,
          contactEmail: sample.contactEmail,
          services: sampleServices,
          locale,
        }));
      }
      break;
    }
    case 'reminder': {
      if (cfg?.emailTplReminder) {
        html = replaceVars(cfg.emailTplReminder, sample);
      } else {
        html = await render(React.createElement(BookingReminderEmail, {
          customerName: sample.customerName,
          serviceName: sample.serviceName,
          date: sample.date,
          time: sample.time,
          branchName: sample.branchName,
          staffName: sample.staffName,
          tenantName: sample.tenantName,
          phone: sample.phone,
          contactEmail: sample.contactEmail,
          cancelUrl: sample.cancelUrl,
          locale,
        }));
      }
      break;
    }
    case 'cancellation': {
      if (cfg?.emailTplCancellation) {
        html = replaceVars(cfg.emailTplCancellation, sample);
      } else {
        html = await render(React.createElement(BookingCancellationEmail, {
          customerName: sample.customerName,
          serviceName: sample.serviceName,
          date: sample.date,
          time: sample.time,
          branchName: sample.branchName,
          tenantName: sample.tenantName,
          phone: sample.phone,
          contactEmail: sample.contactEmail,
          locale,
        }));
      }
      break;
    }
    case 'reschedule': {
      if (cfg?.emailTplReschedule) {
        html = replaceVars(cfg.emailTplReschedule, sample);
      } else {
        html = await render(React.createElement(BookingRescheduleEmail, {
          customerName: sample.customerName,
          serviceName: sample.serviceName,
          oldDate: sample.oldDate,
          oldTime: sample.oldTime,
          newDate: sample.newDate,
          newTime: sample.newTime,
          branchName: sample.branchName,
          staffName: sample.staffName,
          tenantName: sample.tenantName,
          phone: sample.phone,
          contactEmail: sample.contactEmail,
          locale,
        }));
      }
      break;
    }
    case 'trialWarning': {
      if (cfg?.emailTplTrialWarning) {
        html = replaceVars(cfg.emailTplTrialWarning, sample);
      } else {
        html = await render(React.createElement(TrialWarningEmail, {
          businessName: sample.businessName,
          daysLeft: parseInt(sample.daysLeft),
          adminName: sample.adminName,
          locale,
        }));
      }
      break;
    }
    case 'surveyInvite': {
      if (cfg?.emailTplSurveyInvite) {
        html = replaceVars(cfg.emailTplSurveyInvite, sample);
      } else {
        html = await render(React.createElement(SurveyInviteEmail, {
          customerName: sample.customerName,
          tenantName: sample.tenantName,
          surveyUrl: sample.surveyUrl,
          locale,
        }));
      }
      break;
    }
    default:
      return NextResponse.json({ error: 'Unknown template' }, { status: 400 });
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
