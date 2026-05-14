import { Body, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text } from "@react-email/components";
import * as React from "react";
import { t, type EmailLocale } from "@/lib/emailI18n";

interface BookingRescheduleEmailProps {
  customerName: string;
  serviceName: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  branchName: string;
  staffName?: string;
  tenantName: string;
  tenantLogo?: string;
  phone?: string | null;
  contactEmail?: string | null;
  locale?: EmailLocale;
}

export const BookingRescheduleEmail = ({
  customerName, serviceName, oldDate, oldTime, newDate, newTime, branchName, staffName, tenantName, tenantLogo, phone, contactEmail, locale = 'es',
}: BookingRescheduleEmailProps) => {
  const hasContact = !!(phone || contactEmail);
  return (
    <Html>
      <Head />
      <Preview>{t.reschedulePreview(tenantName, locale)}</Preview>
      <Body style={main}>
        <Container style={container}>
          {tenantLogo && <Img src={tenantLogo} width="150" alt={tenantName} style={logo} />}
          <Heading style={h1}>{t.rescheduleHeading(locale)}</Heading>
          <Text style={text}>{t.rescheduleBody(customerName, tenantName, locale)}</Text>

          <Section style={newSection}>
            <Text style={labelText}>{t.rescheduleNewLabel(locale)}</Text>
            <Text style={detailText}><strong>{t.service(locale)}</strong> {serviceName}</Text>
            <Text style={detailText}><strong>{t.date(locale)}</strong> {newDate}</Text>
            <Text style={detailText}><strong>{t.time(locale)}</strong> {newTime}</Text>
            <Text style={detailText}><strong>{t.branch(locale)}</strong> {branchName}</Text>
            {staffName && <Text style={detailText}><strong>{t.specialist(locale)}</strong> {staffName}</Text>}
          </Section>

          <Section style={oldSection}>
            <Text style={oldLabelText}>{t.rescheduleOldLabel(locale)}</Text>
            <Text style={oldDetailText}>{oldDate} {t.rescheduleOldAt(locale)} {oldTime}</Text>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>{t.rescheduleFooter(tenantName, locale)}</Text>
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

export default BookingRescheduleEmail;

const main = { backgroundColor: "#f6f9fc", fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif' };
const container = { backgroundColor: "#ffffff", margin: "0 auto", padding: "40px 20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" };
const logo = { margin: "0 auto 20px auto", display: "block" };
const h1 = { color: "#6b46c1", fontSize: "24px", fontWeight: "bold", textAlign: "center" as const, margin: "30px 0" };
const text = { color: "#555", fontSize: "16px", lineHeight: "26px", textAlign: "center" as const };
const newSection = { padding: "20px", backgroundColor: "#f0fdf4", borderRadius: "8px", margin: "20px 0", borderLeft: "4px solid #22c55e" };
const oldSection = { padding: "12px 20px", backgroundColor: "#f9f9f9", borderRadius: "8px", margin: "10px 0" };
const labelText = { color: "#22c55e", fontSize: "11px", fontWeight: "bold" as const, letterSpacing: "0.1em", margin: "0 0 8px 0" };
const oldLabelText = { color: "#9ca3af", fontSize: "11px", fontWeight: "bold" as const, letterSpacing: "0.1em", margin: "0 0 4px 0" };
const detailText = { color: "#444", fontSize: "15px", margin: "8px 0" };
const oldDetailText = { color: "#9ca3af", fontSize: "13px", margin: "0", textDecoration: "line-through" };
const hr = { borderColor: "#e6ebf1", margin: "20px 0" };
const footer = { color: "#8898aa", fontSize: "12px", textAlign: "center" as const };
const contactSection = { textAlign: "center" as const, margin: "8px 0 0 0" };
const contactLine = { color: "#6b7280", fontSize: "13px", margin: "4px 0", textAlign: "center" as const };
