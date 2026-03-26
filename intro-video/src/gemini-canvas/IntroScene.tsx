import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { GEMINI, INTRO_PHRASE } from "./constants";

const STIFFNESS = 100;
const DAMPING = 12;
const WORD_STAGGER_FRAMES = 5;
const WORD_ANIM_DURATION = 28;

type IntroSceneProps = {
  /** 从第几帧开始播（用于 Sequence 偏移） */
  from?: number;
  /** 自定义文案，按空格拆成单词 */
  phrase?: string;
};

/**
 * Gemini Canvas 风格开场：Logo 发光 + 文案「单词拆解并重新组合」动画
 * 每个单词带 stagger 延迟，用 spring 做位移与淡入（Q 弹物理感）
 */
export const IntroScene: React.FC<IntroSceneProps> = ({
  from = 0,
  phrase = INTRO_PHRASE,
}) => {
  const frame = useCurrentFrame() - from;
  const { fps } = useVideoConfig();
  const words = phrase.trim().split(/\s+/);

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
      {/* Logo 发光：简单圆形 + 多层 drop-shadow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "38%",
          width: 80,
          height: 80,
          marginLeft: -40,
          marginTop: -40,
          borderRadius: "50%",
          background: GEMINI.accentGradient,
          boxShadow: "0 0 40px rgba(66, 133, 244, 0.4)",
          filter: GEMINI.glowShadowLayers,
        }}
      />

      {/* 文案容器：单词拆解并重新组合 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0.25rem 0.75rem",
          paddingLeft: 32,
          paddingRight: 32,
          maxWidth: 900,
          transform: "translateY(8px)",
        }}
      >
        {words.map((word, i) => {
          const delay = i * WORD_STAGGER_FRAMES;
          const progress = spring({
            frame,
            fps,
            config: { stiffness: STIFFNESS, damping: DAMPING },
            durationInFrames: WORD_ANIM_DURATION,
            delay,
          });
          const opacity = progress;
          const translateY = (1 - progress) * 24;
          return (
            <span
              key={`${word}-${i}`}
              style={{
                display: "inline-block",
                color: "#fff",
                fontWeight: 500,
                fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)",
                letterSpacing: "0.02em",
                opacity,
                transform: `translateY(${translateY}px)`,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
