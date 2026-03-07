import React from "react";
import { interpolate } from "remotion";
import { getSceneStartFrame, SCENE_COUNT, SCENE_DURATION } from "../sceneConfig";

/** 每段对应的关键句（Google 风格：简洁、一句一个节奏） */
export const KEY_PHRASES: string[] = [
  "智算视界",
  "让数学看得见、摸得着",
  "全站能力，一览无余",
  "一句话，搞定",
  "手写 → LaTeX",
  "公式 → 动画",
  "全站知识图谱",
  "精选案例，即点即看",
  "代码与公式，一站搞定",
  "立即体验",
];

const PHRASE_VISIBLE_START = 0;
const PHRASE_FADE_IN_END = 10;
const PHRASE_HOLD_END = 28;
const PHRASE_FADE_OUT_END = 38;

type Props = {
  /** 当前场景下标 0..SCENE_COUNT-1 */
  sceneIndex: number;
  /** 当前场景内的本地帧 */
  localFrame: number;
};

/**
 * Google 产品短片风格：每段开头出现一句关键句，淡入→短暂保持→淡出，再露出产品界面
 */
export const KeyPhraseOverlay: React.FC<Props> = ({ sceneIndex, localFrame }) => {
  const phrase = KEY_PHRASES[sceneIndex] ?? "";
  const opacity = interpolate(
    localFrame,
    [PHRASE_VISIBLE_START, PHRASE_FADE_IN_END, PHRASE_HOLD_END, PHRASE_FADE_OUT_END],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );
  if (opacity <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 90,
      }}
    >
      <div
        style={{
          opacity,
          fontFamily: "'Plus Jakarta Sans', 'Microsoft YaHei', sans-serif",
          fontSize: 56,
          fontWeight: 700,
          color: "rgba(255, 255, 255, 0.95)",
          textAlign: "center",
          maxWidth: "85%",
          lineHeight: 1.3,
          letterSpacing: "-0.02em",
          textShadow: "0 2px 24px rgba(0,0,0,0.4)",
        }}
      >
        {phrase}
      </div>
    </div>
  );
};

/** 根据全局帧计算当前场景与本地帧，供 KeyPhraseOverlay 使用 */
export function getCurrentSceneAndLocalFrame(globalFrame: number): { sceneIndex: number; localFrame: number } {
  for (let i = 0; i < SCENE_COUNT; i++) {
    const start = getSceneStartFrame(i);
    if (globalFrame >= start && globalFrame < start + SCENE_DURATION) {
      return { sceneIndex: i, localFrame: globalFrame - start };
    }
  }
  const lastStart = getSceneStartFrame(SCENE_COUNT - 1);
  return { sceneIndex: SCENE_COUNT - 1, localFrame: globalFrame - lastStart };
}
