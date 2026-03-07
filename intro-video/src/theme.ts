/**
 * 与 html_root 站点一致的视觉主题（深色模式）
 * Intro 采用 Gemini Canvas 风格：深色渐变背景、蓝紫强调、发光与 spring 动效
 */
export const theme = {
  // 深色背景
  bgBody: "#0f172a",
  bgSurface: "#1e293b",
  bgGlass: "rgba(30, 41, 59, 0.85)",
  bgInput: "#0f172a",
  border: "#334155",
  border2: "2px solid #334155",

  /** Intro 全局背景：Gemini 风格深蓝紫渐变 */
  introBgGradient: "linear-gradient(180deg, #000000 0%, #0d0d1a 48%, #0a0a14 100%)",

  /** 强调色（与 Gemini 一致，用于发光、按钮、纸片边） */
  accentBlue: "#4285f4",
  accentPurple: "#9b59b6",
  /** 纸片厚度边 / 发光渐变 */
  accentGradient: "linear-gradient(180deg, #8b5cf6 0%, #6366f1 40%, #3b82f6 80%, #60a5fa 100%)",
  glowShadowLayers:
    "drop-shadow(0 0 8px rgba(66, 133, 244, 0.5)) drop-shadow(0 0 24px rgba(66, 133, 244, 0.2))",

  // 主色（与 CSS var 一致）
  primary: "#3b82f6",
  primaryHover: "#60a5fa",
  secondary: "#8b5cf6",
  accent: "#22d3ee",

  // 文字
  textMain: "#f1f5f9",
  textSecondary: "#94a3b8",
  textInverse: "#0f172a",

  // 阴影（与站点一致）
  shadowSm: "0 1px 3px 0 rgba(0, 0, 0, 0.3)",
  shadowMd: "0 4px 12px -2px rgba(0, 0, 0, 0.4)",
  shadowLg: "0 12px 24px -4px rgba(0, 0, 0, 0.5)",
  shadowGlow: "0 0 30px rgba(59, 130, 246, 0.4)",
  shadowPanel:
    "0 4px 24px -8px rgba(0, 0, 0, 0.08), 0 2px 12px -4px rgba(0, 0, 0, 0.04)",
  shadowPanelHover:
    "0 8px 32px -8px rgba(37, 99, 235, 0.12), 0 4px 16px -4px rgba(0, 0, 0, 0.06)",
  shadowDisplay:
    "inset 0 0 60px rgba(0, 0, 0, 0.12), 0 4px 24px -8px rgba(0, 0, 0, 0.1)",
  shadowSidebar: "2px 0 12px rgba(0, 0, 0, 0.04)",
  shadowCtaPrimary:
    "0 10px 30px -10px rgba(37, 99, 235, 0.4), 0 0 0 0 rgba(37, 99, 235, 0.2)",

  // 圆角（与 var 一致）
  radiusSm: 8,
  radiusMd: 16,
  radiusLg: 24,

  // 尺寸（与站点布局一致）
  agentSidebarWidth: 300,
  calcSidebarWidth: 420,
  toolsPanelWidth: 280,

  fontFamily: "'Plus Jakarta Sans', 'Microsoft YaHei', 'Inter', sans-serif",
} as const;

export type Theme = typeof theme;
