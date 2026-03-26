import React from "react";
import { useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Theme } from "../Theme";

const W = 200;
const H = 120;

/** 3D Mercury 球体：随帧绕 Y 轴旋转 */
const MercurySphere: React.FC = () => {
  const frame = useCurrentFrame();
  const rotationY = (frame * 0.8 * Math.PI) / 180;
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 4, 4]} intensity={0.9} />
      <pointLight position={[-3, 2, 2]} intensity={0.3} color={Theme.brand.blue} />
      <pointLight position={[2, -1, 3]} intensity={0.2} color={Theme.brand.purple} />
      <mesh rotation={[0, rotationY, 0]}>
        <sphereGeometry args={[0.85, 32, 32]} />
        <meshStandardMaterial
          color="#6b7280"
          metalness={0.75}
          roughness={0.35}
          emissive="#4b5563"
          emissiveIntensity={0.08}
        />
      </mesh>
    </>
  );
};

/**
 * 周期表用 Mercury 3D 旋转球体（小画布）
 */
export const Mercury3D: React.FC = () => (
  <div style={{ width: W, height: H, borderRadius: 8, overflow: "hidden" }}>
    <ThreeCanvas
      width={W}
      height={H}
      camera={{ position: [0, 0, 2.2], fov: 50 }}
      style={{ background: "rgba(0,0,0,0.25)" }}
    >
      <MercurySphere />
    </ThreeCanvas>
  </div>
);
