import { useRef, useEffect } from "react";

export const LogoParticles = ({ src, className }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const mouse = { x: -9999, y: -9999 };
    let particles = [];
    let animId;
    let loaded = false;
    let imgW = 0;
    let imgH = 0;

    const img = new Image();
    img.src = src;

    img.onerror = () => {
      console.warn("LogoParticles: error loading", src);
    };

    img.onload = () => {
      const dpr = window.devicePixelRatio || 1;
      imgW = img.naturalWidth;
      imgH = img.naturalHeight;

      canvas.width = imgW * dpr;
      canvas.height = imgH * dpr;
      canvas.style.aspectRatio = `${imgW} / ${imgH}`;
      ctx.scale(dpr, dpr);

      // Sample pixels
      const tempC = document.createElement("canvas");
      tempC.width = imgW;
      tempC.height = imgH;
      const tCtx = tempC.getContext("2d");
      tCtx.drawImage(img, 0, 0);
      const imageData = tCtx.getImageData(0, 0, imgW, imgH);
      const data = imageData.data;

      const gap = Math.max(3, Math.floor(Math.max(imgW, imgH) / 80));

      for (let y = 0; y < imgH; y += gap) {
        for (let x = 0; x < imgW; x += gap) {
          const i = (y * imgW + x) * 4;
          if (data[i + 3] > 128) {
            particles.push({
              ox: x, oy: y,
              x, y,
              z: Math.random() * 60 - 30,
              vx: 0, vy: 0,
              size: 3 + Math.random() * 3,
              r: data[i], g: data[i + 1], b: data[i + 2],
              alpha: 0.85 + Math.random() * 0.15,
              phase: Math.random() * Math.PI * 2,
            });
          }
        }
      }

      loaded = true;
    };

    const onMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = imgW / rect.width;
      const sy = imgH / rect.height;
      mouse.x = (e.clientX - rect.left) * sx;
      mouse.y = (e.clientY - rect.top) * sy;
    };

    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    window.addEventListener("mousemove", onMouse);
    canvas.addEventListener("mouseleave", onLeave);

    const animate = (time) => {
      const t = time / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (loaded && particles.length) {
        ctx.globalAlpha = 0.15;
        ctx.drawImage(img, 0, 0, imgW, imgH);
        ctx.globalAlpha = 1;
        ctx.shadowColor = "rgba(255,255,255,0.25)";
        ctx.shadowBlur = 8;

        for (const p of particles) {
          const tx = p.ox + Math.cos(t * 0.6 + p.phase) * 0.8;
          const ty = p.oy + Math.sin(t + p.phase) * 2;

          const springX = (tx - p.x) * 0.06;
          const springY = (ty - p.y) * 0.06;

          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let repelX = 0, repelY = 0;
          if (dist < 120 && dist > 0) {
            const force = ((120 - dist) / 120) * 1.5;
            repelX = (dx / dist) * force;
            repelY = (dy / dist) * force;
          }

          p.vx += springX + repelX;
          p.vy += springY + repelY;
          p.vx *= 0.82;
          p.vy *= 0.82;
          p.x += p.vx;
          p.y += p.vy;
        }

        particles.sort((a, b) => a.z - b.z);

        for (const p of particles) {
          const zNorm = (p.z + 30) / 60;
          const s = 0.8 + zNorm * 1.2;
          const a = (0.5 + zNorm * 0.5) * p.alpha;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * s, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${a})`;
          ctx.fill();
        }

        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouse);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [src]);

  return <canvas ref={canvasRef} className={className} />;
};
