/**
 * Gemini Canvas 1:1 还原 — 设计系统 (Design System)
 * 规范来源：Cursor 高级系统提示词（背景色、品牌色、UI 材质、缓动）
 */

export const Theme = {
  /** 背景：纯黑 → 极深紫 */
  background: {
    start: "#000000",
    end: "#050110",
    gradient: "linear-gradient(180deg, #000000 0%, #050110 100%)",
  },

  /** 品牌色 */
  brand: {
    blue: "#4285F4",
    purple: "#9B72FF",
    blueRgb: "66, 133, 244",
    purpleRgb: "155, 114, 255",
  },

  /** UI 材质（对应 Tailwind 类名与原始值） */
  ui: {
    /** 背景层：半透明锌 + 毛玻璃 */
    glassBg: "rgba(39, 39, 42, 0.5)", // zinc-900/50
    glassBlur: "blur(24px)", // backdrop-blur-xl
    /** 边框 */
    border: "rgba(255, 255, 255, 0.1)",
    borderClass: "border border-white/10",
    /** 霓虹发光 */
    glow: "0 0 30px rgba(66, 133, 244, 0.2)",
    glowStrong: "0 0 40px rgba(66, 133, 244, 0.35)",
  },

  /** 字体 */
  font: {
    sans: "'Google Sans', 'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
  },

  /**
   * Google 标准缓动：Bezier(0.4, 0, 0.2, 1)
   * Remotion 中可用 easing 或自定义 cubic-bezier
   */
  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    /** 用于 interpolate 的 Bezier 近似（Remotion 无直接 cubic-bezier，可用 ease 或此数组做 control points） */
    bezier: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },

  /** 时间轴节奏（秒 → 帧，按 30fps 计） */
  timeline: {
    fps: 30,
    introEnd: 3 * 30,      // 0–3s: Intro
    conceptEnd: 10 * 30,   // 3–10s: Text/Concept
    writingEnd: 30 * 30,   // 10–30s: Writing Features
    showcaseEnd: 50 * 30,  // 30–50s: Coding & Showcase
  },
} as const;

export type ThemeType = typeof Theme;
