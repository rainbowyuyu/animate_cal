import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { interpolate } from "remotion";
import { Theme } from "../Theme";

/**
 * 动态背景：纯黑 → 极深紫渐变 + 缓慢变化的柔光
 * 用于 Gemini 1:1 合成底层，随帧有轻微呼吸感
 */
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cycle = (frame / fps) * 0.15;
  const breath = Math.sin(cycle * Math.PI * 2) * 0.5 + 0.5;
  const blueOpacity = interpolate(breath, [0, 1], [0.03, 0.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const purpleOpacity = interpolate(breath, [0, 1], [0.02, 0.06], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: Theme.background.gradient,
        fontFamily: Theme.font.sans,
      }}
    >
      {/* 中央偏上：蓝色柔光缓慢呼吸 */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "20%",
          width: "120%",
          height: "60%",
          marginLeft: "-60%",
          marginTop: "-20%",
          background: `radial-gradient(ellipse 80% 70% at 50% 50%, rgba(${Theme.brand.blueRgb}, ${blueOpacity}) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      {/* 右下：紫色柔光 */}
      <div
        style={{
          position: "absolute",
          right: "-10%",
          bottom: "-15%",
          width: "70%",
          height: "70%",
          background: `radial-gradient(circle at 70% 70%, rgba(${Theme.brand.purpleRgb}, ${purpleOpacity}) 0%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
