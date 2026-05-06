# 🌿 BioSmart Platform

**BioSmart** (anteriormente AgroSmart) es una plataforma inteligente e integral para agricultura urbana, trazabilidad de donaciones e e-commerce de productos ecológicos. El sistema fusiona análisis ambientales, IoT y una sólida arquitectura moderna orientada a comunidades sustentables.

---

## 🚀 Capacidades Destacadas

### 🌎 Globo 3D & Mapeo de Donaciones 
* **Visualización Dinámica:** Un imponente globo terráqueo en 3D impulsado por *Three.js* visualiza en tiempo real las donaciones globales.
* **Transición 3D a 2D:** Navegación inmersiva donde el mapa global pasa a una vista satelital y topográfica regional con *Leaflet.js* de forma fluida y reaccionando según el nivel de zoom del usuario.

### 🔐 Autenticación Avanzada
* **SSO y JWT:** Login social automatizado mediante **Google OAuth 2.0**.
* **Gestión de Sesiones Seguras:** Combinación de `Passport.js` y firma de tokens JWT (`bcryptjs` para cifrado de los usuarios nativos).
* **Control de Múltiples Roles (RBAC):** Flujos y dashboards estrictamente separados para Usuarios, Vendedores (`seller`) y Administradores (`admin`). 

### 🛒 E-Commerce y Marketplace Integrado
* **Multivendedor:** Posibilidad de abrir tiendas y listar inventarios ("Ventas de productos").
* **Procesamiento de Compras:** Cálculo en tiempo real, catálogo público responsivo y administración interna de operaciones. 
* **Almacenamiento en la Nube (Cloudinary):** Todas las cargas pesadas de recursos gráficos (imágenes de los productos y avatares) se suben directamente y quedan alojadas en formato optimizado dentro de la infraestructura serverless de **Cloudinary**.

### 📊 Dashboard IoT & Análisis
* Paneles interactivos de información meteorológica ("Nuestras Tecnologías").
* Control simulado y sincronización virtual de sensores embebidos *(Arduino, Apps Blynk)* para granjas hidropónicas urbanas.

### 🧠 Motor de IA para Cultivos Verticales (`/vertical_crop_ai`)
* **Pipeline Cognitivo de 15 fases** implementado en Go puro: sanitización CUSUM, filtro Hampel, predicción multi-motor, fusión Bayesiana, detección de drift Page-Hinkley, y calibración de confianza.
* **Procesamiento Concurrente:** Goroutines + Channels para análisis simultáneo de múltiples racks sin bloquear el servidor.
* **Alta Disponibilidad:** Buffer de memoria con flush automático que permite operar sin base de datos temporal.
* **Auditoría IEEE:** Firmas HMAC-SHA256 en cada insight para integridad de datos.
* **Alertas en Tiempo Real:** Notificaciones SSE push cuando se detectan decisiones CRITICAL.

---

## 🛠️ Stack Tecnológico

El proyecto se despliega unificando tecnologías escalables:

### 🖥️ Frontend (Client)
* **React 18 + Vite:** Estructura web SPAs extremadamente veloz.
* **Tailwind CSS & Framer Motion:** Microinteracciones visuales premium, "Glassmorphism" adaptativo y "Dark Mode" fluido en todo el ecosistema web.
* **Recharts:** Diagramación predictiva de humedad y clima en los paneles de control. 

### ⚙️ Backend (Server)
* **Express.js (Node):** API RESTFUL para orquestar la recepción de datos.
* **Drizzle ORM:** Definición de esquemas typesafe de alta complejidad.
* **Neon DB (Serverless PostgreSQL):** Nuestra columna vertebral relacional. Funciona 100% en la nube y maneja toda la persistencia de usuarios, roles, suscripciones y geolocalizaciones de donantes. 

### 🧠 Motor de IA (Go)
* **Go 1.26:** Pipeline cognitivo compilado de alto rendimiento (~1ms por sensor).
* **pgx/v5:** Conexión directa a Neon DB para persistencia de insights.
* **HMAC-SHA256:** Firma de integridad por insight para auditoría.

---

## ⚙️ Estructura del Proyecto

El código está dividido en un monorepositorio con despliegue concurrente:
- `/client`: Aplicación SPA y estilos.
- `/server`: Rutas Express, esquemas de bases de datos de Neondb (`/db/schema.ts`) y utilidades.
- `/vertical_crop_ai`: Motor de IA en Go con pipeline cognitivo de 15 fases.
  - `/cmd/server`: Punto de entrada HTTP (puerto 8090).
  - `/internal/pipeline`: Fases 0–14 del pipeline cognitivo.
  - `/internal/math`: CUSUM, Hampel, Bayesian Weight Tracker.
  - `/internal/engines`: Motores de predicción (Taylor, Statistical, Baseline).
  - `/internal/persistence`: Capa de persistencia pgx/v5 + buffer de memoria.

## 🔑 Instalación en Entorno Local

1. Instalar las dependencias de todos los espacios de trabajo (frontend y backend):
   ```bash
   npm install
   ```

2. Instalar dependencias de Go:
   ```bash
   cd vertical_crop_ai && go mod tidy
   ```

3. Definir las variables de entorno en tus propios ficheros `.env`:
   - `DATABASE_URL` (De tu portal NeonDB)
   - `GOOGLE_CLIENT_ID=tu_google_client_id`
   - `GOOGLE_CLIENT_SECRET=tu_google_client_secret`
   - `CLOUDINARY_URL` / Api keys.
   - `JWT_SECRET`
   - `HMAC_SECRET` (Clave para firmas de integridad IEEE)
   - `VCA_SERVER_PORT=8090`

4. Sincronizar el esquema de la base de datos:
   ```bash
   npm run db:push
   ```

5. Ejecuta los 3 procesos y visualiza la web simultáneamente:
   ```bash
   npm run dev
   ```
   Esto inicia concurrentemente:
   - 🟦 **React** (Vite) en `http://localhost:5173`
   - 🟩 **Express** (Node) en `http://localhost:3000`
   - 🟪 **Go AI Engine** en `http://localhost:8090`

## 📡 API Endpoints del Motor de IA

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/health` | Health check del motor |
| `POST` | `/predict` | Predicción de un sensor individual |
| `POST` | `/analyze` | Análisis multi-rack con identidad de usuario |
| `GET` | `/demo` | Demo con datos sintéticos |
| `GET` | `/buffer` | Diagnóstico del buffer de memoria |

### Proxy Express (requiere autenticación):

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/crop-intel/analyze` | Proxy al motor Go con inyección de userId |
| `GET` | `/api/crop-intel/insights` | Historial de insights del usuario |
| `GET` | `/api/crop-intel/health` | Estado del motor Go |
| `GET` | `/api/crop-intel/stream` | SSE para alertas CRITICAL en tiempo real |
