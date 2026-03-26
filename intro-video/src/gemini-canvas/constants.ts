/** Gemini 风格视觉常量 */
export const GEMINI = {
  bgGradient: "linear-gradient(180deg, #000000 0%, #0d0d1a 50%, #0a0a14 100%)",
  accentBlue: "#4285f4",
  accentPurple: "#8e44ad",
  accentGradient: "linear-gradient(135deg, #4285f4 0%, #9b59b6 100%)",
  fontSans: "'Inter', 'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  glowShadow:
    "0 0 10px rgba(66, 133, 244, 0.5), 0 0 30px rgba(66, 133, 244, 0.2)",
  glowShadowLayers: [
    "drop-shadow(0 0 8px rgba(66, 133, 244, 0.6))",
    "drop-shadow(0 0 24px rgba(66, 133, 244, 0.3))",
    "drop-shadow(0 0 40px rgba(66, 133, 244, 0.15))",
  ].join(" "),
  /** 按钮多层发光 */
  buttonGlow:
    "0 0 10px rgba(66, 133, 244, 0.5), 0 0 30px rgba(66, 133, 244, 0.2)",
  glassBg: "rgba(20, 20, 35, 0.85)",
  borderSubtle: "1px solid rgba(66, 133, 244, 0.25)",
} as const;

/** 默认演示文案（单词拆解用） */
export const INTRO_PHRASE = "Re-imagined for better collaboration";

/** 设备内时间轴（Sequence 内 local frame）：侧栏、Code/Preview、按钮点击等 */
export const CANVAS_TIMELINE = {
  sidebarStart: 8,
  sidebarStagger: 8,
  tabsVisibleAt: 25,
  switchToPreviewAt: 50,
  previewAnimFrames: 22,
  canvasButtonClickAt: 75,
  rippleDuration: 14,
} as const;
