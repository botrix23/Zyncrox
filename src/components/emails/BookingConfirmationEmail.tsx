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
}

export const BookingConfirmationEmail = ({
  customerName,
  serviceName,
  date,
  time,
  branchName,
  staffName,
  tenantName,
  tenantLogo,
  customBody
}: BookingEmailProps) => {
  const getFormattedBody = () => {
    if (!customBody) return null;
    return customBody
      .replace(/{cliente}/g, customerName)
      .replace(/{servicio}/g, serviceName)
      .replace(/{fecha}/g, date)
      .replace(/{hora}/g, time)
      .replace(/{negocio}/g, tenantName)
      .replace(/{sucursal}/g, branchName);
  };

  const formattedBody = getFormattedBody();
  return (
    <Html>
      <Head />
      <Preview>Tu cita en {tenantName} ha sido confirmada</Preview>
      <Body style={main}>
        <Container style={container}>
          {tenantLogo && (
            <Img
              src={tenantLogo}
              width="150"
              alt={tenantName}
              style={logo}
            />
          )}
          <Heading style={h1}>
            {customBody ? 'Confirmación de tu reserva' : `¡Hola ${customerName}!`}
          </Heading>
          <Text style={text}>
            {formattedBody || `Tu cita en ${tenantName} ha sido confirmada satisfactoriamente. Aquí tienes los detalles:`}
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
            Gracias por confiar en {tenantName}. Si necesitas realizar algún cambio, por favor contáctanos.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default BookingConfirmationEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
};

const logo = {
  margin: "0 auto 20px auto",
  display: "block",
};

const h1 = {
  color: "#333",
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
  backgroundColor: "#f9f9f9",
  borderRadius: "8px",
  margin: "20px 0",
};

const detailText = {
  color: "#444",
  fontSize: "15px",
  margin: "10px 0",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  textAlign: "center" as const,
};
