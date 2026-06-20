import { Body, Button, Container, Head, Html, Img, Preview, Section, Text } from "@react-email/components";
import * as React from "react";
import { t, type EmailLocale } from "@/lib/emailI18n";

interface SurveyInviteEmailProps {
  customerName: string;
  tenantName: string;
  tenantLogo?: string;
  surveyUrl: string;
  locale?: EmailLocale;
  primaryColor?: string;
}

export const SurveyInviteEmail = ({
  customerName, tenantName, tenantLogo, surveyUrl, locale = 'es', primaryColor = '#6d28d9',
}: SurveyInviteEmailProps) => {
  const displayName = customerName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const initials = tenantName.slice(0, 2).toUpperCase();

  return (
    <Html lang={locale}>
      <Head>
        <style>{`
          @media only screen and (max-width:600px){
            .zy-container{width:100%!important;border-radius:0!important}
            .zy-body{padding:20px 16px 24px!important}
          }
        `}</style>
      </Head>
      <Preview>{t.surveyPreview(tenantName, locale)}</Preview>
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
            </div>
          </Section>

          {/* ── Body ───────────────────────────── */}
          <Section style={bodyPad} className="zy-body">
            <Text style={greeting}>{t.surveyHeading(displayName, locale)}</Text>
            <Text style={subtext}>
              {t.surveyBody(tenantName, locale)}<strong>{tenantName}</strong>?
            </Text>

            <div style={starsRow}>
              <Text style={starsText}>★★★★★</Text>
            </div>

            <Section style={{ textAlign: 'center', margin: '20px 0' }}>
              <Button href={surveyUrl} style={{ ...ctaBtn, backgroundColor: primaryColor }}>
                {t.surveyButton(locale)}
              </Button>
            </Section>
          </Section>

          {/* ── Footer ─────────────────────────── */}
          <Section style={footerSec}>
            <Text style={footerMain}>{t.surveyFooter(tenantName, locale)}</Text>
            <Text style={footerPow}>{t.poweredBy(locale)} <strong>Zyncrox</strong></Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};

export default SurveyInviteEmail;

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif';
const main = { backgroundColor: '#f3f4f6', fontFamily: font };
const container = { backgroundColor: '#ffffff', margin: '0 auto', maxWidth: '520px', borderRadius: '16px', overflow: 'hidden' as const };
const header = { padding: 0 };
const headerInner = { padding: '28px 24px 24px', textAlign: 'center' as const, borderRadius: '0 0 40px 40px' };
const initialsBox = { width: '70px', height: '70px', borderRadius: '16px', backgroundColor: '#fff', margin: '0 auto 10px', textAlign: 'center' as const, lineHeight: '70px' };
const initialsText = { fontSize: '22px', fontWeight: '800', margin: 0, lineHeight: '70px', textAlign: 'center' as const };
const headerName = { color: '#fff', fontSize: '15px', fontWeight: '700', margin: '0 0 2px', textAlign: 'center' as const };
const bodyPad = { padding: '28px 28px 8px', textAlign: 'center' as const };
const greeting = { fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 8px', textAlign: 'center' as const };
const subtext = { fontSize: '14px', color: '#6b7280', margin: '0 0 20px', lineHeight: '1.6', textAlign: 'center' as const };
const starsRow = { textAlign: 'center' as const, marginBottom: '4px' };
const starsText = { fontSize: '28px', color: '#f59e0b', letterSpacing: '4px', margin: 0, textAlign: 'center' as const };
const ctaBtn = { borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: '700', textDecoration: 'none', padding: '13px 32px', display: 'inline-block' };
const footerSec = { borderTop: '1px solid #f3f4f6', padding: '14px', textAlign: 'center' as const };
const footerMain = { fontSize: '11px', color: '#9ca3af', margin: '0 0 4px' };
const footerPow = { fontSize: '10px', color: '#9ca3af', margin: 0 };
