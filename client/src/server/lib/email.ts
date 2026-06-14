import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_PORT === "465",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"AgroSmart" <noreply@agrosmart.eco>',
      to,
      subject,
      html,
    });
    console.log("Email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

export const emailTemplates = {
  subscriptionSuccess: (name: string, planName: string) => `
    <h1>¡Bienvenido a ${planName}, ${name}!</h1>
    <p>Gracias por unirte a nuestra misión de transformar la agricultura urbana.</p>
    <p>Ya puedes acceder a todas las funciones de tu plan.</p>
    <br/>
    <p>Saludos,<br/>El equipo de AgroSmart</p>
  `,
  aiSuggestion: (name: string, suggestion: string) => `
    <h1>Tu Sugerencia AgroSmart del día</h1>
    <p>Hola ${name}, nuestra IA ha analizado tu actividad y tiene esta recomendación para ti:</p>
    <div style="background: #f4f4f4; padding: 20px; border-left: 4px solid #4CAF50;">
      <i>${suggestion}</i>
    </div>
    <br/>
    <p>¡Sigue cultivando el futuro!</p>
  `,
};
