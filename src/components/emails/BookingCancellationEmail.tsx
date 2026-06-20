import { Body, Container, Head, Html, Img, Preview, Section, Text } from "@react-email/components";
import * as React from "react";
import { t, type EmailLocale } from "@/lib/emailI18n";

interface BookingCancellationEmailProps {
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  branchName: string;
  tenantName: string;
  tenantLogo?: string;
  phone?: string | null;
  contactEmail?: string | null;
  locale?: EmailLocale;
  isHomeService?: boolean;
  primaryColor?: string;
}

export const BookingCancellationEmail = ({
  customerName, serviceName, date, time, branchName, tenantName, tenantLogo,
  phone, contactEmail, locale = 'es', isHomeService = false, primaryColor = '#6d28d9',
}: BookingCancellationEmailProps) => {
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
      <Preview>{t.cancellationPreview(tenantName, locale)}</Preview>
      <Body style={main}>
        <Container style={container} className="zy-container">

          {/* ── Header ─────────────────────────── */}
          <Section style={{ ...header, backgroundColor: primaryColor }}>
            {tenantLogo
              ? <Img src={tenantLogo} width="70" height="70" alt={tenantName}
                  style={{ borderRadius: '16px', margin: '0 auto 10px', display: 'block' }} />
              : <div style={initialsBox}>
                  <Text style={{ ...initialsText, color: primaryColor }}>{initials}</Text>
                </div>
            }
            <Text style={headerName}>{tenantName}</Text>
          </Section>

          {/* ── Body ───────────────────────────── */}
          <Section style={bodyPad} className="zy-body">
            <div style={statusBadge}>
              <Text style={statusInner}>● {locale === 'en' ? 'Cancelled' : 'Cancelada'}</Text>
            </div>
            <Text style={greeting}>{locale === 'en' ? `Hello, ${displayName}` : `Hola, ${displayName}`}</Text>
            <Text style={subtext}>{t.cancellationBody(customerName, tenantName, locale)}</Text>

            <div style={cancelCard}>
              <table width="100%" style={{ borderCollapse: 'collapse' }} cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #fee2e2' }}>
                    <td style={tdLabel}>{t.service(locale).replace(':', '')}</td>
                    <td style={tdValue}>{serviceName}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #fee2e2' }}>
                    <td style={tdLabel}>{t.date(locale).replace(':', '')}</td>
                    <td style={tdValue}>{date}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #fee2e2' }}>
                    <td style={tdLabel}>{t.time(locale).replace(':', '')}</td>
                    <td style={tdValue}>{time}</td>
                  </tr>
                  {!isHomeService && (
                    <tr>
                      <td style={tdLabel}>{t.branch(locale).replace(':', '')}</td>
                      <td style={tdValue}>{branchName}</td>
                    </tr>
                  )}
                  {isHomeService && (
                    <tr>
                      <td style={tdLabel}>{t.homeServiceLabel(locale)}</td>
                      <td style={tdValue}>—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

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
            <Text style={footerMain}>{t.cancellationFooter(tenantName, locale)}</Text>
            <Text style={footerPow}>{t.poweredBy(locale)} <strong>Zyncrox</strong></Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};

export default BookingCancellationEmail;

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif';
const main = { backgroundColor: '#f5f3ff', fontFamily: font };
const container = { backgroundColor: '#ffffff', margin: '0 auto', maxWidth: '520px', borderRadius: '16px', overflow: 'hidden' as const };
const header = { padding: '28px 24px 28px', textAlign: 'center' as const, borderRadius: '0 0 24px 24px' };
const initialsBox = { width: '70px', height: '70px', borderRadius: '16px', backgroundColor: '#fff', margin: '0 auto 10px', textAlign: 'center' as const, lineHeight: '70px' };
const initialsText = { fontSize: '22px', fontWeight: '800', margin: 0, lineHeight: '70px', textAlign: 'center' as const };
const headerName = { color: '#fff', fontSize: '15px', fontWeight: '700', margin: '0 0 2px', textAlign: 'center' as const };
const bodyPad = { padding: '24px 28px 8px' };
const statusBadge = { display: 'inline-block', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '20px', padding: '3px 12px', marginBottom: '12px' };
const statusInner = { fontSize: '10px', fontWeight: '600' as const, color: '#be123c', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: 0 };
const greeting = { fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px' };
const subtext = { fontSize: '13px', color: '#9ca3af', margin: '0 0 16px', lineHeight: '1.5' };
const cancelCard = { border: '1px solid #fecdd3', borderRadius: '12px', overflow: 'hidden', marginBottom: '14px' };
const tdLabel: React.CSSProperties = { padding: '8px 14px', fontSize: '12px', color: '#9ca3af', width: '44%' };
const tdValue: React.CSSProperties = { padding: '8px 14px', fontSize: '12px', fontWeight: '600', color: '#1e1b4b' };
const contactPill = { fontSize: '11px', backgroundColor: '#faf5ff', border: '1px solid #ede9fe', padding: '5px 12px', borderRadius: '20px', fontWeight: '500', display: 'inline-block', margin: '2px 0' };
const footerSec = { borderTop: '1px solid #f5f3ff', padding: '14px', textAlign: 'center' as const };
const footerMain = { fontSize: '11px', color: '#9ca3af', margin: '0 0 4px' };
const footerPow = { fontSize: '10px', color: '#a78bfa', margin: 0 };
