// static/js/docs.js

import { toggleModal } from './ui.js';

const MARKED_CDN = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
const LOAD_TIMEOUT_MS = 6000;   // 文档/Marked 加载超时（毫秒），超时后不再等待

function escapeDocHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function scrollToAndHighlight(container, targetEl) {
    targetEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
    targetEl.classList.add('docs-highlight');
    clearTimeout(targetEl._highlightTimer);
    targetEl._highlightTimer = setTimeout(() => targetEl.classList.remove('docs-highlight'), 2500);
}

/** 更新日志：同步「跳转到版本」按钮的 active 高亮 */
function setUpdateJumpActive(contentEl, headingId) {
    const jumpBar = contentEl.querySelector('.docs-update-jump');
    if (!jumpBar || !headingId) return;
    jumpBar.querySelectorAll('.docs-update-jump-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.id === headingId);
    });
}

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

// 打开文档模态框并加载内容；可选第三参数 scrollToId，打开 update.md 时滚动到该 id（如 'update-v-0.3.5'）
export async function openDoc(fileName, title, scrollToId) {
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

            // 6. 链接：内部锚点不新开页，其余新标签页打开
            contentEl.querySelectorAll('a').forEach((link) => {
                const href = (link.getAttribute('href') || '').trim();
                if (href.startsWith('#')) return;
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            });

            // 7. 更新日志：为每个版本 h2 注入 id、生成跳转按钮、支持锚点高亮与跳转网页区块
            if (fileName === 'update.md') {
                const h2s = contentEl.querySelectorAll('h2');
                const versionHeadings = [];
                h2s.forEach((h2) => {
                    const text = (h2.textContent || '').trim();
                    const slug = text.replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5\-\.]/g, '');
                    const id = 'update-' + (slug || 'h2-' + versionHeadings.length);
                    h2.id = id;
                    h2.setAttribute('data-update-heading', 'true');
                    versionHeadings.push({ id, text });
                });
                const versionRegex = /^v\s*0\.\d+\.\d+/i;
                const jumpHeadings = versionHeadings.filter((v) => versionRegex.test(v.text));
                if (jumpHeadings.length > 0) {
                    const jumpBar = document.createElement('div');
                    jumpBar.className = 'docs-update-jump';
                    jumpBar.innerHTML = '<span class="docs-update-jump-label">跳转到版本：</span>' +
                        jumpHeadings.map((v) => '<button type="button" class="docs-update-jump-btn" data-id="' + v.id + '">' + escapeDocHtml(v.text) + '</button>').join('');
                    contentEl.insertBefore(jumpBar, contentEl.firstChild);
                    jumpBar.querySelectorAll('.docs-update-jump-btn').forEach((btn) => {
                        btn.addEventListener('click', () => {
                            const id = btn.dataset.id;
                            const target = contentEl.querySelector('#' + id);
                            if (target) {
                                scrollToAndHighlight(contentEl, target);
                                setUpdateJumpActive(contentEl, id);
                            }
                        });
                    });
                }
                // 文档内锚点：#section-xxx 跳转到网页对应区块并关闭弹窗，#section-xxx-yyy 并高亮页面内元素
                contentEl.querySelectorAll('a[href^="#"]').forEach((link) => {
                    const href = link.getAttribute('href');
                    if (href === '#') return;
                    const id = href.slice(1);
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (id.startsWith('section-')) {
                            // 结构: #section-<section>[-子定位]，例如：
                            // - #section-devtools           → sectionId=devtools，默认 devtool=rainbow
                            // - #section-devtools-rainbow   → sectionId=devtools，devtool=rainbow
                            // - #section-home-roles         → sectionId=home，高亮 id=section-home-roles
                            const rest = id.slice('section-'.length); // 去掉前缀 'section-'
                            const parts = rest.split('-');
                            const sectionId = parts[0] || 'home';
                            const highlightId = parts.length > 1 ? id : null;
                            closeDocsModal();
                            if (typeof window.closeSettings === 'function') window.closeSettings();
                            if (typeof window.showSection === 'function') {
                                window.showSection(sectionId);
                                // 基于不同 sectionId 更新 URL 查询参数，支持 ?section=...&devtool=... 等精确定位
                                try {
                                    const url = new URL(window.location.href);
                                    if (sectionId) {
                                        url.searchParams.set('section', sectionId);
                                    }
                                    // 针对开发者工具：支持 ?section=devtools&devtool=xxx
                                    if (sectionId === 'devtools') {
                                        // 子参数优先：section-devtools-rainbow / section-devtools-manim
                                        let devtool = parts[1] || 'rainbow';
                                        // 只接受已知值，避免拼写错误导致异常
                                        if (!['latex', 'manim', 'rainbow'].includes(devtool)) {
                                            devtool = 'rainbow';
                                        }
                                        url.searchParams.set('devtool', devtool);
                                        if (typeof window.switchDevTool === 'function') {
                                            window.switchDevTool(devtool);
                                        }
                                    } else {
                                        url.searchParams.delete('devtool');
                                    }
                                    window.history.replaceState({}, '', url.toString());
                                } catch (e) {
                                    // 忽略 URL 更新异常，保持基本跳转可用
                                }
                                if (highlightId) {
                                    const scrollToHighlight = () => {
                                        const el = document.getElementById(highlightId);
                                        if (el) {
                                            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                                            el.classList.add('page-highlight');
                                            clearTimeout(el._pageHighlightTimer);
                                            el._pageHighlightTimer = setTimeout(() => el.classList.remove('page-highlight'), 2500);
                                        }
                                    };
                                    requestAnimationFrame(() => {
                                        setTimeout(scrollToHighlight, 350);
                                    });
                                }
                            }
                            return;
                        }
                        const target = contentEl.querySelector('#' + id);
                        if (target) {
                            scrollToAndHighlight(contentEl, target);
                            if (target.getAttribute('data-update-heading') === 'true' && id.startsWith('update-')) {
                                setUpdateJumpActive(contentEl, id);
                            }
                        }
                    });
                    link.classList.add('docs-internal-link');
                });
                // 滚动：若传入 scrollToId 则定位到该处，否则定位到最新版本
                const scrollTarget = scrollToId ? contentEl.querySelector('#' + scrollToId) : null;
                const lastVersion = h2s[h2s.length - 1];
                const toScroll = scrollTarget || lastVersion;
                if (toScroll) {
                    contentEl.scrollTop = 0;
                    requestAnimationFrame(() => {
                        toScroll.scrollIntoView({ block: 'start', behavior: 'smooth' });
                        if (scrollTarget) {
                            scrollToAndHighlight(contentEl, scrollTarget);
                            if (scrollTarget.id && scrollTarget.getAttribute('data-update-heading') === 'true') {
                                setUpdateJumpActive(contentEl, scrollTarget.id);
                            }
                        }
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