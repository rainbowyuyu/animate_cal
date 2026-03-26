import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { theme } from "../theme";

/** 智能算式识别：还原 workspace.css 布局与样式 + 手写/LaTeX 演示 + 景深 */
export const SceneDetect: React.FC<{ localFrame?: number }> = ({ localFrame }) => {
  const frame = localFrame ?? useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 });
  const toolsOpacity = spring({ frame: frame - 8, fps, config: { damping: 200 }, durationInFrames: 22, delay: 8 });
  const canvasOpacity = spring({ frame: frame - 16, fps, config: { damping: 200 }, durationInFrames: 24, delay: 16 });
  const latexOpacity = spring({ frame: frame - 28, fps, config: { damping: 200 }, durationInFrames: 24, delay: 28 });
  const formulaReveal = interpolate(frame, [45, 70], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ background: theme.bgBody, perspective: 1200 }}>
      <div style={{ padding: "1.5rem 5%", height: "100%", display: "flex", flexDirection: "column", transformStyle: "preserve-3d" }}>
        <h2
          style={{
            opacity: titleOpacity,
            fontFamily: theme.fontFamily,
            fontSize: "1.8rem",
            fontWeight: 700,
            color: theme.textMain,
            margin: "0 0 1rem",
          }}
        >
          智能算式识别
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: `${theme.toolsPanelWidth}px 1fr 320px`, gap: "2rem", flex: 1, minHeight: 0 }}>
          {/* 左侧工具栏 - 与 workspace 一致：280px、圆角、边框 */}
          <div
            style={{
              opacity: toolsOpacity,
              background: theme.bgSurface,
              border: theme.border2,
              borderRadius: theme.radiusMd,
              padding: "1.25rem",
              boxShadow: theme.shadowPanel,
              transform: "translateZ(-10px)",
            }}
          >
            <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
              <div
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: 600,
                  background: theme.primary,
                  color: theme.textInverse,
                  borderRadius: 10,
                }}
              >
                ✍️ 手写
              </div>
              <div
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: 600,
                  background: theme.bgInput,
                  color: theme.textSecondary,
                  borderRadius: 10,
                  border: `1px solid ${theme.border}`,
                }}
              >
                📤 上传
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: theme.textMain, display: "block", marginBottom: 10 }}>
                绘图工具
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["✏️", "🧹", "↩", "↪", "🗑"].map((icon, i) => (
                  <div
                    key={i}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: i === 0 ? theme.primary : theme.bgInput,
                      color: i === 0 ? theme.textInverse : theme.textMain,
                      border: i === 0 ? "none" : `1px solid ${theme.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                    }}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${theme.border}` }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: theme.textMain }}>粗细</label>
              <div style={{ height: 8, borderRadius: 4, background: theme.bgInput, marginTop: 8, border: `1px solid ${theme.border}` }}>
                <div style={{ width: "20%", height: "100%", background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, borderRadius: 4 }} />
              </div>
            </div>
          </div>

          {/* 中间画布 - 演示：手写公式示意 sin x = 1/2 */}
          <div
            style={{
              opacity: canvasOpacity,
              minWidth: 0,
              background: theme.bgSurface,
              border: theme.border2,
              borderRadius: theme.radiusMd,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: theme.shadowPanel,
              transform: "translateZ(0)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                opacity: formulaReveal,
                textAlign: "center",
                fontFamily: "'Segoe Script', 'Comic Sans MS', cursive",
                fontSize: 48,
                color: theme.textMain,
                letterSpacing: 2,
              }}
            >
              sin <i>x</i> = ½
            </div>
          </div>

          {/* 右侧 LaTeX 输出 - 真实演示 */}
          <div
            style={{
              opacity: latexOpacity,
              width: 320,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              transform: "translateZ(8px)",
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 120,
                background: theme.bgSurface,
                border: theme.border2,
                borderRadius: 12,
                padding: 16,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 14,
                color: theme.textSecondary,
                boxShadow: theme.shadowSm,
              }}
            >
              {"x = \\frac{\\pi}{6}"}
            </div>
            <div
              style={{
                minHeight: 56,
                background: theme.bgInput,
                border: theme.border2,
                borderRadius: 12,
                padding: "12px 16px",
                fontFamily: theme.fontFamily,
                fontSize: 22,
                color: theme.textMain,
                display: "flex",
                alignItems: "center",
                boxShadow: theme.shadowSm,
              }}
            >
              x = π/6
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  padding: "12px",
                  textAlign: "center",
                  background: theme.primary,
                  color: theme.textInverse,
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                保存并查看
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  background: theme.bgSurface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  fontSize: 14,
                  color: theme.textMain,
                }}
              >
                复制到计算
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
