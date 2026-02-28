/**
 * 全站统一渲染冷却：开发者工具 Manim 与动态计算共享
 * 同一时刻全站只能进行一个视频渲染，冷却期间两处按钮均禁用
 * 渲染进行中可自由切换页面，其他功能（智能体、算式库等）照常使用
 */

let isCooldown = false;
let cooldownTimerId = null;
let isRendering = false;
let renderSource = '';
let renderProgress = 0;

export function getIsRenderCooldown() {
    return isCooldown;
}

export function getIsRendering() {
    return isRendering;
}

/** 设置渲染进行中状态（请求开始/结束时由 calculate、devtools 调用）
 * @param {boolean} flag - 是否正在渲染
 * @param {{ source?: 'calculate'|'devtools' }} [opts] - 渲染来源
 */
export function setRenderInProgress(flag, opts = {}) {
    if (isRendering === flag) return;
    isRendering = flag;
    if (flag && opts.source) renderSource = opts.source;
    if (!flag) { renderSource = ''; renderProgress = 0; }
    window.dispatchEvent(new CustomEvent(flag ? 'render-start' : 'render-end', {
        detail: flag ? { source: opts.source || renderSource } : {}
    }));
}

/** 更新渲染进度，供 calculate/devtools 在收到服务端进度时调用
 * @param {{ source?: 'calculate'|'devtools', progress?: number }} opts - progress 0-100，devtools 无进度可传 null
 */
export function setRenderProgress(opts) {
    if (opts.source) renderSource = opts.source;
    if (opts.progress != null && opts.progress >= 0) renderProgress = Math.min(100, opts.progress);
    if (!isRendering) return;
    window.dispatchEvent(new CustomEvent('render-progress', {
        detail: { source: renderSource, progress: renderProgress }
    }));
}

/** 启动全站渲染冷却，并派发事件供 devtools/calculate 更新各自按钮 */
export function startRenderCooldown(seconds = 30) {
    if (isCooldown) return;
    isCooldown = true;
    let left = seconds;
    const tick = () => {
        window.dispatchEvent(new CustomEvent('render-cooldown-tick', { detail: { left } }));
        if (left <= 0) {
            if (cooldownTimerId) clearInterval(cooldownTimerId);
            cooldownTimerId = null;
            isCooldown = false;
            window.dispatchEvent(new CustomEvent('render-cooldown-end'));
            return;
        }
        left--;
    };
    tick();
    cooldownTimerId = setInterval(tick, 1000);
}
