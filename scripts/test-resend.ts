import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  console.log("🚀 Probando envío de correo con Resend...");
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'borisguardado@gmail.com', // Asumimos que este es el correo de la cuenta
      subject: 'Prueba Técnica de ZyncSlot',
      html: '<p>Si recibes esto, la API Key y el remitente son válidos.</p>'
    });

    if (error) {
      console.error("❌ Error de Resend:", error);
    } else {
      console.log("✅ Correo enviado con éxito! ID:", data?.id);
    }
  } catch (err) {
    console.error("💥 Error crítico:", err);
  }
}

testEmail();
