import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { theme } from "../theme";

/** 片尾 CTA：与首页一致 - Logo、智算视界、试试智能体 / 立即体验 */
export const SceneCTA: React.FC<{ localFrame?: number }> = ({ localFrame }) => {
  const frame = localFrame ?? useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const logoOpacity = spring({ frame: frame - 15, fps, config: { damping: 200 }, durationInFrames: 22, delay: 15 });
  const titleOpacity = spring({ frame: frame - 30, fps, config: { damping: 200 }, durationInFrames: 25, delay: 30 });
  const ctaOpacity = spring({ frame: frame - 50, fps, config: { damping: 200 }, durationInFrames: 28, delay: 50 });
  const taglineOpacity = interpolate(frame, [70, 100], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const breathScale = 1 + 0.02 * Math.sin(frame * 0.08);

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
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, ${bgOpacity}) 35%, rgba(15, 23, 42, 0.98) 100%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", transformStyle: "preserve-3d" }}>
        <div style={{ opacity: logoOpacity, marginBottom: 20, transform: "translateZ(0)" }}>
          <Img src={staticFile("智算视界_avatar.svg")} style={{ width: 120, height: 120, display: "block" }} />
        </div>
        <h1
          style={{
            opacity: titleOpacity,
            fontFamily: theme.fontFamily,
            fontSize: 64,
            fontWeight: 800,
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          智算视界
        </h1>
        <p
          style={{
            opacity: titleOpacity,
            fontFamily: theme.fontFamily,
            fontSize: 20,
            color: theme.textSecondary,
            marginTop: 12,
            marginBottom: 32,
          }}
        >
          基于 AI 与 Manim 的数学可视化计算平台
        </p>
        <div style={{ opacity: ctaOpacity, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", transform: "translateZ(12px)" }}>
          <div
            style={{
              transform: `scale(${breathScale})`,
              padding: "18px 36px",
              fontSize: 18,
              fontWeight: 600,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
              color: theme.textInverse,
              boxShadow: theme.shadowGlow,
            }}
          >
            ✨ 试试智能体
          </div>
          <div
            style={{
              padding: "18px 36px",
              fontSize: 18,
              borderRadius: 12,
              background: theme.bgGlass,
              border: `1px solid ${theme.border}`,
              color: theme.textMain,
            }}
          >
            立即体验 →
          </div>
        </div>
        <p
          style={{
            opacity: taglineOpacity,
            marginTop: 28,
            fontFamily: theme.fontFamily,
            fontSize: 16,
            color: theme.textSecondary,
          }}
        >
          智算视界 · Wisdom Computing Perspective
        </p>
      </div>
    </AbsoluteFill>
  );
}
