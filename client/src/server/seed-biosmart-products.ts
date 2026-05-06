import dotenv from "dotenv";
dotenv.config(); // Load env vars for cloudinary to work

import { db } from "./db/index.js";
import { users, products } from "./db/schema.js";
import { eq } from "drizzle-orm";
import { cloudinary } from "./lib/cloudinary.js";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

// Descripciones más variadas e inventivas según el nombre aproximado
function generateDescription(name: string, category: string): string {
    const desc = [
        `Impulsa tu huerta y jardín con este increíble producto de la línea ${category}. Diseñado para brindar los mejores resultados en tu cultivo.`,
        `Alta eficiencia garantizada. Perfecto para proyectos ecológicos e inteligentes de BioSmart.`,
        `Solución práctica y sostenible para mejorar el rendimiento de tus plantas.`,
        `Producto premium recomendado para agricultores urbanos y entusiastas de la tecnología verde.`,
        `Protege y nutre tus espacios naturales con la mejor calidad del mercado.`
    ];
    return `${desc[Math.floor(Math.random() * desc.length)]} Recomendado 100%.`;
}

async function seedProducts() {
    if (!db) {
        throw new Error("DB not configured");
    }

    // 1. Find or create user "Nova Dick"
    let seller = await db.query.users.findFirst({
        where: eq(users.email, "nova.dick.seller@biosmart.com")
    });

    if (!seller) {
        const hashedPassword = await bcrypt.hash("nova1234", 10);
        const [newUser] = await db.insert(users).values({
            name: "Nova Dick",
            email: "nova.dick.seller@biosmart.com",
            password: hashedPassword,
            role: "seller",
        }).returning();
        seller = newUser;
        console.log("✓ Vendedor 'Nova Dick' creado exitosamente.");
    } else {
        console.log("✓ Vendedor 'Nova Dick' encontrado en la base de datos.");
    }

    const { id: sellerId } = seller;

    // 2. Iterate over BioSmart folder recursively
    // Path relativo desde donde se ejecute, mejor absoluto con __dirname o process.cwd()
    const baseDir = path.resolve(process.cwd(), "client/public/images/BioSmart");
    
    if (!fs.existsSync(baseDir)) {
        throw new Error(`Directorio no encontrado: ${baseDir}`);
    }

    console.log(`\nEscaneando directorio: ${baseDir}\n`);

    async function processDirectory(dir: string, currentCategory: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                // Determine new category logic
                let nextCategory = currentCategory;
                // Si el directorio actual es la raíz de BioSmart, usamos el nombre de la carpeta hija como gran techo
                if (currentCategory === "General") {
                    nextCategory = entry.name;
                } else if (
                    currentCategory === "Productos Agrícolas" || 
                    currentCategory === "Productos IoT y Tecnología (Huerta Inteligente)" || 
                    currentCategory === "Ventas y Estructuras"
                ) {
                    // Usar la subcarpeta como categoría final más específica
                    nextCategory = entry.name;
                }
                
                await processDirectory(fullPath, nextCategory);
                
            } else if (entry.isFile() && /\.(png|jpg|jpeg|webp)$/i.test(entry.name)) {
                console.log(`Procesando imagen: ${entry.name}`);
                try {
                    // Subir a Cloudinary
                    console.log(`  -> Subiendo a Cloudinary...`);
                    const result = await cloudinary.uploader.upload(fullPath, {
                        folder: 'biosmart-products',
                    });
                    
                    const name = path.parse(entry.name).name;
                    
                    // Precio aleatorio de 1 a 5 dólares
                    const price = (Math.random() * 4 + 1).toFixed(2);
                    
                    const description = generateDescription(name, currentCategory);
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 10000);

                    // Insertar en la BD
                    await db.insert(products).values({
                        sellerId, // Nova Dick
                        name,
                        slug,
                        description,
                        price,
                        category: currentCategory,
                        image: result.secure_url,
                        stock: Math.floor(Math.random() * 50) + 10, // Stock aleatorio
                    });

                    console.log(`  ✓ Producto insertado: ${name} ($${price}) [Categoría: ${currentCategory}]`);
                } catch (err) {
                    console.error(`  X Error al procesar ${entry.name}:`, err);
                }
            }
        }
    }

    try {
        await processDirectory(baseDir, "General");
        console.log("\nProceso de siembra finalizado con éxito.");
        process.exit(0);
    } catch (e) {
        console.error("Fallo durante el processDirectory:", e);
        process.exit(1);
    }
}

seedProducts().catch(err => {
    console.error("Error global en el seed:", err);
    process.exit(1);
});
