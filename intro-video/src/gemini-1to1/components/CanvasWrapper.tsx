import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Theme } from "../Theme";

const SHIMMER_DURATION = 90; // 约 3s 一轮扫光

/** Canvas 按钮 + 扫光动效（规范要求关键按钮有动态扫光） */
const CanvasButtonWithShimmer: React.FC = () => {
  const frame = useCurrentFrame();
  const shimmerX = interpolate(
    frame % SHIMMER_DURATION,
    [0, SHIMMER_DURATION],
    [-100, 200],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );
  return (
    <button
      type="button"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "10px 22px",
        borderRadius: 12,
        border: `1px solid rgba(${Theme.brand.blueRgb}, 0.5)`,
        background: `linear-gradient(135deg, ${Theme.brand.blue}, ${Theme.brand.purple})`,
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: Theme.ui.glow,
      }}
    >
      <span style={{ position: "relative", zIndex: 1 }}>Canvas</span>
      <div
        style={{
          position: "absolute",
          inset: 0,
          left: `${shimmerX}%`,
          width: "60%",
          background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 40%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.25) 60%, transparent 100%)`,
          pointerEvents: "none",
        }}
      />
    </button>
  );
};

const SIDEBAR_WIDTH = 240;
const BOTTOM_BAR_HEIGHT = 88;
const STAGGER = 10;

type CanvasWrapperProps = {
  children?: React.ReactNode;
};

/**
 * 交互外壳：左侧侧边栏 + 中央主体区 + 底部输入栏（Deep Research / Canvas 切换）
 * 对应 Phase A 基础框架，中央区由 children 填入
 */
export const CanvasWrapper: React.FC<CanvasWrapperProps> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sidebarHistory = spring({
    frame,
    fps,
    config: { stiffness: 100, damping: 14 },
    durationInFrames: 24,
    delay: 0,
  });
  const sidebarNewChat = spring({
    frame,
    fps,
    config: { stiffness: 100, damping: 14 },
    durationInFrames: 24,
    delay: STAGGER,
  });
  const bottomBar = spring({
    frame,
    fps,
    config: { stiffness: 100, damping: 14 },
    durationInFrames: 28,
    delay: STAGGER * 2,
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: Theme.font.sans,
      }}
    >
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* 左侧侧边栏 */}
        <aside
          style={{
            width: SIDEBAR_WIDTH,
            minWidth: SIDEBAR_WIDTH,
            padding: "20px 16px",
            background: Theme.ui.glassBg,
            backdropFilter: Theme.ui.glassBlur,
            borderRight: `1px solid ${Theme.ui.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              opacity: sidebarHistory,
              transform: `translateX(${(1 - sidebarHistory) * -16}px)`,
              padding: "12px 16px",
              borderRadius: 12,
              color: "rgba(255,255,255,0.85)",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            History
          </div>
          <div
            style={{
              opacity: sidebarNewChat,
              transform: `translateX(${(1 - sidebarNewChat) * -16}px)`,
              padding: "12px 16px",
              borderRadius: 12,
              background: `rgba(${Theme.brand.blueRgb}, 0.15)`,
              border: `1px solid ${Theme.ui.border}`,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              boxShadow: Theme.ui.glow,
            }}
          >
            New Chat
          </div>
        </aside>

        {/* 中央主体区 */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          {children}
        </main>
      </div>

      {/* 底部输入栏：Deep Research / Canvas 切换 */}
      <div
        style={{
          opacity: bottomBar,
          transform: `translateY(${(1 - bottomBar) * 20}px)`,
          height: BOTTOM_BAR_HEIGHT,
          padding: "0 24px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            flex: 1,
            maxWidth: 560,
            height: 48,
            borderRadius: 24,
            background: Theme.ui.glassBg,
            backdropFilter: Theme.ui.glassBlur,
            border: `1px solid ${Theme.ui.border}`,
            display: "flex",
            alignItems: "center",
            paddingLeft: 20,
            color: "rgba(255,255,255,0.5)",
            fontSize: 14,
          }}
        >
          Ask anything...
        </div>
        <button
          type="button"
          style={{
            padding: "10px 20px",
            borderRadius: 12,
            border: `1px solid ${Theme.ui.border}`,
            background: Theme.ui.glassBg,
            color: "rgba(255,255,255,0.9)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Deep Research
        </button>
        <CanvasButtonWithShimmer />
      </div>
    </div>
  );
};
