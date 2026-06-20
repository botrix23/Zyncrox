import { Body, Button, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import * as React from "react";
import { t, type EmailLocale } from "@/lib/emailI18n";

interface TrialWarningEmailProps {
  businessName: string;
  daysLeft: number;
  adminName?: string;
  locale?: EmailLocale;
}

export const TrialWarningEmail = ({ businessName, daysLeft, adminName, locale = 'es' }: TrialWarningEmailProps) => {
  const isExpired = daysLeft <= 0;

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
      <Preview>{t.trialPreview(daysLeft, locale)}</Preview>
      <Body style={main}>
        <Container style={container} className="zy-container">

          {/* ── Header (Zyncrox branding) ─────── */}
          <Section style={{ padding: 0, backgroundColor: '#ffffff' }}>
            <div style={headerInner}>
            <div style={logoBox}>
              <Text style={logoText}>Z</Text>
            </div>
            <Text style={headerName}>Zyncrox</Text>
            <Text style={headerSub}>{locale === 'en' ? 'Booking management platform' : 'Plataforma de gestión de reservas'}</Text>
            </div>
          </Section>

          {/* ── Body ───────────────────────────── */}
          <Section style={bodyPad} className="zy-body">
            <div style={isExpired ? expiredBadge : warningBadge}>
              <Text style={isExpired ? expiredBadgeText : warningBadgeText}>
                ● {isExpired
                  ? (locale === 'en' ? 'Trial expired' : 'Trial vencido')
                  : (locale === 'en' ? 'Trial ending soon' : 'Trial por vencer')}
              </Text>
            </div>

            <Text style={greeting}>
              {locale === 'en'
                ? `Hello${adminName ? `, ${adminName}` : ''}!`
                : `¡Hola${adminName ? `, ${adminName}` : ''}!`}
            </Text>
            <Text style={subtext}>{t.trialBody(businessName, adminName, daysLeft, locale)}</Text>

            <div style={isExpired ? dangerCard : warningCard}>
              <Text style={cardText}>{t.trialBoxText(daysLeft, locale)}</Text>
            </div>

            {!isExpired && (
              <div style={daysBox}>
                <Text style={daysNum}>{daysLeft}</Text>
                <Text style={daysLabel}>{locale === 'en' ? `day${daysLeft === 1 ? '' : 's'} remaining` : `día${daysLeft === 1 ? '' : 's'} restante${daysLeft === 1 ? '' : 's'}`}</Text>
              </div>
            )}

            <Section style={{ textAlign: 'center', margin: '20px 0' }}>
              <Button href="mailto:soporte@zyncrox.com" style={ctaBtn}>
                {t.trialButton(locale)}
              </Button>
            </Section>
          </Section>

          {/* ── Footer ─────────────────────────── */}
          <Section style={footerSec}>
            <Text style={footerPow}>{t.trialFooter(locale)}</Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};

export default TrialWarningEmail;

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif';
const main = { backgroundColor: '#f5f3ff', fontFamily: font };
const container = { backgroundColor: '#ffffff', margin: '0 auto', maxWidth: '520px', borderRadius: '16px', overflow: 'hidden' as const };
const header = { padding: 0, backgroundColor: '#ffffff' };
const headerInner = { backgroundColor: '#4c1d95', padding: '28px 24px 28px', textAlign: 'center' as const, borderRadius: '0 0 24px 24px' };
const logoBox = { width: '70px', height: '70px', borderRadius: '16px', backgroundColor: '#fff', margin: '0 auto 10px', textAlign: 'center' as const, lineHeight: '70px' };
const logoText = { fontSize: '28px', fontWeight: '900', color: '#6d28d9', margin: 0, lineHeight: '70px', textAlign: 'center' as const };
const headerName = { color: '#fff', fontSize: '16px', fontWeight: '700', margin: '0 0 2px', textAlign: 'center' as const };
const headerSub = { color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: 0, textAlign: 'center' as const };
const bodyPad = { padding: '24px 28px 8px' };
const warningBadge = { display: 'inline-block', backgroundColor: '#fefce8', border: '1px solid #fef08a', borderRadius: '20px', padding: '3px 12px', marginBottom: '12px' };
const expiredBadge = { display: 'inline-block', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '20px', padding: '3px 12px', marginBottom: '12px' };
const warningBadgeText = { fontSize: '10px', fontWeight: '600' as const, color: '#854d0e', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: 0 };
const expiredBadgeText = { fontSize: '10px', fontWeight: '600' as const, color: '#be123c', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: 0 };
const greeting = { fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px' };
const subtext = { fontSize: '13px', color: '#6b7280', margin: '0 0 16px', lineHeight: '1.6' };
const warningCard = { backgroundColor: '#fefce8', border: '1px solid #fef08a', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px' };
const dangerCard = { backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px' };
const cardText = { fontSize: '13px', color: '#374151', margin: 0, lineHeight: '1.6', textAlign: 'center' as const };
const daysBox = { textAlign: 'center' as const, margin: '0 0 8px' };
const daysNum = { fontSize: '48px', fontWeight: '800', color: '#6d28d9', margin: '0', lineHeight: '1', textAlign: 'center' as const };
const daysLabel = { fontSize: '13px', color: '#9ca3af', margin: '4px 0 16px', textAlign: 'center' as const };
const ctaBtn = { backgroundColor: '#6d28d9', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '700', textDecoration: 'none', padding: '12px 28px', display: 'inline-block' };
const footerSec = { borderTop: '1px solid #f5f3ff', padding: '14px', textAlign: 'center' as const };
const footerPow = { fontSize: '10px', color: '#a78bfa', margin: 0 };
