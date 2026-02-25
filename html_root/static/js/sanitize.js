/**
 * 共享 HTML 清洗工具：防止 Markdown 解析后的 XSS 注入
 * 移除 <script>、iframe、object、embed 及内联事件、javascript: URL
 */

export function sanitizeMarkdownHtml(html) {
    if (!html || typeof html !== 'string') return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const removeTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'];
    removeTags.forEach((tag) => {
        tmp.querySelectorAll(tag).forEach((el) => el.remove());
    });
    tmp.querySelectorAll('*').forEach((el) => {
        [...el.attributes].forEach((attr) => {
            const name = attr.name.toLowerCase();
            const value = String(attr.value || '');
            if (name.startsWith('on')) el.removeAttribute(attr.name);
            if ((name === 'href' || name === 'src') && /^javascript:/i.test(value.trim())) el.removeAttribute(attr.name);
            if (name === 'formaction' && /^javascript:/i.test(value.trim())) el.removeAttribute(attr.name);
        });
    });
    return tmp.innerHTML;
}
