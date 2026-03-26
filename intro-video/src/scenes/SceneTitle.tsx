import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { theme } from "../theme";

/** 片头：Logo + 智算视界（与站点一致的渐变）+ 副标题，带 dolly 运镜 */
export const SceneTitle: React.FC<{ localFrame?: number }> = ({ localFrame }) => {
  const frame = localFrame ?? useCurrentFrame();
  const { fps } = useVideoConfig();

  const dollyScale = interpolate(frame, [0, 50], [0.75, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 22,
  });
  const titleOpacity = interpolate(frame, [18, 45], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const subtitleOpacity = interpolate(frame, [35, 65], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        background: theme.bgBody,
        backgroundImage: `radial-gradient(${theme.textSecondary} 1px, transparent 1px), radial-gradient(${theme.textSecondary} 1px, transparent 1px)`,
        backgroundSize: "50px 50px",
        backgroundPosition: "0 0, 25px 25px",
        perspective: 1200,
      }}
    >
      <div
        style={{
          transform: `scale(${dollyScale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          transformStyle: "preserve-3d",
        }}
      >
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale}) translateZ(0)`,
            marginBottom: 28,
          }}
        >
          <Img
            src={staticFile("智算视界_avatar.svg")}
            style={{ width: 140, height: 140, display: "block" }}
          />
        </div>
        <h1
          style={{
            opacity: titleOpacity,
            fontFamily: theme.fontFamily,
            fontSize: 88,
            fontWeight: 800,
            background: "linear-gradient(135deg, #93c5fd 0%, #a5b4fc 35%, #c4b5fd 65%, #bfdbfe 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            margin: 0,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            transform: "translateZ(8px)",
          }}
        >
          智算视界
        </h1>
        <p
          style={{
            opacity: subtitleOpacity,
            fontFamily: theme.fontFamily,
            fontSize: 26,
            color: theme.textSecondary,
            marginTop: 20,
            marginBottom: 0,
            maxWidth: 520,
            lineHeight: 1.6,
          }}
        >
          基于 AI 与 Manim 的数学可视化计算平台
        </p>
      </div>
    </AbsoluteFill>
  );
};
