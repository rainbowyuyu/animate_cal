import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { theme } from "../theme";

const DEMO_CASES = [
  { title: "三角不等式", tag: "不等式" },
  { title: "积分比较", tag: "微积分" },
  { title: "矩阵行列式", tag: "线性代数" },
  { title: "正弦定理", tag: "三角" },
  { title: "泰勒展开", tag: "级数" },
  { title: "傅里叶级数", tag: "分析" },
];

/** 精选教学案例：还原 examples.css 样式 + 真实案例标题演示 + 景深 */
export const SceneExamples: React.FC<{ localFrame?: number }> = ({ localFrame }) => {
  const frame = localFrame ?? useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 });
  const subtitleOpacity = interpolate(frame, [15, 40], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const tabsOpacity = spring({ frame: frame - 12, fps, config: { damping: 200 }, durationInFrames: 22, delay: 12 });
  const gridOpacity = spring({ frame: frame - 24, fps, config: { damping: 200 }, durationInFrames: 28, delay: 24 });

  return (
    <AbsoluteFill style={{ background: theme.bgBody, perspective: 1200 }}>
      <div style={{ padding: "1.5rem 5%", maxWidth: 1200, margin: "0 auto", height: "100%", display: "flex", flexDirection: "column", transformStyle: "preserve-3d" }}>
        <h2 style={{ opacity: titleOpacity, fontFamily: theme.fontFamily, fontSize: 28, fontWeight: 700, color: theme.textMain, margin: "0 0 8px", transform: "translateZ(0)" }}>
          精选教学案例
        </h2>
        <p style={{ opacity: subtitleOpacity, fontFamily: theme.fontFamily, fontSize: 15, color: theme.textSecondary, margin: "0 0 1.25rem", transform: "translateZ(2px)" }}>
          点击卡片即可全屏观看，体验公式推演与可视化演示
        </p>

        <div style={{ opacity: tabsOpacity, display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", transform: "translateZ(4px)" }}>
          <div style={{ padding: "10px 18px", fontSize: 14, fontWeight: 600, background: theme.primary, color: theme.textInverse, borderRadius: 10 }}>
            全部
          </div>
          <div style={{ padding: "10px 18px", fontSize: 14, background: theme.bgSurface, border: `1px solid ${theme.border}`, color: theme.textSecondary, borderRadius: 10 }}>
            ☆ 收藏
          </div>
          <div style={{ padding: "10px 18px", fontSize: 14, background: theme.bgSurface, border: `1px solid ${theme.border}`, color: theme.textSecondary, borderRadius: 10 }}>
            🕐 稍后看
          </div>
          <div style={{ padding: "10px 18px", fontSize: 14, background: theme.bgSurface, border: `1px solid ${theme.border}`, color: theme.textSecondary, borderRadius: 10 }}>
            📚 我的课件
          </div>
          <div style={{ marginLeft: "auto", padding: "10px 16px", fontSize: 14, background: theme.bgSurface, border: `1px solid ${theme.border}`, color: theme.textSecondary, borderRadius: 10 }}>
            标签 ▾
          </div>
        </div>

        <div
          style={{
            opacity: gridOpacity,
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
            minHeight: 0,
          }}
        >
          {DEMO_CASES.map((item, i) => (
            <div
              key={i}
              style={{
                background: theme.bgSurface,
                border: theme.border2,
                borderRadius: theme.radiusMd,
                overflow: "hidden",
                aspectRatio: "16/9",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: theme.shadowPanel,
                transform: `translateZ(${8 + i * 2}px)`,
              }}
            >
              <span style={{ color: theme.textMain, fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{item.title}</span>
              <span style={{ color: theme.textSecondary, fontSize: 12 }}>{item.tag}</span>
              <span style={{ marginTop: 12, fontSize: 24, color: theme.primary }}>▶</span>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
