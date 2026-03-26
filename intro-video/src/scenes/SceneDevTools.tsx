import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { theme } from "../theme";

const LATEX_DEMO = `\\int_0^{\\frac{\\pi}{2}} \\frac{\\sin x}{1+x^2}\\,dx
< \\int_0^{\\frac{\\pi}{2}} \\frac{\\cos x}{1+x^2}\\,dx`;

/** 代码开发者工作台：还原 devtools 样式 + LaTeX 公式演示 + 景深 */
export const SceneDevTools: React.FC<{ localFrame?: number }> = ({ localFrame }) => {
  const frame = localFrame ?? useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 });
  const toolsOpacity = spring({ frame: frame - 10, fps, config: { damping: 200 }, durationInFrames: 24, delay: 10 });
  const mainOpacity = spring({ frame: frame - 22, fps, config: { damping: 200 }, durationInFrames: 26, delay: 22 });

  return (
    <AbsoluteFill style={{ background: theme.bgBody, perspective: 1200 }}>
      <div style={{ padding: "1.5rem 5%", height: "100%", display: "flex", gap: 24, maxWidth: 1400, margin: "0 auto", transformStyle: "preserve-3d" }}>
        <h2
          style={{
            position: "absolute",
            top: "1.5rem",
            left: "5%",
            opacity: titleOpacity,
            fontFamily: theme.fontFamily,
            fontSize: 28,
            fontWeight: 700,
            color: theme.textMain,
            margin: 0,
            transform: "translateZ(0)",
          }}
        >
          代码开发者工作台
        </h2>

        <div
          style={{
            opacity: toolsOpacity,
            width: 240,
            flexShrink: 0,
            marginTop: 64,
            background: theme.bgSurface,
            border: theme.border2,
            borderRadius: theme.radiusMd,
            padding: "1.25rem",
            boxShadow: theme.shadowPanel,
            transform: "translateZ(-6px)",
          }}
        >
          <label style={{ fontSize: 13, fontWeight: 600, color: theme.textMain, display: "block", marginBottom: 12 }}>
            工具箱
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: theme.primary,
                color: theme.textInverse,
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              √ LaTeX 可视化编辑器
            </div>
            <div
              style={{
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: theme.bgInput,
                border: `1px solid ${theme.border}`,
                color: theme.textSecondary,
                borderRadius: 10,
                fontSize: 14,
              }}
            >
              🐍 Manim 代码云端渲染工作台
            </div>
            <div
              style={{
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: theme.bgInput,
                border: `1px solid ${theme.border}`,
                color: theme.textSecondary,
                borderRadius: 10,
                fontSize: 14,
              }}
            >
              📦 rainbow鱼的扩展库 <span style={{ fontSize: 11, background: theme.primary, color: theme.textInverse, padding: "2px 6px", borderRadius: 4 }}>NEW</span>
            </div>
          </div>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${theme.border}` }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: theme.textMain, display: "block", marginBottom: 8 }}>
              快捷键
            </label>
            <p style={{ fontSize: 12, color: theme.textSecondary, margin: 0, lineHeight: 1.6 }}>
              Ctrl + Enter 运行代码<br />
              Tab 自动补全 (Beta)
            </p>
          </div>
        </div>

        <div
          style={{
            opacity: mainOpacity,
            flex: 1,
            marginTop: 64,
            minWidth: 0,
            background: theme.bgSurface,
            border: theme.border2,
            borderRadius: theme.radiusMd,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            boxShadow: theme.shadowPanel,
            transform: "translateZ(8px)",
          }}
        >
          <div style={{ fontFamily: theme.fontFamily, fontSize: 14, fontWeight: 600, color: theme.textMain, marginBottom: 12 }}>
            LaTeX 可视化编辑器
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 320,
              background: theme.bgInput,
              border: `2px solid ${theme.border}`,
              borderRadius: 12,
              padding: 16,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 14,
              color: theme.textMain,
              whiteSpace: "pre-wrap",
              lineHeight: 1.7,
            }}
          >
            {LATEX_DEMO}
          </div>
          <p style={{ marginTop: 12, fontSize: 12, color: theme.textSecondary }}>
            支持 MathLive 编辑、Temml 导出至 Word
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
