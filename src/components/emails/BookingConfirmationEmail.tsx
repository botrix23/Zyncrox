import { Body, Container, Head, Html, Img, Preview, Section, Text } from "@react-email/components";
import * as React from "react";
import { t, type EmailLocale } from "@/lib/emailI18n";

export interface BookingEmailService {
  name: string;
  date: string;
  time: string;
  staffName?: string;
}

interface BookingEmailProps {
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  branchName: string;
  staffName?: string;
  tenantName: string;
  tenantLogo?: string;
  customBody?: string | null;
  phone?: string | null;
  contactEmail?: string | null;
  locale?: EmailLocale;
  services?: BookingEmailService[];
  isHomeService?: boolean;
  primaryColor?: string;
}

const SvcTable = ({ rows }: { rows: { label: string; value: string }[] }) => (
  <table width="100%" style={{ borderCollapse: 'collapse' }} cellPadding={0} cellSpacing={0}>
    <tbody>
      {rows.map((r, i) => (
        <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #f5f3ff' : 'none' }}>
          <td style={{ padding: '8px 14px', fontSize: '12px', color: '#9ca3af', width: '44%' }}>{r.label}</td>
          <td style={{ padding: '8px 14px', fontSize: '12px', fontWeight: '600', color: '#1e1b4b' }}>{r.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const BookingConfirmationEmail = ({
  customerName, serviceName, date, time, branchName, staffName, tenantName, tenantLogo,
  customBody, phone, contactEmail, locale = 'es', services, isHomeService = false,
  primaryColor = '#6d28d9',
}: BookingEmailProps) => {
  const displayName = customerName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const initials = tenantName.slice(0, 2).toUpperCase();
  const useMulti = services && services.length > 0;
  const hasContact = !!(phone || contactEmail);

  const formattedBody = customBody
    ? customBody
        .replace(/{cliente}/g, customerName).replace(/{servicio}/g, serviceName)
        .replace(/{fecha}/g, date).replace(/{hora}/g, time)
        .replace(/{negocio}/g, tenantName).replace(/{sucursal}/g, branchName)
    : null;

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
      <Preview>{t.confirmationPreview(tenantName, locale)}</Preview>
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
              <Text style={statusInner}>● {locale === 'en' ? 'Confirmed' : 'Confirmada'}</Text>
            </div>
            <Text style={greeting}>{t.confirmationHeading(displayName, !!customBody, locale)}</Text>
            <Text style={subtext}>{formattedBody || t.confirmationBody(tenantName, locale)}</Text>

            {useMulti ? (
              services!.map((svc, i) => (
                <div key={i} style={cardWrap}>
                  {services!.length > 1 && (
                    <div style={{ ...cardHead, backgroundColor: primaryColor }}>
                      <Text style={cardHeadText}>{locale === 'en' ? `Service ${i + 1}` : `Servicio ${i + 1}`}</Text>
                    </div>
                  )}
                  <SvcTable rows={[
                    { label: t.service(locale).replace(':', ''),    value: svc.name },
                    { label: t.date(locale).replace(':', ''),       value: svc.date },
                    { label: t.time(locale).replace(':', ''),       value: svc.time },
                    { label: t.specialist(locale).replace(':', ''), value: svc.staffName || t.confirmationSpecialistTbd(locale) },
                  ]} />
                </div>
              ))
            ) : (
              <div style={cardWrap}>
                <SvcTable rows={[
                  { label: t.service(locale).replace(':', ''),    value: serviceName },
                  { label: t.date(locale).replace(':', ''),       value: date },
                  { label: t.time(locale).replace(':', ''),       value: time },
                  { label: t.specialist(locale).replace(':', ''), value: staffName || t.confirmationSpecialistTbd(locale) },
                ]} />
              </div>
            )}

            {isHomeService
              ? <div style={homeBadgeWrap}>
                  <Text style={homeBadgeText}>● {t.homeServiceLabel(locale)}</Text>
                </div>
              : <div style={{ ...branchBlock, borderLeftColor: primaryColor }}>
                  <Text style={branchLabel}>{t.branch(locale).replace(':', '')}</Text>
                  <Text style={branchValue}>{branchName}</Text>
                </div>
            }

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
            <Text style={footerMain}>{t.confirmationFooter(tenantName, locale)}</Text>
            <Text style={footerPow}>{t.poweredBy(locale)} <strong>Zyncrox</strong></Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};

export default BookingConfirmationEmail;

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif';
const main = { backgroundColor: '#f5f3ff', fontFamily: font };
const container = { backgroundColor: '#ffffff', margin: '0 auto', maxWidth: '520px', borderRadius: '16px', overflow: 'hidden' as const };
const header = { padding: '28px 24px 28px', textAlign: 'center' as const, borderRadius: '0 0 24px 24px' };
const initialsBox = { width: '70px', height: '70px', borderRadius: '16px', backgroundColor: '#fff', margin: '0 auto 10px', textAlign: 'center' as const, lineHeight: '70px' };
const initialsText = { fontSize: '22px', fontWeight: '800', margin: 0, lineHeight: '70px', textAlign: 'center' as const };
const headerName = { color: '#fff', fontSize: '15px', fontWeight: '700', margin: '0 0 2px', textAlign: 'center' as const };
const bodyPad = { padding: '24px 28px 8px' };
const statusBadge = { display: 'inline-block', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '3px 12px', marginBottom: '12px' };
const statusInner = { fontSize: '10px', fontWeight: '600' as const, color: '#15803d', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: 0 };
const greeting = { fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px' };
const subtext = { fontSize: '13px', color: '#9ca3af', margin: '0 0 16px', lineHeight: '1.5' };
const cardWrap = { border: '1px solid #ede9fe', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' };
const cardHead = { padding: '6px 14px' };
const cardHeadText = { fontSize: '10px', fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: '#fff', margin: 0 };
const branchBlock = { borderLeft: '3px solid #7c3aed', padding: '9px 14px', backgroundColor: '#faf5ff', marginBottom: '14px', borderRadius: '0 10px 10px 0' };
const branchLabel = { fontSize: '10px', color: '#a78bfa', margin: '0 0 2px' };
const branchValue = { fontSize: '13px', fontWeight: '700', color: '#1e1b4b', margin: 0 };
const homeBadgeWrap = { display: 'inline-block', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '5px 14px', marginBottom: '14px' };
const homeBadgeText = { fontSize: '12px', fontWeight: '600', color: '#15803d', margin: 0 };
const contactPill = { fontSize: '11px', backgroundColor: '#faf5ff', border: '1px solid #ede9fe', padding: '5px 12px', borderRadius: '20px', fontWeight: '500', display: 'inline-block', margin: '2px 0' };
const footerSec = { borderTop: '1px solid #f5f3ff', padding: '14px', textAlign: 'center' as const };
const footerMain = { fontSize: '11px', color: '#9ca3af', margin: '0 0 4px' };
const footerPow = { fontSize: '10px', color: '#a78bfa', margin: 0 };
