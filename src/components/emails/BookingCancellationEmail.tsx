import { Body, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text } from "@react-email/components";
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
}

export const BookingCancellationEmail = ({
  customerName, serviceName, date, time, branchName, tenantName, tenantLogo, phone, contactEmail, locale = 'es',
}: BookingCancellationEmailProps) => {
  const hasContact = !!(phone || contactEmail);
  return (
    <Html>
      <Head />
      <Preview>{t.cancellationPreview(tenantName, locale)}</Preview>
      <Body style={main}>
        <Container style={container}>
          {tenantLogo && <Img src={tenantLogo} width="150" alt={tenantName} style={logo} />}
          <Heading style={h1}>{t.cancellationHeading(locale)}</Heading>
          <Text style={text}>{t.cancellationBody(customerName, tenantName, locale)}</Text>
          <Section style={section}>
            <Text style={detailText}><strong>{t.service(locale)}</strong> {serviceName}</Text>
            <Text style={detailText}><strong>{t.date(locale)}</strong> {date}</Text>
            <Text style={detailText}><strong>{t.time(locale)}</strong> {time}</Text>
            <Text style={detailText}><strong>{t.branch(locale)}</strong> {branchName}</Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>{t.cancellationFooter(tenantName, locale)}</Text>
          {hasContact && (
            <Section style={contactSection}>
              {phone && <Text style={contactLine}>📞 {phone}</Text>}
              {contactEmail && <Text style={contactLine}>✉️ {contactEmail}</Text>}
            </Section>
          )}
        </Container>
      </Body>
    </Html>
  );
};

export default BookingCancellationEmail;

const main = { backgroundColor: "#f6f9fc", fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif' };
const container = { backgroundColor: "#ffffff", margin: "0 auto", padding: "40px 20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" };
const logo = { margin: "0 auto 20px auto", display: "block" };
const h1 = { color: "#e53e3e", fontSize: "24px", fontWeight: "bold", textAlign: "center" as const, margin: "30px 0" };
const text = { color: "#555", fontSize: "16px", lineHeight: "26px", textAlign: "center" as const };
const section = { padding: "20px", backgroundColor: "#fff5f5", borderRadius: "8px", margin: "20px 0" };
const detailText = { color: "#444", fontSize: "15px", margin: "10px 0" };
const hr = { borderColor: "#e6ebf1", margin: "20px 0" };
const footer = { color: "#8898aa", fontSize: "12px", textAlign: "center" as const };
const contactSection = { textAlign: "center" as const, margin: "8px 0 0 0" };
const contactLine = { color: "#6b7280", fontSize: "13px", margin: "4px 0", textAlign: "center" as const };
