# Backend: Cloudinary Upload Endpoint

## Endpoint

**`POST /api/upload`**

### Headers
- `Authorization: Bearer <jwt_token>` (opcional, recomendado)

### Body (multipart/form-data)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `archivo` | File | El archivo a subir |
| `tipo_recurso` | String | `"foto"`, `"video"`, o `"audio"` |

### Response (201)
```json
{
  "url": "https://res.cloudinary.com/tu-cloud/image/upload/v1234/...",
  "public_id": "made-in-chaco/abc123"
}
```

### Response error (400/500)
```json
{
  "error": "Descripción del error"
}
```

---

## Dependencias necesarias (package.json)

```bash
npm install multer cloudinary
```

## Variables de entorno (.env)

```env
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

---

## Ejemplo de implementación (Express)

```js
const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
});

router.post("/upload", upload.single("archivo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se envió ningún archivo" });
    }

    const tipoRecurso = req.body.tipo_recurso || "foto";

    // Mapeo de tipo a recurso de Cloudinary
    const resourceMap = { foto: "image", video: "video", audio: "video" };
    const resourceType = resourceMap[tipoRecurso] || "image";

    // Subir a Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: "made-in-chaco",
          public_id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          eager: [
            { transformation: [
              { width: 1920, crop: "limit", quality: "auto" }
            ]}
          ],
          eager_async: true,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    res.status(201).json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    res.status(500).json({ error: "Error al subir archivo a Cloudinary" });
  }
});

module.exports = router;
```

---

## Validaciones del frontend (para referencia)

El frontend valida **antes** de enviar al backend:

| Tipo | Formatos | Resolución mínima |
|------|----------|-------------------|
| Foto | JPG, PNG, WebP | 1920×1080 |
| Video | MP4 (H.264), WebM (VP9) | 1920×1080 |
| Audio | MP3, WAV, OGG | — |

No hay límites de peso ni duración desde el frontend. Si querés agregarlos, hacelo en el middleware de multer o en Cloudinary.
