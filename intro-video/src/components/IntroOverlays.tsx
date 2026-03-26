import React from "react";
import { interpolate } from "remotion";
import { getSceneStartFrame, SCENE_COUNT, SCENE_DURATION } from "../sceneConfig";
import { theme } from "../theme";
import { KEY_PHRASES } from "./KeyPhraseOverlay";

const PHRASE_FADE_IN_END = 10;
const PHRASE_HOLD_END = 28;
const PHRASE_FADE_OUT_END = 38;

type Props = {
  sceneIndex: number;
  localFrame: number;
};

/**
 * Intro 统一叠层：景深暗角 + 关键句（Gemini 风格）
 * 一层组件，避免散落多个 overlay 造成杂乱
 */
export const IntroOverlays: React.FC<Props> = ({ sceneIndex, localFrame }) => {
  const phrase = KEY_PHRASES[sceneIndex] ?? "";
  const phraseOpacity = interpolate(
    localFrame,
    [0, PHRASE_FADE_IN_END, PHRASE_HOLD_END, PHRASE_FADE_OUT_END],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  return (
    <>
      {/* 景深：中心清晰、边缘轻微渐暗 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 90,
          background: `radial-gradient(
            ellipse 85% 85% at 50% 50%,
            transparent 0%,
            transparent 58%,
            rgba(0, 0, 0, 0.04) 82%,
            rgba(0, 0, 0, 0.12) 100%
          )`,
        }}
      />
      {/* 关键句：无衬线、轻微发光，不抢戏 */}
      {phraseOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 91,
          }}
        >
          <div
            style={{
              opacity: phraseOpacity,
              fontFamily: "'Inter', 'Google Sans', 'Microsoft YaHei', sans-serif",
              fontSize: 48,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.96)",
              textAlign: "center",
              maxWidth: "80%",
              lineHeight: 1.35,
              letterSpacing: "-0.02em",
              textShadow: "0 0 24px rgba(66, 133, 244, 0.25), 0 2px 16px rgba(0,0,0,0.3)",
            }}
          >
            {phrase}
          </div>
        </div>
      )}
    </>
  );
}

export { getCurrentSceneAndLocalFrame } from "./KeyPhraseOverlay";
