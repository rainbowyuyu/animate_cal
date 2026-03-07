import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { GEMINI, CANVAS_TIMELINE } from "./constants";

const STIFFNESS = 100;
const DAMPING = 12;

const SIDEBAR_ITEMS = [
  "Change length",
  "Suggest edits",
  "Add details",
  "Simplify",
] as const;

/**
 * 左侧控制栏：Change length、Suggest edits 等，Stagger 交错弹出
 */
export const InteractionSidebar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        width: 200,
        minWidth: 200,
        padding: "16px 12px",
        background: GEMINI.glassBg,
        backdropFilter: "blur(12px)",
        borderRight: GEMINI.borderSubtle,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {SIDEBAR_ITEMS.map((label, i) => {
        const delay = CANVAS_TIMELINE.sidebarStart + i * CANVAS_TIMELINE.sidebarStagger;
        const progress = spring({
          frame,
          fps,
          config: { stiffness: STIFFNESS, damping: DAMPING },
          durationInFrames: 24,
          delay,
        });
        const opacity = progress;
        const translateX = (1 - progress) * -20;
        return (
          <div
            key={label}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(66, 133, 244, 0.12)",
              border: GEMINI.borderSubtle,
              color: "#e2e8f0",
              fontSize: 13,
              fontWeight: 500,
              opacity,
              transform: `translateX(${translateX}px)`,
              boxShadow: progress > 0.5 ? "0 0 20px rgba(66, 133, 244, 0.15)" : "none",
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
};
