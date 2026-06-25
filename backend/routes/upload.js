import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/auth.js";
import { cloudinary } from "../config/cloudinary.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB público
});

// POST /api/upload (auth required)
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

// POST /api/upload-public — sin auth, solo imágenes hasta 5MB
const uploadPublic = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/upload-public", uploadPublic.single("archivo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se envió ningún archivo" });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.v2.uploader.upload_stream(
        {
          resource_type: "image",
          folder: "made-in-chaco/solicitudes",
          public_id: `pub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      stream.end(req.file.buffer);
    });

    const oldPublicId = req.body.old_public_id;
    if (oldPublicId) {
      try {
        await cloudinary.v2.uploader.destroy(oldPublicId, { invalidate: true });
      } catch (err) {
        console.warn("No se pudo borrar imagen anterior:", err.message);
      }
    }

    res.status(201).json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    console.error("Public upload error:", err);
    res.status(500).json({ error: "Error al subir archivo" });
  }
});

router.post("/delete-public-image", async (req, res) => {
  try {
    const { public_id } = req.body;
    if (!public_id) return res.status(400).json({ error: "public_id requerido" });
    await cloudinary.v2.uploader.destroy(public_id, { invalidate: true });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete public image error:", err);
    res.status(500).json({ error: "Error al borrar imagen" });
  }
});

export default router;
