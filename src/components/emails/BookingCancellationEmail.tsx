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

interface BookingCancellationEmailProps {
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  branchName: string;
  tenantName: string;
  tenantLogo?: string;
}

export const BookingCancellationEmail = ({
  customerName,
  serviceName,
  date,
  time,
  branchName,
  tenantName,
  tenantLogo,
}: BookingCancellationEmailProps) => (
  <Html>
    <Head />
    <Preview>Tu cita en {tenantName} ha sido cancelada</Preview>
    <Body style={main}>
      <Container style={container}>
        {tenantLogo && (
          <Img src={tenantLogo} width="150" alt={tenantName} style={logo} />
        )}
        <Heading style={h1}>Cita cancelada</Heading>
        <Text style={text}>
          Hola {customerName}, te informamos que tu cita en <strong>{tenantName}</strong> ha sido cancelada.
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
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          Si tienes alguna pregunta, por favor contáctanos directamente. ¡Esperamos verte pronto en {tenantName}!
        </Text>
      </Container>
    </Body>
  </Html>
);

export default BookingCancellationEmail;

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
  color: "#e53e3e",
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
  backgroundColor: "#fff5f5",
  borderRadius: "8px",
  margin: "20px 0",
};

const detailText = { color: "#444", fontSize: "15px", margin: "10px 0" };
const hr = { borderColor: "#e6ebf1", margin: "20px 0" };
const footer = { color: "#8898aa", fontSize: "12px", textAlign: "center" as const };
