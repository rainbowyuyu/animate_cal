import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Theme } from "./Theme";
import { Background, Intro, CanvasWrapper, CollaborationText, WritingScene, CodeShowcase } from "./components";

const FPS = Theme.timeline.fps;
const INTRO_DURATION = Theme.timeline.introEnd; // 0–3s
const CONCEPT_DURATION = Theme.timeline.conceptEnd - Theme.timeline.introEnd; // 3–10s
const WRITING_DURATION = Theme.timeline.writingEnd - Theme.timeline.conceptEnd; // 10–30s
const SHOWCASE_DURATION = Theme.timeline.showcaseEnd - Theme.timeline.writingEnd; // 30–50s

/**
 * Gemini Canvas 1:1 主合成
 * 用 Sequence 按时间轴切段：Intro → Concept → Writing → Showcase
 */
export const GeminiComposition: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: Theme.background.start }}>
      <Background />

      <Sequence from={0} durationInFrames={INTRO_DURATION}>
        <Intro />
      </Sequence>

      <Sequence from={INTRO_DURATION} durationInFrames={CONCEPT_DURATION}>
        <CanvasWrapper>
          <CollaborationText />
        </CanvasWrapper>
      </Sequence>

      <Sequence
        from={INTRO_DURATION + CONCEPT_DURATION}
        durationInFrames={WRITING_DURATION}
      >
        <CanvasWrapper>
          <WritingScene />
        </CanvasWrapper>
      </Sequence>

      <Sequence
        from={INTRO_DURATION + CONCEPT_DURATION + WRITING_DURATION}
        durationInFrames={SHOWCASE_DURATION}
      >
        <CanvasWrapper>
          <CodeShowcase />
        </CanvasWrapper>
      </Sequence>
    </AbsoluteFill>
  );
};
