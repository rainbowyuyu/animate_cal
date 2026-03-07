import { Composition } from "remotion";
import { IntroComposition } from "./IntroComposition";
import { TOTAL_DURATION } from "./sceneConfig";
import { GeminiCanvasComposition } from "./gemini-canvas/GeminiCanvasComposition";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

/** Gemini Canvas 风格演示时长（帧） */
const GEMINI_CANVAS_DURATION = 300;

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="Intro"
        component={IntroComposition}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
      <Composition
        id="GeminiCanvas"
        component={GeminiCanvasComposition}
        durationInFrames={GEMINI_CANVAS_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
    </>
  );
};
