// static/js/agent.js — 智能体：聊天式界面，理解意图后跳转并调用本站工具（需登录）

import { showSection, toggleAuthModal } from './ui.js';
import { getCurrentUser } from './auth.js';
import { getAgentEnterSend } from './settings.js';

const SECTION_NAMES = {
    detect: '智能识别',
    calculate: '动态计算',
    devtools: '开发者工具',
    'my-formulas': '我的算式',
    examples: '教学案例',
    help: '帮助'
};

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

/** 规范化为 MathLive 可解析的 LaTeX */
function sanitizeLatexForMathlive(latex) {
    if (latex == null || typeof latex !== 'string') return '';
    let s = latex.trim()
        .replace(/^```(?:latex)?\s*/g, '').replace(/\s*```\s*$/g, '')
        .replace(/^\\\[\s]*/g, '').replace(/\s*\\\]\s*$/g, '')
        .replace(/^\$\$\s*/g, '').replace(/\s*\$\$\s*$/g, '')
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, ' ').replace(/\r\n?|\n/g, ' ')
        .replace(/\s+/g, ' ').trim();
    return s;
}

/** 追加用户消息到聊天区域 */
function appendUserMessage(text, imageDataUrl) {
    const el = getMessagesEl();
    if (!el) return;
    const bubbleContent = imageDataUrl
        ? `<p>${escapeHtml(text || '')}</p><div class="agent-msg-img"><img src="${escapeHtml(imageDataUrl)}" alt=""></div>`
        : `<p>${escapeHtml(text || '')}</p>`;
    const div = document.createElement('div');
    div.className = 'agent-message agent-message-user';
    div.innerHTML = `<div class="agent-avatar agent-avatar-user"><i class="fa-solid fa-user"></i></div><div class="agent-bubble agent-bubble-user">${bubbleContent}</div>`;
    el.appendChild(div);
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
    div.innerHTML = `<div class="agent-avatar agent-avatar-bot"><i class="fa-solid fa-wand-magic-sparkles"></i></div>`;
    div.appendChild(bubble);
    el.appendChild(div);
    animateMessageAppear(bubble);
    scrollMessagesToBottom();
}

/** 从消息重新执行操作 */
function reExecuteFromMessage(executeData) {
    if (!executeData) return;
    
    // 如果是错误或需要重新请求的情况
    if (executeData.isError && executeData.prompt) {
        executeAgentRequest(executeData.prompt, executeData.image_base64 || null);
        return;
    }
    
    // 如果是工具调用模式，直接重新应用结果
    if (executeData.section && executeData.section !== 'chat') {
        applyAgentResult(executeData);
        if (typeof showToast === 'function') {
            showToast('已重新执行', 'success');
        }
    } else if (executeData.section === 'chat' && executeData.reply) {
        // 对话模式：重新显示回复（实际上不需要重新执行，但可以添加提示）
        if (typeof showToast === 'function') {
            showToast('这是对话回复，无需重新执行', 'info');
        }
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

/** 显示当前附带的图片预览；返回当前图片 data URL 或 null */
function updateImagePreview(file) {
    const wrap = getPreviewWrap();
    const img = getPreviewImg();
    const input = getFileInput();
    if (!wrap || !img || !input) return null;
    if (!file) {
        wrap.style.display = 'none';
        img.src = '';
        input.value = '';
        return null;
    }
    const url = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(url);
    img.src = url;
    wrap.style.display = 'inline-block';
    return file;
}

/** 移除附带图片（供 HTML 按钮调用） */
export function clearAttachedImage() {
    updateImagePreview(null);
}

/** 根据后端返回的 section/formula/operation/trigger/fill_latex 跳转并执行 */
function applyAgentResult(data) {
    const section = data.section || 'calculate';
    showSection(section);

    if (section === 'devtools' && data.devtool && window.switchDevTool) {
        setTimeout(() => {
            switchDevTool(data.devtool);
            const toFill = (data.fill_latex && data.fill_latex.trim()) ? data.fill_latex.trim() : (data.formula && data.formula.trim()) ? data.formula.trim() : '';
            if (data.devtool === 'latex' && toFill) {
                setTimeout(() => {
                    const mf = document.getElementById('dev-latex-mathfield');
                    const source = document.getElementById('dev-latex-source');
                    const sanitized = sanitizeLatexForMathlive(toFill);
                    if (mf && mf.setValue) mf.setValue(sanitized);
                    if (source) source.value = sanitized;
                    if (window.MathJax && document.getElementById('dev-latex-preview')) {
                        const preview = document.getElementById('dev-latex-preview');
                        if (preview) preview.innerHTML = `\\[ ${sanitized} \\]`;
                        try { window.MathJax.typesetPromise([preview]); } catch (_) {}
                    }
                }, 150);
            }
        }, 100);
    }

    if (section === 'calculate') {
        setTimeout(() => {
            const mf = document.getElementById('math-field-main');
            const code = document.getElementById('latex-code-main');
            const method = document.getElementById('calc-method');
            if (data.formula) {
                const sanitized = sanitizeLatexForMathlive(data.formula);
                if (mf && mf.setValue) mf.setValue(sanitized);
                if (code) code.value = sanitized;
            }
            if (method && data.operation) method.value = data.operation || 'normal';
            if (data.trigger === 'generate' && typeof window.startAnimation === 'function') {
                setTimeout(() => window.startAnimation(), 400);
            }
        }, 200);
    }

    if (section === 'detect' && data.formula) {
        setTimeout(() => {
            const mathField = document.getElementById('latex-output');
            const codeArea = document.getElementById('latex-code-detect');
            const btnSave = document.getElementById('btn-save-check');
            const btnCalc = document.getElementById('btn-copy-calc');
            const sanitized = sanitizeLatexForMathlive(data.formula);
            if (mathField && mathField.setValue) mathField.setValue(sanitized);
            if (codeArea) codeArea.value = sanitized;
            if (btnSave) btnSave.disabled = false;
            if (btnCalc) btnCalc.disabled = false;
        }, 200);
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
export function clearChat() {
    const messagesEl = getMessagesEl();
    if (!messagesEl) return;
    if (typeof showToast === 'function') {
        if (!confirm('确定要清空所有对话记录吗？')) return;
    }
    messagesEl.innerHTML = `
        <div class="agent-message agent-message-assistant">
            <div class="agent-avatar agent-avatar-bot"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
            <div class="agent-bubble agent-bubble-assistant">
                <p>你好，我是智能体。你可以用自然语言让我帮你：</p>
                <ul>
                    <li>把公式做成动画、打开 LaTeX 编辑器并填入内容</li>
                    <li>只进行识别、识别图片后去计算页生成动画</li>
                    <li>上传或粘贴图片后说「识别这张图」</li>
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
}

/** 执行智能体请求（可被重新调用） */
async function executeAgentRequest(prompt, image_base64) {
    appendUserMessage(prompt, image_base64 || null);
    const btn = getSubmitBtn();
    if (btn) btn.disabled = true;

    appendAssistantMessage('<div class="agent-loading-dots"><span></span><span></span><span></span></div>');

    try {
        const res = await fetch('/api/agent/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, image_base64 })
        });
        const data = await res.json();

        const lastBubble = getMessagesEl() && getMessagesEl().querySelector('.agent-message-assistant:last-child .agent-bubble-assistant');

        if (data.status === 'success') {
            if (data.section === 'chat' && data.reply) {
                // 对话模式：显示回复，不跳转
                const replyHtml = data.reply.split('\n').map(line => `<p>${escapeHtml(line)}</p>`).join('');
                if (lastBubble) {
                    lastBubble.innerHTML = replyHtml;
                    // 保存执行数据以便重新执行
                    if (lastBubble.parentElement) {
                        lastBubble.classList.add('agent-bubble-clickable');
                        lastBubble.setAttribute('data-execute', JSON.stringify(data));
                        lastBubble.setAttribute('title', '点击重新执行');
                        lastBubble.addEventListener('click', () => {
                            reExecuteFromMessage(data);
                        });
                    }
                    animateMessageAppear(lastBubble);
                } else {
                    appendAssistantMessage(replyHtml, data);
                }
            } else {
                // 工具调用模式
                const name = SECTION_NAMES[data.section] || data.section;
                let msg = `已打开「${name}」`;
                if (data.section === 'calculate' && data.operation) {
                    const modeNames = { normal: '通用公式推演+可视化', formular: '公式推演', visualization: '可视化演示' };
                    msg += `，已选择「${modeNames[data.operation] || data.operation}」`;
                }
                if (data.trigger === 'generate') msg += '，已自动开始生成动画';
                else if (data.trigger === 'recognize') msg += '，识别结果已填入';
                msg += '。';
                if (lastBubble) {
                    lastBubble.innerHTML = `<p>${escapeHtml(msg)}</p>`;
                    // 保存执行数据以便重新执行
                    lastBubble.classList.add('agent-bubble-clickable');
                    lastBubble.setAttribute('data-execute', JSON.stringify(data));
                    lastBubble.setAttribute('title', '点击重新执行');
                    lastBubble.addEventListener('click', () => {
                        reExecuteFromMessage(data);
                    });
                    animateMessageAppear(lastBubble);
                } else {
                    appendAssistantMessage(`<p>${escapeHtml(msg)}</p>`, data);
                }
                applyAgentResult(data);
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

    const prompt = (promptEl && promptEl.value) ? promptEl.value.trim() : '';
    if (!prompt) {
        if (typeof showToast === 'function') showToast('请先输入需求描述', 'error');
        return;
    }

    let image_base64 = null;
    const file = fileInput && fileInput.files && fileInput.files[0];
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

    // 执行请求
    await executeAgentRequest(prompt, image_base64);
}
