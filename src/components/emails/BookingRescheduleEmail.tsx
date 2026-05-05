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
}

export const BookingRescheduleEmail = ({
  customerName,
  serviceName,
  oldDate,
  oldTime,
  newDate,
  newTime,
  branchName,
  staffName,
  tenantName,
  tenantLogo,
}: BookingRescheduleEmailProps) => (
  <Html>
    <Head />
    <Preview>Tu cita en {tenantName} ha sido reagendada</Preview>
    <Body style={main}>
      <Container style={container}>
        {tenantLogo && (
          <Img src={tenantLogo} width="150" alt={tenantName} style={logo} />
        )}
        <Heading style={h1}>Cita reagendada</Heading>
        <Text style={text}>
          Hola {customerName}, tu cita en <strong>{tenantName}</strong> ha sido modificada. Aquí están los nuevos detalles:
        </Text>

        <Section style={newSection}>
          <Text style={labelText}>NUEVA FECHA Y HORA</Text>
          <Text style={detailText}><strong>Servicio:</strong> {serviceName}</Text>
          <Text style={detailText}><strong>Fecha:</strong> {newDate}</Text>
          <Text style={detailText}><strong>Hora:</strong> {newTime}</Text>
          <Text style={detailText}><strong>Sucursal:</strong> {branchName}</Text>
          {staffName && (
            <Text style={detailText}><strong>Especialista:</strong> {staffName}</Text>
          )}
        </Section>

        <Section style={oldSection}>
          <Text style={oldLabelText}>FECHA ANTERIOR</Text>
          <Text style={oldDetailText}>{oldDate} a las {oldTime}</Text>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Si tienes alguna pregunta sobre este cambio, por favor contáctanos. ¡Te esperamos en {tenantName}!
        </Text>
      </Container>
    </Body>
  </Html>
);

export default BookingRescheduleEmail;

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

const newSection = {
  padding: "20px",
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  margin: "20px 0",
  borderLeft: "4px solid #22c55e",
};

const oldSection = {
  padding: "12px 20px",
  backgroundColor: "#f9f9f9",
  borderRadius: "8px",
  margin: "10px 0",
};

const labelText = {
  color: "#22c55e",
  fontSize: "11px",
  fontWeight: "bold" as const,
  letterSpacing: "0.1em",
  margin: "0 0 8px 0",
};

const oldLabelText = {
  color: "#9ca3af",
  fontSize: "11px",
  fontWeight: "bold" as const,
  letterSpacing: "0.1em",
  margin: "0 0 4px 0",
};

const detailText = { color: "#444", fontSize: "15px", margin: "8px 0" };
const oldDetailText = { color: "#9ca3af", fontSize: "13px", margin: "0", textDecoration: "line-through" };
const hr = { borderColor: "#e6ebf1", margin: "20px 0" };
const footer = { color: "#8898aa", fontSize: "12px", textAlign: "center" as const };
