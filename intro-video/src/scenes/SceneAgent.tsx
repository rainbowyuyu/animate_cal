import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { theme } from "../theme";

/** 智能体页面：还原 agent.css 样式 + 真实对话演示 + 景深层次 */
export const SceneAgent: React.FC<{ localFrame?: number }> = ({ localFrame }) => {
  const frame = localFrame ?? useCurrentFrame();
  const { fps } = useVideoConfig();

  const sidebarOpacity = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 22 });
  const userMsgOpacity = spring({ frame: frame - 15, fps, config: { damping: 200 }, durationInFrames: 20, delay: 15 });
  const assistantMsgOpacity = spring({ frame: frame - 35, fps, config: { damping: 200 }, durationInFrames: 22, delay: 35 });
  const inputOpacity = interpolate(frame, [50, 75], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ background: theme.bgBody, perspective: 1200 }}>
      <div style={{ display: "flex", flex: 1, overflow: "hidden", transformStyle: "preserve-3d" }}>
        {/* 左侧边栏 - 与 agent.css 一致：300px、border-right、box-shadow */}
        <aside
          style={{
            opacity: sidebarOpacity,
            width: theme.agentSidebarWidth,
            minWidth: theme.agentSidebarWidth,
            flexShrink: 0,
            background: theme.bgSurface,
            borderRight: `1px solid ${theme.border}`,
            boxShadow: theme.shadowSidebar,
            display: "flex",
            flexDirection: "column",
            transform: "translateZ(-8px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "1.25rem 1.5rem",
              borderBottom: `1px solid ${theme.border}`,
              background: "linear-gradient(135deg, rgba(37, 99, 235, 0.03), rgba(124, 58, 237, 0.03))",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: theme.bgInput,
                border: `1px solid ${theme.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                color: theme.textSecondary,
              }}
            >
              ☰
            </div>
            <h2
              style={{
                fontFamily: theme.fontFamily,
                fontSize: "1.3rem",
                fontWeight: 800,
                margin: 0,
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                letterSpacing: "-0.02em",
              }}
            >
              智能体
            </h2>
          </div>
          <div style={{ flex: 1, padding: "1.5rem 1.25rem", display: "flex", flexDirection: "column", gap: 24 }}>
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(139, 92, 246, 0.12)",
                border: "1px solid rgba(139, 92, 246, 0.25)",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.secondary }}>👑 会员功能</span>
              <p style={{ fontFamily: theme.fontFamily, fontSize: 14, color: theme.textSecondary, margin: "8px 0 0", lineHeight: 1.5 }}>
                用自然语言描述你想做的事，智能体会自动调用识别、计算、动画、LaTeX 编辑等能力。
              </p>
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.primary }}>✨ 功能</span>
              <ul style={{ margin: "8px 0 0", paddingLeft: 20, color: theme.textSecondary, fontSize: 13, lineHeight: 1.8 }}>
                <li>一句话生成动画、打开编辑器或识别公式</li>
                <li>支持上传公式图片，自动识别并跳转计算</li>
              </ul>
            </div>
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ padding: "10px 14px", borderRadius: 10, background: theme.bgInput, border: `1px solid ${theme.border}`, fontSize: 13, color: theme.textMain }}>
                🗑 清空对话
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 10, background: theme.bgInput, border: `1px solid ${theme.border}`, fontSize: 13, color: theme.textMain }}>
                ⚙ 设置
              </div>
            </div>
          </div>
        </aside>

        {/* 主聊天区 - 真实演示：用户说「把 sin(x)=1/2 做成动画」+ 助手回复 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: theme.bgBody,
            padding: "1.5rem 2rem",
            transform: "translateZ(0)",
          }}
        >
          {/* 助手欢迎语 */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-start", transform: "translateZ(4px)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: theme.bgSurface }}>
              <Img src={staticFile("智算视界_avatar.svg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div
              style={{
                flex: 1,
                maxWidth: 720,
                padding: "1rem 1.25rem",
                background: theme.bgSurface,
                border: `1px solid ${theme.border}`,
                borderRadius: 16,
                boxShadow: theme.shadowSm,
              }}
            >
              <p style={{ fontFamily: theme.fontFamily, fontSize: 15, color: theme.textMain, margin: 0, lineHeight: 1.6 }}>
                你好，我是智能体。你可以用自然语言让我帮你：把公式做成动画、识别图片后去计算等。
              </p>
            </div>
          </div>

          {/* 用户消息 - 演示 */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, opacity: userMsgOpacity, transform: "translateZ(8px)" }}>
            <div
              style={{
                maxWidth: 680,
                padding: "1rem 1.25rem",
                background: "linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(124, 58, 237, 0.15))",
                border: `1px solid rgba(59, 130, 246, 0.35)`,
                borderRadius: 16,
                boxShadow: "0 2px 12px rgba(37, 99, 235, 0.15)",
              }}
            >
              <p style={{ fontFamily: theme.fontFamily, fontSize: 15, color: theme.textMain, margin: 0, lineHeight: 1.5 }}>
                把 sin(x)=1/2 做成动画
              </p>
            </div>
          </div>

          {/* 助手回复 - 演示 */}
          <div style={{ display: "flex", gap: 16, marginBottom: 24, alignItems: "flex-start", opacity: assistantMsgOpacity, transform: "translateZ(6px)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: theme.bgSurface }}>
              <Img src={staticFile("智算视界_avatar.svg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div
              style={{
                flex: 1,
                maxWidth: 720,
                padding: "1rem 1.25rem",
                background: theme.bgSurface,
                border: `1px solid ${theme.border}`,
                borderRadius: 16,
                boxShadow: theme.shadowSm,
              }}
            >
              <p style={{ fontFamily: theme.fontFamily, fontSize: 15, color: theme.textMain, margin: 0, lineHeight: 1.6 }}>
                正在跳转到动态计算并填入公式 <code style={{ background: theme.bgInput, padding: "2px 6px", borderRadius: 6, fontSize: 14 }}>\sin x = \frac{1}{2}</code>
                ，您随后可点击「生成可视化动画」。
              </p>
            </div>
          </div>

          {/* 输入栏 - 与站点一致 */}
          <div
            style={{
              marginTop: "auto",
              opacity: inputOpacity,
              padding: "14px 18px",
              background: theme.bgSurface,
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
              boxShadow: theme.shadowSm,
              transform: "translateZ(10px)",
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: theme.bgInput, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: theme.textSecondary }}>
              🖼
            </div>
            <div style={{ flex: 1, color: theme.textSecondary, fontSize: 14 }}>
              例如：填入 sin(x)=1/2、识别这张图、把公式做成动画…
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: theme.primary, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textInverse, fontWeight: 600 }}>
              ➤
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
