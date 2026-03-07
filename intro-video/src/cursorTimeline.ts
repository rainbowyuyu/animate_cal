/**
 * 全局光标轨迹：每个 waypoint 为 (frame, x, y)，可选 click 在该帧触发点击涟漪
 * 坐标相对于 1920x1080
 */
export type CursorWaypoint = { frame: number; x: number; y: number; click?: boolean };

/** 按时间排序的 waypoints，相邻两点之间线性插值，easing 在组件内用 interpolate 处理 */
export const CURSOR_WAYPOINTS: CursorWaypoint[] = [
  // 0-100: Title，光标从外移入后点击
  { frame: 20, x: 400, y: 350 },
  { frame: 55, x: 960, y: 520 },
  { frame: 72, x: 960, y: 520, click: true },
  // 76-176: Hero
  { frame: 85, x: 720, y: 580 },
  { frame: 105, x: 820, y: 560 },
  { frame: 118, x: 820, y: 560, click: true },
  { frame: 140, x: 960, y: 620 },
  // 152-252: Nav + Features
  { frame: 165, x: 580, y: 95 },
  { frame: 185, x: 680, y: 95 },
  { frame: 198, x: 680, y: 95, click: true },
  { frame: 220, x: 520, y: 420 },
  { frame: 238, x: 520, y: 420, click: true },
  // 228-328: Agent
  { frame: 250, x: 180, y: 280 },
  { frame: 275, x: 720, y: 480 },
  { frame: 295, x: 720, y: 480, click: true },
  { frame: 310, x: 1100, y: 620 },
  // 304-404: Detect
  { frame: 320, x: 280, y: 320 },
  { frame: 345, x: 960, y: 420 },
  { frame: 362, x: 960, y: 420, click: true },
  { frame: 385, x: 1400, y: 480 },
  { frame: 398, x: 1400, y: 480, click: true },
  // 380-480: Calculate
  { frame: 395, x: 420, y: 380 },
  { frame: 420, x: 420, y: 520 },
  { frame: 438, x: 420, y: 520, click: true },
  { frame: 455, x: 1100, y: 400 },
  // 456-556: Knowledge Graph
  { frame: 475, x: 960, y: 380 },
  { frame: 500, x: 1200, y: 520 },
  { frame: 518, x: 1200, y: 520, click: true },
  // 532-632: Examples
  { frame: 550, x: 320, y: 280 },
  { frame: 580, x: 600, y: 450 },
  { frame: 598, x: 600, y: 450, click: true },
  { frame: 615, x: 960, y: 500 },
  // 608-708: DevTools
  { frame: 625, x: 280, y: 350 },
  { frame: 655, x: 600, y: 520 },
  { frame: 672, x: 600, y: 520, click: true },
  // 684-784: CTA
  { frame: 710, x: 780, y: 560 },
  { frame: 738, x: 860, y: 560 },
  { frame: 755, x: 860, y: 560, click: true },
  { frame: 775, x: 960, y: 540 },
];

function getCursorPositionAtFrame(frame: number): { x: number; y: number } {
  const pts = CURSOR_WAYPOINTS;
  if (pts.length === 0) return { x: 960, y: 540 };
  if (frame <= pts[0].frame) return { x: pts[0].x, y: pts[0].y };
  for (let i = 0; i < pts.length - 1; i++) {
    if (frame >= pts[i].frame && frame <= pts[i + 1].frame) {
      const t = (frame - pts[i].frame) / (pts[i + 1].frame - pts[i].frame);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * ease,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * ease,
      };
    }
  }
  return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
}

export function getCursorStateAtFrame(frame: number) {
  const position = getCursorPositionAtFrame(frame);
  const click = CURSOR_WAYPOINTS.find((w) => w.click && frame >= w.frame && frame <= w.frame + 10);
  return { ...position, clicking: !!click, clickFrame: click ? click.frame : null };
}

/** 当前帧需要渲染的涟漪：仅包含 clickFrame 在 [frame - RIPPLE_DURATION, frame] 的点击 */
export const RIPPLE_DURATION = 12;
export function getRipplesVisibleAtFrame(frame: number): Array<{ frame: number; x: number; y: number }> {
  return CURSOR_WAYPOINTS.filter(
    (w) => w.click && w.frame <= frame && w.frame >= frame - RIPPLE_DURATION
  ).map((w) => ({ frame: w.frame, x: w.x, y: w.y }));
}
