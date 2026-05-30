# Made in Chaco — Backend

API REST para el proyecto Made in Chaco.

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Setup

```bash
# 1. Copiar y configurar variables de entorno
cp .env.example .env
# Editar DATABASE_URL con la URI de tu Supabase

# 2. Ejecutar schema en el SQL Editor de Supabase
# Pegar db/schema.sql y ejecutar

# 3. Instalar dependencias
npm install

# 4. Sembrar datos iniciales (admin)
npm run seed

# 5. Iniciar servidor
npm run dev
```

Servidor en `http://localhost:3001`.

## Admin por defecto

- Usuario: `admin`
- Contraseña: `admin123`
