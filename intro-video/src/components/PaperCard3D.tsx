import React from "react";
import { interpolate } from "remotion";
import { theme } from "../theme";

const DEPTH_PX = 32;

/** 根据角度计算「远侧」暗角强度，使景深随角度持续存在 */
function farSideDarken(rotateY: number): number {
  const t = Math.min(1, Math.abs(rotateY) / 12);
  return 0.06 * t;
}

type Props = {
  children: React.ReactNode;
  /** 当前卡片绕 Y 轴旋转角度（度），用于景深方向与强度 */
  rotateY: number;
  /** 0~1：进入中为 0→1，完全进入为 1；过渡时略虚 */
  enterProgress: number;
  /** 0~1：退出中为 0→1 */
  exitProgress: number;
};

/**
 * 纸片式 3D 卡片：有厚度、渐变边条，立体旋转时可见侧面
 * 每页不同角度 + 缓慢旋转，景深（远侧略暗）根据角度持续保持，柔和感
 */
export const PaperCard3D: React.FC<Props> = ({
  children,
  rotateY,
  enterProgress,
  exitProgress,
}) => {
  const inTransition = enterProgress < 1 || exitProgress > 0;
  const transitionBlur = interpolate(
    inTransition ? (enterProgress < 1 ? 1 - enterProgress : exitProgress) : 0,
    [0, 0.5, 1],
    [0, 1.2, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );
  const farDarkenPersist = farSideDarken(rotateY);
  const leftDark = rotateY > 0 ? farDarkenPersist : 0;
  const rightDark = rotateY < 0 ? farDarkenPersist : 0;
  const topDark = 0.04;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformStyle: "preserve-3d",
      }}
    >
      {/* 左侧厚度边：绕左边旋转 -90deg，可见为「纸片左侧棱」 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: DEPTH_PX,
          height: "100%",
          background: theme.accentGradient,
          transform: `rotateY(-90deg)`,
          transformOrigin: "left center",
          backfaceVisibility: "hidden",
          boxShadow:
            "inset -2px 0 12px rgba(0,0,0,0.2), 0 0 24px rgba(66,133,244,0.15)",
        }}
      />
      {/* 右侧厚度边：绕右边旋转 90deg */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: DEPTH_PX,
          height: "100%",
          background: theme.accentGradient,
          transform: `rotateY(90deg)`,
          transformOrigin: "right center",
          backfaceVisibility: "hidden",
          boxShadow:
            "inset 2px 0 12px rgba(0,0,0,0.2), 0 0 24px rgba(66,133,244,0.15)",
        }}
      />
      {/* 主面：网页内容 + 持续景深（远侧/上缘略暗）+ 过渡时略虚 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backfaceVisibility: "hidden",
          filter: transitionBlur > 0 ? `blur(${transitionBlur}px)` : undefined,
        }}
      >
        {children}
        {/* 景深：根据当前角度，远侧与上缘始终略暗，立体有层次 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: [
              `linear-gradient(to bottom, rgba(0,0,0,${topDark}) 0%, transparent 50%)`,
              `linear-gradient(to right, rgba(0,0,0,${leftDark}) 0%, transparent 35%)`,
              `linear-gradient(to left, rgba(0,0,0,${rightDark}) 0%, transparent 35%)`,
            ].join(", "),
          }}
        />
      </div>
    </div>
  );
}
