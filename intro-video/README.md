# 智算视界 · 介绍视频 (Remotion)

本目录为 [智算视界](https://wiscomper.com) 网站的介绍视频项目，使用 [Remotion](https://www.remotion.dev/) 以 React 编写。整片采用 **Gemini Canvas 风格**：深色蓝紫渐变背景、3D 纸片运镜、统一叠层与弹性动效。

## 特性

- **视觉**：深色渐变背景（#000 → #0d0d1a）、蓝紫强调色与纸片厚度边、景深暗角 + 关键句叠层（一层 `IntroOverlays`，不散乱）。
- **3D 视角**：每个场景为纸片卡片，在统一透视下旋入/旋出（`rotateY` + `translateZ`），静止时每页不同基础角度 + 缓慢旋转。
- **模拟光标与涟漪**：全片一条轨迹（`cursorTimeline.ts`），点击帧触发扩散涟漪；光标带跟随柔光。
- **结构**：`IntroComposition` 层级固定为「渐变背景 → 3D 场景 → 景深+关键句 → 光标」，便于维护。

## 分镜概览（约 26 秒，10 段）

| 顺序 | 场景 | 内容 |
|------|------|------|
| 1 | 片头 | Logo +「智算视界」+ 副标题 |
| 2 | Hero | 「让数学计算 看得见、摸得着」+ CTA |
| 3 | 导航与功能卡 | 导航栏 + 智能体 / 视觉识别 / 动态推演 三卡 |
| 4 | 智能体 | 侧边栏 + 聊天区 |
| 5 | 智能识别 | 手写/上传、画布、LaTeX 输出 |
| 6 | 动态计算 | 演示模式、公式输入、生成动画、系统日志 |
| 7 | 知识图谱 | 全站知识图谱 + 3D 图谱占位 |
| 8 | 教学案例 | 筛选 + 案例卡片网格 |
| 9 | 开发者工具 | LaTeX / Manim / rainbow鱼 工作台 |
| 10 | 片尾 CTA | Logo + 智算视界 + 试试智能体 / 立即体验 |

## 项目结构

```
intro-video/
├── public/              # 静态资源（如 logo）
├── src/
│   ├── index.ts         # registerRoot 入口
│   ├── Root.tsx         # Composition 注册与总时长
│   ├── IntroComposition.tsx  # 全局帧、3D 透视容器、场景与光标
│   ├── sceneConfig.ts   # 每段时长、过渡帧数、可见区间
│   ├── cursorTimeline.ts    # 光标 waypoints 与点击
│   ├── theme.ts         # 深色主题 + Intro 用 Gemini 风格渐变/发光
│   ├── components/
│   │   ├── PerspectiveSceneWrapper.tsx  # 单场景 3D 进入/退出
│   │   ├── PaperCard3D.tsx              # 纸片厚度与景深
│   │   ├── IntroOverlays.tsx            # 景深暗角 + 关键句（一层）
│   │   └── CursorAndRipple.tsx         # 光标 + 涟漪
│   └── scenes/          # 各分镜（支持 localFrame 以配合全局时间轴）
│       ├── SceneTitle.tsx
│       ├── SceneHero.tsx
│       ├── SceneNavAndFeatures.tsx
│       ├── SceneAgent.tsx
│       ├── SceneDetect.tsx
│       ├── SceneCalculate.tsx
│       ├── SceneKnowledgeGraph.tsx
│       ├── SceneExamples.tsx
│       ├── SceneDevTools.tsx
│       └── SceneCTA.tsx
├── package.json
├── remotion.config.ts
└── README.md
```

## 环境与运行

- **Node.js 18+**（本项目可在仓库 `.venv` 下通过 nodeenv 安装 Node 后使用）

```bash
# 安装依赖（若 PATH 含 .venv/Scripts）
npm install

# 预览
npm start

# 渲染 MP4
npm run build
```

输出：`intro-video/out/intro.mp4`（1920×1080，30fps）。

## Gemini Canvas 风格合成（GeminiCanvas）

在 Remotion Studio 中可选择 **Composition: GeminiCanvas**，体验复刻 Google Gemini Canvas 宣传片风格的演示：

- **视觉**：深色渐变背景（#000 → #0d0d1a）、Gemini 蓝 #4285f4 与紫色渐变、多层发光（drop-shadow）、无衬线字体。
- **文字拆解**：`gemini-canvas/IntroScene.tsx` 将文案按单词拆分，每个单词用 `spring`（stiffness 100、damping 12）做错峰位移与淡入，形成「单词拆解并重新组合」的进场。
- **设备切换**：`gemini-canvas/DeviceMockup.tsx` 根据当前帧用 `spring` 将容器从手机尺寸（375×812）平滑缩放到桌面尺寸（1920×1080），内部可放 Code/Preview 或录屏。
- **分阶段**：`GeminiCanvasComposition.tsx` 用 `Sequence` 分两段——开场文案（约 90 帧）+ 设备演示（约 210 帧）。

渲染该合成示例：

```bash
npx remotion render src/index.ts GeminiCanvas out/gemini-canvas.mp4
```

## 调整光标轨迹

编辑 `src/cursorTimeline.ts` 中的 `CURSOR_WAYPOINTS`：每项为 `{ frame, x, y, click? }`，相邻两点之间自动插值（缓动），带 `click: true` 的帧会触发涟漪。

## 许可证

与主仓库一致，仅供学习与展示使用。
