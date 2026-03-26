import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { getCursorStateAtFrame, getRipplesVisibleAtFrame, RIPPLE_DURATION } from "../cursorTimeline";

const CURSOR_SIZE = 28;

/** 单次点击涟漪：双层扩散 + 柔和高光，从 clickFrame 开始 */
const Ripple: React.FC<{ clickFrame: number; x: number; y: number }> = ({ clickFrame, x, y }) => {
  const frame = useCurrentFrame();
  const age = frame - clickFrame;
  const scaleOuter = interpolate(age, [0, RIPPLE_DURATION], [0.2, 2.5], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const scaleInner = interpolate(age, [0, RIPPLE_DURATION], [0.15, 1.4], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const opacityOuter = interpolate(age, [0, 3, RIPPLE_DURATION], [0, 0.5, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const opacityInner = interpolate(age, [0, 5, RIPPLE_DURATION], [0, 0.35, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  if (age < 0 || age > RIPPLE_DURATION) return null;
  const cx = x;
  const cy = y;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          width: 56,
          height: 56,
          marginLeft: -28,
          marginTop: -28,
          borderRadius: "50%",
          border: "2px solid rgba(147, 197, 253, 0.85)",
          transform: `scale(${scaleOuter})`,
          opacity: opacityOuter,
          pointerEvents: "none",
          boxShadow: "0 0 24px rgba(59, 130, 246, 0.35)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          width: 40,
          height: 40,
          marginLeft: -20,
          marginTop: -20,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(147,197,253,0.1) 50%, transparent 70%)",
          transform: `scale(${scaleInner})`,
          opacity: opacityInner,
          pointerEvents: "none",
        }}
      />
    </>
  );
};

/** 光标本体：带轻微阴影和点击压下效果 */
export const CursorAndRipple: React.FC = () => {
  const frame = useCurrentFrame();
  const { x, y, clicking } = getCursorStateAtFrame(frame);
  const ripples = getRipplesVisibleAtFrame(frame);

  return (
    <>
      {/* 涟漪：只渲染当前帧可见的 */}
      {ripples.map((r, i) => (
        <Ripple key={i} clickFrame={r.frame} x={r.x} y={r.y} />
      ))}
      {/* 光标跟随的柔光 */}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: 160,
          height: 160,
          marginLeft: -80,
          marginTop: -80,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(147, 197, 253, 0.08) 0%, rgba(59, 130, 246, 0.03) 40%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 9998,
        }}
      />
      {/* 光标 */}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: CURSOR_SIZE,
          height: CURSOR_SIZE,
          marginLeft: -4,
          marginTop: -4,
          pointerEvents: "none",
          zIndex: 9999,
        }}
      >
        {/* 外圈光晕 */}
        <div
          style={{
            position: "absolute",
            width: CURSOR_SIZE + 16,
            height: CURSOR_SIZE + 16,
            left: -8,
            top: -8,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(147, 197, 253, 0.25) 0%, transparent 70%)",
            transform: clicking ? "scale(0.85)" : "scale(1)",
            transition: "transform 0.05s",
          }}
        />
        {/* 主点 */}
        <div
          style={{
            width: CURSOR_SIZE,
            height: CURSOR_SIZE,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.95)",
            border: "2px solid rgba(59, 130, 246, 0.8)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.5)",
            transform: clicking ? "scale(0.9)" : "scale(1)",
          }}
        />
        {/* 中心高光 */}
        <div
          style={{
            position: "absolute",
            left: 6,
            top: 6,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.9)",
            boxShadow: "inset 0 0 4px rgba(59,130,246,0.3)",
          }}
        />
      </div>
    </>
  );
};
