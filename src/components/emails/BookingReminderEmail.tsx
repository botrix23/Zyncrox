import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface BookingReminderEmailProps {
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  branchName: string;
  staffName?: string;
  tenantName: string;
  tenantLogo?: string;
}

export const BookingReminderEmail = ({
  customerName,
  serviceName,
  date,
  time,
  branchName,
  staffName,
  tenantName,
  tenantLogo,
}: BookingReminderEmailProps) => (
  <Html>
    <Head />
    <Preview>Recordatorio: tu cita en {tenantName} es mañana</Preview>
    <Body style={main}>
      <Container style={container}>
        {tenantLogo && (
          <Img src={tenantLogo} width="150" alt={tenantName} style={logo} />
        )}
        <Heading style={h1}>¡Tu cita es mañana! 🗓️</Heading>
        <Text style={text}>
          Hola {customerName}, este es un recordatorio de tu próxima cita en <strong>{tenantName}</strong>.
        </Text>
        <Section style={section}>
          <Text style={detailText}>
            <strong>Servicio:</strong> {serviceName}
          </Text>
          <Text style={detailText}>
            <strong>Fecha:</strong> {date}
          </Text>
          <Text style={detailText}>
            <strong>Hora:</strong> {time}
          </Text>
          <Text style={detailText}>
            <strong>Sucursal:</strong> {branchName}
          </Text>
          {staffName && (
            <Text style={detailText}>
              <strong>Especialista:</strong> {staffName}
            </Text>
          )}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          Si necesitas cancelar o reagendar, por favor contáctanos con anticipación. ¡Te esperamos en {tenantName}!
        </Text>
      </Container>
    </Body>
  </Html>
);

export default BookingReminderEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
};

const logo = { margin: "0 auto 20px auto", display: "block" };

const h1 = {
  color: "#6b46c1",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "30px 0",
};

const text = {
  color: "#555",
  fontSize: "16px",
  lineHeight: "26px",
  textAlign: "center" as const,
};

const section = {
  padding: "20px",
  backgroundColor: "#faf5ff",
  borderRadius: "8px",
  margin: "20px 0",
  borderLeft: "4px solid #6b46c1",
};

const detailText = { color: "#444", fontSize: "15px", margin: "10px 0" };
const hr = { borderColor: "#e6ebf1", margin: "20px 0" };
const footer = { color: "#8898aa", fontSize: "12px", textAlign: "center" as const };
