import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { GEMINI, CANVAS_TIMELINE } from "./constants";

const STIFFNESS = 100;
const DAMPING = 12;

type GlowButtonWithRippleProps = {
  label: string;
  /** 在第几帧“点击”（触发涟漪），相对 Sequence 内 frame */
  clickAtFrame?: number;
};

/**
 * 发光边框按钮，点击时产生向外扩散的涟漪 + 发光加强
 */
export const GlowButtonWithRipple: React.FC<GlowButtonWithRippleProps> = ({
  label,
  clickAtFrame = CANVAS_TIMELINE.canvasButtonClickAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clickFrame = clickAtFrame;
  const rippleStart = frame - clickFrame;
  const isRippleActive = rippleStart >= 0 && rippleStart <= CANVAS_TIMELINE.rippleDuration;

  const rippleScale = interpolate(
    rippleStart,
    [0, CANVAS_TIMELINE.rippleDuration],
    [0.3, 2.8],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const rippleOpacity = interpolate(
    rippleStart,
    [0, 4, CANVAS_TIMELINE.rippleDuration],
    [0, 0.5, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const pulseProgress = spring({
    frame: frame - clickFrame,
    fps,
    config: { stiffness: 180, damping: DAMPING },
    durationInFrames: 12,
    delay: 0,
  });
  const glowIntensity = isRippleActive ? 0.5 + pulseProgress * 0.3 : 0.4;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {isRippleActive && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 80,
            height: 80,
            marginLeft: -40,
            marginTop: -40,
            borderRadius: "50%",
            border: `2px solid rgba(66, 133, 244, ${rippleOpacity})`,
            transform: `scale(${rippleScale})`,
            pointerEvents: "none",
            boxShadow: `0 0 30px rgba(66, 133, 244, ${rippleOpacity * 0.8})`,
          }}
        />
      )}
      <button
        type="button"
        style={{
          position: "relative",
          padding: "12px 24px",
          borderRadius: 12,
          border: `1px solid rgba(66, 133, 244, 0.5)`,
          background: `linear-gradient(135deg, rgba(66, 133, 244, 0.25) 0%, rgba(155, 89, 182, 0.2) 100%)`,
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          cursor: "default",
          boxShadow: `0 0 ${12 + glowIntensity * 20}px rgba(66, 133, 244, ${glowIntensity})`,
          filter: GEMINI.glowShadowLayers,
        }}
      >
        {label}
      </button>
    </div>
  );
};
