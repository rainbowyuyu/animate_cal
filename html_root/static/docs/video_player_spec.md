# 教学案例 · 视频播放器技术规格书

本文档对「教学案例」模块中的视频栏做完整技术拆解，结合 B 站/抖音网页播放器的业界实践，并与本站现有样式与架构对齐。适用于后续迭代、重构或新成员接入。

---

## 一、整体架构：多层叠加系统 (Layered System)

播放器采用**从下到上的绝对定位叠加**，与 B 站等主流播放器一致。各层通过 `z-index` 与 `pointer-events` 控制点击穿透。

### 1.1 层级定义（从底到顶）

| 层级 | 名称 | 实现方式 | 当前状态 | 说明 |
|------|------|----------|----------|------|
| 0 | 背景层 | `.video-player-wrapper` 背景色 | ✅ 已有 | 深色 `#0f172a`，填充 16:9 留白 |
| 1 | 视频层 | `<video id="example-video-player">` | ✅ 已有 | 无原生 `controls`，由自制控制栏操作 |
| 2 | 防挡弹幕蒙版层 | CSS Mask / Canvas 蒙版 | ❌ 未实现 | B 站黑科技：弹幕从人像背后穿过，依赖服务端预生成蒙版数据 |
| 3 | 弹幕渲染层 | `#video-danmaku-layer`（DOM） | ✅ 已有 | 当前为 DOM 节点 + CSS 动画；可演进为 Canvas 以提升性能 |
| 4 | 高能进度条层 | 进度条上方波形/曲线 | ❌ 未实现 | 可选：根据「高能时刻」数组绘制 SVG/Canvas 曲线 |
| 5 | 中央大播放键 | `.custom-player-center-play` | ✅ 已有 | 暂停时显示，点击播放；B 站/抖音风格 |
| 6 | 控制栏层 | `.custom-player-controls` | ✅ 已有 | 进度条 + 播放/时间/音量/倍速/弹幕/全屏 |
| 7 | 悬浮提示层 | 进度条 tooltip、倍速/音量菜单 | ✅ 已有 | 悬停进度条显示时间；倍速、音量为悬浮面板 |
| 8 | 交互反馈层 | Toast、Loading | 部分 | 评论/弹幕发送用站点统一 `showToast`；缓冲转圈可扩展 |

### 1.2 与本站样式的结合

- **主题色**：控制栏高亮、进度条已播放段、弹幕「我的」样式使用 CSS 变量 `var(--primary-color)`（与全站一致）。
- **B 站风格点缀**：激活态使用 `#00aeec`，中央播放键悬停使用 `rgba(251, 114, 153, 0.85)`（B 站粉），不改变全站主色。
- **圆角与玻璃感**：控制栏为底部渐变遮罩 + 圆角按钮，与站点 `glass-panel`、`border-radius` 风格统一。
- **字体**：时间显示使用默认无衬线字体；若需防止数字跳动，可对时间区域使用等宽字体（如 `tabular-nums` 或 `font-variant-numeric: tabular-nums`）。

---

## 二、视觉与 UI 层 (The Look & Feel)

### 2.1 DOM 结构（当前）

```
#video-player-wrapper (.video-player-wrapper)
├── <video id="example-video-player">          <!-- 无 controls，autoplay playsinline -->
├── #video-danmaku-layer (.video-danmaku-layer) <!-- 弹幕层，全屏/半屏/1/4 屏 class -->
├── #custom-player-center-play                 <!-- 中央大播放键，暂停时显示 -->
└── .custom-player-controls                     <!-- 底部控制栏 -->
    ├── .custom-player-progress-wrap            <!-- 进度条容器 + 悬停 tooltip -->
    │   └── .custom-player-progress-track
    │       ├── .custom-player-progress-loaded  <!-- 缓冲 -->
    │       ├── .custom-player-progress-played   <!-- 已播放 -->
    │       └── .custom-player-progress-hover   <!-- 悬停预览 -->
    └── .custom-player-bar
        ├── .custom-player-left                 <!-- 播放按钮 + 时间 -->
        └── .custom-player-right                <!-- 音量 | 倍速 | 弹幕 | 屏幕模式 | 全屏 -->
```

### 2.2 CSS 关键技术点

- **控制栏显隐**：控制栏常显；若需 B 站式「鼠标离开后下移消失」，可对 `.custom-player-controls` 使用 `transform: translateY(100%)` + `opacity: 0`，在 `.video-player-wrapper:hover` 时还原。
- **进度条**：细条（4px）悬停变粗（6px），`transition: height 0.15s`；已播放/缓冲/悬停三条带用 `width` 百分比由 JS 更新。
- **全屏**：
  - **网页全屏**：对 `#video-player-wrapper` 使用 `Element.requestFullscreen()`，全屏时按钮图标切换为「缩小」。
  - **系统全屏**：同上 API；样式上无需额外 `position: fixed; 100vw/100vh`，Fullscreen API 已接管。
- **图标**：当前使用 Font Awesome（`fa-solid`），与全站一致；若需更细腻动效可改为内联 SVG 或 `<use>`。

### 2.3 控制栏按钮与功能

| 按钮 | 功能 | 说明 |
|------|------|------|
| 播放/暂停 | 切换 `video.play() / video.pause()` | 同步中央大键显隐与图标 |
| 时间 | 当前 / 总时长 | `timeupdate` 驱动，`formatDuration` 格式化 |
| 进度条 | 点击 seek、悬停显示时间 | 无缩略图；可扩展雪碧图预览 |
| 音量 | 滑块 0–100 映射 `video.volume`，按钮静音/恢复 | 悬停显示竖向滑块面板 |
| 倍速 | 0.5x–2x 菜单，写 `video.playbackRate` | 悬浮菜单，选中态高亮 |
| 弹幕开关 | 显示/隐藏弹幕层 | 与设置页「显示弹幕」可同步 |
| 屏幕模式 | 全屏 / 半屏 / 1/4 屏 | 弹幕区域压缩，非裁切画面 |
| 全屏 | 进入/退出 Fullscreen | 仅对 wrapper 全屏 |

---

## 三、核心播放逻辑层 (The Engine)

### 3.1 当前方案（MSE/HLS + MP4 回退）

- **片源**：由 `setVideoSource(player, url, opts)` 统一接管。支持两种方式：
  - **HLS（MSE）**：当 `url` 以 `.m3u8` 结尾或接口返回 `hls_url` 时，使用 **hls.js** 加载 HLS 流并 `attachMedia(video)`，通过 MSE 写入 `SourceBuffer`，实现切片加载与多码率能力。
  - **MP4 回退**：无 HLS 或 hls.js 不可用时，直接 `player.src = url`、`player.load()`。
- **Safari**：若 `video.canPlayType('application/vnd.apple.mpegurl')` 支持，则直接设 `player.src = hlsUrl`，使用原生 HLS。
- **错误回退**：HLS 发生致命网络错误时，若当前 URL 为 MP4，会回退为原生 MP4 播放。

### 3.2 播放状态与事件

- **初始化**：`playExample(..., options)` 内调用 `setVideoSource(player, videoSrc, { hlsUrl })`，再 `player.play().catch(() => {})`；`initCustomPlayer()` 仅绑定一次 UI 与事件。
- **事件**：与 3.1 一致（play/pause/timeupdate/progress/loadedmetadata）。
- **seek**：进度条点击 seek 逻辑不变；HLS 下由 hls.js 负责切片 seek。

### 3.3 预览图（雪碧图）

- **后端**：`/api/examples` 可返回 `sprite_url`、`sprite_cols`、`sprite_rows`、`duration_sec`（metadata.json 或接口扩展）。雪碧图为多张缩略图拼成一张大图（如 10×10 格）。
- **前端**：进度条悬停时，`updatePreviewBox()` 根据鼠标位置对应时间 `t` 与总时长 `duration` 计算索引 `index = (t/duration)*cols*rows`，再算列/行得到 `background-position`，在 `.custom-player-preview-box` 上显示对应格；无 `sprite_url` 时仅显示时间文字。

### 3.4 可选扩展（参考 B 站）

- **HEVC/软解**：若需 HEVC 且浏览器不支持，可引入 WASM 版 FFmpeg 软解并输出到 Canvas（与当前 `<video>` 方案二选一或按能力切换）。

---

## 四、弹幕系统层 (The Danmaku)

### 4.1 当前实现（Canvas + 轨道 + 对象池 + 防挡）

- **渲染**：单层 `<canvas id="video-danmaku-canvas">` 覆盖视频，每帧 `requestAnimationFrame` 重绘，目标 60fps。
- **数据**：打开视频时请求 `GET /api/examples/danmaku?video_id=xxx`，得到 `{ time, text, username }` 数组，按 `time` 排序存入 `danmakuList`；与 `video.currentTime` 比对，`list[i].time <= currentTime` 时调用 `emit(text, isMine)` 入队。
- **轨道管理**：维护 `trackRight[track]` 为每轨当前最右弹幕的右缘；新弹幕发射时 `findTrack(width)` 遍历轨道 0～N-1（**优先填满顶部轨道**），若 `trackRight[t] + 间距 < 画布宽度` 则该轨可用，新弹幕从右侧 `x = canvas.width` 进入，移动中每帧更新 `trackRight` 为该轨所有弹幕中的最大右缘。
- **对象池**：弹幕飞出屏幕（`x + width < 0`）后回收到 `pool`，下次 `emit` 时 `allocItem()` 优先从池中取；池大小上限 `DANMAKU_POOL_MAX`（如 256），防止内存无限增长与 GC 卡顿。
- **智能防挡**：可选蒙版图（服务端 AI 预生成，灰度/Alpha 表示「人物区域」）。绘制完本帧所有弹幕后，若存在 `maskImage`，则 `ctx.globalCompositeOperation = 'destination-out'`，再 `drawImage(maskImage, 0, 0, cw, ch)`，将蒙版区域从画布上擦除，实现弹幕从人背后穿过的效果。蒙版 URL 由 `/api/examples` 的 `mask_url`（或 metadata）提供，前端 `setMask(url)` 加载后每帧应用。

### 4.2 与 B 站方案对比

| 项目 | 当前 | B 站/进阶 |
|------|------|-----------|
| 渲染 | Canvas 2D + requestAnimationFrame | ✅ 一致 |
| 轨道 | 轨道数组 + 碰撞（右缘+间距<宽度）、优先顶部 | ✅ 一致 |
| 对象复用 | 对象池 + 池大小上限 | ✅ 一致 |
| 防挡弹幕 | 蒙版图 + destination-out 擦除 | ✅ 一致（可选） |
| 类型 | 仅滚动（右→左） | 可扩展顶部/底部固定、高级弹幕 |

### 4.3 可选扩展

- **蒙版序列**：若后端提供按时间戳的蒙版图序列（如每帧一张），可随 `currentTime` 切换 `maskImage`，实现动态防挡。
- **CSS Mask 方案**：亦可对弹幕容器使用 `-webkit-mask-image` 绑定同一蒙版数据（需随帧或按需更新）。
- **更多弹幕类型**：顶部固定、底部固定、高级弹幕（代码控制位置/动画）可在此基础上扩展。

---

## 五、数据与交互层 (Data & Interaction)

### 5.1 接口（当前）

- **列表**：`GET /api/examples` → `{ data: [ { video_id, url, title, description, duration_sec, like_count, high_energy?, sprite_url?, hls_url?, mask_url? } ] }`。
- **弹幕**：`GET /api/examples/danmaku?video_id=xxx` → `{ data: [ { time, text, username } ] }`（JSON）；`POST /api/examples/danmaku` → `{ video_id, text, time }`（需登录）。
- **WebSocket**：`WS /api/examples/ws/{video_id}` → 连接后收到 `{ type: "viewer_count", count: N }`；有人发弹幕时推送 `{ type: "new_danmaku", data: { time, text, username } }`。客户端每 30 秒发 `{ type: "ping" }`，服务端回 `{ type: "pong" }` 保活。
- **评论**：`GET /api/examples/comments?video_id=xxx`；`POST` 提交评论（需登录）。
- **点赞**：`GET /api/examples/likes?video_id=xxx`；`POST /api/examples/like`（like/unlike，需登录）。

### 5.2 通讯协议（JSON + 可选 Protobuf）

- **当前**：弹幕列表、评论、点赞等均为 **JSON**，便于调试与扩展。
- **Protobuf（可选）**：B 站弹幕用二进制 Protobuf 以减小体积。本项目在 `static/proto/danmaku.proto` 中提供了 `DanmakuItem`（time, text, username）与 `DanmakuList`（items）定义。若追求极致：
  - 后端：使用 `protoc` 生成 Python `_pb2.py`，在 `GET /api/examples/danmaku?video_id=xxx&format=proto` 中返回序列化后的二进制。
  - 前端：使用 `protobuf.js` 加载该 proto 或预编译的 JSON 描述符，请求 `format=proto` 时解析二进制并得到与 JSON 同构的数据。

### 5.3 设置与持久化

- 弹幕开关、透明度、字号、区域（全屏/半屏/1/4 屏）存于 `localStorage`，键名见 `settings.js`（如 `danmaku_screen`）；与设置页「教学案例与弹幕」同步，并参与云端备份/恢复（若有）。

### 5.4 键盘与鼠标（已实现）

参考 B 站微交互，可增加：

- **空格**：播放/暂停（焦点在播放器内时）。
- **← / →**：快退/快进 5 秒。
- **↑ / ↓**：音量加减。
- **双击视频区域**：切换全屏。
- **右键**：禁用默认菜单，改为自定义（循环播放、复制链接、Stats for nerds 等）。

---

## 六、高能进度条与预览图

### 6.1 进度条悬停预览（雪碧图）

- **后端**：按固定间隔（如每 5 秒）对视频截帧，拼成一张雪碧图（如 10×10 格），并提供元数据（总时长、每格对应时间）。
- **前端**：进度条 `mousemove` 时根据 x 百分比得到时间 t，再算出对应格子的 `background-position`，在 tooltip 内显示一小块预览图（例如 160×90px）。

### 6.2 高能进度条（波形）（已实现）

- **数据**：`/api/examples` 中每个视频可带 `high_energy` 数组（0–100 数值，如 `[0, 10, 55, 90, 20, ...]`），来自 metadata.json 的 `high_energy` 字段；若无则前端用随机示意数据。
- **绘制**：在进度条上方用 SVG `<path>` 绘制折线；与视频时长或数组长度对齐。
- **交互**：鼠标悬停在高能条上时，根据 x 映射到数组下标得到当前段数值；若数值 ≥ 70（`HIGH_ENERGY_PEAK_THRESHOLD`），显示「高能预警」tooltip。

---

## 七、Stats for nerds（可选）

可作为「专业复刻」的扩展功能，在自定义右键菜单或设置中提供：

- 播放器版本 / 逻辑标识
- 视频 ID（video_id）
- 分辨率、编码（如 avc1）
- 视口与丢帧率（需用 requestAnimationFrame 与 video 时间戳估算）
- 实时网速（通过 Resource Timing 或自定义 XHR 统计）

---

## 八、技术栈与文件清单

### 8.1 当前技术栈

- **框架**：无；原生 JS（ES Module），与本站一致。
- **样式**：原生 CSS，变量见站点全局（如 `--primary-color`, `--bg-surface`, `--border-color`）。
- **图标**：Font Awesome（与全站统一）。
- **播放内核**：原生 `<video>`，无 xgplayer/DPlayer。

### 8.2 涉及文件

| 类型 | 路径 | 说明 |
|------|------|------|
| HTML | `html_root/static/index.html` | 视频弹窗、`#video-player-wrapper`、控制栏、弹幕输入、评论区 |
| JS | `html_root/static/js/examples.js` | 案例列表、`playExample`、弹幕加载/发射、`initCustomPlayer`、点赞/评论/弹幕发送 |
| CSS | `html_root/static/css/pages/examples.css` | `.video-player-wrapper`、弹幕层、自制控制栏、进度条、中央键、半屏/1/4 屏 |
| 设置 | `html_root/static/js/settings.js` | 弹幕开关/透明度/字号/区域（full/half/quarter）的 get/set 与持久化 |
| 后端 | `html_root/app/routers/examples.py` | `/api/examples`、`/api/examples/danmaku`、comments、likes |
| 数据 | `html_root/visdom_db.sql` 等 | 示例视频元数据；弹幕/评论/点赞表结构见 examples 路由 |

### 8.3 可选依赖（若后续引入）

- **播放/流媒体**：xgplayer、hls.js、dash.js
- **弹幕库**：danmaku、CommentCoreLibrary（或自研 Canvas 层）
- **协议**：protobuf.js（仅当弹幕/信令改用 Protobuf 时）

---

## 九、复刻与迭代 Checklist

- [x] 多层 DOM 结构（背景 / 视频 / 弹幕 / 控制栏 / 悬浮）
- [x] 自制控制栏（播放、进度、时间、音量、倍速、弹幕、全屏）
- [x] 中央大播放键（暂停显示、播放隐藏）
- [x] 基于时间的弹幕（接口拉取 + 按 currentTime 发射）
- [x] 弹幕区域：全屏 / 半屏 / 1/4 屏（压缩空间）
- [x] 全屏 API、进度条 seek、缓冲显示
- [ ] 进度条悬停缩略图（雪碧图）
- [ ] 高能进度条（波形/曲线）
- [ ] 弹幕 Canvas 渲染 + 轨道碰撞 + 对象池
- [ ] 防挡弹幕（蒙版数据 + mask/composite）
- [ ] 键盘快捷键（空格、方向键、双击全屏）
- [ ] 自定义右键菜单 + Stats for nerds
- [ ] MSE/HLS 多码率（若需长视频与清晰度切换）

---

本文档随实现更新；若新增接口或层级，建议同步修改本规格书与 `api_doc.md`。
