import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Theme } from "../Theme";

const SAMPLE_LINES = [
  "Communication is the foundation of human interaction.",
  "Different styles impact how messages are received.",
  "Adapt your approach to connect more effectively.",
];
const TYPING_CHARS_PER_FRAME = 2;
const SLIDER_APPEAR_AT = 90;
const SLIDER_APPEAR_DURATION = 25;
const SUGGEST_EDIT_AT = 220;
const SUGGEST_APPEAR_DURATION = 30;
const SLIDER_HEIGHT = 120;

/**
 * Phase C：交互式 Canvas 写作
 * - 左上角逐字打入
 * - 右侧调节杆（模拟点击后出现，滑块移动表示长短变化）
 * - Suggest Edits 发光弹出框 + 浅紫遮罩
 */
export const WritingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fullText = SAMPLE_LINES.join("\n");
  const totalChars = fullText.length;
  const visibleChars = Math.min(
    totalChars,
    Math.floor(frame * TYPING_CHARS_PER_FRAME)
  );

  const sliderProgress = spring({
    frame: frame - SLIDER_APPEAR_AT,
    fps,
    config: { stiffness: 100, damping: 14 },
    durationInFrames: SLIDER_APPEAR_DURATION,
    delay: 0,
  });
  const sliderValue = interpolate(
    frame,
    [SLIDER_APPEAR_AT + 40, SLIDER_APPEAR_AT + 120],
    [30, 85],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const suggestProgress = spring({
    frame: frame - SUGGEST_EDIT_AT,
    fps,
    config: { stiffness: 100, damping: 14 },
    durationInFrames: SUGGEST_APPEAR_DURATION,
    delay: 0,
  });

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 900,
        display: "flex",
        gap: 48,
        alignItems: "flex-start",
        fontFamily: Theme.font.sans,
        position: "relative",
      }}
    >
      {/* 左侧：逐字打入的文案 */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: "24px 28px",
          borderRadius: 16,
          background: Theme.ui.glassBg,
          backdropFilter: Theme.ui.glassBlur,
          border: `1px solid ${Theme.ui.border}`,
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 18,
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.9)",
            whiteSpace: "pre-wrap",
          }}
        >
          {fullText.slice(0, visibleChars)}
          {visibleChars < totalChars && (
            <span style={{ opacity: 0.7 }}>|</span>
          )}
        </div>

        {/* Suggest Edits：浅紫半透明遮罩 + 发光框 */}
        {suggestProgress > 0 && (
          <div
            style={{
              position: "absolute",
              left: 24,
              top: 72,
              right: 24,
              bottom: 24,
              background: `rgba(${Theme.brand.purpleRgb}, ${0.15 * suggestProgress})`,
              borderRadius: 12,
              pointerEvents: "none",
              opacity: suggestProgress,
            }}
          />
        )}
      </div>

      {/* Suggest Edits 弹出框 */}
      {suggestProgress > 0 && (
        <div
          style={{
            position: "absolute",
            left: 28,
            top: 68,
            padding: "12px 18px",
            borderRadius: 12,
            background: Theme.ui.glassBg,
            backdropFilter: Theme.ui.glassBlur,
            border: `1px solid rgba(${Theme.brand.purpleRgb}, 0.4)`,
            boxShadow: Theme.ui.glowStrong,
            opacity: suggestProgress,
            transform: `translateY(${(1 - suggestProgress) * 8}px)`,
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: Theme.brand.purple,
            }}
          >
            Suggest edits
          </span>
        </div>
      )}

      {/* 右侧：调节杆（点击后出现） */}
      <div
        style={{
          opacity: sliderProgress,
          transform: `translateX(${(1 - sliderProgress) * 20}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.6)",
            fontWeight: 500,
          }}
        >
          Length
        </span>
        <div
          style={{
            width: 8,
            height: SLIDER_HEIGHT,
            borderRadius: 4,
            background: "rgba(255,255,255,0.1)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: -4,
              width: 16,
              height: 12,
              borderRadius: 6,
              background: `linear-gradient(135deg, ${Theme.brand.blue}, ${Theme.brand.purple})`,
              boxShadow: Theme.ui.glow,
              top: `${100 - sliderValue}%`,
              marginTop: -6,
            }}
          />
        </div>
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {Math.round(sliderValue)}%
        </span>
      </div>
    </div>
  );
};
