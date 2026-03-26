import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { GEMINI, CANVAS_TIMELINE } from "./constants";
import { GlowButtonWithRipple } from "./GlowButtonWithRipple";

const STIFFNESS = 100;
const DAMPING = 12;

const CODE_SAMPLE = `1  // Build a simple timeline
2  const items = [
3    { date: "Jan", value: 42 },
4    { date: "Feb", value: 78 },
5    { date: "Mar", value: 95 }
6  ];
7  return <Chart data={items} />;
`.trim();

/**
 * Code/Preview 水平切换 + 左侧代码区 + 右侧预览区（Scale + Opacity 进场）
 */
export const CanvasPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tabsOpacity = spring({
    frame,
    fps,
    config: { stiffness: STIFFNESS, damping: DAMPING },
    durationInFrames: 20,
    delay: CANVAS_TIMELINE.tabsVisibleAt,
  });

  const switchProgress = spring({
    frame: frame - CANVAS_TIMELINE.switchToPreviewAt,
    fps,
    config: { stiffness: STIFFNESS, damping: DAMPING },
    durationInFrames: CANVAS_TIMELINE.previewAnimFrames,
    delay: 0,
  });

  const indicatorX = interpolate(switchProgress, [0, 1], [0, 80]);
  const previewScale = interpolate(switchProgress, [0, 1], [0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const previewOpacity = interpolate(switchProgress, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "rgba(13, 13, 26, 0.5)",
      }}
    >
      {/* Code / Preview 选项卡 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 20px",
          borderBottom: GEMINI.borderSubtle,
          opacity: tabsOpacity,
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            gap: 0,
            background: "rgba(0,0,0,0.3)",
            borderRadius: 10,
            padding: 4,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 4,
              top: 4,
              width: 56,
              height: 28,
              borderRadius: 8,
              background: GEMINI.accentGradient,
              transform: `translateX(${indicatorX}px)`,
              transition: "none",
              boxShadow: GEMINI.buttonGlow,
            }}
          />
          <span
            style={{
              position: "relative",
              zIndex: 1,
              padding: "6px 20px",
              fontSize: 13,
              fontWeight: 600,
              color: switchProgress < 0.5 ? "#fff" : "rgba(255,255,255,0.6)",
            }}
          >
            Code
          </span>
          <span
            style={{
              position: "relative",
              zIndex: 1,
              padding: "6px 20px",
              fontSize: 13,
              fontWeight: 600,
              color: switchProgress >= 0.5 ? "#fff" : "rgba(255,255,255,0.6)",
            }}
          >
            Preview
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <GlowButtonWithRipple label="Run" />
      </div>

      {/* 主体：代码区 + 预览区 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
        }}
      >
        {/* 左侧：代码编辑器样式 */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: 16,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            fontSize: 13,
            lineHeight: 1.6,
            color: "#94a3b8",
            borderRight: GEMINI.borderSubtle,
            opacity: tabsOpacity,
          }}
        >
          {CODE_SAMPLE.split("\n").map((line, i) => (
            <div key={i} style={{ display: "flex", gap: 12 }}>
              <span style={{ color: "#64748b", userSelect: "none" }}>
                {i + 1}
              </span>
              <span>{line.replace(/^\d+\s+/, "")}</span>
            </div>
          ))}
        </div>

        {/* 右侧：Preview 内容区，Scale + Opacity 进场 */}
        <div
          style={{
            width: "42%",
            minWidth: 280,
            padding: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: previewOpacity,
            transform: `scale(${previewScale})`,
            transformOrigin: "center center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 360,
              padding: 24,
              borderRadius: 16,
              background: GEMINI.glassBg,
              backdropFilter: "blur(12px)",
              border: GEMINI.borderSubtle,
              boxShadow: "0 0 40px rgba(66, 133, 244, 0.12)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "rgba(66, 133, 244, 0.9)",
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              Chart Preview
            </div>
            <div
              style={{
                height: 180,
                display: "flex",
                alignItems: "flex-end",
                gap: 12,
                padding: "8px 0",
              }}
            >
              {[42, 78, 95, 60, 88].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    borderRadius: 6,
                    background: GEMINI.accentGradient,
                    boxShadow: "0 0 16px rgba(66, 133, 244, 0.3)",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
                fontSize: 11,
                color: "#64748b",
              }}
            >
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
