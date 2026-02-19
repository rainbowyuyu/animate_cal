import { toggleModal, showSection, toggleAuthModal, showToast } from './ui.js';
import { loadMyFormulas, normalizeLatex } from './formulas.js';
import * as Formulas from './formulas.js';

let lastGeneratedCode = '';
let lastGeneratedCodeCalc = '';
let lastGeneratedCodeVis = '';
// 解题步骤流式输出累积内容
let accumulatedStepsContent = {
    unified: '',  // 通用模式的解题步骤
    single: ''   // 单阶段模式的解题步骤
};

function getCurrentUser() {
    const userDisplay = document.getElementById('user-display');
    const usernameSpan = document.getElementById('username-span');
    if (userDisplay && userDisplay.style.display !== 'none' && usernameSpan) return usernameSpan.innerText;
    return null;
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
}

// 辅助：冷却逻辑 (独立并行)
function startCooldown(duration = 10) {
    const btn = document.querySelector('.calc-sidebar .action-btn.full-width');
    if (!btn) return;

    // 如果已经在冷却中，不再重复触发（双重保险）
    if (btn.classList.contains('is-cooldown')) return;

    // 1. 保存原始按钮内容 (如果还没保存过)
    if (!btn.dataset.originalHtml) {
        btn.dataset.originalHtml = btn.innerHTML;
    }

    // 2. 设置冷却状态
    btn.disabled = true;
    btn.classList.add('is-cooldown'); // 添加标记
    btn.style.opacity = '0.7';
    btn.style.cursor = 'not-allowed';

    let timeLeft = duration;
    btn.innerHTML = `<i class="fa-regular fa-clock"></i> 冷却中 (${timeLeft}s)`;

    // 3. 启动倒计时 (不等待 Promise，独立运行)
    const timer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(timer);
            // 4. 恢复原始状态
            btn.disabled = false;
            btn.classList.remove('is-cooldown');
            btn.innerHTML = btn.dataset.originalHtml;
            btn.style.opacity = '';
            btn.style.cursor = '';
        } else {
            btn.innerHTML = `<i class="fa-regular fa-clock"></i> 冷却中 (${timeLeft}s)`;
        }
    }, 1000);
}

// 核心：开始生成动画（仅在有错误时由后端对单阶段重试，前端不整请求重试）
export async function startAnimation() {
    const btn = document.querySelector('.calc-sidebar .action-btn.full-width');

    // 检查是否正在冷却
    if (btn && btn.disabled) return;

    const formulaField = document.getElementById('math-field-main');
    const formula = formulaField ? formulaField.getValue() : "";

    if (!formula.trim()) {
        if (typeof showAlert === 'function') await showAlert("请输入公式", "提示");
        return;
    }

    // --- 点击后立即启动冷却 (并行执行) ---
    startCooldown(30);

    // 获取 DOM 元素
    const videoWrapper = document.getElementById('calc-video-wrapper');
    const placeholder = document.getElementById('video-placeholder-content');
    const videoPlayer = document.getElementById('result-video-player');

    const logBox = document.getElementById('gen-log');
    const progBar = document.getElementById('gen-progress');
    const percentText = document.getElementById('gen-percent');
    const method = document.getElementById('calc-method').value;

    // 1. 重置 UI 状态
    if(logBox) logBox.innerHTML = '';
    addLog("正在初始化生成任务...", "#94a3b8");

    if(progBar) {
        progBar.style.width = '0%';
        progBar.className = '';
        progBar.style.background = "#3b82f6";
    }
    if(percentText) percentText.innerText = '0%';

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
        placeholderCalc.innerHTML = '<span>等待「计算」渲染</span><span class="loading-dots"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>';
    }
    if(placeholderVis) {
        placeholderVis.style.display = 'block';
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
        placeholderSingle.innerHTML = '<span>等待渲染</span><span class="loading-dots"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>';
    }
    if (loadingSingle) loadingSingle.style.display = 'none';
    // 重置流式输出累积
    accumulatedStepsContent.unified = '';
    accumulatedStepsContent.single = '';
    const renderLoading = document.getElementById('calc-render-loading');
    if(renderLoading) renderLoading.style.display = 'flex';
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

    try {
        const response = await fetch('/api/animate/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matrixA: formula,
                    matrixB: "",
                    operation: method
                })
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

                            if (data.progress) {
                            if(progBar) progBar.style.width = data.progress + '%';
                            if(percentText) percentText.innerText = data.progress + '%';

                            if(data.progress < 30 && progBar) progBar.style.background = "#3b82f6";
                            else if(data.progress < 90 && progBar) progBar.style.background = "#8b5cf6";
                            else if(progBar) progBar.style.background = "#10b981";
                        }

                        if (data.step === 'text_result') {
                            const content = data.content || '';
                            if (!content) return; // 空内容跳过
                            
                            // 累积内容（流式输出）
                            accumulatedStepsContent.unified += content;
                            accumulatedStepsContent.single += content;
                            
                            // 解析累积的 Markdown（每次追加后重新解析完整内容）
                            let htmlContentUnified = '';
                            let htmlContentSingle = '';
                            if (window.marked && typeof window.marked.parse === 'function') {
                                try {
                                    htmlContentUnified = window.marked.parse(accumulatedStepsContent.unified);
                                    htmlContentSingle = window.marked.parse(accumulatedStepsContent.single);
                                } catch (e) {
                                    console.warn('Markdown parse error:', e);
                                    htmlContentUnified = accumulatedStepsContent.unified.replace(/\n/g, '<br>');
                                    htmlContentSingle = accumulatedStepsContent.single.replace(/\n/g, '<br>');
                                }
                            } else {
                                htmlContentUnified = accumulatedStepsContent.unified.replace(/\n/g, '<br>');
                                htmlContentSingle = accumulatedStepsContent.single.replace(/\n/g, '<br>');
                            }
                            
                            // 将 $...$ / $$...$$ 转为 MathJax 默认的 \(...\) / \[...\]
                            // 修复：确保所有公式（包括包含 \left...\right 的）都能正确解析
                            function convertDollarToMathJax(html) {
                                if (!html) return '';
                                
                                // 先标记所有 $$...$$（块级公式），避免后续处理时误匹配
                                const blockMarkers = [];
                                html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
                                    const marker = `__BLOCK_MATH_${blockMarkers.length}__`;
                                    blockMarkers.push({ marker, match, content });
                                    return marker;
                                });
                                
                                // 处理行内公式 $...$（不匹配 $$）
                                // 修复：包含 \left...\right 的公式也需要转换，MathJax 可以正确解析
                                html = html.replace(/\$([^$\n]+?)\$/g, (match, content) => {
                                    // 如果内容已经包含 \( 或 \[，说明已经转换过，不重复转换
                                    if (content.includes('\\(') || content.includes('\\[')) return match;
                                    // 所有 $...$ 都转换为 \(...\)，包括包含 \left...\right 的复杂公式
                                    return '\\(' + content + '\\)';
                                });
                                
                                // 恢复块级公式标记，并转换
                                blockMarkers.forEach(({ marker, match, content }) => {
                                    // 如果内容已经包含 \[，不转换
                                    if (content.includes('\\[')) {
                                        html = html.replace(marker, match);
                                    } else {
                                        // 块级公式转换为 \[...\]
                                        html = html.replace(marker, '\\[' + content + '\\]');
                                    }
                                });
                                
                                return html;
                            }
                            htmlContentUnified = convertDollarToMathJax(htmlContentUnified);
                            htmlContentSingle = convertDollarToMathJax(htmlContentSingle);
                            
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
                            
                            // 延迟批量渲染 MathJax（避免每次追加都触发，提高性能）
                            // 修复：确保所有公式（包括包含 \left...\right 的结论）都能正确解析
                            clearTimeout(window.stepsMathJaxTimeout);
                            const nodesToTypeset = [stepsContentUnified, stepsContentSingle].filter(Boolean);
                            if (window.MathJax && typeof window.MathJax.typesetPromise === 'function' && nodesToTypeset.length) {
                                window.stepsMathJaxTimeout = setTimeout(() => {
                                    try {
                                        // 先清除之前的 MathJax 内容，避免重复渲染
                                        nodesToTypeset.forEach(node => {
                                            if (node) {
                                                const mjxElements = node.querySelectorAll('.mjx-container, .MathJax');
                                                mjxElements.forEach(el => el.remove());
                                            }
                                        });
                                        // 重新渲染所有数学公式
                                        window.MathJax.typesetPromise(nodesToTypeset).catch(e => {
                                            console.warn('MathJax typeset error:', e);
                                            // 如果失败，尝试重新配置并重试
                                            if (window.MathJax && window.MathJax.startup) {
                                                window.MathJax.startup.promise.then(() => {
                                                    window.MathJax.typesetPromise(nodesToTypeset);
                                                });
                                            }
                                        });
                                    } catch (e) {
                                        console.warn('MathJax typeset error:', e);
                                    }
                                }, 300); // 300ms 防抖，避免频繁渲染
                            }
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
                            addLog(data.message || "正在构思数学可视化脚本...", "#fbbf24");
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
                        }
                        else if (data.step === 'rendering') {
                            if (data.message) {
                                addLog(data.message, "#e2e8f0");
                            }
                            // 单阶段模式渲染时显示加载状态
                            if (!data.part) {
                                const singleWrap = document.getElementById('calc-single-wrap');
                                if (singleWrap && singleWrap.style.display !== 'none') {
                                    const loadingSingle = document.getElementById('calc-window-loading-single');
                                    if (loadingSingle) loadingSingle.style.display = 'flex';
                                }
                            }
                        }
                        else if (data.step === 'complete') {
                            if (renderLoading) renderLoading.style.display = 'none';
                            addLog((data.message || "✨ 渲染完成！视频加载中..."), "#a78bfa");
                            const part = data.part;
                            const url = data.video_url ? `${data.video_url}?t=${new Date().getTime()}` : '';
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
                                    if (windowEl) {
                                        windowEl.style.animation = 'calcCompleteHighlight 1.5s ease-out';
                                    }
                                    if (tabEl) {
                                        tabEl.style.animation = 'calcTabPulse 1s ease-out';
                                    }
                                    setTimeout(() => {
                                        if (windowEl) windowEl.style.animation = '';
                                        if (tabEl) tabEl.style.animation = '';
                                    }, 1500);
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
                                    if (windowEl) {
                                        windowEl.style.animation = 'calcCompleteHighlight 1.5s ease-out';
                                    }
                                    if (tabEl) {
                                        tabEl.style.animation = 'calcTabPulse 1s ease-out';
                                    }
                                    setTimeout(() => {
                                        if (windowEl) windowEl.style.animation = '';
                                        if (tabEl) tabEl.style.animation = '';
                                    }, 1500);
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
                                    if (windowEl) {
                                        windowEl.style.animation = 'calcCompleteHighlight 1.5s ease-out';
                                    }
                                    if (tabEl) {
                                        tabEl.style.animation = 'calcTabPulse 1s ease-out';
                                    }
                                    setTimeout(() => {
                                        if (windowEl) windowEl.style.animation = '';
                                        if (tabEl) tabEl.style.animation = '';
                                    }, 1500);
                                }, 500);
                                return;
                            }
                            // 双阶段时不要 return，继续读流以接收下一阶段 complete
                        }
                        else if (data.step === 'error') {
                            if (renderLoading) renderLoading.style.display = 'none';
                            addLog("❌ 错误: " + (data.message || '未知错误'), "#ef4444");
                            if (progBar) progBar.style.background = "#ef4444";
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
        const loadingEl = document.getElementById('calc-render-loading');
        if (loadingEl) loadingEl.style.display = 'none';
        addLog("❌ 网络或请求错误: " + (e.message || '请检查服务器状态'), "#ef4444");
        if (typeof showToast === 'function') showToast('请求失败，请稍后再试。', 'error');
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
                if (window.MathJax) MathJax.typesetPromise([container]);
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