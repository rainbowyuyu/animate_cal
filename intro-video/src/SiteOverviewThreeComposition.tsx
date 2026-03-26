import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CanvasProps, useFrame } from "@react-three/fiber";
import { Color } from "three";
import { theme } from "./theme";
import { SiteOverviewComposition, SITE_OVERVIEW_DURATION_IN_FRAMES } from "./SiteOverviewComposition";

type ThreeCanvasProps = React.ComponentProps<typeof ThreeCanvas> & CanvasProps;

const FloatingOrbs: React.FC = () => {
  const groupRef = React.useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.12;
    groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.08;
  });

  return (
    <group ref={groupRef}>
      <mesh position={[-2.2, 1.2, -3]}>
        <sphereGeometry args={[0.9, 48, 48]} />
        <meshStandardMaterial
          color={new Color("#4f46e5")}
          emissive={new Color("#4f46e5")}
          emissiveIntensity={0.8}
          roughness={0.25}
          metalness={0.4}
        />
      </mesh>
      <mesh position={[2.4, -0.4, -4]}>
        <sphereGeometry args={[1.2, 48, 48]} />
        <meshStandardMaterial
          color={new Color("#22d3ee")}
          emissive={new Color("#22d3ee")}
          emissiveIntensity={0.7}
          roughness={0.3}
          metalness={0.35}
        />
      </mesh>
      <mesh position={[0, -1.4, -2.5]}>
        <sphereGeometry args={[0.8, 48, 48]} />
        <meshStandardMaterial
          color={new Color("#22c55e")}
          emissive={new Color("#22c55e")}
          emissiveIntensity={0.6}
          roughness={0.35}
          metalness={0.3}
        />
      </mesh>
    </group>
  );
};

const ThreeBackground: React.FC<Partial<ThreeCanvasProps>> = (props) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas
      {...props}
      width={width}
      height={height}
      camera={{ position: [0, 0, 6], fov: 40 }}
      style={{ width: "100%", height: "100%", ...props.style }}
    >
      <color attach="background" args={[theme.bgBody]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 6, 4]} intensity={1.0} color={new Color("#bfdbfe")} />
      <directionalLight position={[-4, -3, -2]} intensity={0.4} color={new Color("#22d3ee")} />
      <FloatingOrbs />
    </ThreeCanvas>
  );
};

/** 使用 React Three Fiber 包裹站点总览内容，模拟 3D 设备中的网页场景 */
export const SiteOverviewThreeComposition: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bgBody }}>
      <ThreeBackground
        style={{
          position: "absolute",
          inset: 0,
        }}
      />

      {/* 前景：居中的 3D 设备框 + 内嵌网页内容 */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: 1120,
            height: 650,
            borderRadius: 40,
            border: "1px solid rgba(148,163,184,0.6)",
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,1))",
            boxShadow:
              "0 30px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(15,23,42,0.9)",
            position: "relative",
            transform: "perspective(2200px) rotateX(14deg) rotateY(-18deg)",
            transformOrigin: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 14,
              borderRadius: 26,
              overflow: "hidden",
              backgroundColor: theme.bgSurface,
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.4)",
            }}
          >
            {/* 这里直接复用 2D 的 SiteOverviewComposition 内容 */}
            <SiteOverviewComposition />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 重导出时长，便于 Root 注册使用
export { SITE_OVERVIEW_DURATION_IN_FRAMES } from "./SiteOverviewComposition";

