import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { theme } from "../theme";

/** 导航栏 + 功能卡片：与 index.html 布局与文案一致，带轻微下摇运镜 */
export const SceneNavAndFeatures: React.FC<{ localFrame?: number }> = ({ localFrame }) => {
  const frame = localFrame ?? useCurrentFrame();
  const { fps } = useVideoConfig();

  const panY = interpolate(frame, [0, 100], [0, -80], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const navOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const card1 = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 28, delay: 20 });
  const card2 = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 28, delay: 35 });
  const card3 = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 28, delay: 50 });

  const cards = [
    {
      title: "智能体",
      badge: "推荐",
      icon: "🤖",
      desc: "用一句话调用全站功能。例如：「把 sin(x) = 1/2 做成动画」或「识别这张图并去计算」，自动跳转并完成任务。",
    },
    {
      title: "视觉识别",
      icon: "👁",
      desc: "支持手写公式与图片上传，毫秒级精准转换 LaTeX 代码，复杂矩阵也能一键提取。",
    },
    {
      title: "动态推演",
      icon: "✨",
      desc: "拒绝死板的答案。基于 Python Manim 引擎，实时渲染矩阵变换、行列式展开过程。",
    },
  ];

  return (
    <AbsoluteFill
      style={{
        background: theme.bgBody,
        backgroundImage: `radial-gradient(${theme.textSecondary} 1px, transparent 1px), radial-gradient(${theme.textSecondary} 1px, transparent 1px)`,
        backgroundSize: "50px 50px",
        backgroundPosition: "0 0, 25px 25px",
        perspective: 1200,
      }}
    >
      <div style={{ transform: `translateY(${panY}px)`, padding: "0 5%", maxWidth: 1200, margin: "0 auto", transformStyle: "preserve-3d" }}>
        {/* 导航栏 - 与 layout.css / components.css 一致 */}
        <nav
          style={{
            opacity: navOpacity,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 0",
            borderBottom: `1px solid ${theme.border}`,
            marginBottom: 48,
            transform: "translateZ(0)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: "1.5rem",
              fontWeight: 800,
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            <Img src={staticFile("智算视界_avatar.svg")} style={{ width: 40, height: 40 }} />
            智算视界
          </div>
          <div style={{ display: "flex", gap: 6, background: theme.bgInput, padding: 6, borderRadius: 99, border: `1px solid ${theme.border}` }}>
            {["首页", "智能体", "智能识别", "我的算式", "动态计算", "教学案例", "开发者工具", "帮助"].map(
              (label, i) => (
                <span
                  key={i}
                  style={{
                    padding: "8px 14px",
                    fontSize: 14,
                    fontWeight: 600,
                    color: i === 0 ? theme.primary : theme.textMain,
                    borderRadius: 8,
                  }}
                >
                  {label}
                </span>
              )
            )}
          </div>
        </nav>

        {/* 功能卡片 - 与 home.css feature-card 一致 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 32,
            paddingBottom: 48,
          }}
        >
          {cards.map((card, i) => {
            const delay = [card1, card2, card3][i];
            return (
              <div
                key={i}
              style={{
                opacity: delay,
                background: theme.bgGlass,
                border: theme.border2,
                borderRadius: theme.radiusMd,
                padding: "2rem 1.75rem",
                position: "relative",
                backdropFilter: "blur(12px)",
                boxShadow: theme.shadowPanel,
                transform: `translateZ(${8 + i * 4}px)`,
              }}
              >
                {card.badge && (
                  <span
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      fontSize: 11,
                      fontWeight: 700,
                      background: theme.primary,
                      color: theme.textInverse,
                      padding: "4px 10px",
                      borderRadius: 99,
                    }}
                  >
                    {card.badge}
                  </span>
                )}
                <div
                  style={{
                    width: 72,
                    height: 72,
                    background: `linear-gradient(135deg, ${theme.bgInput}, ${theme.bgSurface})`,
                    borderRadius: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    marginBottom: 20,
                  }}
                >
                  {card.icon}
                </div>
                <h3 style={{ fontFamily: theme.fontFamily, fontSize: 22, fontWeight: 700, color: theme.textMain, marginBottom: 12 }}>
                  {card.title}
                </h3>
                <p style={{ fontFamily: theme.fontFamily, fontSize: 15, color: theme.textSecondary, lineHeight: 1.6, margin: 0 }}>
                  {card.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
