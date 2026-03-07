import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { theme } from "../theme";

/** 首页 Hero：让数学计算 / 看得见、摸得着 + 副标题 + CTA，与 index.html 一致 */
export const SceneHero: React.FC<{ localFrame?: number }> = ({ localFrame }) => {
  const frame = localFrame ?? useCurrentFrame();
  const { fps } = useVideoConfig();

  const dolly = interpolate(frame, [0, 90], [0.92, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const line1 = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 25 });
  const line2 = spring({ frame: frame - 8, fps, config: { damping: 200 }, durationInFrames: 28, delay: 8 });
  const subtitleOpacity = interpolate(frame, [25, 55], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const btnsOpacity = interpolate(frame, [45, 75], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const linksOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const breathScale = 1 + 0.018 * Math.sin(frame * 0.1);

  return (
    <AbsoluteFill
      style={{
        background: theme.bgBody,
        backgroundImage: `radial-gradient(${theme.textSecondary} 1px, transparent 1px), radial-gradient(${theme.textSecondary} 1px, transparent 1px)`,
        backgroundSize: "50px 50px",
        backgroundPosition: "0 0, 25px 25px",
        perspective: 1400,
      }}
    >
      {/* 背景光晕 - 景深底层 */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          top: "-20%",
          left: "50%",
          transform: "translateX(-50%) translateZ(-60px)",
          background: `radial-gradient(circle at center, ${theme.primary} 0%, transparent 70%)`,
          opacity: 0.08,
          filter: "blur(100px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          top: "30%",
          right: "15%",
          transform: "translateZ(-40px)",
          background: `radial-gradient(circle at center, ${theme.secondary} 0%, transparent 75%)`,
          opacity: 0.06,
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          transform: `scale(${dolly})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          padding: "4rem 5%",
          textAlign: "center",
          transformStyle: "preserve-3d",
        }}
      >
        <h1
          style={{
            opacity: line1,
            fontFamily: theme.fontFamily,
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: 16,
            letterSpacing: "-0.02em",
            color: theme.textMain,
            transform: "translateZ(0)",
          }}
        >
          让数学计算
          <br />
          <span
            style={{
              opacity: line2,
              display: "inline-block",
              background: "linear-gradient(135deg, #93c5fd 0%, #a5b4fc 35%, #c4b5fd 65%, #bfdbfe 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            看得见、摸得着
          </span>
        </h1>
        <p
          style={{
            opacity: subtitleOpacity,
            fontFamily: theme.fontFamily,
            fontSize: 22,
            color: theme.textSecondary,
            maxWidth: 620,
            margin: "0 0 2.5rem",
            lineHeight: 1.7,
          }}
        >
          融合 <b>OCR</b> 手写识别 <b>Manim</b> 动态引擎。<br />
          将枯燥的公式转化为直观的视觉语言，专为新一代学习者打造。
        </p>
        <div
          style={{
            opacity: btnsOpacity,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <div
            style={{
              transform: `scale(${breathScale}) translateZ(12px)`,
              padding: "1rem 2.5rem",
              fontSize: "1.1rem",
              fontWeight: 600,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
              color: theme.textInverse,
              boxShadow: theme.shadowCtaPrimary,
            }}
          >
            ✨ 试试智能体
          </div>
          <div
            style={{
              padding: "1rem 2.5rem",
              fontSize: "1.1rem",
              borderRadius: 12,
              background: theme.bgGlass,
              border: `1px solid ${theme.border}`,
              color: theme.textMain,
              transform: "translateZ(10px)",
              backdropFilter: "blur(12px)",
            }}
          >
            立即体验 →
          </div>
          <div
            style={{
              padding: "1rem 2.5rem",
              fontSize: "1.1rem",
              borderRadius: 12,
              background: theme.bgGlass,
              border: `1px solid ${theme.border}`,
              color: theme.textMain,
              transform: "translateZ(10px)",
              backdropFilter: "blur(12px)",
            }}
          >
            ▶ 观看演示
          </div>
        </div>
        <div style={{ opacity: linksOpacity, display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ fontFamily: theme.fontFamily, fontSize: 15, color: theme.textSecondary }}>
            🤖 用一句话完成识别与动画
          </span>
          <span style={{ fontFamily: theme.fontFamily, fontSize: 15, color: theme.textSecondary }}>
            📊 查看全站知识图谱
          </span>
          <span style={{ fontFamily: theme.fontFamily, fontSize: 15, color: theme.textSecondary }}>
            ❓ 30 秒教程
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}
