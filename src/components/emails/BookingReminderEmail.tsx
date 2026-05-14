import { Body, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text } from "@react-email/components";
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
  locale?: EmailLocale;
}

export const BookingReminderEmail = ({
  customerName, serviceName, date, time, branchName, staffName, tenantName, tenantLogo, phone, contactEmail, locale = 'es',
}: BookingReminderEmailProps) => {
  const hasContact = !!(phone || contactEmail);
  return (
    <Html>
      <Head />
      <Preview>{t.reminderPreview(tenantName, locale)}</Preview>
      <Body style={main}>
        <Container style={container}>
          {tenantLogo && <Img src={tenantLogo} width="150" alt={tenantName} style={logo} />}
          <Heading style={h1}>{t.reminderHeading(locale)}</Heading>
          <Text style={text}>
            {t.reminderBody(customerName, tenantName, locale)}<strong>{tenantName}</strong>.
          </Text>
          <Section style={section}>
            <Text style={detailText}><strong>{t.service(locale)}</strong> {serviceName}</Text>
            <Text style={detailText}><strong>{t.date(locale)}</strong> {date}</Text>
            <Text style={detailText}><strong>{t.time(locale)}</strong> {time}</Text>
            <Text style={detailText}><strong>{t.branch(locale)}</strong> {branchName}</Text>
            {staffName && <Text style={detailText}><strong>{t.specialist(locale)}</strong> {staffName}</Text>}
          </Section>
          <Hr style={hr} />
          <Text style={footer}>{t.reminderFooter(tenantName, locale)}</Text>
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

export default BookingReminderEmail;

const main = { backgroundColor: "#f6f9fc", fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif' };
const container = { backgroundColor: "#ffffff", margin: "0 auto", padding: "40px 20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" };
const logo = { margin: "0 auto 20px auto", display: "block" };
const h1 = { color: "#6b46c1", fontSize: "24px", fontWeight: "bold", textAlign: "center" as const, margin: "30px 0" };
const text = { color: "#555", fontSize: "16px", lineHeight: "26px", textAlign: "center" as const };
const section = { padding: "20px", backgroundColor: "#faf5ff", borderRadius: "8px", margin: "20px 0", borderLeft: "4px solid #6b46c1" };
const detailText = { color: "#444", fontSize: "15px", margin: "10px 0" };
const hr = { borderColor: "#e6ebf1", margin: "20px 0" };
const footer = { color: "#8898aa", fontSize: "12px", textAlign: "center" as const };
const contactSection = { textAlign: "center" as const, margin: "8px 0 0 0" };
const contactLine = { color: "#6b7280", fontSize: "13px", margin: "4px 0", textAlign: "center" as const };
