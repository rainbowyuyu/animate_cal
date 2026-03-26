export const SCENE_DURATION = 100;
export const TRANSITION_FRAMES = 24;

/** 第 i 个场景的起始帧（含过渡重叠） */
export function getSceneStartFrame(i: number): number {
  return i * (SCENE_DURATION - TRANSITION_FRAMES);
}

/** 总场景数（Title, Hero, NavAndFeatures, Agent, Detect, Calculate, KnowledgeGraph, Examples, DevTools, CTA） */
export const SCENE_COUNT = 10;

/** 每页静止时的基础角度（度），不同页面不同角度，纸片厚度与景深始终可见 */
export const SCENE_BASE_ANGLES: number[] = [-4, 5, -3, 6, -5, 4, -6, 3, -4, 5];

/** 缓慢旋转：振幅（度）、角速度（每帧），柔和呼吸感 */
export const DRIFT_AMPLITUDE = 2.5;
export const DRIFT_SPEED = 0.018;

/** 总时长 */
export const TOTAL_DURATION = getSceneStartFrame(SCENE_COUNT) + SCENE_DURATION;

/** 计算场景 i 在当前全局帧下的 3D 进入/退出进度 */
export function getSceneProgress(globalFrame: number, sceneIndex: number) {
  const start = getSceneStartFrame(sceneIndex);
  const nextStart = getSceneStartFrame(sceneIndex + 1);
  const enterProgress = globalFrame < start ? 0 : Math.min(1, (globalFrame - start) / TRANSITION_FRAMES);
  const exitProgress =
    sceneIndex < SCENE_COUNT - 1 && globalFrame >= nextStart
      ? Math.min(1, (globalFrame - nextStart) / TRANSITION_FRAMES)
      : 0;
  return { enterProgress, exitProgress };
}

/** 当前帧是否应渲染该场景（在可见区间或退出过渡中） */
export function isSceneVisible(globalFrame: number, sceneIndex: number): boolean {
  const start = getSceneStartFrame(sceneIndex);
  const end = start + SCENE_DURATION;
  return globalFrame >= start && globalFrame < end;
}
