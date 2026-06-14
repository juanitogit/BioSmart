import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { eq } from "drizzle-orm";

async function makeAdmin() {
  try {
    const res = await db.update(users).set({ role: "admin" }).where(eq(users.email, "nova.dick.team@gmail.com")).returning();
    console.log("Updated users:", res.length);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
makeAdmin();
