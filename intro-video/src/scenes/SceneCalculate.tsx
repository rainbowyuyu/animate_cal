import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { theme } from "../theme";

/** 数学运算可视化：还原 calculate.css 样式 + 公式与渲染进度演示 + 景深 */
export const SceneCalculate: React.FC<{ localFrame?: number }> = ({ localFrame }) => {
  const frame = localFrame ?? useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftOpacity = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 22 });
  const rightOpacity = spring({ frame: frame - 12, fps, config: { damping: 200 }, durationInFrames: 26, delay: 12 });
  const progress = interpolate(frame, [35, 85], [0, 0.65], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ background: theme.bgBody, perspective: 1200 }}>
      <div style={{ padding: "1.5rem 5%", height: "100%", display: "grid", gridTemplateColumns: `${theme.calcSidebarWidth}px 1fr`, gap: "2rem", maxWidth: 1600, margin: "0 auto", transformStyle: "preserve-3d" }}>
        {/* 左侧配置 - 与 calc-sidebar-panel 一致：2px 边框、圆角、阴影 */}
        <div
          style={{
            opacity: leftOpacity,
            flexShrink: 0,
            height: "100%",
            background: theme.bgSurface,
            border: theme.border2,
            borderRadius: theme.radiusLg,
            boxShadow: theme.shadowPanel,
            padding: "0 1.75rem",
            display: "flex",
            flexDirection: "column",
            transform: "translateZ(-8px)",
          }}
        >
          <div style={{ paddingTop: "1.75rem", marginBottom: "1.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.95rem", fontWeight: 700, color: theme.textMain, marginBottom: 10 }}>
              📚 演示模式
            </label>
            <div
              style={{
                padding: "0.75rem 1rem",
                background: theme.bgInput,
                border: `2px solid ${theme.border}`,
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                color: theme.textMain,
              }}
            >
              通用公式推演+可视化 (推荐)
            </div>
            <p style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8, lineHeight: 1.5 }}>
              * 「通用模式」下，将自动分析您输入的算式并生成对应动画。
            </p>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.95rem", fontWeight: 700, color: theme.textMain, marginBottom: 10 }}>
              🧮 数学表达式
            </label>
            <div
              style={{
                minHeight: 80,
                padding: 16,
                background: theme.bgInput,
                border: `2px solid ${theme.border}`,
                borderRadius: 12,
                fontFamily: "JetBrains Mono, serif",
                fontSize: 18,
                color: theme.textMain,
              }}
            >
              ∫₀^(π/2) sin x/(1+x²) dx &lt; ∫₀^(π/2) cos x/(1+x²) dx
            </div>
            <details style={{ marginTop: 10 }}>
              <summary style={{ fontSize: 13, color: theme.textSecondary, cursor: "pointer" }}>📝 编辑 LaTeX 源码</summary>
            </details>
          </div>
          <div
            style={{
              marginTop: "auto",
              padding: "1.25rem 0 1.75rem",
            }}
          >
            <div
              style={{
                padding: 16,
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                color: theme.textInverse,
                borderRadius: 12,
                textAlign: "center",
                fontWeight: 700,
                fontSize: 16,
                boxShadow: theme.shadowCtaPrimary,
              }}
            >
              🎬 生成可视化动画
            </div>
          </div>
        </div>

        {/* 右侧显示 - 与 calc-display 一致：深色背景、2px 边框、内阴影 */}
        <div
          style={{
            opacity: rightOpacity,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            background: "#0f172a",
            border: theme.border2,
            borderRadius: theme.radiusLg,
            boxShadow: theme.shadowDisplay,
            overflow: "hidden",
            transform: "translateZ(0)",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: theme.textSecondary,
              fontSize: 15,
              minHeight: 280,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 28 }}>🎬</p>
              <p style={{ margin: "8px 0 0" }}>正在生成动画...</p>
              <span style={{ fontSize: 13 }}>Manim 渲染中</span>
            </div>
          </div>
          <div
            style={{
              borderTop: `1px solid ${theme.border}`,
              padding: "12px 16px",
              background: theme.bgBody,
              transform: "translateZ(6px)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: theme.textMain }}>🖥 系统日志</span>
              <span style={{ fontSize: 13, color: theme.textSecondary }}>{Math.round(progress * 100)}%</span>
            </div>
            <div style={{ height: 6, background: theme.bgSurface, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${progress * 100}%`, height: "100%", background: theme.primary, borderRadius: 3 }} />
            </div>
            <div style={{ marginTop: 8, fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: theme.textSecondary, lineHeight: 1.5 }}>
              &gt; 正在渲染 Manim 动画...
              <br />
              &gt; 解析公式完成，生成场景中
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
