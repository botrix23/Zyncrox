import { Body, Button, Container, Head, Html, Img, Preview, Section, Text } from "@react-email/components";
import * as React from "react";
import { t, type EmailLocale } from "@/lib/emailI18n";

interface BookingReminderEmailProps {
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  branchName: string;
  staffName?: string;
  tenantName: string;
  tenantLogo?: string;
  phone?: string | null;
  contactEmail?: string | null;
  cancelUrl?: string;
  locale?: EmailLocale;
  isHomeService?: boolean;
  primaryColor?: string;
}

export const BookingReminderEmail = ({
  customerName, serviceName, date, time, branchName, staffName, tenantName, tenantLogo,
  phone, contactEmail, cancelUrl, locale = 'es', isHomeService = false, primaryColor = '#6d28d9',
}: BookingReminderEmailProps) => {
  const displayName = customerName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const initials = tenantName.slice(0, 2).toUpperCase();
  const hasContact = !!(phone || contactEmail);

  return (
    <Html lang={locale}>
      <Head>
        <style>{`
          @media only screen and (max-width:600px){
            .zy-container{width:100%!important;border-radius:0!important}
            .zy-body{padding:20px 16px 8px!important}
          }
        `}</style>
      </Head>
      <Preview>{t.reminderPreview(tenantName, locale)}</Preview>
      <Body style={main}>
        <Container style={container} className="zy-container">

          {/* ── Header ─────────────────────────── */}
          <Section style={{ padding: 0 }}>
            <div style={{ ...headerInner, backgroundColor: primaryColor }}>
              {tenantLogo
                ? <Img src={tenantLogo} width="70" height="70" alt={tenantName}
                    style={{ borderRadius: '16px', margin: '0 auto 10px', display: 'block' }} />
                : <div style={initialsBox}>
                    <Text style={{ ...initialsText, color: primaryColor }}>{initials}</Text>
                  </div>
              }
              <Text style={headerName}>{tenantName}</Text>
              <div style={waveArch} />
            </div>
          </Section>

          {/* ── Body ───────────────────────────── */}
          <Section style={bodyPad} className="zy-body">
            <div style={statusBadge}>
              <Text style={statusInner}>● {locale === 'en' ? 'Reminder' : 'Recordatorio'}</Text>
            </div>
            <Text style={greeting}>{locale === 'en' ? `Hello, ${displayName}!` : `¡Hola, ${displayName}!`}</Text>
            <Text style={subtext}>
              {locale === 'en'
                ? `This is a reminder of your appointment tomorrow at ${tenantName}.`
                : `Este es un recordatorio de tu cita mañana en ${tenantName}.`}
            </Text>

            <div style={cardWrap}>
              <table width="100%" style={{ borderCollapse: 'collapse' }} cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #fef9c3' }}>
                    <td style={tdLabel}>{t.service(locale).replace(':', '')}</td>
                    <td style={tdValue}>{serviceName}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #fef9c3' }}>
                    <td style={tdLabel}>{t.date(locale).replace(':', '')}</td>
                    <td style={tdValue}>{date}</td>
                  </tr>
                  <tr style={{ borderBottom: staffName ? '1px solid #fef9c3' : 'none' }}>
                    <td style={tdLabel}>{t.time(locale).replace(':', '')}</td>
                    <td style={tdValue}>{time}</td>
                  </tr>
                  {staffName && (
                    <tr>
                      <td style={tdLabel}>{t.specialist(locale).replace(':', '')}</td>
                      <td style={tdValue}>{staffName}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {isHomeService
              ? <div style={homeBadgeWrap}>
                  <Text style={homeBadgeText}>● {t.homeServiceLabel(locale)}</Text>
                </div>
              : <div style={{ ...branchBlock, borderLeftColor: primaryColor }}>
                  <Text style={branchLabel}>{t.branch(locale).replace(':', '')}</Text>
                  <Text style={branchValue}>{branchName}</Text>
                </div>
            }

            {cancelUrl && (
              <Section style={{ textAlign: 'center', margin: '8px 0 16px' }}>
                <Text style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 10px' }}>
                  {t.reminderCancelNote(locale)}
                </Text>
                <Button href={cancelUrl} style={cancelBtn}>
                  {t.reminderCancelButton(locale)}
                </Button>
              </Section>
            )}

            {hasContact && (
              <table width="100%" style={{ textAlign: 'center', marginBottom: '14px' }} cellPadding={0} cellSpacing={0}>
                <tbody><tr>
                  {phone && <td style={{ textAlign: 'center', padding: '0 4px' }}>
                    <Text style={{ ...contactPill, color: primaryColor }}>{phone}</Text>
                  </td>}
                  {contactEmail && <td style={{ textAlign: 'center', padding: '0 4px' }}>
                    <Text style={{ ...contactPill, color: primaryColor }}>{contactEmail}</Text>
                  </td>}
                </tr></tbody>
              </table>
            )}
          </Section>

          {/* ── Footer ─────────────────────────── */}
          <Section style={footerSec}>
            <Text style={footerMain}>{t.reminderFooter(tenantName, locale)}</Text>
            <Text style={footerPow}>{t.poweredBy(locale)} <strong>Zyncrox</strong></Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};

export default BookingReminderEmail;

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif';
const main = { backgroundColor: '#f3f4f6', fontFamily: font };
const container = { backgroundColor: '#ffffff', margin: '0 auto', maxWidth: '520px', borderRadius: '16px', overflow: 'hidden' as const };
const header = { padding: 0 };
const headerInner = { padding: '28px 24px 0', textAlign: 'center' as const };
const initialsBox = { width: '70px', height: '70px', borderRadius: '16px', backgroundColor: '#fff', margin: '0 auto 10px', textAlign: 'center' as const, lineHeight: '70px' };
const initialsText = { fontSize: '22px', fontWeight: '800', margin: 0, lineHeight: '70px', textAlign: 'center' as const };
const headerName = { color: '#fff', fontSize: '15px', fontWeight: '700', margin: '0 0 2px', textAlign: 'center' as const };
const bodyPad = { padding: '24px 28px 8px' };
const statusBadge = { display: 'inline-block', backgroundColor: '#fefce8', border: '1px solid #fef08a', borderRadius: '20px', padding: '3px 12px', marginBottom: '12px' };
const statusInner = { fontSize: '10px', fontWeight: '600' as const, color: '#854d0e', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: 0 };
const greeting = { fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px' };
const subtext = { fontSize: '13px', color: '#9ca3af', margin: '0 0 16px', lineHeight: '1.5' };
const cardWrap = { border: '1px solid #fef9c3', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' };
const tdLabel: React.CSSProperties = { padding: '8px 14px', fontSize: '12px', color: '#9ca3af', width: '44%' };
const tdValue: React.CSSProperties = { padding: '8px 14px', fontSize: '12px', fontWeight: '600', color: '#1e1b4b' };
const branchBlock = { borderLeft: '3px solid', padding: '9px 14px', backgroundColor: '#f9fafb', marginBottom: '14px', borderRadius: '0 10px 10px 0' };
const branchLabel = { fontSize: '10px', color: '#9ca3af', margin: '0 0 2px' };
const branchValue = { fontSize: '13px', fontWeight: '700', color: '#1e1b4b', margin: 0 };
const homeBadgeWrap = { display: 'inline-block', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '5px 14px', marginBottom: '14px' };
const homeBadgeText = { fontSize: '12px', fontWeight: '600', color: '#15803d', margin: 0 };
const cancelBtn = { backgroundColor: '#ef4444', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', textDecoration: 'none', padding: '10px 22px', display: 'inline-block' };
const contactPill = { fontSize: '11px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '5px 12px', borderRadius: '20px', fontWeight: '500', display: 'inline-block', margin: '2px 0' };
const waveArch = { height: '28px', backgroundColor: '#ffffff', borderRadius: '50% 50% 0 0 / 100% 100% 0 0', display: 'block', lineHeight: 0, fontSize: 0, marginTop: '14px' };
const footerSec = { borderTop: '1px solid #f3f4f6', padding: '14px', textAlign: 'center' as const };
const footerMain = { fontSize: '11px', color: '#9ca3af', margin: '0 0 4px' };
const footerPow = { fontSize: '10px', color: '#9ca3af', margin: 0 };
