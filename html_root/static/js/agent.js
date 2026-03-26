// static/js/agent.js — 智能体：聊天式界面，理解意图后跳转并调用本站工具（需登录）

import { showSection, toggleAuthModal } from './ui.js';
import { getCurrentUser } from './auth.js';
import { sanitizeMarkdownHtml } from './sanitize.js';
import { getAgentEnterSend } from './settings.js';
import { getCurrentUserAvatarUrl } from './profile.js';
import { getSectionDisplayName, resolveIntent } from './site-graph.js';

/** 获取单步的简短描述，用于多步执行时的列表展示 */
function getStepLabel(step) {
    const name = getSectionDisplayName(step.section) || step.section;
    const parts = [];
    if (step.section === 'devtools') {
        if (step.devtool === 'latex') parts.push('填入 LaTeX');
        else if (step.devtool === 'manim') {
            const act = step.devtool_action || step.action;
            if (act === 'run') parts.push('运行 Manim');
            else if (act === 'keyframe') parts.push('关键帧预览');
            else if (act === 'import') parts.push('导入脚本');
            else if (act === 'save') parts.push('保存脚本');
            else if (act === 'summary') parts.push('生成视频文案');
            else if (act === 'ai_edit') parts.push('AI 编辑');
            else parts.push('填入 Manim 代码');
        } else if (step.devtool === 'rainbow') parts.push('Rainbow 拓展');
    }
    if (step.trigger === 'recognize') parts.push('识别');
    if (step.trigger === 'generate') parts.push('生成动画');
    if (step.save_to_formulas) parts.push('保存到我的算式');
    if (step.section === 'calculate' && step.operation) {
        const modeNames = { normal: '通用推演', formular: '公式推演', visualization: '可视化', solution: '完整解题演示' };
        parts.push(modeNames[step.operation] || step.operation);
    }
    if (step.section === 'examples' && step.examples_filter) {
        const filterNames = { all: '全部案例', favorites: '收藏', watch_later: '稍后看', courseware: '我的课件' };
        parts.push(filterNames[step.examples_filter] || step.examples_filter);
    }
    if (step.section === 'settings') {
        const sectionNames = { appearance: '外观', profile: '账户', agent: '智能体', detect: '画板', shortcuts: '快捷键', calc: '动态计算', devtools: '开发者工具', examples: '弹幕' };
        if (step.settings_section) parts.push(sectionNames[step.settings_section] || step.settings_section);
        if (step.setting_key) parts.push('修改 ' + step.setting_key);
    }
    const action = parts.length ? `（${parts.join('、')}）` : '';
    return `打开「${name}」${action}`;
}

function getPromptEl() {
    return document.getElementById('agent-prompt');
}
function getFileInput() {
    return document.getElementById('agent-image-upload');
}
function getSubmitBtn() {
    return document.getElementById('agent-submit-btn');
}
function getMessagesEl() {
    return document.getElementById('agent-messages');
}
function getPreviewWrap() {
    return document.getElementById('agent-image-preview-wrap');
}
function getPreviewImg() {
    return document.getElementById('agent-image-preview');
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/** 对助手回复中的 LaTeX 进行 KaTeX 渲染（在容器已插入 DOM 后调用，与 ChatGPT/Claude/豆包一致） */
function typesetAgentMath(container) {
    if (!container) return;
    if (typeof renderMath === 'function') renderMath(container);
}

/** 将纯文本回复转为可展示的 HTML（保留 $...$ / $$...$$ 供 KaTeX 渲染） */
function replyTextToHtml(text) {
    if (!text || !text.trim()) return '';
    return escapeHtml(text.trim()).replace(/\n/g, '<br>');
}

/** 流式将文本写入 element，完成后可选执行 LaTeX 渲染与回调。返回 Promise。 */
function streamTextInto(element, fullText, options = {}) {
    const chunkSize = options.chunkSize ?? 2;
    const intervalMs = options.intervalMs ?? 35;
    const onDone = options.onDone;
    if (!element || fullText == null) {
        if (onDone) onDone();
        return Promise.resolve();
    }
    let index = 0;
    const len = fullText.length;
    return new Promise((resolve) => {
        const tick = () => {
            if (index >= len) {
                if (onDone) onDone();
                resolve();
                return;
            }
            const end = Math.min(index + chunkSize, len);
            const chunk = fullText.slice(index, end);
            index = end;
            element.appendChild(document.createTextNode(chunk));
            scrollMessagesToBottom();
            setTimeout(tick, intervalMs);
        };
        tick();
    });
}

/** 规范化为 MathLive 可解析的 LaTeX */
function sanitizeLatexForMathlive(latex) {
    if (latex == null || typeof latex !== 'string') return '';
    let s = latex.trim()
        .replace(/^```(?:latex)?\s*/g, '').replace(/\s*```\s*$/g, '')
        .replace(/^\\\[\s]*/g, '').replace(/\s*\\\]\s*$/g, '')
        .replace(/^\$\$\s*/g, '').replace(/\s*\$\$\s*$/g, '')
        .replace(/^\\\(\s*/g, '').replace(/\s*\\\)\s*$/g, '') // 处理 \( 和 \)
        .replace(/\\\(/g, '').replace(/\\\)/g, '') // 移除内联的 \( 和 \)
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, ' ').replace(/\r\n?|\n/g, ' ')
        .replace(/\s+/g, ' ').trim();
    return s;
}

/** 点击用户消息中的图片时放大预览 */
function openAgentImagePreview(src) {
    if (!src) return;
    let overlay = document.getElementById('agent-image-preview-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'agent-image-preview-overlay';
        overlay.className = 'agent-image-preview-overlay';
        overlay.innerHTML = '<button type="button" class="agent-image-preview-close" aria-label="关闭"><i class="fa-solid fa-xmark"></i></button><img alt="预览" class="agent-image-preview-img">';
        overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.closest('.agent-image-preview-close')) overlay.style.display = 'none'; });
        overlay.querySelector('.agent-image-preview-img').addEventListener('click', (e) => e.stopPropagation());
        overlay.querySelector('.agent-image-preview-close').addEventListener('click', (e) => { e.stopPropagation(); overlay.style.display = 'none'; });
        document.body.appendChild(overlay);
    }
    const img = overlay.querySelector('.agent-image-preview-img');
    if (img) img.src = src;
    overlay.style.display = 'flex';
}

/** 追加用户消息到聊天区域（有头像时使用用户头像）；用户上传的图片可点击预览 */
function appendUserMessage(text, imageDataUrl) {
    const el = getMessagesEl();
    if (!el) return;
    const bubbleContent = imageDataUrl
        ? `<p>${escapeHtml(text || '')}</p><div class="agent-msg-img agent-msg-img-clickable" title="点击放大预览"><img src="${escapeHtml(imageDataUrl)}" alt=""></div>`
        : `<p>${escapeHtml(text || '')}</p>`;
    const avatarUrl = getCurrentUserAvatarUrl();
    const avatarHtml = avatarUrl
        ? `<img src="${escapeHtml(avatarUrl)}" alt="" class="agent-avatar-img">`
        : '<i class="fa-solid fa-user"></i>';
    const div = document.createElement('div');
    div.className = 'agent-message agent-message-user';
    div.innerHTML = `<div class="agent-avatar agent-avatar-user">${avatarHtml}</div><div class="agent-bubble agent-bubble-user">${bubbleContent}</div>`;
    el.appendChild(div);
    if (imageDataUrl) {
        const imgWrap = div.querySelector('.agent-msg-img');
        if (imgWrap) imgWrap.addEventListener('click', () => openAgentImagePreview(imageDataUrl));
    }
    animateMessageAppear(div.querySelector('.agent-bubble-user'));
    scrollMessagesToBottom();
}

/** 追加助手消息 */
function appendAssistantMessage(html, executeData = null) {
    const el = getMessagesEl();
    if (!el) return;
    const div = document.createElement('div');
    div.className = 'agent-message agent-message-assistant';
    const bubble = document.createElement('div');
    bubble.className = 'agent-bubble agent-bubble-assistant';
    if (executeData) {
        bubble.classList.add('agent-bubble-clickable');
        bubble.setAttribute('data-execute', JSON.stringify(executeData));
        bubble.setAttribute('title', '点击重新执行');
        bubble.addEventListener('click', () => {
            reExecuteFromMessage(executeData);
        });
    }
    bubble.innerHTML = html;
    div.innerHTML = `<div class="agent-avatar agent-avatar-bot"><img src="assets/智算视界_avatar.svg" alt="智算视界" class="agent-avatar-logo"></div>`;
    div.appendChild(bubble);
    el.appendChild(div);
    animateMessageAppear(bubble);
    scrollMessagesToBottom();
}

/** 重新执行上一条可执行消息（供右键菜单等调用） */
export function reExecuteLastMessage() {
    const bubbles = document.querySelectorAll('.agent-bubble-assistant[data-execute]');
    const last = bubbles[bubbles.length - 1];
    if (last) {
        try {
            const data = JSON.parse(last.getAttribute('data-execute'));
            reExecuteFromMessage(data);
        } catch (_) {}
    }
}

/** 从消息重新执行操作 */
function reExecuteFromMessage(executeData) {
    if (!executeData) return;

    if (executeData.isError && executeData.prompt) {
        executeAgentRequest(executeData.prompt, executeData.image_base64 || null);
        return;
    }

    const steps = Array.isArray(executeData.steps) && executeData.steps.length > 0 ? executeData.steps : null;
    const singleSection = executeData.section;
    const singleReply = executeData.reply;

    if (steps && steps.length > 0) {
        const isChatOnly = steps.length === 1 && steps[0].section === 'chat' && steps[0].reply;
        if (isChatOnly) {
            if (typeof showToast === 'function') showToast('这是对话回复，无需重新执行', 'info');
            return;
        }
        applyAgentResult(executeData);
        if (typeof showToast === 'function') showToast('已重新执行', 'success');
        return;
    }

    if (singleSection && singleSection !== 'chat') {
        applyAgentResult(executeData);
        if (typeof showToast === 'function') showToast('已重新执行', 'success');
    } else if (singleSection === 'chat' && singleReply) {
        if (typeof showToast === 'function') showToast('这是对话回复，无需重新执行', 'info');
    }
}

function escapeHtml(s) {
    if (!s) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

function scrollMessagesToBottom() {
    const el = getMessagesEl();
    if (el) {
        requestAnimationFrame(() => {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        });
    }
}

/** 功能与示例：知识图谱式示例面板 */
const AGENT_EXAMPLE_GRAPH_DATA = [
    {
        id: 'detect',
        icon: 'fa-camera',
        title: '识别与公式',
        subtitle: '从图片 / 手写到 LaTeX',
        desc: '将题目图片或手写算式识别为可编辑 LaTeX，可选择仅识别、保存到我的算式或直接去计算页。',
        examples: [
            {
                id: 'detect-basic',
                title: '识别这张图',
                summary: '上传/粘贴题目图片，一句话让智能体识别其中的公式。',
                prompt: '识别这张图',
                steps: [
                    '读取你刚刚上传或粘贴的图片。',
                    '调用「智能识别」工具，将图片中的公式转成 LaTeX。',
                    '把识别结果展示在识别页的公式栏中，便于你修改或保存。'
                ]
            },
            {
                id: 'detect-save',
                title: '识别并保存到我的算式',
                summary: '识别后自动写入「我的算式」，方便后续在计算页或工作台复用。',
                prompt: '帮我识别公式并保存到我的算式',
                steps: [
                    '打开「智能识别」页并识别当前图片中的公式。',
                    '把识别出来的 LaTeX 填入结果区域。',
                    '自动点击「保存并查看」，将公式写入「我的算式」。'
                ]
            },
            {
                id: 'detect-explain',
                title: '识别并告诉我结果',
                summary: '不仅识别公式，还用文字解释结果含义或计算值。',
                prompt: '识别这张图里的公式并告诉我结果',
                steps: [
                    '用多模态大模型识别题目中的公式与文字。',
                    '将公式统一整理为规范 LaTeX 表达。',
                    '在聊天区给出文字版的计算结果或结论说明。'
                ]
            }
        ]
    },
    {
        id: 'calculate',
        icon: 'fa-calculator',
        title: '动态计算与可视化',
        subtitle: '从公式到动画',
        desc: '在动态计算页进行推演、可视化或完整解题演示，智能体会自动选择合适模式。',
        examples: [
            {
                id: 'calc-sin-anim',
                title: '把 sin(x)=1/2 做成动画',
                summary: '自动选择可视化模式，生成解方程 + 图像的联动动画。',
                prompt: '把 sin(x)=1/2 做成动画',
                steps: [
                    '切换到「动态计算」页并选中合适的演示模式。',
                    '在主输入框中填入 sin(x)=1/2 的 LaTeX 表达。',
                    '生成一段包含解方程与函数图像的 Manim 脚本，并开始渲染预览。'
                ]
            },
            {
                id: 'calc-solution',
                title: '完整解题演示',
                summary: '针对一整道题生成「整题模式」的逐步演示。',
                prompt: '用完整解题演示做这道题',
                steps: [
                    '分析你粘贴的整道题或刚识别的题目图片。',
                    '在动态计算中选择「完整解题演示」模式，将整题文字填入输入框。',
                    '先给出文字版解题步骤，再生成对应的 Manim 动画视频。'
                ]
            },
            {
                id: 'calc-visual-yx2',
                title: '可视化：画 y=x²',
                summary: '用可视化模式绘制基础函数曲线，适合课堂讲解。',
                prompt: '用可视化模式画 y=x^2',
                steps: [
                    '打开「动态计算」页并切换到「可视化」模式。',
                    '填入 y = x^2 的公式，并设置合理的取值区间。',
                    '生成一段展示抛物线形状与关键点的动画。'
                ]
            }
        ]
    },
    {
        id: 'devtools',
        icon: 'fa-code',
        title: '开发者工具与脚本',
        subtitle: 'LaTeX / Manim / Rainbow',
        desc: '在云端代码工作台中编辑、运行 Manim 脚本，或在 LaTeX 编辑器中整理公式。',
        examples: [
            {
                id: 'devtools-open-latex',
                title: '打开 LaTeX 编辑器',
                summary: '快速跳到开发者工具中的 LaTeX 子页。',
                prompt: '打开 LaTeX 编辑器',
                steps: [
                    '切换到「开发者工具」页。',
                    '在顶部标签中选中「LaTeX 编辑器」。',
                    '准备好预览区域，方便你一边写一边看公式排版。'
                ]
            },
            {
                id: 'devtools-open-manim',
                title: '打开工作台并填入示例',
                summary: '在云端工作台中填入一段可直接运行的 Manim 示例代码。',
                prompt: '打开云端渲染工作台并帮我写一段 Manim 示例代码填入',
                steps: [
                    '切换到「开发者工具」页并选中「云端代码工作台」。',
                    '在编辑器中填入一段简单的 Manim 示例脚本（如几何图形或数轴演示）。',
                    '准备好渲染区域，你可以手动点击「运行」查看动画效果。'
                ]
            }
        ]
    },
    {
        id: 'flows',
        icon: 'fa-route',
        title: '组合路径与流程',
        subtitle: '识别 → 计算 → 案例',
        desc: '按一条「知识图谱路径」组合多个工具，用一句话完成整条流水线。',
        examples: [
            {
                id: 'flow-detect-to-calc',
                title: '识别图片 → 去计算页生成动画',
                summary: '一键走完「识别 → 动态计算 → 生成动画」的整条链路。',
                prompt: '识别这张图并去计算页生成动画',
                steps: [
                    '在「智能识别」中识别你上传的题目图片，得到 LaTeX 公式。',
                    '自动跳转到「动态计算」页并填入识别到的公式。',
                    '选择合适的模式，自动点击「生成可视化动画」，渲染完成后给出视频入口。'
                ]
            },
            {
                id: 'flow-save-and-calc',
                title: '识别 → 保存到算式库 → 去计算',
                summary: '适合先把题目收集进资料库，再进入计算页统一整理。',
                prompt: '识别这张图并保存到我的算式再去计算',
                steps: [
                    '识别图片中的公式并将其规范化为 LaTeX。',
                    '点击「保存并查看」，把题目写入「我的算式」。',
                    '跳转到「动态计算」页，从算式库中载入该公式开始推演或可视化。'
                ]
            },
            {
                id: 'flow-to-courseware',
                title: '从案例到课件包',
                summary: '把已经生成好的教学案例整理成课件包，方便课堂或分享。',
                prompt: '帮我把这几个我收藏的教学案例整理成一个「导数入门」课件包。',
                steps: [
                    '在「教学案例」页中根据收藏与标签筛选出你需要的几个视频。',
                    '为这些视频创建一个名为「导数入门」的课件包分组，并添加相应的元信息说明。',
                    '生成一个方便课堂使用的入口链接，供你在上课或分享时一键打开这一组案例。'
                ]
            },
            {
                id: 'flow-errorbook',
                title: '错题本联动智能体练习',
                summary: '基于看过的视频和错题记录，自动出同类练习题。',
                prompt: '根据我最近在错题本里记录的内容，出 3 道同类练习题并带解析。',
                steps: [
                    '读取最近几条错题本记录，分析其中涉及的知识点与题型。',
                    '调用智能体生成若干同类型但数值不同的新题目，并给出详细解析过程。',
                    '提供将这些练习题再次写入错题本或交给动态计算/教学案例继续可视化的选项。'
                ]
            }
        ]
    },
    {
        id: 'agent',
        icon: 'fa-robot',
        title: '智能体总控',
        subtitle: '用一句话调度全站工具',
        desc: '智能体是整个站点的总控中枢，可以根据你的自然语言，在知识图谱上自动选择节点并执行（识别、计算、脚本、案例、课包、设置等）。',
        examples: [
            {
                id: 'agent-role-student',
                title: '按学生角色带我学一节课',
                summary: '智能体基于知识图谱自动串联「教学案例 → 动态计算 → 错题本」。',
                prompt: '我是学生，帮我用教学案例和动态计算学一节关于极限的课，并记录错题到错题本。',
                steps: [
                    '分析你当前的学习需求，并从教学案例中推荐合适的极限类视频。',
                    '在知识图谱上依次走「教学案例 → 动态计算」，选出一个关键公式做可视化推演。',
                    '在你做题时，将容易错的地方记录到错题本，方便后续复习。'
                ]
            },
            {
                id: 'agent-course-pack',
                title: '用智能体创建一套课包',
                summary: '为教师把「识别 → 计算 → 开发者工具 → 教学案例」整合成课件流水线。',
                prompt: '帮我从板书照片开始，生成一套关于微积分入门的课包，并整理到「我的课件」。',
                steps: [
                    '引导你上传板书或讲义照片，并在「智能识别」中将内容转成可编辑 LaTeX。',
                    '在「动态计算」和「开发者工具」中生成对应的推演/可视化动画脚本并渲染成视频。',
                    '将生成的视频加入教学案例，并通过课件包功能整理到「我的课件」，形成一键复用的课包。'
                ]
            },
            {
                id: 'agent-templates',
                title: '把这次操作存成模板',
                summary: '将当前对话步骤保存为可复用的「智能体模板」，下次一键运行。',
                prompt: '把刚才帮我做的这套流程保存成智能体模板，起名「极限练习流水线」。',
                steps: [
                    '读取本轮对话中自动执行过的步骤树（识别 → 动态计算 → 保存脚本 / 错题本）。',
                    '写入「我的算式」里的模板库中，生成一条名为「极限练习流水线」的模板记录。',
                    '下次你在智能体侧边栏选择「从模板运行」时，可以一键复用这条流程。'
                ]
            },
            {
                id: 'agent-settings',
                title: '帮我调好整站偏好设置',
                summary: '用一句话修改外观、演示模式、弹幕开关等常用偏好。',
                prompt: '帮我把整站改成深色主题，动态计算默认用完整解题模式，教学案例默认关闭弹幕。',
                steps: [
                    '打开系统设置，通过知识图谱定位到外观、动态计算和教学案例设置分区。',
                    '将主题切换为深色模式，并将动态计算默认模式改为「完整解题演示」。',
                    '在教学案例设置中关闭弹幕或调低弹幕透明度，保存这些偏好并在下次访问时自动应用。'
                ]
            }
        ]
    }
];

let _agentExamplesGraphInited = false;
let _agentDemoTimers = [];

function initAgentExamplesGraph() {
    if (_agentExamplesGraphInited) return;
    const left = document.getElementById('agent-examples-graph-left');
    const descEl = document.getElementById('agent-graph-node-desc');
    const examplesWrap = document.getElementById('agent-graph-examples');
    const demoTitle = document.getElementById('agent-graph-demo-title');
    const demoSub = document.getElementById('agent-graph-demo-sub');
    const demoInput = document.getElementById('agent-graph-demo-input');
    const demoSteps = document.getElementById('agent-graph-demo-steps');
    if (!left || !descEl || !examplesWrap || !demoTitle || !demoSub || !demoInput || !demoSteps) return;

    function clearDemo() {
        // 取消上一次 demo 的所有定时器，避免频繁切换造成堆积
        _agentDemoTimers.forEach((id) => clearTimeout(id));
        _agentDemoTimers = [];
        demoInput.innerHTML = '';
        demoSteps.innerHTML = '';
    }

    function playDemo(example) {
        clearDemo();
        const fullText = '「' + (example.prompt || example.title || '') + '」';
        const span = document.createElement('span');
        span.className = 'agent-graph-demo-input-text';
        demoInput.appendChild(span);
        let idx = 0;
        const typingInterval = 28;
        function tick() {
            if (idx > fullText.length) return;
            span.textContent = fullText.slice(0, idx);
            idx += 1;
            if (idx <= fullText.length) {
                const id = setTimeout(tick, typingInterval);
                _agentDemoTimers.push(id);
            }
        }
        tick();

        const steps = Array.isArray(example.steps) ? example.steps.slice(0, 4) : [];
        steps.forEach((text, i) => {
            const p = document.createElement('p');
            p.className = 'agent-graph-demo-step';
            p.textContent = '• ' + text;
            demoSteps.appendChild(p);
            const id = setTimeout(() => {
                p.classList.add('agent-graph-demo-step-show');
            }, 160 + i * 180);
            _agentDemoTimers.push(id);
        });
    }

    function renderExamples(node) {
        examplesWrap.innerHTML = '';
        const list = Array.isArray(node.examples) ? node.examples : [];
        list.forEach((ex) => {
            const card = document.createElement('div');
            card.className = 'agent-graph-example-card';
            card.dataset.nodeId = node.id;
            card.dataset.exampleId = ex.id;
            const inner = document.createElement('div');
            inner.className = 'agent-graph-example-inner';
            const title = document.createElement('div');
            title.className = 'agent-graph-example-title';
            title.textContent = ex.title;
            const desc = document.createElement('div');
            desc.className = 'agent-graph-example-desc';
            desc.textContent = ex.summary || ex.prompt || '';
            inner.appendChild(title);
            inner.appendChild(desc);

            const footer = document.createElement('div');
            footer.className = 'agent-graph-example-footer';
            const meta = document.createElement('div');
            meta.className = 'agent-graph-example-meta';
            const metaIcon = document.createElement('i');
            metaIcon.className = 'fa-solid fa-circle-nodes';
            const metaText = document.createElement('span');
            metaText.textContent = node.title;
            meta.appendChild(metaIcon);
            meta.appendChild(metaText);

            const tryBtn = document.createElement('button');
            tryBtn.type = 'button';
            tryBtn.className = 'agent-graph-example-try agent-example-chip';
            tryBtn.dataset.prompt = ex.prompt || ex.title || '';
            tryBtn.innerHTML = '<i class="fa-solid fa-bolt"></i><span>一键试试</span>';

            footer.appendChild(meta);
            footer.appendChild(tryBtn);

            card.appendChild(inner);
            card.appendChild(footer);

            // 有趣交互：鼠标移入卡片时，轻微高亮对应左侧节点
            card.addEventListener('mouseenter', () => {
                left.querySelectorAll('.agent-graph-node').forEach((btn) => {
                    if (btn.dataset.nodeId === node.id) {
                        btn.classList.add('hover-link');
                    }
                });
            });
            card.addEventListener('mouseleave', () => {
                left.querySelectorAll('.agent-graph-node.hover-link').forEach((btn) => {
                    btn.classList.remove('hover-link');
                });
            });

            card.addEventListener('click', (e) => {
                // 避免点击内部「一键试试」按钮时重复触发 demo 以外行为
                if (e.target.closest('.agent-example-chip')) return;
                demoTitle.textContent = ex.title;
                demoSub.textContent = node.subtitle || node.desc || '';
                playDemo(ex);
            });

            examplesWrap.appendChild(card);
        });
    }

    function setActiveNode(nodeId) {
        const node = AGENT_EXAMPLE_GRAPH_DATA.find((n) => n.id === nodeId) || AGENT_EXAMPLE_GRAPH_DATA[0];
        if (!node) return;
        left.querySelectorAll('.agent-graph-node').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.nodeId === node.id);
        });
        descEl.textContent = node.desc || '';
        demoTitle.textContent = node.title;
        demoSub.textContent = node.subtitle || '';
        playDemo(node.examples && node.examples[0] ? node.examples[0] : { title: node.title, prompt: node.title, steps: [] });
        renderExamples(node);
    }

    left.innerHTML = '';
    AGENT_EXAMPLE_GRAPH_DATA.forEach((node) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'agent-graph-node';
        btn.dataset.nodeId = node.id;
        const main = document.createElement('div');
        main.className = 'agent-graph-node-main';
        const t = document.createElement('div');
        t.className = 'agent-graph-node-title';
        t.textContent = node.title;
        const s = document.createElement('div');
        s.className = 'agent-graph-node-sub';
        s.textContent = node.subtitle || '';
        main.appendChild(t);
        main.appendChild(s);
        const icon = document.createElement('div');
        icon.className = 'agent-graph-node-icon';
        const i = document.createElement('i');
        i.className = 'fa-solid ' + (node.icon || 'fa-circle');
        icon.appendChild(i);
        btn.appendChild(main);
        btn.appendChild(icon);
        btn.addEventListener('click', () => setActiveNode(node.id));
        left.appendChild(btn);
    });

    if (AGENT_EXAMPLE_GRAPH_DATA.length > 0) {
        setActiveNode(AGENT_EXAMPLE_GRAPH_DATA[0].id);
    }

    _agentExamplesGraphInited = true;
}

/** 消息出现动画 */
function animateMessageAppear(element) {
    if (!element) return;
    element.style.opacity = '0';
    element.style.transform = 'translateY(10px)';
    requestAnimationFrame(() => {
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    });
}

/** 当前附带的图片（粘贴时部分浏览器无法设置 input.files，用此备份供发送使用） */
let _attachedFile = null;

/** 检测是否为移动设备 */
function isMobileDevice() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/** 显示当前附带的图片预览；返回当前图片 data URL 或 null */
// @param {File} file - 图片文件
// @param {boolean} skipAutoOpen - 是否跳过移动端自动打开编辑器（用于从编辑器应用时）
function updateImagePreview(file, skipAutoOpen = false) {
    const wrap = getPreviewWrap();
    const img = getPreviewImg();
    const input = getFileInput();
    _attachedFile = file || null;
    if (!wrap || !img) return null;
    if (!file) {
        wrap.style.display = 'none';
        img.src = '';
        if (input) input.value = '';
        return null;
    }
    const url = URL.createObjectURL(file);
    // 不在 onload 时立即 revoke，保留 URL 供编辑器使用
    // img.onload = () => URL.revokeObjectURL(url);
    
    // 如果 skipAutoOpen 为 true，先清理可能存在的 onload 事件监听器
    if (skipAutoOpen) {
        img.onload = null;
        img.onerror = null;
    }
    
    // 移动端：图片加载完成后自动打开编辑器（除非是从编辑器应用来的）
    if (isMobileDevice() && !skipAutoOpen) {
        const openEditorOnLoad = () => {
            // 检查是否应该跳过自动打开
            if (skipAutoOpen || (window.ImageEditor && window.ImageEditor._editorJustClosed)) {
                return;
            }
            
            // 确保图片已显示
            wrap.style.display = 'inline-block';
            // 延迟一小段时间确保 DOM 更新完成和 ImageEditor 初始化
            setTimeout(() => {
                // 再次检查标志
                if (skipAutoOpen || (window.ImageEditor && window.ImageEditor._editorJustClosed)) {
                    return;
                }
                
                if (window.ImageEditor && typeof window.ImageEditor.openEditor === 'function') {
                    try {
                        window.ImageEditor.openEditor('agent-image-preview', 'agent');
                    } catch (e) {
                        console.error('Failed to open editor:', e);
                        if (typeof showToast === 'function') {
                            showToast('打开编辑器失败，请重试', 'error');
                        }
                    }
                } else {
                    console.warn('ImageEditor not available, retrying...');
                    setTimeout(openEditorOnLoad, 200);
                }
            }, 150);
        };
        
        // 如果图片已经加载完成，直接打开编辑器
        if (img.complete && img.naturalWidth > 0) {
            img.src = url;
            wrap.style.display = 'inline-block';
            openEditorOnLoad();
        } else {
            img.onload = openEditorOnLoad;
            img.onerror = () => {
                wrap.style.display = 'inline-block';
            };
            img.src = url;
            wrap.style.display = 'inline-block';
        }
    } else {
        img.src = url;
        wrap.style.display = 'inline-block';
    }
    
    return file;
}

// 导出供 image-editor.js 使用
export { updateImagePreview };

// 获取当前附带的文件（供外部使用）
export function getAttachedFile() {
    return _attachedFile;
}

// 同时挂载到全局，供 HTML 调用
window.Agent = window.Agent || {};
window.Agent.updateImagePreview = updateImagePreview;
window.Agent.getAttachedFile = getAttachedFile;

/** 移除附带图片（供 HTML 按钮调用） */
export function clearAttachedImage() {
    updateImagePreview(null);
}

/** 延迟 Promise */
function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/** 执行单步：跳转并填入/触发（支持 fill_manim_code、save_to_formulas） */
function applyStepContent(step) {
    const section = step.section || 'calculate';
    showSection(section);

    if (section === 'devtools' && step.devtool && window.switchDevTool) {
        setTimeout(() => {
            switchDevTool(step.devtool);
            const toFill = (step.fill_latex && step.fill_latex.trim()) ? step.fill_latex.trim() : (step.formula && step.formula.trim()) ? step.formula.trim() : '';
            if (step.devtool === 'latex' && toFill) {
                setTimeout(() => {
                    const mf = document.getElementById('dev-latex-mathfield');
                    const source = document.getElementById('dev-latex-source');
                    const sanitized = sanitizeLatexForMathlive(toFill);
                    if (mf && mf.setValue) mf.setValue(sanitized);
                    if (source) source.value = sanitized;
                    if (typeof renderMath === 'function' && document.getElementById('dev-latex-preview')) {
                        const preview = document.getElementById('dev-latex-preview');
                        if (preview) { preview.innerHTML = `\\[ ${sanitized} \\]`; renderMath(preview); }
                    }
                }, 150);
            }
            if (step.devtool === 'manim' && step.fill_manim_code && step.fill_manim_code.trim() && typeof window.openManimWorkbenchWithCode === 'function') {
                setTimeout(() => {
                    window.openManimWorkbenchWithCode(step.fill_manim_code.trim());
                }, 200);
            }
            // 智能体调用的 Manim 工具栏动作（知识图谱中的按钮）
            const action = step.devtool_action || step.action;
            if (step.devtool === 'manim' && action && typeof window.DevTools !== 'undefined') {
                const D = window.DevTools;
                const act = () => {
                    if (action === 'run' && typeof window.runDevManim === 'function') window.runDevManim();
                    else if (action === 'keyframe' && typeof D.previewKeyframes === 'function') D.previewKeyframes();
                    else if (action === 'import' && typeof D.toggleImportPanel === 'function') D.toggleImportPanel();
                    else if (action === 'save' && typeof D.saveScriptFromWorkbench === 'function') D.saveScriptFromWorkbench();
                    else if (action === 'summary' && typeof D.generateVideoCopy === 'function') D.generateVideoCopy();
                    else if (action === 'ai_edit' && typeof D.toggleAiEditPanel === 'function') D.toggleAiEditPanel();
                };
                setTimeout(act, 300);
            }
        }, 100);
    }

    if (section === 'calculate') {
        setTimeout(() => {
            const mf = document.getElementById('math-field-main');
            const code = document.getElementById('latex-code-main');
            const method = document.getElementById('calc-method');
            if (step.formula) {
                // 整题（完整解题演示）时填入整题结构化文字，不做单公式 LaTeX 清洗；单公式推演/可视化时再做清洗
                const toFill = step.operation === 'solution' ? step.formula.trim() : sanitizeLatexForMathlive(step.formula);
                if (mf && mf.setValue) mf.setValue(toFill);
                if (code) code.value = toFill;
            }
            if (method && step.operation) method.value = step.operation || 'normal';
            if (step.trigger === 'generate' && typeof window.startAnimation === 'function') {
                setTimeout(() => window.startAnimation(), 400);
            }
        }, 200);
    }

    if (section === 'examples' && step.examples_filter) {
        if (typeof window.Examples !== 'undefined' && typeof window.Examples.switchExamplesFilter === 'function') {
            setTimeout(() => window.Examples.switchExamplesFilter(step.examples_filter), 200);
        }
    }

    if (section === 'settings') {
        const anchor = step.settings_section || undefined;
        if (typeof window.openSettings === 'function') {
            setTimeout(() => window.openSettings(anchor), 100);
        }
        if (step.setting_key && step.setting_value != null && typeof window.Settings?.applySingleSetting === 'function') {
            setTimeout(() => {
                window.Settings.applySingleSetting(step.setting_key, step.setting_value);
                if (typeof showToast === 'function') showToast('已修改设置：' + step.setting_key, 'success');
            }, 250);
        }
    }

    if (section === 'detect' && step.formula) {
        setTimeout(() => {
            const mathField = document.getElementById('latex-output');
            const codeArea = document.getElementById('latex-code-detect');
            const btnSave = document.getElementById('btn-save-check');
            const btnCalc = document.getElementById('btn-copy-calc');
            const sanitized = sanitizeLatexForMathlive(step.formula);
            if (mathField && mathField.setValue) mathField.setValue(sanitized);
            if (codeArea) codeArea.value = sanitized;
            if (btnSave) btnSave.disabled = false;
            if (btnCalc) btnCalc.disabled = false;
        }, 200);
    }
}

/** 按顺序执行多步（每步：跳转 → 延时 → 填入/触发 → 若 save_to_formulas 则保存到我的算式） */
async function runStepsSequence(steps) {
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        showSection(step.section);
        await delay(400);
        applyStepContent(step);
        if (step.save_to_formulas && typeof window.saveAndShowFormula === 'function') {
            await delay(500);
            window.saveAndShowFormula();
        }
        if (i < steps.length - 1) await delay(500);
    }
}

/** 根据后端返回的 steps 或单步 data 跳转并执行（兼容旧单步格式） */
function applyAgentResult(data) {
    const steps = Array.isArray(data.steps) && data.steps.length > 0 ? data.steps : [data];
    if (steps.length === 1) {
        applyStepContent(steps[0]);
        return;
    }
    runStepsSequence(steps);
}

export function toggleFeaturesExamples() {
    const modal = document.getElementById('agent-examples-modal');
    const btn = document.getElementById('agent-features-examples-btn');
    if (!modal) return;
    const isHidden = modal.classList.contains('show') === false;
    if (isHidden) {
        // 首次打开时再初始化知识图谱面板，避免页面加载就做大量 DOM 操作
        if (!_agentExamplesGraphInited) {
            initAgentExamplesGraph();
        }
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('show'));
    } else {
        modal.classList.remove('show');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
    if (btn) {
        btn.classList.toggle('active', isHidden);
        btn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    }
}

export function refreshAgentGate() {
    const gate = document.getElementById('agent-gate');
    const wrap = document.getElementById('agent-workspace-wrap');
    if (!gate || !wrap) return;
    const loggedIn = !!getCurrentUser();
    gate.style.display = loggedIn ? 'none' : 'block';
    wrap.style.display = loggedIn ? 'block' : 'none';
}

/** 切换侧边栏折叠/展开 */
export function toggleSidebar() {
    const sidebar = document.getElementById('agent-sidebar');
    const toggle = document.getElementById('agent-sidebar-toggle');
    if (!sidebar) return;
    
    if (window.innerWidth <= 768) {
        // 移动端：切换显示/隐藏
        const isOpen = sidebar.classList.contains('mobile-open');
        if (isOpen) {
            closeSidebarMobile();
        } else {
            openSidebarMobile();
        }
        return;
    }
    
    // 桌面端：折叠/展开
    const isCollapsed = sidebar.classList.contains('collapsed');
    if (isCollapsed) {
        sidebar.classList.remove('collapsed');
        localStorage.setItem('agent_sidebar_collapsed', 'false');
        updateSidebarToggleIcon(false);
    } else {
        sidebar.classList.add('collapsed');
        localStorage.setItem('agent_sidebar_collapsed', 'true');
        updateSidebarToggleIcon(true);
    }
}

/** 更新侧边栏切换按钮图标和主区打开按钮显示 */
function updateSidebarToggleIcon(isCollapsed) {
    const toggle = document.getElementById('agent-sidebar-toggle');
    const openBtn = document.getElementById('agent-sidebar-open-btn');
    
    if (toggle) {
        const icon = toggle.querySelector('i');
        if (icon) {
            icon.className = isCollapsed ? 'fa-solid fa-bars' : 'fa-solid fa-xmark';
        }
    }
    
    // 桌面端：侧边栏折叠时显示主区的打开按钮
    if (window.innerWidth > 768 && openBtn) {
        openBtn.style.display = isCollapsed ? 'flex' : 'none';
    }
}

/** 移动端关闭侧边栏 */
export function closeSidebarMobile() {
    const sidebar = document.getElementById('agent-sidebar');
    const overlay = document.getElementById('agent-sidebar-overlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
}

/** 移动端打开侧边栏 */
export function openSidebarMobile() {
    const sidebar = document.getElementById('agent-sidebar');
    const overlay = document.getElementById('agent-sidebar-overlay');
    if (sidebar) sidebar.classList.add('mobile-open');
    if (overlay) overlay.classList.add('active');
}

/** 清空对话历史 */
export async function clearChat() {
    const messagesEl = getMessagesEl();
    if (!messagesEl) return;
    if (typeof showConfirm === 'function') {
        const confirmed = await showConfirm('确定要清空所有对话记录吗？', "确认清空");
        if (!confirmed) return;
    }
    messagesEl.innerHTML = `
        <div class="agent-message agent-message-assistant">
            <div class="agent-avatar agent-avatar-bot"><img src="assets/智算视界_avatar.svg" alt="智算视界" class="agent-avatar-logo"></div>
            <div class="agent-bubble agent-bubble-assistant">
                <p>你好，我是智能体。你可以用自然语言让我帮你：</p>
                <ul>
                    <li>把公式做成动画、打开 LaTeX 编辑器并填入内容</li>
                    <li>只进行识别、识别图片后去计算页生成动画</li>
                    <li>上传或粘贴题目/算式图片，让我<strong>解题并调用网站工具</strong>生成 LaTeX→Manim 演示（如选择题、求极限、无穷小量等）</li>
                </ul>
                <p>直接输入需求，支持粘贴剪贴板图片后发送。</p>
            </div>
        </div>
    `;
    if (typeof showToast === 'function') showToast('对话已清空', 'success');
    if (window.innerWidth <= 768) closeSidebarMobile();
}

export function initAgent() {
    // 将 HTML 里 onclick="Agent.xxx()" 需要的全部方法挂到 window.Agent（不再用 main 的 window.Agent=Agent，避免只读模块命名空间）
    window.Agent = window.Agent || {};
    window.Agent.execute = execute;
    window.Agent.clearChat = clearChat;
    window.Agent.toggleSidebar = toggleSidebar;
    window.Agent.closeSidebarMobile = closeSidebarMobile;
    window.Agent.openSidebarMobile = openSidebarMobile;
    window.Agent.toggleFeaturesExamples = toggleFeaturesExamples;
    window.Agent.clearAttachedImage = clearAttachedImage;
    window.Agent.updateImagePreview = updateImagePreview;
    window.Agent.getAttachedFile = getAttachedFile;
    window.Agent.openTemplatesModal = openTemplatesModal;
    window.Agent.closeTemplatesModal = closeTemplatesModal;
    window.Agent.runTemplateById = runTemplate;
    window.Agent.startRoleFlow = startRoleFlow;
    window.Agent.prefillAndShow = prefillAndShow;
    window.Agent.reExecuteLastMessage = reExecuteLastMessage;
    window.typesetAgentMath = typesetAgentMath;

    const input = getFileInput();
    const promptEl = getPromptEl();
    const sidebar = document.getElementById('agent-sidebar');
    const toggle = document.getElementById('agent-sidebar-toggle');
    
    // 恢复侧边栏状态（仅桌面端）
    if (sidebar && window.innerWidth > 768) {
        const saved = localStorage.getItem('agent_sidebar_collapsed');
        if (saved === 'true') {
            sidebar.classList.add('collapsed');
        }
        updateSidebarToggleIcon(sidebar.classList.contains('collapsed'));
    }
    
    // 窗口大小改变时调整侧边栏状态
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth <= 768) {
                // 切换到移动端：关闭侧边栏
                if (sidebar) {
                    sidebar.classList.remove('collapsed');
                    closeSidebarMobile();
                }
            } else {
                // 切换到桌面端：恢复折叠状态
                if (sidebar) {
                    closeSidebarMobile();
                    const saved = localStorage.getItem('agent_sidebar_collapsed');
                    if (saved === 'true') {
                        sidebar.classList.add('collapsed');
                    } else {
                        sidebar.classList.remove('collapsed');
                    }
                    updateSidebarToggleIcon(sidebar.classList.contains('collapsed'));
                }
            }
        }, 150);
    });
    
    // 移动端：点击主区时关闭侧边栏
    const main = document.querySelector('.agent-main');
    if (main) {
        main.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('mobile-open')) {
                // 如果点击的不是侧边栏本身，则关闭
                if (!sidebar.contains(e.target) && !e.target.closest('.agent-mobile-menu-btn')) {
                    closeSidebarMobile();
                }
            }
        });
    }
    
    if (input) {
        input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            updateImagePreview(file || null);
        });
    }
    if (promptEl) {
        promptEl.addEventListener('paste', (e) => {
            const items = e.clipboardData && e.clipboardData.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const file = items[i].getAsFile();
                    if (file && getFileInput()) {
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        getFileInput().files = dt.files;
                        updateImagePreview(file);
                    }
                    break;
                }
            }
        });
        promptEl.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            if (getAgentEnterSend()) {
                if (e.shiftKey) return;
                e.preventDefault();
                execute();
            } else {
                if (!e.shiftKey && e.ctrlKey) {
                    e.preventDefault();
                    execute();
                }
            }
        });
    }
    refreshAgentGate();
    window.addEventListener('auth-state-change', refreshAgentGate);

    document.addEventListener('click', (e) => {
        if (e.target.closest('.agent-video-link')) {
            e.preventDefault();
            showSection('calculate');
            if (typeof showToast === 'function') showToast('已跳转到动态计算页，可查看题解与视频', 'info');
        }
        const chip = e.target.closest('.agent-example-chip');
        if (!chip || !chip.dataset.prompt) return;
        const promptEl = getPromptEl();
        if (promptEl) {
            promptEl.value = chip.dataset.prompt;
            promptEl.focus();
        }
        const inModal = chip.closest('#agent-examples-modal');
        if (getCurrentUser()) {
            execute();
            if (inModal) toggleFeaturesExamples();
        } else {
            toggleAuthModal(true);
            if (inModal) toggleFeaturesExamples();
        }
    });
}

/** 按角色快速开始：从首页入口一键唤起智能体并用对应提示词模板真正执行 */
export function startRoleFlow(role) {
    const promptEl = getPromptEl();
    // 先切到智能体页
    showSection('agent');
    const templates = {
        student: '我是学生，想用「教学案例 + 动态计算」来学数学。请帮我：\n1）根据我的学习阶段推荐 2～3 个适合的教学案例；\n2）任选其中一个案例，从视频中挑出一个关键公式，帮我在「动态计算」页做一次可视化推演；\n3）顺便告诉我怎样用时间戳笔记和错题本复习这一类题。',
        teacher: '我是老师，想把一节课的板书/讲义变成可复用的「课件案例」。请帮我：\n1）先问我本节课的主题和难点；\n2）给出 1 条从「识别 → 动态计算 → Manim 工作台 → 教学案例」的推荐流水线；\n3）示范一套流程（可用你站内自带的公式）并告诉我如何保存成下次可直接调用的“课件套餐”。',
        creator: '我是内容创作者，想用这里做数学/科普短视频。请帮我：\n1）问我想讲的主题和平台（例如 B 站 / 短视频）；\n2）推荐一段合适的公式或画面，并在 Manim 工作台里生成可直接跑的视频脚本；\n3）根据生成的脚本，给出 15～30 秒视频的大纲与分镜建议，方便我再加工上传。',
        developer: '我是开发者，想把自己的数学/Manim 代码做成可复用的小组件。请帮我：\n1）在 Rainbow / Manim 工作台中选一个示例模块，带我跑通一次；\n2）告诉我这个站点推荐的脚本结构与最佳实践；\n3）指导我如何把自己的脚本整理成「组件卡片」，方便以后一键载入和分享。'
    };
    const text = templates[role] || templates.student;
    setTimeout(() => {
        if (promptEl) {
            promptEl.value = text;
            promptEl.focus();
        }
        if (!getCurrentUser()) {
            toggleAuthModal(true);
            if (typeof showToast === 'function') showToast('登录后将自动按该角色提示词执行', 'info');
            return;
        }
        // 已登录：自动执行，真实使用对应提示词模板完成内容
        if (typeof showToast === 'function') showToast('已按角色开始执行', 'success');
        execute();
    }, 200);
}

/** 将当前对话步骤存为模板（数据库存储，需登录） */
async function saveAgentTemplate(prompt, steps, btnEl) {
    if (!prompt && (!steps || steps.length === 0)) {
        if (typeof showToast === 'function') showToast('无内容可保存为模板', 'error');
        return;
    }
    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    if (!user) {
        if (typeof showToast === 'function') showToast('请先登录以保存模板', 'error');
        if (typeof toggleAuthModal === 'function') toggleAuthModal(true);
        return;
    }
    const name = (prompt.slice(0, 28) || '未命名') + (prompt.length > 28 ? '…' : '');
    try {
        const res = await fetch('/api/agent_templates/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, name, prompt, steps: steps || [] })
        });
        const data = await res.json();
        if (data.status === 'success') {
            if (typeof showToast === 'function') showToast('已存为模板，可在侧栏「从模板运行」中使用', 'success');
            if (btnEl) { btnEl.textContent = '已保存'; btnEl.disabled = true; }
        } else {
            if (typeof showToast === 'function') showToast(data.message || '保存失败', 'error');
        }
    } catch (e) {
        if (typeof showToast === 'function') showToast('网络错误，保存失败', 'error');
    }
}

/** 预填提示词并打开智能体（供笔记转练习题、跨页跳转等调用） */
export function prefillAndShow(promptText) {
    showSection('agent');
    const promptEl = getPromptEl();
    setTimeout(() => {
        if (promptEl) {
            promptEl.value = (promptEl.value ? promptEl.value + '\n\n' : '') + (promptText || '');
            promptEl.focus();
        }
        if (!getCurrentUser()) toggleAuthModal(true);
    }, 150);
}

/** 从模板运行：跳转到「我的算式」的智能体模板库，用户在其中选择并点击「使用」即可执行 */
function openTemplatesModal() {
    if (typeof showSection === 'function') showSection('my-formulas');
    if (window.Formulas && typeof window.Formulas.switchFormulasSubTab === 'function') {
        window.Formulas.switchFormulasSubTab('templates');
    }
    if (typeof closeSidebarMobile === 'function') closeSidebarMobile();
}
function closeTemplatesModal() {
    const modal = document.getElementById('agent-templates-modal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 200);
}
/** 从模板预填并执行：自动切到智能体，已登录则直接运行（数据库读取） */
async function runTemplate(id) {
    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    if (!user) {
        if (typeof toggleAuthModal === 'function') toggleAuthModal(true);
        if (typeof showToast === 'function') showToast('请先登录以使用模板', 'info');
        return;
    }
    let t = null;
    try {
        const res = await fetch(`/api/agent_templates/get?id=${id}&username=${encodeURIComponent(user)}`);
        const data = await res.json();
        if (data.status === 'success' && data.data) t = data.data;
    } catch (_) {}
    if (!t || !t.prompt) return;
    if (typeof showSection === 'function') showSection('agent');
    const promptEl = getPromptEl();
    if (promptEl) {
        promptEl.value = t.prompt;
        promptEl.focus();
    }
    closeTemplatesModal();
    if (typeof showToast === 'function') showToast('已按模板开始执行', 'success');
    execute();
}

// 将按角色快速开始挂到全局，供首页按钮调用
window.Agent = window.Agent || {};
window.Agent.startRoleFlow = startRoleFlow;
window.Agent.prefillAndShow = prefillAndShow;
window.Agent.openTemplatesModal = openTemplatesModal;
window.Agent.closeTemplatesModal = closeTemplatesModal;

/** 从对话区取上一轮用户与助手各一句（少量上下文，不长） */
function getLastAgentContext() {
    const messagesEl = getMessagesEl();
    if (!messagesEl) return { last_user_message: '', last_assistant_message: '' };
    const children = Array.from(messagesEl.children);
    let lastUser = '', lastAssistant = '';
    for (let i = children.length - 1; i >= 0; i--) {
        if (children[i].classList.contains('agent-message-assistant')) {
            lastAssistant = (children[i].querySelector('.agent-bubble-assistant')?.innerText ?? '').trim().slice(0, 280);
            if (i > 0 && children[i - 1].classList.contains('agent-message-user')) {
                lastUser = (children[i - 1].querySelector('.agent-bubble-user')?.innerText ?? '').trim().slice(0, 280);
            }
            break;
        }
    }
    return { last_user_message: lastUser || undefined, last_assistant_message: lastAssistant || undefined };
}

/** 执行智能体请求（可被重新调用） */
async function executeAgentRequest(prompt, image_base64, lastUser, lastAssistant) {
    appendUserMessage(prompt, image_base64 || null);
    const btn = getSubmitBtn();
    if (btn) btn.disabled = true;

    appendAssistantMessage('<div class="agent-loading-dots"><span></span><span></span><span></span></div>');

    const context = lastUser !== undefined && lastAssistant !== undefined ? { last_user_message: lastUser, last_assistant_message: lastAssistant } : getLastAgentContext();

    try {
        const res = await fetch('/api/agent/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, image_base64, ...context })
        });
        const data = await res.json();

        const lastBubble = getMessagesEl() && getMessagesEl().querySelector('.agent-message-assistant:last-child .agent-bubble-assistant');

        if (data.status === 'success') {
            const steps = Array.isArray(data.steps) && data.steps.length > 0 ? data.steps : [];
            const first = steps[0];
            const isChatOnly = steps.length === 1 && first && first.section === 'chat' && first.reply;
            const hasToolCall = !isChatOnly && steps.length > 0;
            const replyText = (first && first.reply && first.reply.trim()) || (steps.find(s => s.reply && s.reply.trim()) || {}).reply || '';

            function attachBubbleClick(bubble) {
                if (!bubble) return;
                bubble.classList.add('agent-bubble-clickable');
                bubble.setAttribute('data-execute', JSON.stringify(data));
                bubble.setAttribute('title', '点击重新执行');
                bubble.addEventListener('click', () => { reExecuteFromMessage(data); });
            }

            function buildStepDescHtml() {
                if (steps.length > 1) {
                    return `<p class="agent-step-desc">已按 <strong>${steps.length}</strong> 步执行：</p><ol class="agent-steps-list">${steps.map((s, i) => `<li>${escapeHtml(getStepLabel(s))}</li>`).join('')}</ol>`;
                }
                const s = first || {};
                const name = getSectionDisplayName(s.section) || s.section;
                let m = `已打开「${name}」`;
                if (s.section === 'calculate' && s.operation) {
                    const modeNames = { normal: '通用公式推演+可视化', formular: '公式推演', visualization: '可视化演示', solution: '完整解题演示' };
                    m += `，已选择「${modeNames[s.operation] || s.operation}」`;
                }
                if (s.trigger === 'generate') m += '，已自动开始生成动画';
                    else if (s.trigger === 'recognize') m += '，识别结果已填入';
                if (s.fill_manim_code) m += '，已填入 Manim 代码';
                if (s.save_to_formulas) m += '，已保存到我的算式';
                if (s.trigger === 'generate') return `<p class="agent-step-desc">${escapeHtml(m)}，<a href="#" class="agent-video-link">查看视频解析</a>。</p>`;
                return `<p class="agent-step-desc">${escapeHtml(m + '。')}</p>`;
            }

            if (isChatOnly) {
                const streamContainer = document.createElement('div');
                streamContainer.className = 'agent-reply-content markdown-body';
                if (lastBubble) {
                    lastBubble.innerHTML = '';
                    lastBubble.appendChild(streamContainer);
                    attachBubbleClick(lastBubble);
                } else {
                    const wrap = document.createElement('div');
                    wrap.className = 'agent-bubble agent-bubble-assistant';
                    wrap.appendChild(streamContainer);
                    appendAssistantMessage('', data);
                    const last = getMessagesEl() && getMessagesEl().querySelector('.agent-message-assistant:last-child .agent-bubble-assistant');
                    if (last) { last.innerHTML = ''; last.appendChild(streamContainer); attachBubbleClick(last); }
                }
                await streamTextInto(streamContainer, first.reply, {
                    onDone: () => {
                        const html = (window.marked && typeof window.marked.parse === 'function')
                            ? sanitizeMarkdownHtml(window.marked.parse(first.reply))
                            : replyTextToHtml(first.reply);
                        streamContainer.innerHTML = html;
                        typesetAgentMath(streamContainer);
                    }
                });
                animateMessageAppear(streamContainer);
            } else {
                const streamContainer = document.createElement('div');
                streamContainer.className = 'agent-reply-content markdown-body';
                const stepDescWrap = document.createElement('div');
                stepDescWrap.className = 'agent-step-desc-wrap';
                stepDescWrap.innerHTML = buildStepDescHtml();
                const saveTemplateBtn = document.createElement('button');
                saveTemplateBtn.type = 'button';
                saveTemplateBtn.className = 'agent-save-template-btn';
                saveTemplateBtn.textContent = '存为模板';
                saveTemplateBtn.title = '将本次提示词与步骤保存为自动化模板，下次可快速触发';
                saveTemplateBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const userPrompt = (data && data.prompt) || (stepDescWrap.closest('.agent-message-assistant')?.previousElementSibling?.querySelector('.agent-bubble-user')?.innerText?.trim()) || '';
                    saveAgentTemplate(userPrompt, steps, saveTemplateBtn);
                });
                stepDescWrap.appendChild(saveTemplateBtn);
                const toolHintWrap = document.createElement('div');
                toolHintWrap.className = 'agent-tool-hint';
                toolHintWrap.style.cssText = 'margin-top:8px;padding:8px 12px;background:var(--agent-tool-hint-bg,rgba(59,130,246,0.12));border-radius:8px;color:var(--agent-tool-hint-color,#3b82f6);font-size:0.9em;';
                toolHintWrap.textContent = '即将跳转并调用工具，请稍候…';

                toolHintWrap.style.display = 'none';
                if (lastBubble) {
                    lastBubble.innerHTML = '';
                    lastBubble.appendChild(streamContainer);
                    lastBubble.appendChild(stepDescWrap);
                    if (hasToolCall) lastBubble.appendChild(toolHintWrap);
                    attachBubbleClick(lastBubble);
                } else {
                    appendAssistantMessage('', data);
                    const last = getMessagesEl() && getMessagesEl().querySelector('.agent-message-assistant:last-child .agent-bubble-assistant');
                    if (last) {
                        last.innerHTML = '';
                        last.appendChild(streamContainer);
                        last.appendChild(stepDescWrap);
                        if (hasToolCall) last.appendChild(toolHintWrap);
                        attachBubbleClick(last);
                    }
                }

                const textToStream = replyText || '';
                if (textToStream) {
                    await streamTextInto(streamContainer, textToStream, {
                        onDone: () => {
                            const html = (window.marked && typeof window.marked.parse === 'function')
                                ? sanitizeMarkdownHtml(window.marked.parse(textToStream))
                                : replyTextToHtml(textToStream);
                            streamContainer.innerHTML = html;
                            typesetAgentMath(streamContainer);
                        }
                    });
                } else {
                    stepDescWrap.style.marginTop = '0';
                }
                animateMessageAppear(streamContainer);

                if (hasToolCall) {
                    toolHintWrap.style.display = 'block';
                    if (typeof showToast === 'function') showToast('即将跳转并调用工具，请稍候…', 'info');
                    await delay(2500);
                    applyAgentResult(data);
                }
            }
        } else {
            // 错误消息也保存请求数据以便重新执行
            const errorData = { prompt, image_base64, isError: true };
            const errorHtml = `<p style="color:var(--error-color,#ef4444);">${escapeHtml(data.message || '执行失败')}</p>`;
            if (lastBubble) {
                lastBubble.innerHTML = errorHtml;
                lastBubble.classList.add('agent-bubble-clickable');
                lastBubble.setAttribute('data-execute', JSON.stringify(errorData));
                lastBubble.setAttribute('title', '点击重新执行');
                // 移除旧的监听器（如果有），添加新的
                const newClickHandler = () => {
                    executeAgentRequest(prompt, image_base64);
                };
                const cloned = lastBubble.cloneNode(true);
                lastBubble.replaceWith(cloned);
                cloned.addEventListener('click', newClickHandler);
            } else {
                appendAssistantMessage(errorHtml, errorData);
            }
        }
    } catch (e) {
        const lastBubble = getMessagesEl() && getMessagesEl().querySelector('.agent-message-assistant:last-child .agent-bubble-assistant');
        const errorData = { prompt, image_base64, isError: true, error: e.message };
        const errorHtml = `<p style="color:var(--error-color,#ef4444);">网络错误：${escapeHtml(e.message || '请稍后重试')}</p>`;
        if (lastBubble) {
            lastBubble.innerHTML = errorHtml;
            lastBubble.classList.add('agent-bubble-clickable');
            lastBubble.setAttribute('data-execute', JSON.stringify(errorData));
            lastBubble.setAttribute('title', '点击重新执行');
            // 移除旧的监听器（如果有），添加新的
            const newClickHandler = () => {
                executeAgentRequest(prompt, image_base64);
            };
            lastBubble.replaceWith(lastBubble.cloneNode(true));
            const newBubble = getMessagesEl().querySelector('.agent-message-assistant:last-child .agent-bubble-assistant');
            if (newBubble) {
                newBubble.addEventListener('click', newClickHandler);
            }
        } else {
            appendAssistantMessage(errorHtml, errorData);
        }
    } finally {
        const btn = getSubmitBtn();
        if (btn) btn.disabled = false;
    }
}

export async function execute() {
    if (!getCurrentUser()) {
        toggleAuthModal(true);
        return;
    }
    const promptEl = getPromptEl();
    const fileInput = getFileInput();

    let prompt = (promptEl && promptEl.value) ? promptEl.value.trim() : '';
    const fileCount = (fileInput && fileInput.files) ? fileInput.files.length : (_attachedFile ? 1 : 0);
    const file = (fileInput && fileInput.files && fileInput.files[0]) || _attachedFile;
    if (!prompt && !file) {
        if (typeof showToast === 'function') showToast('请输入需求描述或上传/粘贴图片', 'error');
        return;
    }
    if (!prompt && file) prompt = '请根据这张图片的内容进行操作（识别、解题或生成演示）。';
    if (fileCount > 1) prompt = (prompt || '').trim() + (prompt ? '\n\n' : '') + `（共上传 ${fileCount} 张，当前仅处理第 1 张）`;

    let image_base64 = null;
    if (file) {
        try {
            image_base64 = await fileToBase64(file);
        } catch (e) {
            if (typeof showToast === 'function') showToast('图片读取失败', 'error');
            return;
        }
    }

    // 清空输入
    if (promptEl) promptEl.value = '';
    clearAttachedImage();

    const { last_user_message, last_assistant_message } = getLastAgentContext();
    await executeAgentRequest(prompt, image_base64, last_user_message, last_assistant_message);
}
