# Made in Chaco

Plataforma que celebra la herencia cultural, los emprendedores, la gastronomía, el turismo y las tradiciones de la provincia del Chaco, Argentina.

Directorio de entidades con mapa interactivo (Mapbox), sistema de gamificación (sellos, logros, ranking), wikia chaqueña y panel de administración.

## Tech Stack

**Frontend:** React 19, Vite, Mapbox GL, Zustand, React Router v7, PWA
**Backend:** Express, PostgreSQL (pg), Socket.IO, Cloudinary, Nodemailer
**Deploy:** Railway (Nixpacks)

## Requisitos

- Node.js >= 18
- PostgreSQL
- Cuenta de [Mapbox](https://www.mapbox.com/) (token público)
- Cuenta de [Cloudinary](https://cloudinary.com/) (imágenes)
- Servidor SMTP (Gmail u otro para emails transaccionales)

## Setup

```bash
# 1. Clonar
git clone https://github.com/tu-usuario/made-in-chaco.git
cd made-in-chaco

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 3. Instalar dependencias (frontend + backend)
npm install

# 4. Marcar migraciones existentes
npm run db:migrate:init

# 5. Correr en desarrollo
npm run dev          # Frontend en http://localhost:5173
cd backend && npm run dev  # API en http://localhost:3001
```

## Scripts

| Comando                     | Descripción                                        |
| --------------------------- | -------------------------------------------------- |
| `npm run dev`               | Frontend (Vite, hot reload)                        |
| `npm run build`             | Build de producción                                |
| `npm test`                  | Tests (Vitest)                                     |
| `npm run test:watch`        | Tests en watch mode                                |
| `npm run lint`              | ESLint                                             |
| `npm start`                 | Backend en producción (sirve el frontend buildado) |
| `npm run db:migrate`        | Aplicar migraciones pendientes                     |
| `npm run db:migrate:status` | Ver estado de migraciones                          |
| `npm run db:migrate:init`   | Marcar migraciones existentes como aplicadas       |

## Estructura

```
made-in-chaco/
├── src/                          # Frontend React
│   ├── pages/                    # Páginas (Home, Mapa, Login, Admin, etc.)
│   ├── components/               # Componentes compartidos
│   │   └── map/                  # Componentes del mapa interactivo
│   ├── hooks/                    # Custom hooks (mapa, socket, animaciones)
│   ├── store/                    # Estado global (Zustand)
│   ├── context/                  # Contexts (auth, notificaciones)
│   ├── services/                 # Servicios (socket)
│   ├── utils/                    # Utilidades (tracking, imágenes, mapas)
│   ├── helpers/                  # Helpers de fetch
│   ├── admin/                    # Panel de administración
│   ├── styles/                   # Estilos CSS
│   ├── data/                     # Datos GeoJSON (límites, puntos)
│   └── test/                     # Setup de tests
├── backend/                      # API Express
│   ├── routes/                   # Rutas REST
│   ├── services/                 # Servicios (mailer, gamificación, socket)
│   ├── middleware/               # Auth JWT, validación
│   ├── config/                   # DB, Cloudinary, logger, env
│   ├── cron/                     # Jobs programados
│   └── db/                       # Migraciones SQL y seeds
│       ├── migrations/           # Migraciones numeradas (001-024)
│       └── seed.js               # Seed de admin y palabras
├── public/                       # Assets estáticos (audios, imágenes, offline)
└── vite.config.js                # Config Vite + PWA + Vitest
```

## Variables de entorno

Copiá `.env.example` a `.env` y completá:

| Variable                | Descripción                                          | Default                                               |
| ----------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| `VITE_MAPBOX_TOKEN`     | Token público de Mapbox                              | —                                                     |
| `VITE_SITE_LIVE`        | Mostrar sitio (`true`) o "en construcción" (`false`) | `false`                                               |
| `DATABASE_URL`          | URL de conexión PostgreSQL                           | `postgresql://facundogg@localhost:5432/made_in_chaco` |
| `JWT_SECRET`            | Secreto para firmar tokens JWT                       | —                                                     |
| `PORT`                  | Puerto del backend                                   | `3001`                                                |
| `NODE_ENV`              | `development` o `production`                         | `development`                                         |
| `SITE_URL`              | URL del frontend                                     | `http://localhost:5173`                               |
| `CLOUDINARY_CLOUD_NAME` | Nombre del cloud de Cloudinary                       | —                                                     |
| `CLOUDINARY_API_KEY`    | API key de Cloudinary                                | —                                                     |
| `CLOUDINARY_API_SECRET` | API secret de Cloudinary                             | —                                                     |
| `MAIL_HOST`             | Host SMTP                                            | `smtp.gmail.com`                                      |
| `MAIL_PORT`             | Puerto SMTP                                          | `587`                                                 |
| `MAIL_USER`             | Usuario SMTP                                         | —                                                     |
| `MAIL_PASS`             | Contraseña SMTP (app password)                       | —                                                     |
| `MAIL_FROM`             | Email remitente                                      | `noreply@madeinchaco.com`                             |
| `CORS_ORIGIN`           | Orígenes permitidos (separar con coma)               | —                                                     |
| `LOG_LEVEL`             | Nivel de log (0=debug, 1=info, 2=warn, 3=error)      | `1`                                                   |

## Deploy

Railway detecta `railway.json` automáticamente:

1. **Build:** `npm install` + `npm run build`
2. **Start:** `npm start` (Express sirve el frontend buildado + API)
3. **Health check:** `GET /api/health`

Las migraciones se aplican manualmente o se pueden automatizar con un hook post-deploy.
