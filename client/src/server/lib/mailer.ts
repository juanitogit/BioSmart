import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Generate a temporary Ethereal test account if no keys are provided
    const testAccount = await nodemailer.createTestAccount();
    console.log("⚠️ No se encontró configuración SMTP. Usando Ethereal (Mock Email).");
    console.log(`Mock Email: ${testAccount.user} / ${testAccount.pass}`);
    
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
  return transporter;
}

export const sendWelcomeEmail = async (to: string, name: string) => {
  try {
    const t = await getTransporter();
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #22c55e;">¡Bienvenido a BioSmart, ${name}! 🌱</h2>
        <p>Estamos muy felices de tenerte en nuestra plataforma integrada de agricultura inteligente y sostenibilidad.</p>
        <p>Desde tu panel, ahora podrás:</p>
        <ul>
          <li>Administrar tu cuenta y acceder a herramientas de IoT.</li>
          <li>Vender y comprar productos ecológicos en nuestro Marketplace.</li>
          <li>Participar en la red global de donaciones y visualizar el impacto.</li>
        </ul>
        <p>¡Explora el futuro de la agricultura urbana hoy mismo!</p>
        <br/>
        <p>El equipo de <strong>BioSmart.</strong></p>
      </div>
    `;

    const info = await t.sendMail({
      from: '"BioSmart Team" <no-reply@biosmart.com>', // sender address
      to, // list of receivers
      subject: "¡Bienvenido a BioSmart! 🌱", // Subject line
      html, // html body
    });

    console.log(`✅ Correo de bienvenida procesado para ${to}`);
    // If using Ethereal, this generates a direct URL to preview the email exactly as it was sent!
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📨 [VISTA PREVIA DEL CORREO]: ${previewUrl}`);
    }
  } catch (error) {
    console.error("❌ Error enviando correo de bienvenida:", error);
  }
};

export const sendNewsletterEmail = async (to: string) => {
  try {
    const t = await getTransporter();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #10b981;">Reporte de Impacto BioSmart 🌍</h2>
        <p>Hola, aquí tienes tu actualización exclusiva de nuevas tecnologías y productos destacados:</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #10b981;">
          <h3 style="margin-top: 0; color: #10b981;">💡 Sugerencia de la Inteligencia Artificial</h3>
          <p>"Optimizar la circulación de aire en microcultivos de interior previene la aparición de hongos tempranos. Recomendamos colocar extractores automatizados basados en el índice de humedad actual."</p>
        </div>

        <div style="margin-top: 20px;">
          <h3>🛒 En el Marketplace esta semana:</h3>
          <ul>
            <li><strong>Semillas Orgánicas Heirloom</strong> - Diversidad urbana para tu huerto.</li>
            <li><strong>Invernaderos modulares v2.0</strong> - Estructuras 100% material reciclado.</li>
          </ul>
        </div>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 25px;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center;">Has recibido este mensaje porque activaste la opción "Mantente Actualizado" en tu panel de BioSmart.</p>
      </div>
    `;

    const info = await t.sendMail({
      from: '"BioSmart Updates" <newsletter@biosmart.com>',
      to,
      subject: "Noticias y Novedades de Agricultura Inteligente 🌍",
      html,
    });

    console.log(`✅ Newsletter procesada para ${to}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📨 [VISTA PREVIA DEL CORREO]: ${previewUrl}`);
    }
  } catch (error) {
    console.error("❌ Error enviando newsletter:", error);
  }
};
