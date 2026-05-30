import { Router } from "express";
import multer from "multer";
import cloudinary from "cloudinary";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// POST /api/upload
const uploadFields = upload.fields([
  { name: "archivo", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

router.post("/upload", authMiddleware, uploadFields, async (req, res) => {
  try {
    const archivo = req.files?.archivo?.[0];
    if (!archivo) {
      return res.status(400).json({ error: "No se envió ningún archivo" });
    }

    const tipoRecurso = req.body.tipo_recurso || "foto";
    const resourceMap = { foto: "image", video: "video", audio: "video" };
    const resourceType = resourceMap[tipoRecurso] || "image";

    // Subir thumbnail si viene
    let thumbnailUrl = null;
    const thumbFile = req.files?.thumbnail?.[0];
    if (thumbFile) {
      try {
        const thumbResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.v2.uploader.upload_stream(
            { folder: "made-in-chaco/thumbnails" },
            (err, result) => (err ? reject(err) : resolve(result)),
          );
          stream.end(thumbFile.buffer);
        });
        thumbnailUrl = thumbResult.secure_url;
      } catch {}
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.v2.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: "made-in-chaco",
          public_id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      stream.end(archivo.buffer);
    });

    res.status(201).json({
      url: result.secure_url,
      public_id: result.public_id,
      thumbnail_url: thumbnailUrl,
    });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    res.status(500).json({ error: "Error al subir archivo a Cloudinary" });
  }
});

export default router;
