import { Body, Button, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import * as React from "react";
import { type EmailLocale } from "@/lib/emailI18n";

interface AbsenceRequestEmailProps {
  staffName: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  reason?: string;
  panelUrl?: string;
  locale?: EmailLocale;
}

export const AbsenceRequestEmail = ({
  staffName,
  tenantName,
  startDate,
  endDate,
  reason,
  panelUrl = 'https://www.zyncrox.com/es/admin/staff',
  locale = 'es',
}: AbsenceRequestEmailProps) => {
  const isEs = locale === 'es';
  const labels = {
    preview:     isEs ? `Solicitud de ausencia de ${staffName}` : `Absence request from ${staffName}`,
    badge:       isEs ? 'Solicitud de ausencia' : 'Absence request',
    greeting:    isEs ? `¡Hola!` : `Hello!`,
    intro:       isEs
      ? `Un miembro de tu equipo en <strong>${tenantName}</strong> ha enviado una solicitud de ausencia que requiere tu aprobación.`
      : `A team member at <strong>${tenantName}</strong> has submitted an absence request that requires your approval.`,
    labelStaff:  isEs ? 'Especialista' : 'Specialist',
    labelPeriod: isEs ? 'Período' : 'Period',
    labelReason: isEs ? 'Motivo' : 'Reason',
    cta:         isEs ? 'Revisar solicitud →' : 'Review request →',
    hint:        isEs ? 'Ve a Staff → Solicitudes para aprobar o rechazar.' : 'Go to Staff → Requests to approve or reject.',
    footer:      isEs ? 'Mensaje automático de Zyncrox · No respondas a este correo.' : 'Automated message from Zyncrox · Do not reply to this email.',
  };

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
      <Preview>{labels.preview}</Preview>
      <Body style={main}>
        <Container style={container} className="zy-container">

          {/* Header */}
          <Section style={{ padding: 0 }}>
            <div style={headerInner}>
              <div style={logoBox}>
                <Text style={logoText}>Z</Text>
              </div>
              <Text style={headerName}>Zyncrox</Text>
              <Text style={headerSub}>{tenantName}</Text>
            </div>
          </Section>

          {/* Body */}
          <Section style={bodyPad} className="zy-body">
            <div style={badge}>
              <Text style={badgeText}>📋 {labels.badge}</Text>
            </div>

            <Text style={greeting}>{labels.greeting}</Text>
            <Text
              style={subtext}
              dangerouslySetInnerHTML={{ __html: labels.intro }}
            />

            {/* Info card */}
            <div style={card}>
              <div style={cardRow}>
                <Text style={cardLabel}>{labels.labelStaff}</Text>
                <Text style={cardValue}>{staffName}</Text>
              </div>
              <div style={{ ...cardRow, borderTop: '1px solid #e2e8f0' }}>
                <Text style={cardLabel}>{labels.labelPeriod}</Text>
                <Text style={cardValue}>{startDate} → {endDate}</Text>
              </div>
              {reason && (
                <div style={{ ...cardRow, borderTop: '1px solid #e2e8f0' }}>
                  <Text style={cardLabel}>{labels.labelReason}</Text>
                  <Text style={{ ...cardValue, color: '#64748b' }}>{reason}</Text>
                </div>
              )}
            </div>

            <Section style={{ textAlign: 'center', margin: '20px 0 8px' }}>
              <Button href={panelUrl} style={ctaBtn}>{labels.cta}</Button>
            </Section>
            <Text style={hint}>{labels.hint}</Text>
          </Section>

          {/* Footer */}
          <Section style={footerSec}>
            <Text style={footerText}>{labels.footer}</Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};

export default AbsenceRequestEmail;

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif';
const main = { backgroundColor: '#f3f4f6', fontFamily: font };
const container = { backgroundColor: '#ffffff', margin: '0 auto', maxWidth: '520px', borderRadius: '16px', overflow: 'hidden' as const };
const headerInner = { backgroundColor: '#4c1d95', padding: '28px 24px 24px', textAlign: 'center' as const, borderRadius: '0 0 40px 40px' };
const logoBox = { width: '70px', height: '70px', borderRadius: '16px', backgroundColor: '#fff', margin: '0 auto 10px', textAlign: 'center' as const, lineHeight: '70px' };
const logoText = { fontSize: '28px', fontWeight: '900', color: '#6d28d9', margin: 0, lineHeight: '70px', textAlign: 'center' as const };
const headerName = { color: '#fff', fontSize: '16px', fontWeight: '700', margin: '0 0 2px', textAlign: 'center' as const };
const headerSub = { color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: 0, textAlign: 'center' as const };
const bodyPad = { padding: '24px 28px 8px' };
const badge = { display: 'inline-block', backgroundColor: '#ede9fe', border: '1px solid #ddd6fe', borderRadius: '20px', padding: '3px 12px', marginBottom: '12px' };
const badgeText = { fontSize: '10px', fontWeight: '600' as const, color: '#5b21b6', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: 0 };
const greeting = { fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px' };
const subtext = { fontSize: '13px', color: '#6b7280', margin: '0 0 16px', lineHeight: '1.6' };
const card = { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' as const, marginBottom: '20px' };
const cardRow = { padding: '12px 16px' };
const cardLabel = { fontSize: '10px', fontWeight: '700' as const, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.8px', margin: '0 0 2px' };
const cardValue = { fontSize: '14px', fontWeight: '700' as const, color: '#1e293b', margin: 0 };
const ctaBtn = { backgroundColor: '#6d28d9', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '700', textDecoration: 'none', padding: '12px 28px', display: 'inline-block' };
const hint = { fontSize: '11px', color: '#94a3b8', textAlign: 'center' as const, margin: '8px 0 0' };
const footerSec = { borderTop: '1px solid #f3f4f6', padding: '14px', textAlign: 'center' as const };
const footerText = { fontSize: '10px', color: '#9ca3af', margin: 0 };
