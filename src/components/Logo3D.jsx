import { useRef, useState, Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { DoubleSide, LinearMipmapLinearFilter } from "three";

function LogoMesh({ imgSrc, onLoad, mouse }) {
  const meshRef = useRef(null);
  const texture = useTexture(imgSrc);
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  const viewport = useThree((s) => s.viewport);
  const rotRef = useRef({ x: 0, y: 0 });
  const done = useRef(false);

  if (!done.current && texture.image) {
    done.current = true;
    onLoad(texture.image.width, texture.image.height);
  }

  const img = texture.image;
  const aspect = img ? img.height / img.width : 1;
  const baseScale = viewport.width * 0.55;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const t = clock.elapsedTime;
    const breathe = 1 + Math.sin(t * 0.5) * 0.05;
    const s = baseScale * breathe;

    rotRef.current.x += (mouse.current.y * 0.15 - rotRef.current.x) * 0.05;
    rotRef.current.y += (mouse.current.x * 0.25 - rotRef.current.y) * 0.05;

    meshRef.current.scale.set(s, s * aspect, 1);
    meshRef.current.position.y = viewport.height * 0.05 + Math.sin(t * 0.7) * 0.06;
    meshRef.current.rotation.x = rotRef.current.x - Math.sin(t * 0.4) * 0.01;
    meshRef.current.rotation.y = rotRef.current.y + Math.cos(t * 0.5) * 0.01;
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent side={DoubleSide} />
    </mesh>
  );
}

function Scene({ imgSrc, onLoad, mouse }) {
  return (
    <Suspense fallback={null}>
      <LogoMesh imgSrc={imgSrc} onLoad={onLoad} mouse={mouse} />
    </Suspense>
  );
}

export const Logo3D = ({ src }) => {
  const containerRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [size, setSize] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMouse = (e) => {
      const rect = el.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    window.addEventListener("mousemove", onMouse);
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5], fov: 40 }}
        gl={{ alpha: true, antialias: true }}
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        <Scene
          imgSrc={src}
          mouse={mouseRef}
          onLoad={(w, h) => setSize({ w, h })}
        />
      </Canvas>
    </div>
  );
};
