// static/js/agent.js — 智能体：聊天式界面，理解意图后跳转并调用本站工具（需登录）

import { showSection, toggleAuthModal } from './ui.js';
import { getCurrentUser } from './auth.js';
import { getAgentEnterSend } from './settings.js';
import { getCurrentUserAvatarUrl } from './profile.js';

const SECTION_NAMES = {
    detect: '智能识别',
    calculate: '动态计算',
    devtools: '开发者工具',
    'my-formulas': '我的算式',
    examples: '教学案例',
    help: '帮助'
};

/** 获取单步的简短描述，用于多步执行时的列表展示 */
function getStepLabel(step) {
    const name = SECTION_NAMES[step.section] || step.section;
    const parts = [];
    if (step.section === 'devtools') {
        if (step.devtool === 'latex') parts.push('填入 LaTeX');
        else if (step.devtool === 'manim') parts.push('填入 Manim 代码');
        else if (step.devtool === 'rainbow') parts.push('Rainbow 拓展');
    }
    if (step.trigger === 'recognize') parts.push('识别');
    if (step.trigger === 'generate') parts.push('生成动画');
    if (step.save_to_formulas) parts.push('保存到我的算式');
    if (step.section === 'calculate' && step.operation) {
        const modeNames = { normal: '通用推演', formular: '公式推演', visualization: '可视化', solution: '完整解题演示' };
        parts.push(modeNames[step.operation] || step.operation);
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
                const name = SECTION_NAMES[s.section] || s.section;
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
                await streamTextInto(streamContainer, first.reply, { onDone: () => {
                    const html = (window.marked && typeof window.marked.parse === 'function')
                        ? window.marked.parse(first.reply)
                        : replyTextToHtml(first.reply);
                    streamContainer.innerHTML = html;
                    typesetAgentMath(streamContainer);
                } });
                animateMessageAppear(streamContainer);
            } else {
                const streamContainer = document.createElement('div');
                streamContainer.className = 'agent-reply-content markdown-body';
                const stepDescWrap = document.createElement('div');
                stepDescWrap.className = 'agent-step-desc-wrap';
                stepDescWrap.innerHTML = buildStepDescHtml();
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
                    await streamTextInto(streamContainer, textToStream, { onDone: () => {
                        const html = (window.marked && typeof window.marked.parse === 'function')
                            ? window.marked.parse(textToStream)
                            : replyTextToHtml(textToStream);
                        streamContainer.innerHTML = html;
                        typesetAgentMath(streamContainer);
                    } });
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
    const file = (fileInput && fileInput.files && fileInput.files[0]) || _attachedFile;
    if (!prompt && !file) {
        if (typeof showToast === 'function') showToast('请输入需求描述或上传/粘贴图片', 'error');
        return;
    }
    if (!prompt && file) prompt = '请根据这张图片的内容进行操作（识别、解题或生成演示）。';

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
