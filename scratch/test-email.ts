import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  console.log("Using API Key:", process.env.RESEND_API_KEY?.substring(0, 7) + "...");
  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'boris90guardado@gmail.com',
      subject: 'Prueba de Conexión ZyncSlot',
      html: '<strong>Si recibes esto, la integración de Resend está funcionando correctamente.</strong>'
    });

    console.log("Resend Response:", data);
  } catch (error) {
    console.error("Resend Error:", error);
  }
}

testEmail();
