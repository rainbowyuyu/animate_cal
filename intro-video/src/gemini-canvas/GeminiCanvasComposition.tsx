import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { GEMINI } from "./constants";
import { IntroScene } from "./IntroScene";
import { DeviceMockup } from "./DeviceMockup";
import { InteractionSidebar } from "./InteractionSidebar";
import { CanvasPreview } from "./CanvasPreview";

/** 开场文案 + Logo 时长（帧） */
const INTRO_DURATION = 90;
/** 设备演示总时长（帧） */
const DEVICE_DURATION = 210;

/**
 * Gemini Canvas 风格主合成：深色渐变、弹性动画、设备切换
 * 阶段 1：文字拆解 + Logo 发光
 * 阶段 2：设备从手机放大到桌面，内为侧栏 + Code/Preview 切换 + 发光按钮与涟漪
 */
export const GeminiCanvasComposition: React.FC = () => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: GEMINI.bgGradient,
        width,
        height,
      }}
    >
      <Sequence from={0} durationInFrames={INTRO_DURATION}>
        <IntroScene />
      </Sequence>

      <Sequence from={INTRO_DURATION} durationInFrames={DEVICE_DURATION}>
        <DeviceMockup
          transitionStartFrame={0}
          transitionDurationFrames={50}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "row",
              background: "rgba(13, 13, 26, 0.4)",
              backdropFilter: "blur(8px)",
            }}
          >
            <InteractionSidebar />
            <CanvasPreview />
          </div>
        </DeviceMockup>
      </Sequence>
    </AbsoluteFill>
  );
};
