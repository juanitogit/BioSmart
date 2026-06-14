import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Intentar cargar desde el directorio server o desde la raíz
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

console.log("DB URL Check:", process.env.DATABASE_URL ? "Configurada" : "VACÍA");

import app from "./app.js";

const PORT = process.env.PORT ?? 3000;

app.listen(Number(PORT), () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📡 API disponible en http://localhost:${PORT}/api`);
});
