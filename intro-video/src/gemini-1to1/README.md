# Gemini Canvas 1:1 还原 — 模块说明

按 Cursor 系统提示词分阶段实现，时间轴与组件对应如下。

## 时间轴 (Series)

| 时间段 | 时长 | 对应组件 / 内容 |
|--------|------|------------------|
| 0–3s   | Intro | `Intro.tsx`（如 "Hello, Teresa"） |
| 3–10s  | Text/Concept | `CollaborationText.tsx`（字母聚合） |
| 10–30s | Writing Features | `WritingScene.tsx`（打字、调节杆、Suggest Edits） |
| 30–50s | Coding & Showcase | `CodeShowcase.tsx`（Code/Preview、周期表/时间轴/地图/游戏） |

## 组件与文件结构

```
gemini-1to1/
├── Theme.ts              # 设计系统（颜色、缓动、时间轴常量）
├── README.md             # 本说明
├── components/
│   ├── Background.tsx    # 动态背景（Step 2）
│   ├── Intro.tsx         # "Hello, Teresa" 片段（Step 3）
│   ├── GeminiShell.tsx   # Phase A：侧边栏 + 中央区 + 底部输入/Canvas 按钮
│   ├── CollaborationText.tsx  # Phase B：collaboration 字母聚合
│   ├── WritingScene.tsx  # Phase C：打字、调节杆、Suggest Edits
│   ├── CodeShowcase.tsx  # Phase D：Code/Preview Tab + 预览卡片
│   └── CanvasWrapper.tsx # 交互外壳（Step 4）
└── GeminiComposition.tsx # 主合成，用 <Series> 对齐节奏（Step 5）
```

## 样式与 Tailwind

- 设计 token 以 `Theme.ts` 为准；Tailwind 的 `tailwind.config.js` 已扩展 `gemini-blue`、`gemini-purple`、`gemini-glow` 等。
- 若启用 Tailwind，需在 `remotion.config.ts` 中 `enableTailwind(currentConfiguration)`，并在入口引入 `index.css`（`@import "tailwindcss"` 或 v3 的 `@tailwind`）。

## 当前进度

- **Gemini1to1** 合成已完整：0–3s Intro、3–10s CollaborationText、10–30s WritingScene、30–50s CodeShowcase，无占位。
- 所有 Phase A–D 组件已实现并接入 Root（合成 id: **Gemini1to1**，50s，30fps）。

## 可选后续

- 为周期表增加 Mercury 等 3D 展示（如接入 Three.js）
- 细化时间轴横向滚动、地震图数据与脉冲节奏
- 为 Canvas 按钮增加扫光 (shimmer) 动效
