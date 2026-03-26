import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Theme } from "../Theme";

/**
 * Intro 片段："Hello, Teresa" 渐变字样
 * 0–3s 内淡入 + 轻微上移，带品牌色渐变与柔和发光
 */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({
    frame,
    fps,
    config: { stiffness: 100, damping: 14 },
    durationInFrames: 28,
  });
  const translateY = interpolate(
    spring({
      frame,
      fps,
      config: { stiffness: 90, damping: 14 },
      durationInFrames: 32,
    }),
    [0, 1],
    [24, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const gradient = `linear-gradient(135deg, ${Theme.brand.blue} 0%, ${Theme.brand.purple} 100%)`;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: Theme.font.sans,
      }}
    >
      <h1
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          margin: 0,
          fontSize: "clamp(48px, 6vw, 80px)",
          fontWeight: 600,
          letterSpacing: "-0.03em",
          background: gradient,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: `drop-shadow(0 0 20px rgba(${Theme.brand.blueRgb}, 0.25))`,
        }}
      >
        Hello, Teresa
      </h1>
    </AbsoluteFill>
  );
};
