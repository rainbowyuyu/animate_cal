import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Theme } from "../Theme";

const WORD = "collaboration";
const AGGREGATE_START = 15;
const AGGREGATE_DURATION = 30;

/** 确定性「散落」偏移（按字母索引），单位 px */
function getLetterOffset(index: number): { x: number; y: number } {
  const x = ((index * 127) % 600) - 300;
  const y = ((index * 97) % 400) - 200;
  return { x, y };
}

/**
 * Phase B：单词 "collaboration" 字母从四周散落汇聚到中心
 * 规范：第 15–45 帧用 spring 完成聚合
 */
export const CollaborationText: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - AGGREGATE_START,
    fps,
    config: { stiffness: 100, damping: 14 },
    durationInFrames: AGGREGATE_DURATION,
    delay: 0,
  });

  const letters = WORD.split("");

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "nowrap",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        fontFamily: Theme.font.sans,
        fontSize: "clamp(48px, 5vw, 72px)",
        fontWeight: 600,
        letterSpacing: "-0.02em",
      }}
    >
      {letters.map((char, i) => {
        const { x: offX, y: offY } = getLetterOffset(i);
        const x = interpolate(progress, [0, 1], [offX, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const y = interpolate(progress, [0, 1], [offY, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const opacity = interpolate(progress, [0, 0.4], [0.3, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <span
            key={`${char}-${i}`}
            style={{
              display: "inline-block",
              transform: `translate(${x}px, ${y}px)`,
              opacity,
              background: `linear-gradient(135deg, ${Theme.brand.blue}, ${Theme.brand.purple})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};
