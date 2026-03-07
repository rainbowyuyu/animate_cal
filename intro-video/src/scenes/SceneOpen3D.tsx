import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";

/** 相机环轨：由 useCurrentFrame 驱动，每帧更新 position + lookAt */
const CameraOrbit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { camera } = useThree();
  const t = frame / fps;
  const r = 6;
  const x = Math.sin(t * 0.5) * r;
  const z = Math.cos(t * 0.5) * r;
  camera.position.set(x, 2.5, z);
  camera.lookAt(0, 0, 0);
  return null;
};

/** 3D 开场：球体 + 双环，品牌色 */
const SceneContent: React.FC = () => {
  const frame = useCurrentFrame();

  const ringRotationY = frame * 0.015;
  const sphereScale = 0.85 + Math.sin(frame * 0.05) * 0.08;

  return (
    <>
      <CameraOrbit />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 8, 5]} intensity={0.9} />
      <pointLight position={[-4, 4, -4]} intensity={0.4} color="#8b5cf6" />
      <pointLight position={[4, -2, 4]} intensity={0.3} color="#3b82f6" />

      <group position={[0, 0, 0]}>
        <mesh scale={sphereScale}>
          <sphereGeometry args={[1.2, 64, 64]} />
          <meshStandardMaterial
            color="#1e293b"
            metalness={0.4}
            roughness={0.5}
            emissive="#3b82f6"
            emissiveIntensity={0.15}
          />
        </mesh>
        <mesh rotation={[0, ringRotationY, 0]}>
          <torusGeometry args={[1.8, 0.06, 24, 80]} />
          <meshStandardMaterial
            color="#a5b4fc"
            metalness={0.6}
            roughness={0.3}
            emissive="#6366f1"
            emissiveIntensity={0.2}
          />
        </mesh>
        <mesh rotation={[0, ringRotationY * 0.7, Math.PI / 2]}>
          <torusGeometry args={[1.5, 0.04, 16, 60]} />
          <meshStandardMaterial color="#8b5cf6" metalness={0.5} roughness={0.4} emissiveIntensity={0.1} />
        </mesh>
      </group>
    </>
  );
};

export const SceneOpen3D: React.FC = () => {
  const { width, height } = useVideoConfig();

  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{ position: [0, 2.5, 6], fov: 45 }}
      style={{ backgroundColor: "#0f172a" }}
    >
      <SceneContent />
    </ThreeCanvas>
  );
};
