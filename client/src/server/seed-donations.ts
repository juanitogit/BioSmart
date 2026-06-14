import { db } from "./db/index.js";
import { donations, users } from "./db/schema.js";

const demoDonations = [
  {
      name: "Mateo Vargas",
      email: "mateo_vargas@biosmart.com",
      amount: "250",
      city: "Bogotá",
      country: "Colombia",
      lat: "4.7110",
      lng: "-74.0721",
      message: "¡Feliz de apoyar esta causa!",
      color: "#ffdd59",
      emoji: "🇨🇴"
  },
  {
      name: "Valentina Castro",
      email: "valentina_castro@biosmart.com",
      amount: "500",
      city: "Madrid",
      country: "España",
      lat: "40.4168",
      lng: "-3.7038",
      message: "Juntos hacemos la diferencia.",
      color: "#ffb8b8",
      emoji: "🇪🇸"
  },
  {
      name: "Santiago Herrera",
      email: "santiago_h@biosmart.com",
      amount: "180",
      city: "Santiago",
      country: "Chile",
      lat: "-33.4489",
      lng: "-70.6693",
      message: "Por un futuro más verde para todos.",
      color: "#eb4d4b",
      emoji: "🇨🇱"
  },
  {
      name: "Isabella Torres",
      email: "isabella_t@biosmart.com",
      amount: "350",
      city: "Buenos Aires",
      country: "Argentina",
      lat: "-34.6037",
      lng: "-58.3816",
      message: "¡El mundo necesita más iniciativas así! ❤️",
      color: "#c7ecee",
      emoji: "🇦🇷"
  },
  {
      name: "Camila Rojas",
      email: "camila_rojas@biosmart.com",
      amount: "150",
      city: "Lima",
      country: "Perú",
      lat: "-12.0464",
      lng: "-77.0428",
      message: "Construyendo juntos un mañana más ecológico.",
      color: "#ff9f43",
      emoji: "🇵🇪"
  },
  {
      name: "Diego Mendoza",
      email: "diego_m@biosmart.com",
      amount: "420",
      city: "Monterrey",
      country: "México",
      lat: "25.6866",
      lng: "-100.3161",
      message: "Un pequeño aporte para un gran impacto.",
      color: "#ff6b6b",
      emoji: "🇲🇽"
  }
];

async function seed() {
  console.log("Seeding demo donations...");
  try {
    // 1. Delete existing donations
    await db.delete(donations);
    console.log("Cleared existing donations.");

    // 2. Insert demo donations with matching individual users
    for (const d of demoDonations) {
        // Find or create user
        let user = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, d.email)
        });

        if (!user) {
            const [newUser] = await db.insert(users).values({
                name: d.name,
                email: d.email,
                password: "hashedpassword123",
                role: "user"
            }).returning();
            user = newUser;
        }

        await db.insert(donations).values({
            userId: user.id,
            amount: d.amount,
            source: "direct",
            message: d.message,
            city: d.city,
            country: d.country,
            lat: d.lat,
            lng: d.lng,
            color: d.color,
            emoji: d.emoji,
            createdAt: new Date()
        });
    }

    console.log("Successfully seeded", demoDonations.length, "demo donations.");
    process.exit(0);
  } catch (e) {
    console.error("Failed to seed donations:", e);
    process.exit(1);
  }
}

seed();
