import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

/** 前 durationFrames 帧从 0 到 1 的透明度，之后保持 1 */
export function useFadeIn(durationFrames: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
}

/** 弹性出现 (0→1)，用于标题等 */
export function useSpringIn(delayFrames = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - delayFrames,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
    delay: delayFrames,
  });
}

/** 上移 + 淡入，用于副标题 */
export function useSlideUpFadeIn(startFrame: number, durationFrames: number) {
  const frame = useCurrentFrame();
  const progress = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );
  const opacity = progress;
  const y = interpolate(progress, [0, 1], [24, 0]);
  return { opacity, transform: `translateY(${y}px)` };
}
