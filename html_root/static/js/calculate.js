import { toggleModal, showSection, toggleAuthModal, showToast } from './ui.js';
import { loadMyFormulas, normalizeLatex } from './formulas.js';
import { getIsRenderCooldown, startRenderCooldown, setRenderInProgress, setRenderProgress } from './render-cooldown.js';
import { sanitizeMarkdownHtml } from './sanitize.js';
import * as Formulas from './formulas.js';
import * as Settings from './settings.js';

let lastGeneratedCode = '';
let lastGeneratedCodeCalc = '';
let lastGeneratedCodeVis = '';
// 解题步骤流式输出累积内容
let accumulatedStepsContent = {
    unified: '',  // 通用模式的解题步骤
    single: ''   // 单阶段模式的解题步骤
};
// 本次生成完成的视频（用于在题解中插入可点击跳转链接）
let completedVideosThisRun = [];

function getCurrentUser() {
    const userDisplay = document.getElementById('user-display');
    const usernameSpan = document.getElementById('username-span');
    if (userDisplay && userDisplay.style.display !== 'none' && usernameSpan) return usernameSpan.innerText;
    return null;
}

/** 在题解区域追加「视频解析」可点击链接，点击后跳转到对应视频并播放 */
function appendVideoLinksToSteps() {
    if (completedVideosThisRun.length === 0) return;
    function makeWrap() {
        const wrap = document.createElement('div');
        wrap.className = 'calc-video-links-wrap';
        wrap.innerHTML = '<strong class="calc-video-links-title">视频解析：</strong>';
        const linksContainer = document.createElement('span');
        linksContainer.className = 'calc-video-links';
        completedVideosThisRun.forEach((item, i) => {
            const a = document.createElement('a');
            a.href = '#';
            a.className = 'calc-video-link';
            a.textContent = item.label || ('视频 ' + (i + 1));
            a.dataset.videoUrl = item.url || '';
            a.dataset.part = item.part || '';
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const u = a.dataset.videoUrl;
                if (!u) return;
                const singleWrap = document.getElementById('calc-single-wrap');
                const vSingle = document.getElementById('result-video-player');
                const vCalc = document.getElementById('result-video-player-calc');
                const vVis = document.getElementById('result-video-player-vis');
                if (singleWrap && singleWrap.style.display !== 'none' && vSingle) {
                    singleWrap.querySelectorAll('.calc-stack-tab').forEach((x) => x.classList.toggle('active', x.dataset.tab === 'video'));
                    singleWrap.querySelectorAll('.calc-stack-window').forEach((w) => w.classList.toggle('active', w.id === 'calc-window-video-single'));
                    vSingle.src = u;
                    vSingle.style.display = 'block';
                    vSingle.play();
                    vSingle.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else if (vCalc || vVis) {
                    const part = a.dataset.part;
                    const target = part === 'calc' ? vCalc : vVis;
                    if (target) {
                        target.src = u;
                        target.style.display = 'block';
                        target.play();
                        const wrap = target.closest('.calc-stack-wrap');
                        if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
            });
            linksContainer.appendChild(a);
            if (i < completedVideosThisRun.length - 1) linksContainer.appendChild(document.createTextNode(' · '));
        });
        wrap.appendChild(linksContainer);
        return wrap;
    }
    [ 'calc-steps-content', 'calc-steps-content-single' ].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const old = el.querySelector('.calc-video-links-wrap');
        if (old) old.remove();
        el.appendChild(makeWrap());
    });
}

/** 通用模式叠层窗口：解题步骤 | 计算 | 可视化，点击标签切换 (仅绑定一次) */
function initCalcStackTabs() {
    const wrap = document.getElementById('calc-dual-videos-wrap');
    if (!wrap || wrap.dataset.tabsInited === '1') return;
    wrap.dataset.tabsInited = '1';
    const tabs = wrap.querySelectorAll('.calc-stack-tab');
    const windows = wrap.querySelectorAll('.calc-stack-window');
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const t = tab.dataset.tab;
            tabs.forEach((x) => x.classList.toggle('active', x.dataset.tab === t));
            windows.forEach((w) => w.classList.toggle('active', w.id === 'calc-window-' + t));
        });
    });
    const stepsContent = document.getElementById('calc-steps-content');
    const hasSteps = stepsContent && !stepsContent.classList.contains('calc-steps-waiting') && stepsContent.innerHTML.trim() && !stepsContent.innerHTML.includes('等待解题步骤');
    const defaultTab = hasSteps ? 'steps' : 'calc';
    tabs.forEach((x) => x.classList.toggle('active', x.dataset.tab === defaultTab));
    windows.forEach((w) => w.classList.toggle('active', w.id === 'calc-window-' + defaultTab));
}

/** 单阶段模式叠层窗口：解题步骤 | 视频，点击标签切换 (仅绑定一次) */
function initSingleStackTabs() {
    const wrap = document.getElementById('calc-single-wrap');
    if (!wrap || wrap.dataset.tabsInited === '1') return;
    wrap.dataset.tabsInited = '1';
    const tabs = wrap.querySelectorAll('.calc-stack-tab');
    const windows = wrap.querySelectorAll('.calc-stack-window');
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const t = tab.dataset.tab;
            tabs.forEach((x) => x.classList.toggle('active', x.dataset.tab === t));
            windows.forEach((w) => w.classList.toggle('active', w.id === 'calc-window-' + t + '-single'));
        });
    });
    const stepsContent = document.getElementById('calc-steps-content-single');
    const hasSteps = stepsContent && !stepsContent.classList.contains('calc-steps-waiting') && stepsContent.innerHTML.trim() && !stepsContent.innerHTML.includes('等待解题步骤');
    const defaultTab = hasSteps ? 'steps' : 'video';
    tabs.forEach((x) => x.classList.toggle('active', x.dataset.tab === defaultTab));
    windows.forEach((w) => w.classList.toggle('active', w.id === 'calc-window-' + defaultTab + '-single'));
}

// 初始化计算页面的监听器
export function initCalculateListeners() {
    const field = document.getElementById('math-field-main');
    const code = document.getElementById('latex-code-main');

    if (field && code) {
        code.value = field.getValue();
        field.addEventListener('input', (e) => { code.value = e.target.value; });
        code.addEventListener('input', (e) => { field.setValue(e.target.value); });
    }

    // 数学表达式字号由设置页滑块控制，进入计算页时应用一次
    if (typeof Settings.applyCalcMathFontSizeToPage === 'function') {
        Settings.applyCalcMathFontSizeToPage();
    }

    // 演示模式下拉框变更时同步到设置，使设置页与计算页状态栏一致
    const calcMethodSelect = document.getElementById('calc-method');
    if (calcMethodSelect && typeof Settings.setCalcDefaultMode === 'function') {
        calcMethodSelect.addEventListener('change', function () {
            const v = this.value;
            if (['normal', 'formular', 'visualization', 'solution'].includes(v)) {
                Settings.setCalcDefaultMode(v);
            }
        });
    }

    // 全站渲染冷却事件：同步更新计算页按钮状态
    window.addEventListener('render-cooldown-tick', (e) => updateCalcButtonFromCooldown(e.detail.left));
    window.addEventListener('render-cooldown-end', () => updateCalcButtonFromCooldown(0));
}

// 动态计算按钮冷却（与开发者工具共享全站渲染冷却）
function updateCalcButtonFromCooldown(left) {
    const btn = document.querySelector('.calc-sidebar .action-btn.full-width');
    if (!btn) return;
    if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
    if (left > 0) {
        btn.disabled = true;
        btn.classList.add('is-cooldown');
        btn.style.opacity = '0.7';
        btn.style.cursor = 'not-allowed';
        btn.innerHTML = `<i class="fa-regular fa-clock"></i> 冷却中 (${left}s)`;
    } else {
        btn.disabled = false;
        btn.classList.remove('is-cooldown');
        btn.innerHTML = btn.dataset.originalHtml;
        btn.style.opacity = '';
        btn.style.cursor = '';
    }
}

// 核心：开始生成动画（仅在有错误时由后端对单阶段重试，前端不整请求重试）
export async function startAnimation() {
    const btn = document.querySelector('.calc-sidebar .action-btn.full-width');

    if (getIsRenderCooldown()) {
        if (typeof showAlert === 'function') await showAlert("全站渲染冷却中，请稍后再试（开发者工具与动态计算共享冷却）", "提示");
        return;
    }

    const formulaField = document.getElementById('math-field-main');
    const formula = formulaField ? formulaField.getValue() : "";

    if (!formula.trim()) {
        if (typeof showAlert === 'function') await showAlert("请输入公式", "提示");
        return;
    }

    startRenderCooldown(30);
    updateCalcButtonFromCooldown(30);
    setRenderInProgress(true, { source: 'calculate' });
    setRenderProgress({ source: 'calculate', progress: 0 });

    // 获取 DOM 元素
    const videoWrapper = document.getElementById('calc-video-wrapper');
    const placeholder = document.getElementById('video-placeholder-content');
    const videoPlayer = document.getElementById('result-video-player');

    const logBox = document.getElementById('gen-log');
    const progBar = document.getElementById('gen-progress');
    const percentText = document.getElementById('gen-percent');
    const terminalWrapper = document.getElementById('calc-terminal-wrapper');
    const method = document.getElementById('calc-method').value;
    const isGenericDual = method === 'normal';

    // 1. 重置 UI 状态
    if(logBox) logBox.innerHTML = '';
    addLog("正在初始化生成任务...", "#94a3b8");

    if(progBar) {
        progBar.style.width = '0%';
        progBar.className = 'calc-terminal-progress-bar phase-start';
    }
    if(percentText) percentText.innerText = '0%';

    // 假戏真做：阶段性进度条，各阶段都有平滑前进感，多阶段时首阶段到 75%、末阶段到 100%
    let displayProgress = 0;
    let serverProgress = 0;
    let progressIntervalId = null;
    let stageCap = 20;  // 阶段 1：理解/规划
    let isDualPhase = isGenericDual;
    let calcPhaseComplete = false;  // 通用模式：计算阶段是否已完成
    let hasSwitchedToPreviewTab = false;
    const setStageCap = (cap) => { stageCap = Math.max(stageCap, cap); };
    /** 通用：整体 0–100%，计算 0–75%、可视化 75–100%；非通用：独立 0–100% */
    const toDisplayProgress = (raw) => {
        if (!isDualPhase) return Math.min(100, raw);
        const effective = !calcPhaseComplete ? Math.min(raw, 75) : raw;
        return Math.min(100, effective);
    };
    const updateProgressUI = (p) => {
        const displayVal = toDisplayProgress(p);
        const v = Math.min(100, Math.round(displayVal * 10) / 10);
        if (progBar) {
            progBar.style.width = v + '%';
            progBar.classList.remove('phase-start', 'phase-mid', 'phase-done');
            progBar.classList.add(v < 30 ? 'phase-start' : v < 90 ? 'phase-mid' : 'phase-done');
        }
        if (percentText) percentText.innerText = v.toFixed(1) + '%';
        setRenderProgress({ source: 'calculate', progress: v });
    };
    const tickFakeProgress = () => {
        if (displayProgress >= 99) return;
        const gap = stageCap - displayProgress;
        // 前期稍快、接近 cap 时放缓，避免卡在 cap 边缘的假感
        const nearCap = gap < 4;
        const baseInc = nearCap ? 0.06 + Math.random() * 0.1 : (displayProgress < 30 ? 0.15 + Math.random() * 0.25 : 0.1 + Math.random() * 0.28);
        const inc = baseInc + (Math.random() > 0.9 ? 0.12 : 0);
        displayProgress = Math.min(stageCap, displayProgress + inc);
        if (isDualPhase && !calcPhaseComplete) displayProgress = Math.min(displayProgress, 75);
        const show = Math.max(displayProgress, serverProgress);
        updateProgressUI(show);
    };
    progressIntervalId = setInterval(tickFakeProgress, 360 + Math.random() * 200);  // 360~560ms，节奏更均匀
    if(terminalWrapper) terminalWrapper.classList.add('is-generating');

    if(videoPlayer) {
        videoPlayer.pause();
        videoPlayer.style.display = 'none';
        videoPlayer.src = "";
    }
    if(placeholder) placeholder.style.display = 'block';
    const saveScriptWrap = document.getElementById('calc-save-script-wrap');
    if(saveScriptWrap) saveScriptWrap.style.display = 'none';
    const dualWrap = document.getElementById('calc-dual-videos-wrap');
    if(dualWrap) dualWrap.style.display = 'none';
    const singleWrap = document.getElementById('calc-single-wrap');
    if(singleWrap) {
        singleWrap.style.display = 'none';
        singleWrap.dataset.tabsInited = '0'; // 重置标签初始化状态
    }
    const videoCalc = document.getElementById('result-video-player-calc');
    const videoVis = document.getElementById('result-video-player-vis');
    const placeholderCalc = document.getElementById('calc-placeholder-calc');
    const placeholderVis = document.getElementById('calc-placeholder-vis');
    const saveCalcWrap = document.getElementById('calc-save-calc-wrap');
    const saveVisWrap = document.getElementById('calc-save-vis-wrap');
    if(videoCalc) { videoCalc.pause(); videoCalc.src = ''; videoCalc.style.display = 'none'; }
    if(videoVis) { videoVis.pause(); videoVis.src = ''; videoVis.style.display = 'none'; }
    if(placeholderCalc) {
        placeholderCalc.style.display = 'block';
        placeholderCalc.className = 'calc-window-placeholder';
        placeholderCalc.innerHTML = '<span>等待「计算」渲染</span><span class="loading-dots"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>';
    }
    if(placeholderVis) {
        placeholderVis.style.display = 'block';
        placeholderVis.className = 'calc-window-placeholder';
        placeholderVis.innerHTML = '<span>等待「可视化」渲染</span><span class="loading-dots"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>';
    }
    if(saveCalcWrap) saveCalcWrap.style.display = 'none';
    if(saveVisWrap) saveVisWrap.style.display = 'none';
    const stepsContentSingle = document.getElementById('calc-steps-content-single');
    const stepsContentUnified = document.getElementById('calc-steps-content');
    const placeholderSingle = document.getElementById('calc-placeholder-single');
    const loadingSingle = document.getElementById('calc-window-loading-single');
    if (stepsContentSingle) {
        stepsContentSingle.innerHTML = '<span>等待解题步骤</span><span class="loading-dots"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>';
        stepsContentSingle.classList.add('calc-steps-waiting');
    }
    if (stepsContentUnified) {
        stepsContentUnified.innerHTML = '<span>等待解题步骤</span><span class="loading-dots"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>';
        stepsContentUnified.classList.add('calc-steps-waiting');
    }
    if (placeholderSingle) {
        placeholderSingle.style.display = 'block';
        placeholderSingle.className = 'calc-window-placeholder';
        placeholderSingle.innerHTML = '<span>等待渲染</span><span class="loading-dots"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>';
    }
    if (loadingSingle) loadingSingle.style.display = 'none';
    // 重置流式输出累积与本次完成视频列表
    accumulatedStepsContent.unified = '';
    accumulatedStepsContent.single = '';
    completedVideosThisRun = [];
    const renderLoading = document.getElementById('calc-render-loading');
    const renderLoadingTextEl = renderLoading ? renderLoading.querySelector('.calc-render-loading-text') : null;
    if (renderLoading) {
        renderLoading.style.display = 'flex';
        // 初始阶段：让用户知道系统在「理解题目与规划步骤」
        if (renderLoadingTextEl) {
            renderLoadingTextEl.textContent = '正在理解题目与规划步骤…';
        }
    }
    const loadingCalc = document.getElementById('calc-window-loading-calc');
    const loadingVis = document.getElementById('calc-window-loading-vis');
    if(loadingCalc) loadingCalc.style.display = 'none';
    if(loadingVis) loadingVis.style.display = 'none';

    // 辅助：添加日志
    function addLog(msg, color = "#cbd5e1") {
        if (!logBox) return;
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.style.color = color;
        div.style.marginBottom = '6px';
        div.style.lineHeight = '1.5';
        div.innerHTML = `<span style="opacity:0.6; margin-right:5px;">></span> ${msg}`;
        logBox.appendChild(div);
        logBox.scrollTop = logBox.scrollHeight;
    }

    // 辅助：流式打字机显示代码
    async function streamCodeBlock(fullCode) {
        if (!logBox) return;
        const pre = document.createElement('pre');
        pre.style.marginTop = "10px";
        pre.style.marginBottom = "10px";
        pre.style.background = "#00000033";
        pre.style.padding = "10px";
        pre.style.borderRadius = "4px";
        pre.style.border = "1px solid #334155";
        pre.style.overflowX = "auto";

        const codeEl = document.createElement('code');
        codeEl.className = "language-python hljs";
        codeEl.style.fontFamily = "'JetBrains Mono', monospace";
        codeEl.style.fontSize = "0.8rem";

        pre.appendChild(codeEl);
        logBox.appendChild(pre);

        const chars = fullCode.split('');
        let currentText = "";

        return new Promise((resolve) => {
            let i = 0;
            const speed = 5;

            function type() {
                if (i < chars.length) {
                    const chunk = chars.slice(i, i + speed).join('');
                    currentText += chunk;
                    codeEl.textContent = currentText;
                    logBox.scrollTop = logBox.scrollHeight;
                    i += speed;
                    requestAnimationFrame(type);
                } else {
                    if (window.hljs) window.hljs.highlightElement(codeEl);
                    resolve();
                }
            }
            requestAnimationFrame(type);
        });
    }

    // 构造请求载荷：保留现有字段，并附带来自识别页的「视觉描述 Prompt」（若后端已支持）
    const payload = {
        matrixA: formula,
        matrixB: "",
        operation: method
    };
    try {
        const vp = (typeof sessionStorage !== 'undefined')
            ? sessionStorage.getItem('last_detect_vision_prompt')
            : null;
        if (vp && vp.trim()) {
            payload.vision_prompt = vp.trim();
        }
    } catch (e) {
        // sessionStorage 不可用时静默忽略，保持向后兼容
        console.warn('Read vision prompt from sessionStorage failed', e);
    }

    try {
        const response = await fetch('/api/animate/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.replace('data: ', '');
                        try {
                            const data = JSON.parse(jsonStr);

                            if (data.progress !== undefined && data.progress !== null) {
                            const raw = Number(data.progress);
                            serverProgress = Math.max(serverProgress, raw);
                            if (isDualPhase && !calcPhaseComplete) serverProgress = Math.min(serverProgress, 75);
                            const show = Math.max(displayProgress, serverProgress);
                            updateProgressUI(show);
                        }

                        if (data.step === 'text_result') {
                            const content = data.content || '';
                            if (!content) return; // 空内容跳过
                            setStageCap(55);  // 阶段 2：解题步骤已开始，假进度可到 55%
                            // 题解已到：立即隐藏「正在生成与渲染」全屏遮罩，避免挡住解题步骤；系统日志保持可见
                            if (renderLoading) renderLoading.style.display = 'none';
                            
                            // 累积内容（流式输出）
                            accumulatedStepsContent.unified += content;
                            accumulatedStepsContent.single += content;
                            
                            // 解析累积的 Markdown（每次追加后重新解析完整内容）
                            let htmlContentUnified = '';
                            let htmlContentSingle = '';
                            if (window.marked && typeof window.marked.parse === 'function') {
                                try {
                                    htmlContentUnified = sanitizeMarkdownHtml(window.marked.parse(accumulatedStepsContent.unified));
                                    htmlContentSingle = sanitizeMarkdownHtml(window.marked.parse(accumulatedStepsContent.single));
                                } catch (e) {
                                    console.warn('Markdown parse error:', e);
                                    htmlContentUnified = accumulatedStepsContent.unified.replace(/\n/g, '<br>');
                                    htmlContentSingle = accumulatedStepsContent.single.replace(/\n/g, '<br>');
                                }
                            } else {
                                htmlContentUnified = accumulatedStepsContent.unified.replace(/\n/g, '<br>');
                                htmlContentSingle = accumulatedStepsContent.single.replace(/\n/g, '<br>');
                            }
                            
                            // 保留 $...$ / $$...$$，由 KaTeX renderMathInElement 统一渲染（与 ChatGPT/Claude/豆包一致）
                            // 通用模式：流式更新独立的「解题步骤」窗口
                            const stepsContentUnified = document.getElementById('calc-steps-content');
                            const dualWrap = document.getElementById('calc-dual-videos-wrap');
                            if (stepsContentUnified) {
                                stepsContentUnified.innerHTML = htmlContentUnified;
                                stepsContentUnified.classList.remove('calc-steps-waiting'); // 移除等待状态样式
                                // 自动滚动到底部（流式输出时跟随最新内容）
                                stepsContentUnified.scrollTop = stepsContentUnified.scrollHeight;
                                if (dualWrap && dualWrap.style.display !== 'none') {
                                    const tabs = dualWrap.querySelectorAll('.calc-stack-tab');
                                    const windows = dualWrap.querySelectorAll('.calc-stack-window');
                                    tabs.forEach((x) => x.classList.toggle('active', x.dataset.tab === 'steps'));
                                    windows.forEach((w) => w.classList.toggle('active', w.id === 'calc-window-steps'));
                                }
                            }
                            
                            // 单阶段模式：流式更新独立的「解题步骤」窗口
                            const stepsContentSingle = document.getElementById('calc-steps-content-single');
                            const singleWrap = document.getElementById('calc-single-wrap');
                            const placeholder = document.getElementById('video-placeholder-content');
                            if (stepsContentSingle) {
                                stepsContentSingle.innerHTML = htmlContentSingle;
                                stepsContentSingle.classList.remove('calc-steps-waiting'); // 移除等待状态样式
                                stepsContentSingle.scrollTop = stepsContentSingle.scrollHeight;
                                // 显示单阶段窗口并切换到解题步骤标签
                                if (singleWrap && placeholder) {
                                    placeholder.style.display = 'none';
                                    singleWrap.style.display = 'flex';
                                    initSingleStackTabs();
                                    const tabs = singleWrap.querySelectorAll('.calc-stack-tab');
                                    const windows = singleWrap.querySelectorAll('.calc-stack-window');
                                    tabs.forEach((x) => x.classList.toggle('active', x.dataset.tab === 'steps'));
                                    windows.forEach((w) => w.classList.toggle('active', w.id === 'calc-window-steps-single'));
                                }
                            }
                            
                            // 延迟批量用 KaTeX 渲染公式（与 ChatGPT/Claude/豆包一致）
                            clearTimeout(window.stepsMathJaxTimeout);
                            const nodesToTypeset = [stepsContentUnified, stepsContentSingle].filter(Boolean);
                            window.stepsMathJaxTimeout = setTimeout(() => {
                                nodesToTypeset.forEach(node => {
                                    if (node && typeof renderMath === 'function') renderMath(node);
                                });
                            }, 300);
                        }
                        if (data.step === 'normal_split') {
                            addLog(data.message || "通用演示将分两步：先计算推演，再可视化演示", "#a78bfa");
                            const dualWrap = document.getElementById('calc-dual-videos-wrap');
                            const placeholder = document.getElementById('video-placeholder-content');
                            if (dualWrap && placeholder) {
                                placeholder.style.display = 'none';
                                dualWrap.style.display = 'flex';
                                const singleContainer = document.getElementById('calc-single-video-container');
                                if (singleContainer) singleContainer.style.display = 'none';
                                if (renderLoading) renderLoading.style.display = 'none';
                                initCalcStackTabs();
                            }
                        }
                        else if (data.step === 'generating_code') {
                            setStageCap(38);  // 阶段 1.5：生成代码
                            addLog(data.message || "正在构思数学可视化脚本...", "#fbbf24");
                            if (renderLoadingTextEl) {
                                renderLoadingTextEl.textContent = '正在生成动画脚本与关键步骤…';
                            }
                        }
                        else if (data.step === 'code_generated') {
                            if (data.code) {
                                if (data.part === 'calc') lastGeneratedCodeCalc = data.code;
                                else if (data.part === 'vis') lastGeneratedCodeVis = data.code;
                                else lastGeneratedCode = data.code;
                            }
                            addLog(data.message || "脚本生成完毕，代码预览：", "#34d399");
                            if (data.code) {
                                await streamCodeBlock(data.code);
                            }
                            if (data.part && document.getElementById('calc-dual-videos-wrap')) {
                                // 通用模式
                                document.getElementById('video-placeholder-content').style.display = 'none';
                                const dw = document.getElementById('calc-dual-videos-wrap');
                                const singleWrap = document.getElementById('calc-single-wrap');
                                if (dw) dw.style.display = 'flex';
                                if (singleWrap) singleWrap.style.display = 'none';
                                if (renderLoading) renderLoading.style.display = 'none';
                                if (typeof initCalcStackTabs === 'function') initCalcStackTabs();
                                const loadingCalc = document.getElementById('calc-window-loading-calc');
                                const loadingVis = document.getElementById('calc-window-loading-vis');
                                if (data.part === 'calc' && loadingCalc) loadingCalc.style.display = 'flex';
                                if (data.part === 'vis' && loadingVis) loadingVis.style.display = 'flex';
                            } else if (!data.part) {
                                // 单阶段模式：显示窗口并显示加载状态
                                const singleWrap = document.getElementById('calc-single-wrap');
                                const placeholder = document.getElementById('video-placeholder-content');
                                if (singleWrap && placeholder) {
                                    placeholder.style.display = 'none';
                                    singleWrap.style.display = 'flex';
                                    initSingleStackTabs();
                                    const loadingSingle = document.getElementById('calc-window-loading-single');
                                    if (loadingSingle) loadingSingle.style.display = 'flex';
                                }
                                if (renderLoading) renderLoading.style.display = 'none';
                            }
                        }
                        else if (data.step === 'fixing_code') {
                            addLog(data.message || "渲染报错，正在根据错误信息修正代码并重试...", "#fbbf24");
                            if (renderLoadingTextEl) {
                                renderLoadingTextEl.textContent = '检测到错误，正在自动修正脚本…';
                            }
                        }
                        else if (data.step === 'rendering') {
                            setStageCap(90);  // 阶段 3：进入渲染，假进度可到 90%
                            if (data.message) {
                                addLog(data.message, "#e2e8f0");
                            }

                            // 渲染阶段：若后端提供 preview_url，则优先展示静态关键帧预览；关键帧一出现就立即隐藏所有加载层
                            if (data.preview_url) {
                                // 先隐藏加载层，再展示预览（避免加载遮挡关键帧）
                                const ldCalc = document.getElementById('calc-window-loading-calc');
                                const ldVis = document.getElementById('calc-window-loading-vis');
                                const ldSingle = document.getElementById('calc-window-loading-single');
                                if (ldCalc) ldCalc.style.display = 'none';
                                if (ldVis) ldVis.style.display = 'none';
                                if (ldSingle) ldSingle.style.display = 'none';
                                if (renderLoading) renderLoading.style.display = 'none';

                                setStageCap(90);
                                const url = `${data.preview_url}?t=${new Date().getTime()}`;
                                let targetPlaceholder = null;
                                if (data.part === 'calc') {
                                    targetPlaceholder = document.getElementById('calc-placeholder-calc');
                                } else if (data.part === 'vis') {
                                    targetPlaceholder = document.getElementById('calc-placeholder-vis');
                                } else {
                                    targetPlaceholder = document.getElementById('calc-placeholder-single');
                                }
                                if (targetPlaceholder) {
                                    targetPlaceholder.className = 'calc-window-placeholder calc-window-placeholder-preview';
                                    targetPlaceholder.innerHTML = `
                                        <div class="calc-preview-wrap">
                                            <img src="${url}" alt="关键帧预览" class="calc-preview-img">
                                            <span class="calc-preview-hint">已生成关键帧预览，视频渲染中…</span>
                                        </div>
                                    `;
                                }
                                // 生成关键帧时即跳转并高亮，不等视频完成
                                if (!hasSwitchedToPreviewTab) {
                                        hasSwitchedToPreviewTab = true;
                                        setTimeout(() => {
                                            if (data.part === 'calc') {
                                                const dw = document.getElementById('calc-dual-videos-wrap');
                                                if (dw && dw.style.display !== 'none') {
                                                    const allTabs = dw.querySelectorAll('.calc-stack-tab');
                                                    const allWindows = dw.querySelectorAll('.calc-stack-window');
                                                    allTabs.forEach((x) => x.classList.toggle('active', x.dataset.tab === 'calc'));
                                                    allWindows.forEach((w) => w.classList.toggle('active', w.id === 'calc-window-calc'));
                                                    const wEl = document.getElementById('calc-window-calc');
                                                    const tEl = dw.querySelector('.calc-stack-tab[data-tab="calc"]');
                                                    if (wEl) { wEl.style.animation = 'calcCompleteHighlight 1.5s ease-out'; setTimeout(() => { wEl.style.animation = ''; }, 1500); }
                                                    if (tEl) { tEl.style.animation = 'calcTabPulse 1s ease-out'; setTimeout(() => { tEl.style.animation = ''; }, 1000); }
                                                }
                                            } else if (data.part === 'vis') {
                                                const dw = document.getElementById('calc-dual-videos-wrap');
                                                if (dw && dw.style.display !== 'none') {
                                                    const allTabs = dw.querySelectorAll('.calc-stack-tab');
                                                    const allWindows = dw.querySelectorAll('.calc-stack-window');
                                                    allTabs.forEach((x) => x.classList.toggle('active', x.dataset.tab === 'vis'));
                                                    allWindows.forEach((w) => w.classList.toggle('active', w.id === 'calc-window-vis'));
                                                    const wEl = document.getElementById('calc-window-vis');
                                                    const tEl = dw.querySelector('.calc-stack-tab[data-tab="vis"]');
                                                    if (wEl) { wEl.style.animation = 'calcCompleteHighlight 1.5s ease-out'; setTimeout(() => { wEl.style.animation = ''; }, 1500); }
                                                    if (tEl) { tEl.style.animation = 'calcTabPulse 1s ease-out'; setTimeout(() => { tEl.style.animation = ''; }, 1000); }
                                                }
                                            } else {
                                                const sw = document.getElementById('calc-single-wrap');
                                                if (sw && sw.style.display !== 'none') {
                                                    const tabs = sw.querySelectorAll('.calc-stack-tab');
                                                    const windows = sw.querySelectorAll('.calc-stack-window');
                                                    tabs.forEach((x) => x.classList.toggle('active', x.dataset.tab === 'video'));
                                                    windows.forEach((w) => w.classList.toggle('active', w.id === 'calc-window-video-single'));
                                                    const wEl = document.getElementById('calc-window-video-single');
                                                    const tEl = sw.querySelector('.calc-stack-tab[data-tab="video"]');
                                                    if (wEl) { wEl.style.animation = 'calcCompleteHighlight 1.5s ease-out'; setTimeout(() => { wEl.style.animation = ''; }, 1500); }
                                                    if (tEl) { tEl.style.animation = 'calcTabPulse 1s ease-out'; setTimeout(() => { tEl.style.animation = ''; }, 1000); }
                                                }
                                            }
                                        }, 150);
                                    }
                            }
                            // 不在此处显示加载层：后端会先发 preview_url 再发后续 rendering，若在无 preview 的 rendering 时显示加载会遮挡已出现的关键帧（通用推演流程同理）

                            if (renderLoadingTextEl) {
                                renderLoadingTextEl.textContent = '正在渲染视频画面…';
                            }
                        }
                        else if (data.step === 'complete') {
                            const part = data.part;
                            const isCalcCompleteDual = part === 'calc' && isDualPhase;
                            if (!isCalcCompleteDual) {
                                // 单阶段或双阶段最后一阶段：先到 ~95% 再平滑过渡 100%（避免直接跳）
                                if (progressIntervalId) { clearInterval(progressIntervalId); progressIntervalId = null; }
                                if (terminalWrapper) terminalWrapper.classList.remove('is-generating');
                                const raw = Math.max(displayProgress, serverProgress);
                                const midRaw = isDualPhase ? 97.5 : Math.max(raw, 95);
                                updateProgressUI(midRaw);
                                setTimeout(() => {
                                    if (progBar) {
                                        progBar.classList.remove('phase-start', 'phase-mid');
                                        progBar.classList.add('phase-done');
                                        progBar.style.width = '100%';
                                    }
                                    if (percentText) percentText.innerText = '100%';
                                    setRenderProgress({ source: 'calculate', progress: 100 });
                                }, 280);
                            } else {
                                // 双阶段首阶段（calc）完成：进入整体后半段，显示 75%，vis 阶段 75→100
                                calcPhaseComplete = true;
                                stageCap = 75;
                                displayProgress = 75;
                                serverProgress = 75;
                                updateProgressUI(75);
                                if (progBar) progBar.classList.add('phase-mid');
                            }
                            if (renderLoading) renderLoading.style.display = 'none';
                            addLog((data.message || "✨ 渲染完成！视频加载中..."), "#a78bfa");
                            const label = data.label || (part === 'calc' ? '计算推演' : part === 'vis' ? '可视化演示' : '查看视频解析');
                            const url = data.video_url ? `${data.video_url}?t=${new Date().getTime()}` : '';
                            completedVideosThisRun.push({ part, label, url });
                            /* 解题步骤中不展示「查看视频解析」链接，仅智能体消息中保留 */
                            if (part === 'calc') {
                                if (data.code) lastGeneratedCodeCalc = data.code;
                                setTimeout(() => {
                                    const dualWrap = document.getElementById('calc-dual-videos-wrap');
                                    const placeholder = document.getElementById('video-placeholder-content');
                                    if (dualWrap) {
                                        placeholder.style.display = 'none';
                                        dualWrap.style.display = 'flex';
                                        const singleContainer = document.getElementById('calc-single-video-container');
                                        if (singleContainer) singleContainer.style.display = 'none';
                                        if (renderLoading) renderLoading.style.display = 'none';
                                        if (typeof initCalcStackTabs === 'function') initCalcStackTabs();
                                    }
                                    const windowEl = document.getElementById('calc-window-calc');
                                    const tabEl = document.querySelector('.calc-stack-tab[data-tab="calc"]');
                                    const v = document.getElementById('result-video-player-calc');
                                    const ph = document.getElementById('calc-placeholder-calc');
                                    const sw = document.getElementById('calc-save-calc-wrap');
                                    const allTabs = document.querySelectorAll('.calc-stack-tab');
                                    const allWindows = document.querySelectorAll('.calc-stack-window');
                                    // 激活计算窗口和标签
                                    allTabs.forEach((x) => x.classList.toggle('active', x.dataset.tab === 'calc'));
                                    allWindows.forEach((w) => w.classList.toggle('active', w.id === 'calc-window-calc'));
                                    if (ph) ph.style.display = 'none';
                                    if (v) { v.src = url; v.style.display = 'block'; v.play(); }
                                    if (sw) sw.style.display = 'block';
                                    const loadingCalc = document.getElementById('calc-window-loading-calc');
                                    if (loadingCalc) loadingCalc.style.display = 'none';
                                    if (!hasSwitchedToPreviewTab && windowEl) {
                                        windowEl.style.animation = 'calcCompleteHighlight 1.5s ease-out';
                                        if (tabEl) tabEl.style.animation = 'calcTabPulse 1s ease-out';
                                        setTimeout(() => { if (windowEl) windowEl.style.animation = ''; if (tabEl) tabEl.style.animation = ''; }, 1500);
                                    }
                                }, 300);
                            } else if (part === 'vis') {
                                if (data.code) lastGeneratedCodeVis = data.code;
                                setTimeout(() => {
                                    const dualWrap = document.getElementById('calc-dual-videos-wrap');
                                    if (dualWrap) dualWrap.style.display = 'flex';
                                    const singleContainer = document.getElementById('calc-single-video-container');
                                    if (singleContainer) singleContainer.style.display = 'none';
                                    if (renderLoading) renderLoading.style.display = 'none';
                                    const windowEl = document.getElementById('calc-window-vis');
                                    const tabEl = document.querySelector('.calc-stack-tab[data-tab="vis"]');
                                    const v = document.getElementById('result-video-player-vis');
                                    const ph = document.getElementById('calc-placeholder-vis');
                                    const sw = document.getElementById('calc-save-vis-wrap');
                                    const allTabs = document.querySelectorAll('.calc-stack-tab');
                                    const allWindows = document.querySelectorAll('.calc-stack-window');
                                    // 激活可视化窗口和标签
                                    allTabs.forEach((x) => x.classList.toggle('active', x.dataset.tab === 'vis'));
                                    allWindows.forEach((w) => w.classList.toggle('active', w.id === 'calc-window-vis'));
                                    if (ph) ph.style.display = 'none';
                                    if (v) { v.src = url; v.style.display = 'block'; v.play(); }
                                    if (sw) sw.style.display = 'block';
                                    const loadingVis = document.getElementById('calc-window-loading-vis');
                                    if (loadingVis) loadingVis.style.display = 'none';
                                    if (!hasSwitchedToPreviewTab && windowEl) {
                                        windowEl.style.animation = 'calcCompleteHighlight 1.5s ease-out';
                                        if (tabEl) tabEl.style.animation = 'calcTabPulse 1s ease-out';
                                        setTimeout(() => { if (windowEl) windowEl.style.animation = ''; if (tabEl) tabEl.style.animation = ''; }, 1500);
                                    }
                                }, 300);
                            } else {
                                // 单阶段模式：显示视频并切换到视频标签
                                if (data.code) lastGeneratedCode = data.code;
                                setTimeout(() => {
                                    const placeholder = document.getElementById('video-placeholder-content');
                                    const renderLoading = document.getElementById('calc-render-loading');
                                    const singleWrap = document.getElementById('calc-single-wrap');
                                    if (placeholder) placeholder.style.display = 'none';
                                    if (renderLoading) renderLoading.style.display = 'none';
                                    if (singleWrap) {
                                        singleWrap.style.display = 'flex';
                                        initSingleStackTabs();
                                    }
                                    const windowEl = document.getElementById('calc-window-video-single');
                                    const tabEl = singleWrap ? singleWrap.querySelector('.calc-stack-tab[data-tab="video"]') : null;
                                    const v = document.getElementById('result-video-player');
                                    const ph = document.getElementById('calc-placeholder-single');
                                    const sw = document.getElementById('calc-save-script-wrap');
                                    const loadingSingle = document.getElementById('calc-window-loading-single');
                                    const tabs = singleWrap ? singleWrap.querySelectorAll('.calc-stack-tab') : [];
                                    const windows = singleWrap ? singleWrap.querySelectorAll('.calc-stack-window') : [];
                                    // 激活视频窗口和标签
                                    tabs.forEach((x) => x.classList.toggle('active', x.dataset.tab === 'video'));
                                    windows.forEach((w) => w.classList.toggle('active', w.id === 'calc-window-video-single'));
                                    if (ph) ph.style.display = 'none';
                                    if (loadingSingle) loadingSingle.style.display = 'none';
                                    if (v) {
                                        v.src = url;
                                        v.style.display = 'block';
                                        v.play();
                                    }
                                    if (sw && lastGeneratedCode) sw.style.display = 'block';
                                    if (!hasSwitchedToPreviewTab && windowEl) {
                                        windowEl.style.animation = 'calcCompleteHighlight 1.5s ease-out';
                                        if (tabEl) tabEl.style.animation = 'calcTabPulse 1s ease-out';
                                        setTimeout(() => { if (windowEl) windowEl.style.animation = ''; if (tabEl) tabEl.style.animation = ''; }, 1500);
                                    }
                                }, 500);
                                return;
                            }
                            // 双阶段时不要 return，继续读流以接收下一阶段 complete
                        }
                        else if (data.step === 'error') {
                            if (progressIntervalId) { clearInterval(progressIntervalId); progressIntervalId = null; }
                            if (terminalWrapper) terminalWrapper.classList.remove('is-generating');
                            if (progBar) {
                                progBar.classList.remove('phase-start', 'phase-mid', 'phase-done');
                                progBar.classList.add('phase-error');
                            }
                            if (renderLoading) renderLoading.style.display = 'none';
                            addLog("❌ 错误: " + (data.message || '未知错误'), "#ef4444");
                            if (typeof showToast === 'function') showToast(data.message || '生成失败，请检查公式或稍后再试。', 'error');
                            return;
                        }

                    } catch (e) {
                        console.warn("JSON Parse Warning", e);
                    }
                }
            }
        }

    } catch (e) {
        console.error(e);
        if (progressIntervalId) { clearInterval(progressIntervalId); progressIntervalId = null; }
        if (terminalWrapper) terminalWrapper.classList.remove('is-generating');
        if (progBar) {
            progBar.classList.remove('phase-start', 'phase-mid', 'phase-done');
            progBar.classList.add('phase-error');
        }
        const loadingEl = document.getElementById('calc-render-loading');
        if (loadingEl) loadingEl.style.display = 'none';
        addLog("❌ 网络或请求错误: " + (e.message || '请检查服务器状态'), "#ef4444");
        if (typeof showToast === 'function') showToast('请求失败，请稍后再试。', 'error');
    } finally {
        setRenderInProgress(false);
    }
}


// --- 公式选择器逻辑 ---
let currentTargetField = null;

export function openFormulaSelector(target) {
    currentTargetField = target;
    toggleModal('select-formula-modal', true);
    loadFormulaSelectorList();
}

export function closeFormulaSelector() {
    toggleModal('select-formula-modal', false);
    currentTargetField = null;
}

// 加载用于选择的公式列表
async function loadFormulaSelectorList() {
    const container = document.getElementById('selector-list');
    const userSpan = document.getElementById('username-span');
    const userDisplay = document.getElementById('user-display');
    const user = (userDisplay && userDisplay.style.display !== 'none' && userSpan) ? userSpan.innerText : null;

    if (!user) {
        container.innerHTML = `
            <div style="text-align:center; padding: 2rem;">
                <p style="color:var(--text-secondary); margin-bottom: 1rem;">请先登录以查看您的公式库</p>
                <button class="action-btn" onclick="closeFormulaSelector(); toggleAuthModal(true);">
                    立即登录
                </button>
            </div>`;
        return;
    }

    container.innerHTML = '<div style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>';

    try {
        const res = await fetch(`/api/formulas/list?username=${user}`);
        const data = await res.json();

        if (data.status === 'success') {
            if (data.data.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding: 2rem; color:#94a3b8;">
                        <p>暂无公式</p>
                        <button class="action-btn secondary" onclick="goToMyFormulas()">去添加</button>
                    </div>`;
            } else {
                const listHtml = data.data.map(f => {
                    const displayLatex = normalizeLatex(f.latex);
                    return `
                    <div class="formula-card" onclick="selectFormula('${encodeURIComponent(f.latex)}')" style="cursor:pointer; margin-bottom:1rem; border:1px solid #e2e8f0; padding:1rem; border-radius:8px; transition:0.2s;">
                        <div style="font-size:1.2rem; margin-bottom:0.5rem; overflow-x:auto; padding:5px;">
                            \\[ ${displayLatex} \\]
                        </div>
                        <div style="font-size:0.85rem; color:#64748b; display:flex; justify-content:space-between;">
                            <span>${f.note || "未命名"}</span>
                            <span style="color:var(--primary-color);"><i class="fa-solid fa-check-circle"></i> 选择</span>
                        </div>
                    </div>
                `}).join('');

                const manageBtnHtml = `
                    <div style="text-align:center; margin-top:2rem; padding-top:1rem; border-top:1px solid #f1f5f9;">
                        <button class="action-btn secondary" onclick="goToMyFormulas()">
                            <i class="fa-solid fa-list-check"></i> 管理我的算式库
                        </button>
                    </div>
                `;
                container.innerHTML = listHtml + manageBtnHtml;
                if (typeof renderMath === 'function') renderMath(container);
            }
        } else {
            container.innerHTML = "加载失败";
        }
    } catch (e) {
        container.innerHTML = "加载失败";
    }
}

/** 打开与开发者工具同款的脚本备注弹窗，填写后点保存再执行保存。part 可选：'calc' 保存计算脚本，'vis' 保存可视化脚本，不传为单阶段代码。 */
export function saveLastCodeToScripts(part) {
    const user = getCurrentUser();
    if (!user) {
        showToast('请先登录', 'error');
        toggleAuthModal(true);
        return;
    }
    const code = part === 'calc' ? lastGeneratedCodeCalc : (part === 'vis' ? lastGeneratedCodeVis : lastGeneratedCode);
    if (!code || !code.trim()) {
        showToast(part === 'calc' ? '暂无可保存的计算脚本' : (part === 'vis' ? '暂无可保存的可视化脚本' : '暂无可保存的代码'), 'error');
        return;
    }
    window._scriptNoteModalSource = 'calculate';
    window._scriptNoteModalPart = part;
    window._scriptNoteModalCode = code;
    const titleEl = document.getElementById('script-note-modal-title');
    const inputEl = document.getElementById('script-note-input');
    const prefixEl = document.getElementById('script-note-prefix');
    const label = part === 'calc' ? '计算' : (part === 'vis' ? '可视化' : '');
    if (titleEl) titleEl.textContent = label ? `保存「${label}」到动画脚本库` : '保存到动画脚本库';
    if (prefixEl) {
        if (label) {
            prefixEl.textContent = label + ' - ';
            prefixEl.style.display = 'inline-flex';
        } else {
            prefixEl.textContent = '';
            prefixEl.style.display = 'none';
        }
    }
    if (inputEl) {
        inputEl.value = '动态计算 ' + new Date().toLocaleString();
        inputEl.placeholder = '例如：矩阵动画、sin(x) 可视化、公式推演';
    }
    toggleModal('script-note-modal', true);
}

/** 由脚本备注弹窗确认后调用，执行实际保存（与开发者工具共用同一弹窗时由 main 挂载的 submitCalcScriptNote 调用） */
export async function submitSaveScriptNote(note) {
    const user = getCurrentUser();
    const code = (window._scriptNoteModalCode && window._scriptNoteModalCode.trim()) ? window._scriptNoteModalCode.trim() : lastGeneratedCode.trim();
    if (!user || !code) return;
    if (window._scriptNoteModalCode) window._scriptNoteModalCode = null;
    const noteStr = (note && note.trim()) ? note.trim() : '未命名';
    try {
        const res = await fetch('/api/animation_scripts/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, note: noteStr, code })
        });
        const data = await res.json();
        if (data.status === 'success') {
            // 与开发者工具工作台保持一致：在保存脚本后，自动调用同一接口生成「视频文案」摘要，
            // 并写入 localStorage，供「动画脚本库」列表预览使用。
            try {
                const copyRes = await fetch('/api/devtools/generate_video_copy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                const copyData = await copyRes.json();
                if (copyData.status === 'success' && copyData.copy && data.id) {
                    try {
                        const key = 'animation_script_video_copies';
                        const raw = localStorage.getItem(key) || '{}';
                        const map = JSON.parse(raw);
                        map[String(data.id)] = copyData.copy;
                        localStorage.setItem(key, JSON.stringify(map));
                    } catch (e) {
                        console.warn('保存视频文案到 localStorage 失败', e);
                    }
                }
            } catch (e) {
                console.warn('generate_video_copy 调用失败（calculate 页面）', e);
            }
            showToast('已保存到动画脚本库', 'success');
            showSection('my-formulas');
            Formulas.switchFormulasSubTab('scripts');
        } else {
            showToast(data.message || '保存失败', 'error');
        }
    } catch (e) {
        showToast('网络错误', 'error');
    }
}

window.goToMyFormulas = function() {
    closeFormulaSelector();
    showSection('my-formulas');
}

export function clearCalcInput() {
    const field = document.getElementById('math-field-main');
    const code = document.getElementById('latex-code-main');
    if(field) field.setValue("");
    if(code) code.value = "";
}

window.selectFormula = function(encodedLatex) {
    const latex = decodeURIComponent(encodedLatex);
    const field = document.getElementById('math-field-main');
    if(field) field.setValue(latex);
    closeFormulaSelector();
};