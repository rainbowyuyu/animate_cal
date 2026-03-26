import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { GEMINI } from "./constants";

const STIFFNESS = 100;
const DAMPING = 12;

type DeviceMockupProps = {
  /** 从第几帧开始（Sequence 偏移后为 0） */
  from?: number;
  /** 手机 → 桌面 过渡起始帧（相对 from） */
  transitionStartFrame?: number;
  /** 过渡持续帧数 */
  transitionDurationFrames?: number;
  children: React.ReactNode;
};

/** 手机端逻辑尺寸（用于比例） */
const PHONE_WIDTH = 375;
const PHONE_HEIGHT = 812;
/** 桌面端为满屏 */
const DESKTOP_WIDTH = 1920;
const DESKTOP_HEIGHT = 1080;

/**
 * 设备容器：根据 frame 从手机尺寸平滑缩放到桌面尺寸
 * 使用 spring 获得弹性过渡，内部可放 Code/Preview 等内容
 */
export const DeviceMockup: React.FC<DeviceMockupProps> = ({
  from = 0,
  transitionStartFrame = 0,
  transitionDurationFrames = 50,
  children,
}) => {
  const frame = useCurrentFrame() - from;
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - transitionStartFrame,
    fps,
    config: { stiffness: STIFFNESS, damping: DAMPING },
    durationInFrames: transitionDurationFrames,
    delay: 0,
  });

  const width = interpolate(
    progress,
    [0, 1],
    [PHONE_WIDTH, DESKTOP_WIDTH],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const height = interpolate(
    progress,
    [0, 1],
    [PHONE_HEIGHT, DESKTOP_HEIGHT],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scaleX = 1920 / width;
  const scaleY = 1080 / height;
  const scale = Math.min(scaleX, scaleY);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: GEMINI.bgGradient,
        fontFamily: GEMINI.fontSans,
      }}
    >
      <div
        style={{
          overflow: "hidden",
          borderRadius: 16,
          width,
          height,
          maxWidth: "100vw",
          maxHeight: "100vh",
          transform: `scale(${scale})`,
          boxShadow: [
            "0 0 0 1px rgba(66, 133, 244, 0.2)",
            "0 0 40px rgba(66, 133, 244, 0.15)",
            "0 25px 80px rgba(0,0,0,0.5)",
          ].join(", "),
          filter: GEMINI.glowShadowLayers,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
}
