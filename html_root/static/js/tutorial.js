// static/js/tutorial.js
import { showSection, switchInputMode } from './ui.js';

// 兼容 CDN 暴露：官方为 window.driver.js.driver，部分 IIFE 为 window['driver.js'].driver
function getDriver() {
    if (typeof window === 'undefined') return null;
    if (window.driver?.js?.driver) return window.driver.js.driver;
    if (window['driver.js']?.driver) return window['driver.js'].driver;
    return null;
}
let tutorialInterval = null;

// 模拟数据
const MOCK_MATRIX = String.raw`\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}`;

// 辅助：延时
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 辅助：先切换区块，等布局完成后再滚动，确保 Driver.js 能正确高亮
function goToAndScroll(sectionId, element) {
    showSection(sectionId);
    if (element) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
            });
        });
    }
}

// 辅助：检测深色模式
const isDarkMode = () => document.documentElement.getAttribute('data-theme') === 'dark';

// --- 样式注入：适配 Driver.js 的深色模式 ---
function injectDriverStyles() {
    const styleId = 'driver-custom-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        /* 覆盖 Driver.js 默认样式以适配深色模式和品牌色 */
        .driver-popover.driverjs-theme {
            background-color: var(--bg-surface);
            color: var(--text-main);
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-lg);
            border-radius: var(--radius-md);
        }
        .driver-popover.driverjs-theme .driver-popover-title {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--primary-color);
        }
        .driver-popover.driverjs-theme .driver-popover-description {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 0.95rem;
            color: var(--text-main);
            line-height: 1.6;
        }
        .driver-popover.driverjs-theme button {
            background-color: var(--bg-body);
            color: var(--text-main);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            text-shadow: none;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .driver-popover.driverjs-theme button:hover {
            background-color: var(--primary-color);
            color: white;
        }
        .driver-popover.driverjs-theme .driver-popover-navigation-btns {
            gap: 8px;
        }
        /* 遮罩层颜色 */
        .driver-overlay path {
            fill: var(--bg-body);
            opacity: 0.75;
        }
    `;
    document.head.appendChild(style);
}

// --- 动画效果函数 ---

// 仅当【智能识别】区块可见时执行（避免教程切到其他页时误触）
function isDetectSectionVisible() {
    const section = document.getElementById('detect');
    return section && section.classList.contains('active-section');
}

// 1. 模拟画板绘制 (适配深色模式)
async function simulateDrawing() {
    if (!isDetectSectionVisible()) return;
    const canvas = document.getElementById('drawing-board');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 获取当前主题颜色配置
    const dark = isDarkMode();
    // 深色模式背景色对应 --bg-surface (#1e293b), 亮色对应 #FFFFFF
    const bgColor = dark ? '#1e293b' : '#FFFFFF';
    // 深色模式笔触用亮青色，亮色模式用品牌蓝
    const strokeColor = dark ? '#22d3ee' : '#2563eb';

    // 重置画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 坐标转换辅助
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;

    ctx.lineWidth = 3 * scaleX;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;

    // 定义一个 "1" 的轨迹 (简化版)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const paths = [
        // [
        [{x: centerX-60, y: centerY-50}, {x: centerX-80, y: centerY-50}, {x: centerX-80, y: centerY+50}, {x: centerX-60, y: centerY+50}],
        // 1
        [{x: centerX-40, y: centerY-20}, {x: centerX-40, y: centerY+20}],
        // 2
        [{x: centerX+40, y: centerY-20}, {x: centerX+40, y: centerY+20}],
        // ]
        [{x: centerX+60, y: centerY-50}, {x: centerX+80, y: centerY-50}, {x: centerX+80, y: centerY+50}, {x: centerX+60, y: centerY+50}]
    ];

    let pathIdx = 0;
    let pointIdx = 0;

    if (tutorialInterval) clearInterval(tutorialInterval);

    tutorialInterval = setInterval(() => {
        if (pathIdx >= paths.length) {
            clearInterval(tutorialInterval);
            return;
        }

        const currentPath = paths[pathIdx];

        if (pointIdx === 0) {
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
        }

        if (pointIdx < currentPath.length) {
            const p = currentPath[pointIdx];
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            pointIdx++;
        } else {
            ctx.closePath();
            pathIdx++;
            pointIdx = 0;
        }
    }, 50);
}

// 2. 模拟识别结果填充
async function simulateRecognitionResult() {
    if (!isDetectSectionVisible()) return;
    const mathField = document.getElementById('latex-output');
    if (!mathField) return;

    // 模拟 Loading
    mathField.setValue(String.raw`\text{正在识别中...}`);
    await sleep(800);
    // 模拟结果
    mathField.setValue(MOCK_MATRIX);
    // 高亮反馈 (使用 primary color 的 glow)
    const container = document.querySelector('.result-panel');
    if(container) {
        container.style.transition = "box-shadow 0.3s";
        container.style.boxShadow = "0 0 0 4px var(--shadow-glow)"; // 使用 CSS 变量
        setTimeout(() => container.style.boxShadow = "", 1000);
    }
}

// 动态加载 driver.js（CDN），加载完成后执行 callback
function loadDriverScript(callback) {
    const scriptId = 'driver-js-script';
    const existing = document.getElementById(scriptId);
    if (existing) {
        const fn = getDriver();
        if (fn) callback(fn);
        else callback(null);
        return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.js.iife.js';
    script.onload = () => callback(getDriver());
    script.onerror = () => callback(null);
    document.head.appendChild(script);
}

// --- 教程主逻辑 ---

export function startTutorial() {
    function runTutorial(driverFn) {
        if (!driverFn) {
            if (typeof showToast === 'function') showToast('引导库未加载，请刷新后重试', 'error');
            else if (typeof showAlert === 'function') showAlert('引导库未加载，请刷新后重试', "提示");
            return;
        }
        injectDriverStyles();
        runDriverTour(driverFn);
    }

    const driverFn = getDriver();
    if (driverFn) {
        runTutorial(driverFn);
        return;
    }
    // 未检测到引导库时尝试动态加载
    loadDriverScript(runTutorial);
}

function runDriverTour(driverFn) {

    const tour = driverFn({
        showProgress: true,
        animate: true,
        allowClose: true,
        doneBtnText: "开始探索",
        nextBtnText: "下一步",
        prevBtnText: "上一步",
        progressText: "步骤 {{current}} / {{total}}",
        // 关键：给引导框添加自定义类名，以便应用样式
        popoverClass: 'driverjs-theme',
        steps: [
            {
                element: '.logo',
                popover: {
                    title: '👋 欢迎使用智算视界',
                    description: '本站是<b>数学公式识别 + 动态可视化</b>一体化平台：可<b>手写或上传</b>公式 → 【智能识别】 → 存入【我的算式】 → 在【动态计算】中生成 Manim 动画；也可用【智能体】一句话完成上述流程，或用【开发者工具】直接编辑 LaTeX / Manim。下面用约 30 秒带您走一遍经典路径。',
                    side: "bottom",
                    align: 'start'
                },
                onHighlightStarted: (el) => goToAndScroll('home', el)
            },
            // --- 智能体（跳转到智能体页并高亮侧栏入口）---
            {
                element: '#agent #agent-features-examples-btn',
                popover: {
                    title: '推荐：智能体',
                    description: '用<b>自然语言</b>说出需求（或<b>上传公式图片</b>），系统会自动跳转并执行：识别、保存、生成动画、打开 LaTeX/Manim 工作台等。支持多步指令，如【识别这张图并保存到我的算式】。可点击此处【功能与示例】查看可用的说法与示例。',
                    side: "right"
                },
                onHighlightStarted: (el) => goToAndScroll('agent', el)
            },
            // --- 阶段一：识别（先切区块再滚动，保证 Driver.js 高亮位置正确）---
            {
                element: '.nav-links .desktop-nav button:nth-child(3)', // 智能识别 tab
                popover: {
                    title: '1. 进入识别工作台',
                    description: '第一步：点击这里进入【智能识别】页面。',
                    side: "bottom"
                },
                onHighlightStarted: (el) => goToAndScroll('detect', el)
            },
            {
                element: '#detect #draw-tools',
                popover: {
                    title: '2. 书写数学公式',
                    description: '请在中间的画板区域写下您的公式。支持矩阵、微积分等复杂符号。<br><i>(👀 请看屏幕上的自动书写演示)</i>',
                    side: "right"
                },
                onHighlightStarted: async (el) => {
                    goToAndScroll('detect', el);
                    switchInputMode('draw');
                    await sleep(500);
                    simulateDrawing();
                }
            },
            {
                element: '#detect .tools-panel .action-btn',
                popover: {
                    title: '3. 点击识别',
                    description: '写好后，点击【立即识别】按钮，将把笔迹转换为标准数学公式。',
                    side: "right"
                },
                onHighlightStarted: (el) => goToAndScroll('detect', el)
            },
            {
                element: '#detect .result-panel',
                popover: {
                    title: '4. 检查与编辑结果',
                    description: '识别结果会显示在这里。<br>👉 <b>技巧：</b>如果个别数字识别有误，直接点击公式即可像在 Word 中一样修改。',
                    side: "top"
                },
                onHighlightStarted: (el) => {
                    goToAndScroll('detect', el);
                    simulateRecognitionResult();
                }
            },
            // --- 阶段二：保存 ---
            {
                element: '#detect .result-actions .btn-calc-go',
                popover: {
                    title: '5. 保存公式',
                    description: '确认无误后，点击【保存并查看】。公式将存入您的云端笔记本，无需重复书写。',
                    side: "top"
                },
                onHighlightStarted: (el) => goToAndScroll('detect', el)
            },
            {
                element: '#my-formulas #formula-list',
                popover: {
                    title: '6. 我的算式',
                    description: '保存的公式会出现在这里，可随时调用。本页还有【子页】：渲染出的动画可【保存为脚本】，在【我的脚本】中编辑，或到【开发者工具】中继续编辑与渲染。',
                    side: "top"
                },
                onHighlightStarted: (el) => goToAndScroll('my-formulas', el)
            },
            // --- 阶段三：计算 ---
            {
                element: '.nav-links .desktop-nav button:nth-child(5)', // 动态计算 tab
                popover: {
                    title: '7. 前往计算引擎',
                    description: '现在，让我们把静态公式变成动画。点击进入【动态计算】页面。',
                    side: "bottom"
                },
                onHighlightStarted: (el) => goToAndScroll('calculate', el)
            },
            {
                element: '#calculate .header-actions .btn-import:first-child',
                popover: {
                    title: '8. 一键导入',
                    description: '不需要重新输入。点击【导入】图标，直接选择刚才保存的公式。',
                    side: "left"
                },
                onHighlightStarted: (el) => goToAndScroll('calculate', el)
            },
            {
                element: '#calculate #calc-method',
                popover: {
                    title: '9. 选择可视化模式',
                    description: '选择【公式推演】或【可视化演示】等模式，系统会生成对应动画。通用计算可视化会<b>分步执行</b>：先计算、再可视化，生成<b>两个视频</b>并带标签，便于保存时区分。',
                    side: "left"
                },
                onHighlightStarted: (el) => goToAndScroll('calculate', el)
            },
            {
                element: '#calculate .calc-sidebar .action-btn.full-width',
                popover: {
                    title: '10. 生成视频',
                    description: '点击生成后，右侧会播放 Manim 渲染的数学动画。生成完成后可【保存代码】到【我的算式】中的脚本库，便于在【开发者工具】中继续编辑与渲染。',
                    side: "right"
                },
                onHighlightStarted: (el) => goToAndScroll('calculate', el)
            },
            // --- 开发者工具（跳转到工作台并高亮工具箱）---
            {
                element: '#devtools .tools-list',
                popover: {
                    title: '11. 进阶：开发者工具',
                    description: '【LaTeX 编辑器】写公式；【Manim 工作台】写 Manim 代码并云端渲染，可导入已保存脚本或 rainbow 拓展库示例；【rainbow鱼拓展库】免安装使用拓展案例。适合想精细控制动画或直接写代码的用户。',
                    side: "right"
                },
                onHighlightStarted: (el) => goToAndScroll('devtools', el)
            },
            // --- 教学案例（跳转到案例页并高亮内容区）---
            {
                element: '#examples .section-title',
                popover: {
                    title: '12. 教学案例',
                    description: '观看现成的数学动画示例与教学场景，了解本站能做出的可视化效果。',
                    side: "bottom"
                },
                onHighlightStarted: (el) => goToAndScroll('examples', el)
            }
        ],
        onDestroyed: () => {
            // 清理
            if (tutorialInterval) clearInterval(tutorialInterval);

            // 清空画板并重置颜色
            const canvas = document.getElementById('drawing-board');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                const dark = isDarkMode();
                const bgColor = dark ? '#1e293b' : '#FFFFFF';
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // 重置输入框
            const mathField = document.getElementById('latex-output');
            if(mathField) mathField.setValue(String.raw`\text{等待输入...}`);

            // 回到首页
            showSection('home');
            localStorage.setItem('tutorial_played', 'true');
        }
    });

    tour.drive();
}

// 检查自动播放
export function checkAutoPlay() {
    if (!localStorage.getItem('tutorial_played')) {
        setTimeout(startTutorial, 1500);
    }
}