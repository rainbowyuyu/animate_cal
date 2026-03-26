import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Theme } from "../Theme";
import { Mercury3D } from "./Mercury3D";

const CODE_LINES = [
  "const data = await fetchPeriodicTable();",
  "const timeline = buildTimeline(events);",
  "const map = renderEarthquakeMap(geo);",
  "const game = new SpaceInvaders();",
];
const TAB_SWITCH_AT = 25;
const TAB_SWITCH_DURATION = 22;
const PREVIEW_CARD_DURATION = 180; // 每张卡片约 6s

type PreviewType = "periodic" | "timeline" | "map" | "game";

function getPreviewType(frame: number): PreviewType {
  const i = Math.floor(frame / PREVIEW_CARD_DURATION) % 4;
  return (["periodic", "timeline", "map", "game"] as const)[i];
}

/**
 * Phase D：Code / Preview 切换 + 预览卡片（周期表、时间轴、地震图、游戏）
 */
export const CodeShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tabProgress = spring({
    frame: frame - TAB_SWITCH_AT,
    fps,
    config: { stiffness: 100, damping: 14 },
    durationInFrames: TAB_SWITCH_DURATION,
    delay: 0,
  });
  const previewScale = interpolate(tabProgress, [0, 1], [0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const previewOpacity = tabProgress;

  const previewType = getPreviewType(frame);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1000,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: Theme.font.sans,
      }}
    >
      {/* Code / Preview 选项卡 */}
      <div
        style={{
          display: "flex",
          gap: 0,
          background: "rgba(0,0,0,0.35)",
          borderRadius: 12,
          padding: 4,
          width: "fit-content",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 4,
              top: 4,
              width: 72,
              height: 32,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${Theme.brand.blue}, ${Theme.brand.purple})`,
              transform: `translateX(${tabProgress * 80}px)`,
              boxShadow: Theme.ui.glow,
            }}
          />
          <span
            style={{
              position: "relative",
              zIndex: 1,
              padding: "8px 24px",
              fontSize: 13,
              fontWeight: 600,
              color: tabProgress < 0.5 ? "#fff" : "rgba(255,255,255,0.5)",
            }}
          >
            Code
          </span>
          <span
            style={{
              position: "relative",
              zIndex: 1,
              padding: "8px 24px",
              fontSize: 13,
              fontWeight: 600,
              color: tabProgress >= 0.5 ? "#fff" : "rgba(255,255,255,0.5)",
            }}
          >
            Preview
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, minHeight: 320 }}>
        {/* 左侧：代码区 */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: 16,
            borderRadius: 12,
            background: "rgba(0,0,0,0.4)",
            border: `1px solid ${Theme.ui.border}`,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            fontSize: 13,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {CODE_LINES.map((line, i) => (
            <div key={i} style={{ display: "flex", gap: 12 }}>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>{i + 1}</span>
              <span>{line}</span>
            </div>
          ))}
        </div>

        {/* 右侧：Preview 内容区，Scale + Opacity 进场 */}
        <div
          style={{
            width: 380,
            minWidth: 380,
            opacity: previewOpacity,
            transform: `scale(${previewScale})`,
            transformOrigin: "top left",
          }}
        >
          <PreviewCard type={previewType} frame={frame} />
        </div>
      </div>
    </div>
  );
};

function PreviewCard({
  type,
  frame,
}: {
  type: PreviewType;
  frame: number;
}) {
  const pulse = Math.sin(frame * 0.2) * 0.5 + 0.5;

  if (type === "periodic") {
    return (
      <div
        style={{
          padding: 20,
          borderRadius: 16,
          background: Theme.ui.glassBg,
          backdropFilter: Theme.ui.glassBlur,
          border: `1px solid ${Theme.ui.border}`,
          boxShadow: Theme.ui.glow,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: Theme.brand.blue,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Periodic Table
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Hg", "..."].map(
            (el, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 4px",
                  textAlign: "center",
                  borderRadius: 6,
                  background:
                    el === "Hg"
                      ? `linear-gradient(135deg, ${Theme.brand.blue}, ${Theme.brand.purple})`
                      : "rgba(255,255,255,0.08)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#fff",
                }}
              >
                {el}
              </div>
            )
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Mercury3D />
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            Hg — Mercury 3D
          </span>
        </div>
      </div>
    );
  }

  if (type === "timeline") {
    const milestones = ["Kickoff", "Q1", "Alpha", "Q2", "Beta", "Q3", "Launch", "Q4"];
    const scrollCycle = 140; // 帧数一轮
    const scrollOffset = interpolate(
      frame % scrollCycle,
      [0, scrollCycle],
      [0, -160],
      { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
    );
    return (
      <div
        style={{
          padding: 20,
          borderRadius: 16,
          background: Theme.ui.glassBg,
          backdropFilter: Theme.ui.glassBlur,
          border: `1px solid ${Theme.ui.border}`,
          boxShadow: Theme.ui.glow,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: Theme.brand.blue,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Timeline
        </div>
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "max-content",
              transform: `translateX(${scrollOffset}px)`,
            }}
          >
            {milestones.map((label, i) => (
              <div
                key={i}
                style={{
                  flexShrink: 0,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${Theme.ui.border}`,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.85)",
                  textAlign: "center",
                  minWidth: 56,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === "map") {
    const dots: { left: number; top: number; phase: number; scale: number }[] = [
      { left: 28, top: 35, phase: 0, scale: 1.2 },
      { left: 50, top: 55, phase: 18, scale: 1 },
      { left: 72, top: 40, phase: 36, scale: 0.85 },
      { left: 40, top: 68, phase: 50, scale: 0.7 },
      { left: 62, top: 28, phase: 70, scale: 0.9 },
    ];
    return (
      <div
        style={{
          padding: 20,
          borderRadius: 16,
          background: Theme.ui.glassBg,
          backdropFilter: Theme.ui.glassBlur,
          border: `1px solid ${Theme.ui.border}`,
          boxShadow: Theme.ui.glow,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: Theme.brand.blue,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Earthquake Map
        </div>
        <div
          style={{
            height: 140,
            background: "rgba(0,0,0,0.3)",
            borderRadius: 8,
            position: "relative",
          }}
        >
          {dots.map((d, i) => {
            const phase = (frame + d.phase) % 45;
            const coreScale = 0.7 + 0.5 * Math.sin((frame + d.phase) * 0.15);
            const ringScale = interpolate(phase, [0, 45], [1, 3.2], {
              extrapolateRight: "clamp",
              extrapolateLeft: "clamp",
            });
            const ringOpacity = interpolate(phase, [0, 20, 45], [0.5, 0.35, 0], {
              extrapolateRight: "clamp",
              extrapolateLeft: "clamp",
            });
            const size = 10 * d.scale;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${d.left}%`,
                  top: `${d.top}%`,
                  width: size * 2,
                  height: size * 2,
                  marginLeft: -size,
                  marginTop: -size,
                  borderRadius: "50%",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, rgba(${Theme.brand.blueRgb}, 0.9) 0%, rgba(${Theme.brand.blueRgb}, 0) 65%)`,
                    transform: `scale(${coreScale})`,
                    boxShadow: `0 0 ${12 * d.scale}px rgba(${Theme.brand.blueRgb}, 0.6)`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: size * 2,
                    height: size * 2,
                    marginLeft: -size,
                    marginTop: -size,
                    borderRadius: "50%",
                    border: `2px solid rgba(${Theme.brand.blueRgb}, ${ringOpacity})`,
                    transform: `scale(${ringScale})`,
                    boxShadow: `0 0 ${20 * ringScale}px rgba(${Theme.brand.blueRgb}, ${ringOpacity * 0.8})`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // game: Space Invaders
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 16,
        background: Theme.ui.glassBg,
        backdropFilter: Theme.ui.glassBlur,
        border: `1px solid ${Theme.ui.border}`,
        boxShadow: Theme.ui.glow,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: Theme.brand.blue,
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        Space Invaders
      </div>
      <div
        style={{
          height: 140,
          background: "rgba(0,0,0,0.3)",
          borderRadius: 8,
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: 4,
          padding: 8,
          alignContent: "end",
        }}
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background:
                i % 4 === 0
                  ? Theme.brand.purple
                  : "rgba(255,255,255,0.15)",
            }}
          />
        ))}
        <div
          style={{
            gridColumn: "1 / -1",
            height: 8,
            marginTop: 8,
            background: Theme.brand.blue,
            borderRadius: 4,
            width: 40,
            justifySelf: "center",
          }}
        />
      </div>
    </div>
  );
}
