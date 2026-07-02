import { useRef, useState, Suspense, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { DoubleSide, LinearMipmapLinearFilter, Points, PointsMaterial, BufferGeometry, Float32BufferAttribute } from "three";

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

function Particles({ mouse }) {
  const meshRef = useRef(null);
  const count = 200;
  const viewport = useThree((s) => s.viewport);

  const [geometry] = useState(() => {
    const g = new BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const radius = 0.5 + Math.random() * 2.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * radius * 0.6 + 0.1;
      positions[i * 3 + 2] = Math.cos(phi) * radius * 0.3 - 0.5;
      sizes[i] = 0.005 + Math.random() * 0.015;
    }
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("size", new Float32BufferAttribute(sizes, 1));
    return g;
  });

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const baseX = positions[i3];
      const baseY = positions[i3 + 1];
      const baseZ = positions[i3 + 2];
      const offset = i * 0.1;
      positions[i3] = baseX + Math.sin(t * 0.3 + offset) * 0.02;
      positions[i3 + 1] = baseY + Math.cos(t * 0.4 + offset) * 0.02;
      positions[i3 + 2] = baseZ + Math.sin(t * 0.2 + offset * 2) * 0.015;
    }
    geometry.attributes.position.needsUpdate = true;

    const rx = mouse.current.y * 0.05;
    const ry = mouse.current.x * 0.08;
    meshRef.current.rotation.x += (rx - meshRef.current.rotation.x) * 0.02;
    meshRef.current.rotation.y += (ry - meshRef.current.rotation.y) * 0.02;
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial
        size={0.02}
        color="white"
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
        blending={2}
      />
    </points>
  );
}

function Scene({ imgSrc, onLoad, mouse }) {
  return (
    <Suspense fallback={null}>
      <Particles mouse={mouse} />
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
