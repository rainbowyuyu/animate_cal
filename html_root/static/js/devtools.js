// static/js/devtools.js

import { RAINBOW_LIB_INFO } from './rainbow_data.js';
import { toggleModal, showToast } from './ui.js';
import { sanitizeMarkdownHtml } from './sanitize.js';

// 全局变量保存编辑器实例
let monacoEditor = null;

/** 工作台当前脚本状态：null 表示新建未保存，数字为已加载脚本 id */
let workbenchScriptId = null;
let workbenchScriptNote = '';

/** 仅含框架的 Manim 空白脚本（新建时填入工作台） */
const MANIM_FRAMEWORK_SCRIPT = `from manim import *

class GenScene(Scene):
    def construct(self):
        pass
`;

// 1. 工具切换逻辑
export function switchDevTool(tool) {
    document.querySelectorAll('#devtools .tab-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`#devtools .tab-btn[onclick*="${tool}"]`);
    if(btn) btn.classList.add('active');

    const latexPanel = document.getElementById('dev-latex');
    const manimPanel = document.getElementById('dev-manim');
    const rainbowPanel = document.getElementById('dev-rainbow'); // [新增]

    // 隐藏所有
    latexPanel.style.display = 'none';
    manimPanel.style.display = 'none';
    if(rainbowPanel) rainbowPanel.style.display = 'none';

    if (tool === 'latex') {
        latexPanel.style.display = 'flex';
    } else if (tool === 'manim') {
        manimPanel.style.display = 'block';
        if (monacoEditor) {
            setTimeout(() => monacoEditor.layout(), 50);
        } else {
            loadMonaco();
        }
        // AI 编辑面板默认打开
        const aiPanel = document.getElementById('manim-ai-edit-float');
        if (aiPanel && aiPanel.style.display === 'none') {
            aiPanel.style.display = 'flex';
        }
    } else if (tool === 'rainbow') {
        // [新增] 切换到 Rainbow 面板
        if(rainbowPanel) {
            rainbowPanel.style.display = 'block';
            renderRainbowLib(); // 渲染内容
        }
    }
}

// 2. 初始化入口
export function initDevTools() {
    initLatexTool();
    initManimResize();
    initManimVideoFloat();
    initManimAiEdit();
}

/** 竖排布局：上（代码+日志）/ 下（视频）拖拽调整高度 */
function initManimResize() {
    const topPane = document.getElementById('ide-left-pane');
    const editorPane = document.getElementById('ide-editor-pane');
    const logPane = document.getElementById('ide-log-pane');
    const previewPane = document.getElementById('ide-preview-pane');
    const handleTopBottom = document.getElementById('ide-resize-top-bottom');
    const handleEditorLog = document.getElementById('ide-resize-editor-log');
    
    if (!topPane || !editorPane) return;

    // 垂直拖拽：调整上（代码+日志）与下（视频）的高度
    function dragVertical(handle, paneAbove, paneBelow, minAbove, minBelow) {
        let startY = 0, startAbove = 0;
        function onMove(e) {
            const dy = e.clientY - startY;
            const newAbove = Math.max(minAbove, startAbove + dy);
            paneAbove.style.flex = `0 0 ${newAbove}px`;
            paneBelow.style.flex = '1 1 0%';
        }
        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            if (window.monacoEditor) window.monacoEditor.layout();
        }
        handle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            startY = e.clientY;
            startAbove = paneAbove.getBoundingClientRect().height;
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    // 上/下大块：视频已浮动，仅连接 editor-log（topPane 与 placeholder 无需调整）
    if (handleEditorLog && logPane) {
        dragVertical(handleEditorLog, editorPane, logPane, 200, 120);
    }
}

/** 浮动视频面板：拖动顶部调整位置 */
function initManimVideoFloat() {
    const wrap = document.getElementById('manim-video-float-wrap');
    const header = document.getElementById('manim-video-float-header');
    if (!wrap || !header) return;

    let isDragging = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;

    header.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        isDragging = true;
        const rect = wrap.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;
        wrap.style.right = 'auto';
        wrap.style.bottom = 'auto';
        wrap.style.left = startLeft + 'px';
        wrap.style.top = startTop + 'px';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let left = startLeft + dx;
        let top = startTop + dy;
        const maxLeft = window.innerWidth - wrap.offsetWidth;
        const maxTop = window.innerHeight - wrap.offsetHeight;
        left = Math.max(0, Math.min(left, maxLeft));
        top = Math.max(0, Math.min(top, maxTop));
        wrap.style.left = left + 'px';
        wrap.style.top = top + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
        }
    });
}

/** AI 编辑浮动面板状态 */
let aiEditDiffEditor = null;
let aiEditPendingCode = null;

/** 关键帧断点行号集合（1-based），点击行号左侧可切换 */
let keyframeBreakpoints = new Set();

/** 切换 AI 编辑面板显示/隐藏 */
export function toggleAiEditPanel() {
    const panel = document.getElementById('manim-ai-edit-float');
    if (!panel) return;
    const visible = panel.style.display !== 'none';
    panel.style.display = visible ? 'none' : 'flex';
}

function appendKeyframeLog(msg) {
    const log = document.getElementById('dev-manim-log');
    if (log) {
        log.textContent = (log.textContent || '') + `[关键帧] ${msg}\n`;
        log.scrollTop = log.scrollHeight;
    }
}

/** 解析断点行号：优先使用用户点击设置的断点，其次 # @keyframe 注释，1-based */
function getBreakpointLine(code) {
    if (keyframeBreakpoints.size > 0) {
        const line = Math.min(...keyframeBreakpoints);
        return line;
    }
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('# @keyframe') || lines[i].includes('# keyframe')) {
            return i + 1;
        }
    }
    return null;
}

/** 选取最能体现 Manim 改动的行号：Create/Write/Transform 等 play 动画行才是显示改动的位置（1-based） */
function getImportantChangeLine(originalCode, modifiedCode) {
    const animKeywords = /\b(Create|Write|Transform|ReplacementTransform|FadeIn|FadeOut|GrowFromCenter|DrawBorderThenFill)\s*\(/;
    const playPattern = /self\.play\s*\(/;
    const lines = modifiedCode.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (playPattern.test(line) && animKeywords.test(line)) {
            return i + 1;
        }
    }
    for (let i = 0; i < lines.length; i++) {
        if (playPattern.test(lines[i])) return i + 1;
    }
    const orig = originalCode.split('\n');
    const mod = modifiedCode.split('\n');
    for (let i = 0; i < Math.min(orig.length, mod.length); i++) {
        if ((orig[i] || '').trim() !== (mod[i] || '').trim()) return i + 1;
    }
    return null;
}

/** 渲染关键帧：支持断点（# @keyframe 注释），结果显示在视频预览区，输出日志 */
export async function previewKeyframes() {
    const code = monacoEditor ? monacoEditor.getValue() : '';
    if (!code || !code.trim()) {
        if (typeof showToast === 'function') showToast('请输入或加载代码', 'info');
        return;
    }
    const breakpointLine = getBreakpointLine(code);
    appendKeyframeLog(breakpointLine ? `正在渲染断点行 ${breakpointLine} 的关键帧...` : '正在渲染关键帧...');
    const loading = document.getElementById('dev-manim-loading');
    const loadingText = document.querySelector('#dev-manim-loading .ide-loading-text');
    const video = document.getElementById('dev-manim-video');
    const placeholder = document.getElementById('dev-manim-placeholder');
    if (loading && loadingText) {
        loading.style.display = 'flex';
        loadingText.textContent = '正在渲染关键帧...';
        if (placeholder) placeholder.style.display = 'none';
        if (video) video.style.display = 'none';
    }
    try {
        const body = { code: code.trim() };
        if (breakpointLine) body.breakpoint_line = breakpointLine;
        const res = await fetch('/api/devtools/render_keyframe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'include',
        });
        const data = await res.json();
        if (loading) loading.style.display = 'none';
        if (data.status === 'success' && data.preview_url) {
            const base = window.location.origin || '';
            const url = data.preview_url.startsWith('/') ? base + data.preview_url : data.preview_url;
            appendKeyframeLog('关键帧渲染完成');
            if (video) video.style.display = 'none';
            if (placeholder) placeholder.style.display = 'none';
            const preview = document.getElementById('manim-keyframe-preview-in-video');
            const img = document.getElementById('manim-keyframe-img-in-video');
            if (preview && img) {
                img.src = url;
                preview.style.display = 'flex';
            }
        } else {
            const err = (data.message || '渲染失败').slice(0, 150);
            appendKeyframeLog('渲染失败: ' + err);
            if (placeholder) placeholder.style.display = '';
            if (typeof showToast === 'function') showToast(err, 'error');
        }
    } catch (_) {
        if (loading) loading.style.display = 'none';
        appendKeyframeLog('网络错误');
        if (placeholder) placeholder.style.display = '';
        if (typeof showToast === 'function') showToast('网络错误', 'error');
    }
}

function hideKeyframeInVideoArea() {
    const preview = document.getElementById('manim-keyframe-preview-in-video');
    const img = document.getElementById('manim-keyframe-img-in-video');
    if (preview) preview.style.display = 'none';
    if (img) img.src = '';
}

/** 调用 render_keyframe，可选 breakpointLine，返回 preview_url 或 null */
export async function renderKeyframeForCode(code, breakpointLine = null) {
    if (!code || !code.trim()) return null;
    try {
        const body = { code: code.trim() };
        if (breakpointLine != null) body.breakpoint_line = breakpointLine;
        const res = await fetch('/api/devtools/render_keyframe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'include',
        });
        const data = await res.json();
        if (data.status === 'success' && data.preview_url) {
            const base = window.location.origin || '';
            return data.preview_url.startsWith('/') ? base + data.preview_url : data.preview_url;
        }
    } catch (_) {}
    return null;
}

/** 初始化 AI 编辑（独立浮动面板） */
function initManimAiEdit() {
    const panel = document.getElementById('manim-ai-edit-float');
    const header = document.getElementById('manim-ai-edit-float-header');
    const input = document.getElementById('manim-ai-edit-input');
    const btn = document.getElementById('manim-ai-edit-btn');
    const conversation = document.getElementById('manim-ai-edit-conversation');
    const previewBlock = document.getElementById('manim-ai-preview-block');
    const keyframeImg = document.getElementById('manim-ai-edit-keyframe-img');
    const diffContainer = document.getElementById('manim-ai-edit-diff-container');
    const acceptBtn = document.getElementById('manim-ai-edit-accept');
    const rejectBtn = document.getElementById('manim-ai-edit-reject');
    if (!input || !btn || !conversation || !previewBlock || !diffContainer) return;

    initAiEditFloatDrag(panel, header);

    function appendMsg(role, text) {
        const div = document.createElement('div');
        div.className = 'manim-ai-edit-msg ' + role;
        div.textContent = text;
        if (previewBlock && previewBlock.parentNode === conversation) {
            conversation.insertBefore(div, previewBlock);
        } else {
            conversation.appendChild(div);
        }
        conversation.scrollTop = conversation.scrollHeight;
    }

    function showDiff(originalCode, modifiedCode) {
        aiEditPendingCode = modifiedCode;
        if (!window.monaco) {
            appendMsg('ai', 'Monaco 未加载，无法展示差异。请先切换到 Manim 工作台。');
            return;
        }
        if (aiEditDiffEditor) {
            const m = aiEditDiffEditor.getModel();
            if (m && m.original) m.original.dispose();
            if (m && m.modified) m.modified.dispose();
            aiEditDiffEditor.dispose();
            aiEditDiffEditor = null;
        }
        diffContainer.innerHTML = '';
        const origModel = window.monaco.editor.createModel(originalCode, 'python');
        const modModel = window.monaco.editor.createModel(modifiedCode, 'python');
        aiEditDiffEditor = window.monaco.editor.createDiffEditor(diffContainer, {
            theme: 'vs-dark',
            readOnly: true,
            automaticLayout: true,
            fontSize: 12,
            renderSideBySide: true,
        });
        aiEditDiffEditor.setModel({ original: origModel, modified: modModel });
        if (previewBlock) {
            previewBlock.style.display = 'flex';
            conversation.scrollTop = conversation.scrollHeight;
        }
        setTimeout(() => { if (aiEditDiffEditor) aiEditDiffEditor.layout(); }, 50);
    }

    function hidePreviewBlock() {
        if (previewBlock) previewBlock.style.display = 'none';
        if (keyframeImg) keyframeImg.src = '';
    }

    function hideDiff() {
        hidePreviewBlock();
        aiEditPendingCode = null;
        if (aiEditDiffEditor) {
            const m = aiEditDiffEditor.getModel();
            if (m && m.original) m.original.dispose();
            if (m && m.modified) m.modified.dispose();
            aiEditDiffEditor.dispose();
            aiEditDiffEditor = null;
        }
        if (diffContainer) diffContainer.innerHTML = '';
    }

    function onAccept() {
        if (aiEditPendingCode && monacoEditor) {
            monacoEditor.setValue(aiEditPendingCode);
            if (typeof showToast === 'function') showToast('已应用编辑', 'success');
        }
        hideDiff();
    }

    function onReject() {
        hideDiff();
        if (typeof showToast === 'function') showToast('已取消变更', 'info');
    }

    if (acceptBtn) acceptBtn.addEventListener('click', onAccept);
    if (rejectBtn) rejectBtn.addEventListener('click', onReject);

    async function doEdit() {
        const user = getCurrentUsername();
        if (!user) {
            if (typeof window.toggleAuthModal === 'function') window.toggleAuthModal(true);
            if (typeof showToast === 'function') showToast('请先登录后使用 AI 编辑', 'info');
            return;
        }
        const instruction = (input.value || '').trim();
        if (!instruction) {
            if (typeof showToast === 'function') showToast('请输入编辑指令', 'info');
            return;
        }
        const editor = monacoEditor;
        if (!editor) {
            if (typeof showToast === 'function') showToast('请先切换到 Manim 工作台', 'error');
            return;
        }
        const code = editor.getValue();
        appendMsg('user', instruction);
        input.value = '';
        btn.disabled = true;
        btn.title = '处理中...';
        hidePreviewBlock();
        try {
            const res = await fetch('/api/devtools/edit_code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, instruction }),
                credentials: 'include',
            });
            const data = await res.json();
            if (data.status === 'success' && data.code) {
                appendMsg('ai', '已根据您的指令修改代码。正在生成效果预览…');
                const importantLine = getImportantChangeLine(code, data.code);
                const previewUrl = await renderKeyframeForCode(data.code, importantLine);
                if (previewUrl && keyframeImg) {
                    keyframeImg.src = previewUrl;
                }
                appendMsg('ai', '请查看效果预览及代码对比，选择接受或拒绝。');
                showDiff(code, data.code);
            } else {
                appendMsg('ai', data.message || '编辑失败，请重试。');
            }
        } catch (_) {
            appendMsg('ai', '网络错误，请检查连接后重试。');
        } finally {
            btn.disabled = false;
            btn.title = '发送指令';
        }
    }

    btn.addEventListener('click', doEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            doEdit();
        }
    });
}

function initAiEditFloatDrag(wrap, header) {
    if (!wrap || !header) return;
    let isDragging = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.manim-ai-edit-close')) return;
        if (e.button !== 0) return;
        e.preventDefault();
        isDragging = true;
        const rect = wrap.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;
        wrap.style.right = 'auto';
        wrap.style.bottom = 'auto';
        wrap.style.left = startLeft + 'px';
        wrap.style.top = startTop + 'px';
        wrap.style.transform = 'none';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let left = startLeft + dx;
        let top = startTop + dy;
        left = Math.max(0, Math.min(left, window.innerWidth - wrap.offsetWidth));
        top = Math.max(0, Math.min(top, window.innerHeight - wrap.offsetHeight));
        wrap.style.left = left + 'px';
        wrap.style.top = top + 'px';
    });
    document.addEventListener('mouseup', () => { isDragging = false; });
}

// --- LaTeX 模块 (保持不变) ---
function initLatexTool() {
    const mf = document.getElementById('dev-latex-mathfield');
    const source = document.getElementById('dev-latex-source');
    const preview = document.getElementById('dev-latex-preview');

    if (mf) {
        // 初始同步
        updateLatexView(mf.getValue());

        mf.addEventListener('input', (e) => {
            updateLatexView(e.target.value);
        });
    }

    function updateLatexView(latex) {
        if(source) source.value = latex;
        if(preview) {
            preview.innerHTML = `\\[ ${latex} \\]`;
            if (typeof renderMath === 'function') renderMath(preview);
        }
    }
}

// 复制 LaTeX 源码
export function copyDevLatex() {
    const source = document.getElementById('dev-latex-source');
    if(source) {
        source.select();
        document.execCommand('copy');
        // 简单的视觉反馈
        const originalBg = source.style.backgroundColor;
        source.style.backgroundColor = '#dcfce7';
        setTimeout(() => source.style.backgroundColor = originalBg, 200);
    }
}

// --- Manim 模块 (Monaco Kernel) ---
// Monaco 懒加载：仅在用户进入开发者工具时加载，减轻首屏体积
function loadMonaco() {
    // 如果已经加载过，直接初始化
    if (window.monaco) {
        initMonacoEditor();
        return;
    }

    // 防止重复注入
    if (document.getElementById('monaco-loader-script')) return;

    const loaderUrl = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';

    const script = document.createElement('script');
    script.id = 'monaco-loader-script';
    script.src = loaderUrl;

    script.onload = () => {
        // loader.js 加载完毕，此时 window.require 可用
        // 配置 Monaco 路径
        window.require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }});

        // 加载编辑器核心
        window.require(['vs/editor/editor.main'], function() {
            initMonacoEditor();
        });
    };

    document.body.appendChild(script);
}

function initMonacoEditor() {
    const container = document.getElementById('monaco-container');
    if (!container) return;

    // 1. 注册 Manim 智能补全 (模拟 Pylance)
    monaco.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: function(model, position) {
            const suggestions = [
                // 核心类
                { label: 'Scene', kind: monaco.languages.CompletionItemKind.Class, insertText: 'Scene' },
                { label: 'Circle', kind: monaco.languages.CompletionItemKind.Class, insertText: 'Circle(radius=${1:1}, color=${2:BLUE})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Mobject' },
                { label: 'Square', kind: monaco.languages.CompletionItemKind.Class, insertText: 'Square(side_length=${1:2}, color=${2:RED})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Mobject' },
                { label: 'Text', kind: monaco.languages.CompletionItemKind.Class, insertText: 'Text("${1:Hello}", font_size=${2:48})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Mobject' },
                { label: 'MathTex', kind: monaco.languages.CompletionItemKind.Class, insertText: 'MathTex(r"${1:\\frac{a}{b}}")', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'LaTeX' },
                { label: 'NumberPlane', kind: monaco.languages.CompletionItemKind.Class, insertText: 'NumberPlane()', detail: 'Grid' },
                { label: 'Axes', kind: monaco.languages.CompletionItemKind.Class, insertText: 'Axes(x_range=[${1:-5, 5}], y_range=[${2:-5, 5}])', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Graph' },

                // 动画方法
                { label: 'Create', kind: monaco.languages.CompletionItemKind.Function, insertText: 'Create(${1:mobject})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Animation' },
                { label: 'Write', kind: monaco.languages.CompletionItemKind.Function, insertText: 'Write(${1:text})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Animation' },
                { label: 'FadeIn', kind: monaco.languages.CompletionItemKind.Function, insertText: 'FadeIn(${1:mobject})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Animation' },
                { label: 'Transform', kind: monaco.languages.CompletionItemKind.Function, insertText: 'Transform(${1:obj1}, ${2:obj2})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Animation' },
                { label: 'ReplacementTransform', kind: monaco.languages.CompletionItemKind.Function, insertText: 'ReplacementTransform(${1:obj1}, ${2:obj2})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Animation' },

                // 常量
                { label: 'UP', kind: monaco.languages.CompletionItemKind.Constant, insertText: 'UP', detail: 'Vector' },
                { label: 'DOWN', kind: monaco.languages.CompletionItemKind.Constant, insertText: 'DOWN', detail: 'Vector' },
                { label: 'LEFT', kind: monaco.languages.CompletionItemKind.Constant, insertText: 'LEFT', detail: 'Vector' },
                { label: 'RIGHT', kind: monaco.languages.CompletionItemKind.Constant, insertText: 'RIGHT', detail: 'Vector' },
                { label: 'ORIGIN', kind: monaco.languages.CompletionItemKind.Constant, insertText: 'ORIGIN', detail: 'Vector [0,0,0]' },
                { label: 'BLUE', kind: monaco.languages.CompletionItemKind.Color, insertText: 'BLUE', detail: 'Color' },
                { label: 'RED', kind: monaco.languages.CompletionItemKind.Color, insertText: 'RED', detail: 'Color' },
                { label: 'YELLOW', kind: monaco.languages.CompletionItemKind.Color, insertText: 'YELLOW', detail: 'Color' },
                { label: 'GREEN', kind: monaco.languages.CompletionItemKind.Color, insertText: 'GREEN', detail: 'Color' },

                // 自身方法 (Snippet)
                { label: 'play', kind: monaco.languages.CompletionItemKind.Method, insertText: 'self.play(${1:Animation})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Scene Method' },
                { label: 'wait', kind: monaco.languages.CompletionItemKind.Method, insertText: 'self.wait(${1:1})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Scene Method' },
                { label: 'add', kind: monaco.languages.CompletionItemKind.Method, insertText: 'self.add(${1:mobject})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Scene Method' }
            ];
            return { suggestions: suggestions };
        }
    });

    const defaultCode = `from manim import *

class GenScene(Scene):
    def construct(self):
        # 1. 定义对象
        circle = Circle(radius=2, color=BLUE)
        circle.set_fill(BLUE, opacity=0.5)
        
        text = Text("Hello Manim", font_size=48)
        text.next_to(circle, UP)
        
        # 2. 播放动画
        self.play(Create(circle))
        self.play(Write(text))
        self.wait(1)
        
        # 3. 变换
        square = Square(color=RED)
        self.play(Transform(circle, square))
        self.wait(1)`;

    // 2. 创建编辑器实例
    monacoEditor = monaco.editor.create(container, {
        value: defaultCode,
        language: 'python',
        theme: 'vs-dark', // 深色主题
        automaticLayout: true, // 自动响应 resize (性能开销稍大，但方便)
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Consolas', 'Courier New', monospace",
        minimap: { enabled: false }, // 关闭缩略图，节省空间
        scrollBeyondLastLine: false,
        padding: { top: 15, bottom: 15 },
        lineNumbersMinChars: 3,
        glyphMargin: true,
        wordWrap: 'on'
    });

    let breakpointDecorations = [];
    monacoEditor.onMouseDown((e) => {
        if (e.target.type === 2 && e.target.position) {
            const line = e.target.position.lineNumber;
            if (keyframeBreakpoints.has(line)) {
                keyframeBreakpoints.delete(line);
            } else {
                keyframeBreakpoints.add(line);
            }
            const decos = Array.from(keyframeBreakpoints).map((ln) => ({
                range: new monaco.Range(ln, 1, ln, 1),
                options: { glyphMarginClassName: 'manim-keyframe-breakpoint' }
            }));
            breakpointDecorations = monacoEditor.deltaDecorations(breakpointDecorations, decos);
        }
    });
    window.monacoEditor = monacoEditor;

    // 3. 绑定快捷键 Ctrl+Enter 运行
    monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function() {
        runDevManim();
    });
}

// --- 运行逻辑 ---
let isCooldown = false;

export async function runDevManim() {
    if (isCooldown) {
        if (typeof showAlert === 'function') await showAlert("请等待冷却时间结束", "提示");
        return;
    }
    if (!monacoEditor) return;
    const code = monacoEditor.getValue();

    const btn = document.getElementById('btn-run-manim');
    const video = document.getElementById('dev-manim-video');
    const placeholder = document.getElementById('dev-manim-placeholder');
    const loading = document.getElementById('dev-manim-loading');
    const logEl = document.getElementById('dev-manim-log');

    startCooldownTimer(30, btn);
    placeholder.style.display = 'none';
    video.style.display = 'none';
    loading.style.display = 'block';
    if (logEl) {
        logEl.textContent = '';
        logEl.style.display = 'block';
    }

    try {
        const res = await fetch('/api/devtools/run_manim_stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        if (!res.ok || !res.body) {
            if (logEl) logEl.textContent = '请求失败';
            placeholder.style.display = 'block';
            loading.style.display = 'none';
            return;
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === 'log' && data.message && logEl) {
                            logEl.textContent += '> ' + data.message + '\n';
                            logEl.scrollTop = logEl.scrollHeight;
                        } else if (data.type === 'start' && logEl) {
                            logEl.textContent += '> ' + (data.message || '') + '\n';
                            logEl.scrollTop = logEl.scrollHeight;
                        } else if (data.type === 'complete' && data.video_url) {
                            hideKeyframeInVideoArea();
                            if (placeholder) placeholder.style.display = 'none';
                            video.src = `${data.video_url}?t=${new Date().getTime()}`;
                            video.style.display = 'block';
                            if (logEl) { logEl.textContent += '> 渲染完成。\n'; logEl.scrollTop = logEl.scrollHeight; }
                        } else if (data.type === 'error') {
                            if (logEl) { logEl.textContent += '> 错误: ' + (data.message || '') + '\n'; logEl.scrollTop = logEl.scrollHeight; }
                            placeholder.style.display = 'block';
                        }
                    } catch (_) {}
                }
            }
        }
        if (video.style.display !== 'block') placeholder.style.display = 'block';
    } catch (e) {
        console.error(e);
        if (logEl) logEl.textContent += '网络错误: ' + e.message + '\n';
        placeholder.style.display = 'block';
    } finally {
        loading.style.display = 'none';
    }
}

// 当前工作台脚本的最新视频文案摘要（仅前端存储，用于列表预览）
let currentVideoCopy = '';

/** 创作者：总结当前 Manim 脚本，生成视频文案（标题 + 简介 + 章节建议），结果以弹窗形式展示 */
export async function generateVideoCopy() {
    const code = monacoEditor ? monacoEditor.getValue() : '';
    if (!code || !code.trim()) {
        if (typeof showToast === 'function') showToast('请先编写或导入脚本', 'info');
        return;
    }
    const modalId = 'video-copy-modal';
    const modal = document.getElementById(modalId);
    const contentEl = modal && modal.querySelector('.video-copy-content');
    const btnSave = modal && modal.querySelector('.video-copy-save-btn');
    if (!modal || !contentEl || !btnSave) {
        if (typeof showToast === 'function') showToast('页面缺少视频文案弹窗容器', 'error');
        return;
    }
    contentEl.innerHTML = '<div class="formulas-loading" style="text-align:center;padding:2rem;color:var(--text-secondary);"><i class="fa-solid fa-spinner fa-spin"></i> 正在生成视频文案，请稍候…</div>';
    btnSave.disabled = true;

    toggleModal(modalId, true);

    try {
        const res = await fetch('/api/devtools/generate_video_copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const data = await res.json();
        if (data.status !== 'success' || !data.copy) {
            contentEl.innerHTML = `<p style="color:#ef4444;">生成失败：${(data && data.message) || '未知错误'}</p>`;
            return;
        }
        currentVideoCopy = data.copy;
        if (window.marked && typeof window.marked.parse === 'function') {
            // 生成 Markdown 再做一次基础 XSS 清洗，避免脚本注入
            const rawHtml = window.marked.parse(currentVideoCopy);
            const safe = sanitizeMarkdownHtml(rawHtml);
            contentEl.innerHTML = `<div class="markdown-body agent-reply-content">${safe}</div>`;
            if (typeof window.typesetAgentMath === 'function') window.typesetAgentMath(contentEl);
        } else {
            contentEl.innerHTML = `<pre style="white-space:pre-wrap; font-family:inherit;">${currentVideoCopy}</pre>`;
        }
        btnSave.disabled = false;
    } catch (e) {
        console.error(e);
        contentEl.innerHTML = `<p style="color:#ef4444;">生成视频文案时出错：${e.message || e}</p>`;
    }
}

/** 将当前视频文案与脚本 ID 关联存入 localStorage，供「我的脚本」和动画脚本库预览使用 */
export function saveCurrentVideoCopyForScript(scriptId) {
    if (!scriptId || !currentVideoCopy) return;
    try {
        const key = 'animation_script_video_copies';
        const raw = localStorage.getItem(key) || '{}';
        const map = JSON.parse(raw);
        map[String(scriptId)] = currentVideoCopy;
        localStorage.setItem(key, JSON.stringify(map));
    } catch (e) {
        console.warn('保存视频文案到 localStorage 失败', e);
    }
}

export function getVideoCopyForScript(scriptId) {
    try {
        const key = 'animation_script_video_copies';
        const raw = localStorage.getItem(key) || '{}';
        const map = JSON.parse(raw);
        return map && map[String(scriptId)] || '';
    } catch {
        return '';
    }
}

/** 将弹窗中展示的视频文案保存为当前脚本的关联文案（localStorage），便于列表里显示文案与时间 */
export function saveVideoCopyAsScriptNote() {
    if (workbenchScriptId == null) {
        if (typeof showToast === 'function') showToast('请先保存脚本到动画脚本库后再关联文案', 'info');
        return;
    }
    saveCurrentVideoCopyForScript(workbenchScriptId);
    toggleModal('video-copy-modal', false);
    if (typeof showToast === 'function') showToast('已保存为当前脚本文案，列表中将显示文案与时间', 'success');
    renderImportScripts();
}

/** 供 HTML 直接调用的关闭视频文案弹窗方法 */
export function closeVideoCopyModal() {
    toggleModal('video-copy-modal', false);
}

/** 从外部（如我的算式-动画脚本库）跳转到本工作台并填入代码，可选自动运行；支持 scriptId/note 以支持工作台保存 */
export function openManimWorkbenchWithCode(code, options = {}) {
    workbenchScriptId = options.scriptId ?? null;
    workbenchScriptNote = options.note ?? '';

    switchDevTool('manim');
    const setCode = () => {
        if (monacoEditor) {
            monacoEditor.setValue(code || '');
            if (options.autoRun) setTimeout(() => runDevManim(), 400);
        }
    };
    setTimeout(setCode, 150);
    const t = setInterval(() => {
        if (monacoEditor) {
            setCode();
            clearInterval(t);
        }
    }, 100);
    setTimeout(() => clearInterval(t), 6000);
}

/** 新建空白脚本：跳转到云端渲染工作台并填入框架代码（由算式库「新建空白脚本」调用） */
export function openNewBlankScriptInWorkbench() {
    workbenchScriptId = null;
    workbenchScriptNote = '';

    switchDevTool('manim');
    const setCode = () => {
        if (monacoEditor) monacoEditor.setValue(MANIM_FRAMEWORK_SCRIPT);
    };
    setTimeout(setCode, 150);
    const t = setInterval(() => {
        if (monacoEditor) {
            setCode();
            clearInterval(t);
        }
    }, 100);
    setTimeout(() => clearInterval(t), 6000);
}

function startCooldownTimer(seconds, btn) {
    isCooldown = true;
    let left = seconds;
    const originalContent = '<i class="fa-solid fa-play"></i> 运行脚本';

    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.innerHTML = `<i class="fa-regular fa-clock"></i> ${left}s`;

    const timer = setInterval(() => {
        left--;
        if (left <= 0) {
            clearInterval(timer);
            isCooldown = false;
            btn.disabled = false;
            btn.innerHTML = originalContent;
            btn.style.opacity = '1';
        } else {
            btn.innerHTML = `<i class="fa-regular fa-clock"></i> ${left}s`;
        }
    }, 1000);
}

// [修改] 渲染 Rainbow 库内容
function renderRainbowLib() {
    const container = document.getElementById('rainbow-content-container');
    if (!container || container.innerHTML.trim() !== "") return;

    const headerHtml = `
        <div class="rainbow-header">
            <h1 class="rainbow-title">${RAINBOW_LIB_INFO.title}</h1>
            <p class="rainbow-desc">${RAINBOW_LIB_INFO.description}</p>
            <a href="${RAINBOW_LIB_INFO.github}" target="_blank" class="rainbow-github-link">
                <i class="fa-brands fa-github"></i> View on GitHub
            </a>
        </div>
        <div class="rainbow-grid">
    `;

    const cardsHtml = RAINBOW_LIB_INFO.modules.map((mod, index) => {
        // [新增] 动态生成图片 HTML
        // 如果有图片，显示图片；否则不显示这个 div
        // 使用 onerror 处理器，如果图片加载失败（比如路径不对），自动隐藏该图片元素
        const imagePart = mod.image ? `
            <div class="rainbow-card-image">
                <img src="${mod.image}" alt="${mod.title}" onerror="this.style.display='none'">
            </div>
        ` : '';

        return `
        <div class="rainbow-card">
            <div class="card-top">
                <h3>${mod.title}</h3>
                <span class="card-badge">Extension</span>
            </div>
            
            <!-- 图片区域 -->
            ${imagePart}
            
            <p>${mod.desc}</p>
            
            <div class="code-preview">
                <pre><code class="language-python">${escapeHtml(mod.code)}</code></pre>
            </div>
            
            <button class="action-btn full-width" onclick="loadIntoWorkbench(${index})">
                <i class="fa-solid fa-flask"></i> 载入到工作台试用
            </button>
        </div>
        `;
    }).join('');

    const communityHtml = `
        <div class="rainbow-community-section">
            <h3 class="rainbow-community-title"><i class="fa-solid fa-users"></i> 社区模块</h3>
            <p class="rainbow-community-desc">提交你写好的 Manim 脚本（附简短说明），审核通过后将展示在此，其他人可一键载入、fork 改编。敬请期待。</p>
            <button type="button" class="action-btn tertiary" disabled style="opacity:0.8;">即将开放</button>
        </div>`;
    container.innerHTML = headerHtml + cardsHtml + '</div>' + communityHtml;

    if(window.hljs) container.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
}

// [新增] 将代码载入 Monaco 并跳转
window.loadIntoWorkbench = function(index) {
    const code = RAINBOW_LIB_INFO.modules[index].code;

    // 1. 切换到 Manim 标签
    switchDevTool('manim');

    // 2. 等待切换完成（Monaco 初始化）后设置值
    setTimeout(() => {
        if (monacoEditor) {
            monacoEditor.setValue(code);
        } else {
            // 如果 Monaco 还没加载完，轮询一次
            const checkInit = setInterval(() => {
                if (monacoEditor) {
                    monacoEditor.setValue(code);
                    clearInterval(checkInit);
                }
            }, 100);
        }
    }, 100);
};

// 辅助：HTML 转义
function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// --- 导入面板：我的脚本 + Rainbow 样例 ---
function getCurrentUsername() {
    const userDisplay = document.getElementById('user-display');
    const usernameSpan = document.getElementById('username-span');
    if (userDisplay && userDisplay.style.display !== 'none' && usernameSpan) return usernameSpan.innerText;
    return null;
}

export function toggleImportPanel() {
    const panel = document.getElementById('manim-import-panel');
    const btn = document.getElementById('btn-manim-import');
    if (!panel) return;
    if (panel.style.display === 'flex') {
        panel.style.display = 'none';
        return;
    }
    panel.style.display = 'flex';
    // 使用 fixed 定位并相对「导入」按钮贴齐，避免被父级 overflow 裁剪
    if (btn) {
        const r = btn.getBoundingClientRect();
        panel.style.position = 'fixed';
        panel.style.left = r.left + 'px';
        panel.style.top = (r.bottom + 6) + 'px';
        panel.style.right = 'auto';
        const maxH = window.innerHeight - r.bottom - 16;
        if (maxH < 320) panel.style.maxHeight = Math.max(200, maxH) + 'px';
        else panel.style.maxHeight = '360px';
    }
    const scriptsTab = panel.querySelector('.manim-import-tab[data-tab="scripts"]');
    const rainbowTab = panel.querySelector('.manim-import-tab[data-tab="rainbow"]');
    if (scriptsTab && scriptsTab.classList.contains('active')) {
        renderImportScripts();
    } else if (rainbowTab && rainbowTab.classList.contains('active')) {
        renderImportRainbow();
    }
    // 点击外部关闭
    const close = (e) => {
        if (!panel.contains(e.target) && !btn?.contains(e.target)) {
            panel.style.display = 'none';
            document.removeEventListener('click', close);
        }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
}

function renderImportScripts() {
    const listEl = document.getElementById('manim-import-scripts');
    const rainbowEl = document.getElementById('manim-import-rainbow');
    if (!listEl || !rainbowEl) return;
    listEl.style.display = 'block';
    rainbowEl.style.display = 'none';
    const user = getCurrentUsername();
    if (!user) {
        listEl.innerHTML = '<p class="manim-import-msg" style="padding:1rem; font-size:0.85rem;">请先登录后在此选择已保存的脚本。</p>';
        return;
    }
    listEl.innerHTML = '<div class="formulas-loading" style="text-align:center;padding:2rem;color:var(--text-secondary);"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>';
    fetch(`/api/animation_scripts/list?username=${encodeURIComponent(user)}`)
        .then(res => res.json())
        .then(data => {
            if (data.status !== 'success' || !data.data || data.data.length === 0) {
                listEl.innerHTML = '<p class="manim-import-msg" style="padding:1rem; font-size:0.85rem;">暂无保存的脚本，可前往「我的算式 → 动画脚本库」保存。</p>';
                return;
            }
            const marked = window.marked && typeof window.marked.parse === 'function' ? window.marked : null;
            const typesetMath = typeof window.typesetAgentMath === 'function' ? window.typesetAgentMath : null;
            listEl.innerHTML = '';
            data.data.forEach(s => {
                const note = (s.note || '未命名').replace(/</g, '&lt;').replace(/"/g, '&quot;');
                const created = s.created_at ? new Date(s.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '';
                const videoCopy = getVideoCopyForScript(s.id);
                const metaText = videoCopy
                    ? (created ? created : '')
                    : (created ? '文案未生成 · ' + created : '');
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'import-item';
                btn.dataset.id = String(s.id);
                btn.title = note + (metaText ? ' · ' + metaText : '');
                btn.innerHTML = `<span class="import-item-note">${note}</span>`;
                if (videoCopy && marked) {
                    const preview = document.createElement('div');
                    preview.className = 'import-item-preview markdown-body';
                    const raw = marked.parse(videoCopy.slice(0, 1500));
                    preview.innerHTML = sanitizeMarkdownHtml(raw);
                    if (typesetMath) typesetMath(preview);
                    btn.appendChild(preview);
                }
                const small = document.createElement('small');
                small.className = 'import-item-meta';
                small.textContent = metaText || ('ID: ' + s.id + (created ? ' · ' + created : ''));
                btn.appendChild(small);
                btn.addEventListener('click', () => loadScriptIntoEditor(parseInt(btn.dataset.id, 10)));
                listEl.appendChild(btn);
            });
        })
        .catch(() => {
            listEl.innerHTML = '<p class="manim-import-msg manim-import-msg-error" style="padding:1rem; font-size:0.85rem;">加载失败</p>';
        });
}

function loadScriptIntoEditor(scriptId) {
    const user = getCurrentUsername();
    if (!user) return;
    fetch(`/api/animation_scripts/get?id=${scriptId}&username=${encodeURIComponent(user)}`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' && data.data && data.data.code && monacoEditor) {
                monacoEditor.setValue(data.data.code);
                workbenchScriptId = scriptId;
                workbenchScriptNote = (data.data.note || '').trim();
                document.getElementById('manim-import-panel').style.display = 'none';
            }
        });
}

/** 打开脚本备注弹窗（与公式编辑窗口同款样式），用户填写后点保存再执行实际保存 */
export function saveScriptFromWorkbench() {
    const user = getCurrentUsername();
    if (!user) {
        if (typeof window.toggleAuthModal === 'function') window.toggleAuthModal(true);
        return;
    }
    const code = monacoEditor ? monacoEditor.getValue() : '';
    if (!code || !code.trim()) {
        showToast('代码不能为空', 'error');
        return;
    }
    window._scriptNoteModalSource = 'devtools';
    const titleEl = document.getElementById('script-note-modal-title');
    const inputEl = document.getElementById('script-note-input');
    const prefixEl = document.getElementById('script-note-prefix');
    if (prefixEl) prefixEl.style.display = 'none';
    if (titleEl) titleEl.textContent = workbenchScriptId != null ? '编辑脚本备注' : '脚本备注';
    if (inputEl) {
        inputEl.value = workbenchScriptNote || '未命名';
        inputEl.placeholder = '例如：矩阵动画、公式推演';
        inputEl.focus();
    }
    toggleModal('script-note-modal', true);
}

/** 关闭脚本备注弹窗 */
export function closeScriptNoteModal() {
    toggleModal('script-note-modal', false);
}

/** 从脚本备注弹窗确认并执行保存（与登录成功一致使用 showToast 提示，不用浏览器默认 alert） */
export async function confirmScriptNoteAndSave() {
    const inputEl = document.getElementById('script-note-input');
    const prefixEl = document.getElementById('script-note-prefix');
    const prefix = (prefixEl && prefixEl.style.display !== 'none' && prefixEl.textContent) ? prefixEl.textContent : '';
    const inputPart = (inputEl && inputEl.value != null) ? inputEl.value.trim() : '';
    const note = prefix + (inputPart || '未命名');
    if (window._scriptNoteModalSource === 'calculate') {
        closeScriptNoteModal();
        window._scriptNoteModalSource = null;
        window._scriptNoteModalPart = null;
        if (typeof window.submitCalcScriptNote === 'function') window.submitCalcScriptNote(note);
        return;
    }
    closeScriptNoteModal();

    const user = getCurrentUsername();
    if (!user) return;
    const code = monacoEditor ? monacoEditor.getValue() : '';
    if (!code || !code.trim()) return;

    try {
        if (workbenchScriptId != null) {
            const res = await fetch('/api/animation_scripts/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: workbenchScriptId, username: user, note, code })
            });
            const data = await res.json();
            if (data.status === 'success') {
                workbenchScriptNote = note;
                showToast('更新成功！', 'success');
                try {
                    const copyRes = await fetch('/api/devtools/generate_video_copy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code })
                    });
                    const copyData = await copyRes.json();
                    if (copyData.status === 'success' && copyData.copy) {
                        currentVideoCopy = copyData.copy;
                        saveCurrentVideoCopyForScript(workbenchScriptId);
                        renderImportScripts();
                    }
                } catch (_) {}
            } else {
                showToast(data.message || '更新失败', 'error');
            }
        } else {
            const res = await fetch('/api/animation_scripts/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, note, code })
            });
            const data = await res.json();
            if (data.status === 'success' && data.id) {
                workbenchScriptId = data.id;
                workbenchScriptNote = note;
                showToast('保存成功！', 'success');
                renderImportScripts();
                try {
                    const copyRes = await fetch('/api/devtools/generate_video_copy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code })
                    });
                    const copyData = await copyRes.json();
                    if (copyData.status === 'success' && copyData.copy) {
                        currentVideoCopy = copyData.copy;
                        saveCurrentVideoCopyForScript(data.id);
                        renderImportScripts();
                    }
                } catch (_) {}
            } else {
                showToast(data.message || '保存失败', 'error');
            }
        }
    } catch (e) {
        showToast('网络错误', 'error');
    }
}

function renderImportRainbow() {
    const listEl = document.getElementById('manim-import-rainbow');
    const scriptsEl = document.getElementById('manim-import-scripts');
    if (!listEl || !scriptsEl) return;
    listEl.style.display = 'block';
    scriptsEl.style.display = 'none';
    const modules = RAINBOW_LIB_INFO.modules || [];
    if (modules.length === 0) {
        listEl.innerHTML = '<p style="padding:1rem; color:#94a3b8;">暂无样例</p>';
        return;
    }
    listEl.innerHTML = modules.map((mod, i) => {
        const title = (mod.title || '').replace(/</g, '&lt;');
        const desc = (mod.desc || '').replace(/</g, '&lt;').substring(0, 60);
        return `<button type="button" class="import-item" data-rainbow-index="${i}">${title}<small>${desc}${desc.length >= 60 ? '…' : ''}</small></button>`;
    }).join('');
    listEl.querySelectorAll('.import-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = parseInt(btn.dataset.rainbowIndex, 10);
            const code = RAINBOW_LIB_INFO.modules[i]?.code;
            if (code && monacoEditor) {
                monacoEditor.setValue(code);
                document.getElementById('manim-import-panel').style.display = 'none';
            }
        });
    });
}

export function switchImportTab(tab) {
    document.querySelectorAll('#manim-import-panel .manim-import-tab').forEach(t => t.classList.remove('active'));
    const btn = document.querySelector(`#manim-import-panel .manim-import-tab[data-tab="${tab}"]`);
    if (btn) btn.classList.add('active');
    if (tab === 'scripts') renderImportScripts();
    else renderImportRainbow();
}

