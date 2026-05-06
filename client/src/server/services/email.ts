import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter;
  }

  console.warn("⚠️ Email no configurado. Los emails se registrarán en consola.");
  return null;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    console.log(`📧 [EMAIL MOCK] To: ${options.to} | Subject: ${options.subject}`);
    console.log(`📧 Body: ${options.html.substring(0, 200)}...`);
    return true;
  }

  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || "noreply@agrosmart.eco",
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

export function planPurchaseEmail(userName: string, planName: string, amount: string): EmailOptions {
  return {
    to: "",
    subject: `🎉 Suscripción a ${planName} - AgroSmart`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0f1a; color: #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #16a34a, #0ea5e9); padding: 40px 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; color: white;">🌱 ¡Bienvenido a ${planName}!</h1>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 16px; line-height: 1.6;">Hola <strong>${userName}</strong>,</p>
          <p style="font-size: 16px; line-height: 1.6;">Tu suscripción al plan <strong>${planName}</strong> ha sido activada exitosamente.</p>
          <div style="background: #111827; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #1f2937;">
            <p style="margin: 0; color: #9ca3af;">Monto: <strong style="color: #16a34a;">$${amount} USD</strong></p>
            <p style="margin: 8px 0 0; color: #9ca3af;">Donación solidaria (30%): <strong style="color: #0ea5e9;">$${(parseFloat(amount) * 0.3).toFixed(2)} USD</strong></p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">Gracias por ser parte de la revolución agrícola urbana. 🌿</p>
        </div>
      </div>
    `,
  };
}

export function aiSuggestionEmail(userName: string, suggestion: string): EmailOptions {
  return {
    to: "",
    subject: "🤖 Nueva sugerencia de IA - AgroSmart",
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0f1a; color: #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #7c3aed, #0ea5e9); padding: 40px 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; color: white;">🤖 Sugerencia Inteligente</h1>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 16px; line-height: 1.6;">Hola <strong>${userName}</strong>,</p>
          <div style="background: #111827; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #1f2937;">
            <p style="font-size: 16px; line-height: 1.8; color: #e5e7eb;">${suggestion}</p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">Esta sugerencia fue generada por nuestro sistema de IA basado en tus datos de actividad.</p>
        </div>
      </div>
    `,
  };
}
