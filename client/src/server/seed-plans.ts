import { db } from "./db/index.js";
import { plans, planTypeEnum } from "./db/schema.js";
import { eq } from "drizzle-orm";

async function seedPlans() {
  if (!db) return;
  console.log("Seeding plans...");
  const existingPlans = await db.select().from(plans);
  if (existingPlans.length === 0) {
    await db.insert(plans).values([
      { name: "Raíz Solidaria", slug: "raiz_solidaria", description: "Plan básico", priceMonthly: "5.00", priceAnnual: "50.00" },
      { name: "Desarrollo Rural", slug: "desarrollo_rural", description: "Plan intermedio", priceMonthly: "15.00", priceAnnual: "150.00" },
      { name: "Impacto Global", slug: "impacto_global", description: "Plan avanzado", priceMonthly: "30.00", priceAnnual: "300.00" }
    ]);
    console.log("Plans seeded!");
  } else {
    console.log("Plans already exist");
  }
}

seedPlans().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
