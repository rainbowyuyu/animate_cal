import React from "react";
import { interpolate } from "remotion";
import { SCENE_BASE_ANGLES, DRIFT_AMPLITUDE, DRIFT_SPEED } from "../sceneConfig";

/** 柔和运镜（模仿 Google 产品短片：过渡更顺、角度更小） */
const ANGLE_ENTER = 38;
const ANGLE_EXIT = 36;
const Z_OFF = 280;

type Props = {
  children: (rotateY: number) => React.ReactNode;
  sceneIndex: number;
  globalFrame: number;
  /** 0→1：当前场景从侧面旋入的进度 */
  enterProgress: number;
  /** 0→1：当前场景向侧面旋出的进度（未退出为 0） */
  exitProgress: number;
};

/**
 * 将子内容放在 3D 透视中：进入时从右侧旋入，退出时向左侧旋出
 * 静止时每页保持不同基础角度 + 缓慢旋转（柔和呼吸感），纸片厚度与景深始终可见
 */
export const PerspectiveSceneWrapper: React.FC<Props> = ({
  children,
  sceneIndex,
  globalFrame,
  enterProgress,
  exitProgress,
}) => {
  const isExiting = exitProgress > 0;
  const isEntering = enterProgress < 1;
  const baseAngle = SCENE_BASE_ANGLES[sceneIndex] ?? 0;
  const drift = DRIFT_AMPLITUDE * Math.sin(globalFrame * DRIFT_SPEED);

  let rotateY: number;
  if (isExiting) {
    rotateY = interpolate(exitProgress, [0, 1], [baseAngle + drift, -ANGLE_EXIT]);
  } else if (isEntering) {
    rotateY = interpolate(enterProgress, [0, 1], [ANGLE_ENTER, baseAngle + drift]);
  } else {
    rotateY = baseAngle + drift;
  }

  const translateZ = isExiting
    ? interpolate(exitProgress, [0, 1], [0, -Z_OFF])
    : interpolate(enterProgress, [0, 1], [-Z_OFF, 0]);
  const opacity = isExiting
    ? interpolate(exitProgress, [0, 0.5, 1], [1, 0.7, 0])
    : interpolate(enterProgress, [0, 0.4, 1], [0, 0.6, 1]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformStyle: "preserve-3d",
        transform: `translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
        opacity,
        backfaceVisibility: "hidden",
      }}
    >
      {children(rotateY)}
    </div>
  );
};
