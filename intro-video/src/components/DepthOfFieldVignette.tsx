import React from "react";

/**
 * 摄像头聚焦 + 景深：中心清晰、边缘渐暗的遮罩，模拟镜头焦点与空间层次
 * 叠在场景最上层，不阻挡交互层（cursor）
 */
export const DepthOfFieldVignette: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      zIndex: 100,
      background: `radial-gradient(
        ellipse 82% 82% at 50% 50%,
        transparent 0%,
        transparent 55%,
        rgba(0, 0, 0, 0.06) 80%,
        rgba(0, 0, 0, 0.16) 100%
      )`,
    }}
  />
);
