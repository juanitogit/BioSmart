import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  console.log("Seeding admin user...");
  try {
    const adminEmail = "admin@biosmart.com";
    const passwordRaw = "admin1234";

    const existingAdmin = await db.query.users.findFirst({
        where: eq(users.email, adminEmail)
    });
    
    if (existingAdmin) {
        console.log("El usuario admin ya existe. Actualizando contraseña para segurar acceso...");
        const hashedPassword = await bcrypt.hash(passwordRaw, 10);
        await db.update(users).set({
            password: hashedPassword,
            role: "admin"
        }).where(eq(users.email, adminEmail));
        
        console.log("Admin actualizado exitosamente.");
        console.log(`Email: ${adminEmail} | Password: ${passwordRaw} | Rol: admin`);
        process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(passwordRaw, 10);
    
    await db.insert(users).values({
        name: "Administrador Global",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
    });

    console.log("Admin creado exitosamente.");
    console.log(`Email: ${adminEmail} | Password: ${passwordRaw} | Rol: admin`);
    process.exit(0);
  } catch (e) {
    console.error("Failed to seed admin:", e);
    process.exit(1);
  }
}

seedAdmin();
