import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { getSceneStartFrame, getSceneProgress, isSceneVisible } from "./sceneConfig";
import { PerspectiveSceneWrapper } from "./components/PerspectiveSceneWrapper";
import { PaperCard3D } from "./components/PaperCard3D";
import { CursorAndRipple } from "./components/CursorAndRipple";
import { IntroOverlays, getCurrentSceneAndLocalFrame } from "./components/IntroOverlays";
import { theme } from "./theme";
import { SceneTitle } from "./scenes/SceneTitle";
import { SceneHero } from "./scenes/SceneHero";
import { SceneNavAndFeatures } from "./scenes/SceneNavAndFeatures";
import { SceneAgent } from "./scenes/SceneAgent";
import { SceneDetect } from "./scenes/SceneDetect";
import { SceneCalculate } from "./scenes/SceneCalculate";
import { SceneKnowledgeGraph } from "./scenes/SceneKnowledgeGraph";
import { SceneExamples } from "./scenes/SceneExamples";
import { SceneDevTools } from "./scenes/SceneDevTools";
import { SceneCTA } from "./scenes/SceneCTA";

const SCENES = [
  SceneTitle,
  SceneHero,
  SceneNavAndFeatures,
  SceneAgent,
  SceneDetect,
  SceneCalculate,
  SceneKnowledgeGraph,
  SceneExamples,
  SceneDevTools,
  SceneCTA,
] as const;

/**
 * Intro 主合成（Gemini Canvas 风格）
 * 层级：渐变背景 → 3D 纸片场景 → 景深+关键句叠层 → 光标
 */
export const IntroComposition: React.FC = () => {
  const globalFrame = useCurrentFrame();
  const { sceneIndex, localFrame } = getCurrentSceneAndLocalFrame(globalFrame);

  return (
    <AbsoluteFill
      style={{
        background: theme.introBgGradient,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          perspective: 2200,
          perspectiveOrigin: "50% 50%",
        }}
      >
        {SCENES.map((Scene, i) => {
          if (!isSceneVisible(globalFrame, i)) return null;
          const { enterProgress, exitProgress } = getSceneProgress(globalFrame, i);
          const sceneLocalFrame = globalFrame - getSceneStartFrame(i);
          return (
            <PerspectiveSceneWrapper
              key={i}
              sceneIndex={i}
              globalFrame={globalFrame}
              enterProgress={enterProgress}
              exitProgress={exitProgress}
            >
              {(rotateY) => (
                <PaperCard3D
                  rotateY={rotateY}
                  enterProgress={enterProgress}
                  exitProgress={exitProgress}
                >
                  <AbsoluteFill style={{ backfaceVisibility: "hidden" }}>
                    <Scene localFrame={sceneLocalFrame} />
                  </AbsoluteFill>
                </PaperCard3D>
              )}
            </PerspectiveSceneWrapper>
          );
        })}
      </div>

      <IntroOverlays sceneIndex={sceneIndex} localFrame={localFrame} />
      <CursorAndRipple />
    </AbsoluteFill>
  );
};
