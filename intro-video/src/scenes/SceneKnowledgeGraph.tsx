import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { theme } from "../theme";

/** 全站知识图谱：还原 home.css role-start-section 样式 + 景深层次 */
export const SceneKnowledgeGraph: React.FC<{ localFrame?: number }> = ({ localFrame }) => {
  const frame = localFrame ?? useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeOpacity = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 });
  const titleOpacity = spring({ frame: frame - 8, fps, config: { damping: 200 }, durationInFrames: 22, delay: 8 });
  const hintOpacity = interpolate(frame, [20, 45], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const graphOpacity = interpolate(frame, [25, 60], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ background: theme.bgBody, perspective: 1200 }}>
      <div
        style={{
          padding: "3rem 5%",
          maxWidth: 1000,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          transformStyle: "preserve-3d",
        }}
      >
        <span
          style={{
            opacity: badgeOpacity,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            background: "rgba(139, 92, 246, 0.15)",
            border: "1px solid rgba(139, 92, 246, 0.3)",
            borderRadius: 99,
            fontSize: 14,
            fontWeight: 600,
            color: theme.secondary,
            marginBottom: 16,
            transform: "translateZ(0)",
          }}
        >
          📊 知识图谱
        </span>
        <h2
          style={{
            opacity: titleOpacity,
            fontFamily: theme.fontFamily,
            fontSize: 36,
            fontWeight: 700,
            color: theme.textMain,
            margin: "0 0 8px",
            transform: "translateZ(4px)",
          }}
        >
          全站知识图谱
        </h2>
        <p
          style={{
            opacity: hintOpacity,
            fontFamily: theme.fontFamily,
            fontSize: 16,
            color: theme.textSecondary,
            margin: "0 0 24px",
            transform: "translateZ(2px)",
          }}
        >
          点击任意节点跳转功能，探索网站全部能力
        </p>

        {/* 3D 图谱区 - 立体厚度：多层阴影 + translateZ */}
        <div
          style={{
            opacity: graphOpacity,
            width: "100%",
            maxWidth: 800,
            height: 420,
            background: "linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.98) 100%)",
            border: theme.border2,
            borderRadius: theme.radiusLg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            boxShadow: "0 8px 32px -8px rgba(0,0,0,0.35), 0 4px 16px -4px rgba(59,130,246,0.1), inset 0 1px 0 rgba(255,255,255,0.04)",
            transform: "translateZ(24px)",
          }}
        >
          <div style={{ textAlign: "center", color: theme.textSecondary, fontSize: 15 }}>
            <p style={{ margin: 0, fontSize: 48 }}>🌐</p>
            <p style={{ margin: "12px 0 0" }}>3D 力导向图 · 智算星云</p>
            <p style={{ margin: "8px 0 0", fontSize: 13 }}>左键旋转 · 右键平移 · 滚轮缩放</p>
          </div>
          <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", gap: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: theme.bgSurface, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textMain }}>+</div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: theme.bgSurface, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textMain }}>−</div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: theme.bgSurface, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textMain }}>↺</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
