// static/js/docs.js

import { toggleModal } from './ui.js';

const MARKED_CDN = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
const LOAD_TIMEOUT_MS = 6000;   // 文档/Marked 加载超时（毫秒），超时后不再等待

function timeout(ms, msg = '加载超时') {
    return new Promise((_, reject) =>
        setTimeout(() => reject(new Error(msg)), ms)
    );
}

/** 确保 window.marked 已加载，未加载则动态插入脚本并等待，超时则放弃 */
function ensureMarked() {
    if (window.marked && typeof window.marked.parse === 'function') {
        return Promise.resolve();
    }
    const load = new Promise((resolve, reject) => {
        if (document.querySelector('script[src*="marked"]')) {
            const start = Date.now();
            const check = () => {
                if (window.marked && typeof window.marked.parse === 'function') {
                    resolve();
                } else if (Date.now() - start >= LOAD_TIMEOUT_MS) {
                    reject(new Error('Marked.js 加载超时'));
                } else {
                    setTimeout(check, 80);
                }
            };
            check();
            return;
        }
        const script = document.createElement('script');
        script.src = MARKED_CDN;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Marked.js 加载失败'));
        document.head.appendChild(script);
    });
    return Promise.race([load, timeout(LOAD_TIMEOUT_MS, 'Marked.js 加载超时')]);
}

// 打开文档模态框并加载内容
export async function openDoc(fileName, title) {
    const modal = document.getElementById('docs-modal');
    const titleEl = document.getElementById('docs-title');
    const contentEl = document.getElementById('docs-content');

    if (!modal || !contentEl) return;

    // 1. 设置标题和 Loading 状态
    if (titleEl) titleEl.innerText = title;

    // 重置内容区域并显示 Loading (使用 CSS 类)
    contentEl.scrollTop = 0;
    contentEl.innerHTML = `
        <div class="docs-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>正在加载文档...</p>
        </div>
    `;

    // 2. 显示模态框
    toggleModal('docs-modal', true);

    try {
        // 3. 请求 Markdown 文件（带超时，避免一直加载）
        const fetchPromise = fetch(`docs/${fileName}?t=${new Date().getTime()}`);
        const res = await Promise.race([
            fetchPromise,
            timeout(LOAD_TIMEOUT_MS, '文档加载超时').then(() => { throw new Error('文档加载超时'); })
        ]);

        if (!res.ok) throw new Error(`File not found: ${fileName}`);

        const markdownText = await res.text();

        // 4. 确保 Marked 已加载后转换为 HTML
        try {
            await ensureMarked();
        } catch (_) {
            contentEl.style.whiteSpace = 'pre-wrap';
            contentEl.innerText = markdownText;
        }

        if (window.marked && typeof window.marked.parse === 'function') {
            window.marked.use({
                gfm: true,
                breaks: true
            });

            const html = window.marked.parse(markdownText);
            contentEl.innerHTML = html;

            // 5. 代码高亮
            if (window.hljs) {
                contentEl.querySelectorAll('pre code').forEach((block) => {
                    window.hljs.highlightElement(block);
                });
            }

            // 6. 链接在新标签页打开
            contentEl.querySelectorAll('a').forEach(link => {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            });

            // 7. 更新日志：自动滚动到最新版本（最后一个 h2）
            if (fileName === 'update.md') {
                const h2s = contentEl.querySelectorAll('h2');
                const lastVersion = h2s[h2s.length - 1];
                if (lastVersion) {
                    contentEl.scrollTop = 0;
                    requestAnimationFrame(() => {
                        lastVersion.scrollIntoView({ block: 'start', behavior: 'smooth' });
                    });
                }
            }
        }

    } catch (e) {
        console.error(e);
        const msg = (e && e.message) ? e.message : `无法获取文件 "${fileName}"`;
        contentEl.innerHTML = `
            <div class="docs-error">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p class="error-title">文档加载失败</p>
                <p>${msg}</p>
                <button class="action-btn secondary" onclick="closeDocsModal()" style="margin-top: 1.5rem;">关闭</button>
            </div>
        `;
    }
}

export function closeDocsModal() {
    toggleModal('docs-modal', false);
}