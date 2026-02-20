// static/js/examples.js
import { toggleModal } from './ui.js';

export async function loadExamples() {
    const grid = document.getElementById('examples-grid');
    if (!grid) return;

    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> 加载案例中...</div>';

    try {
        const res = await fetch('/api/examples');
        const data = await res.json();

        if (data.status === 'success') {
            renderExampleCards(data.data);
        } else {
            grid.innerHTML = '<div style="text-align:center;">加载失败</div>';
        }
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<div style="text-align:center;">网络错误</div>';
    }
}

function renderExampleCards(videos) {
    const grid = document.getElementById('examples-grid');
    if (!grid) {
        console.warn('examples-grid element not found');
        return;
    }
    
    if (!Array.isArray(videos) || videos.length === 0) {
        grid.innerHTML = '<div style="text-align:center;">暂无视频案例</div>';
        return;
    }

    // 转义 HTML 防止 XSS
    const escapeHtml = (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
    
    // 转义 HTML 属性值（转义引号、&、<、>）
    const escapeAttr = (str) => {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    };

    // 使用 data 属性存储数据，避免内联 onclick 的引号问题
    grid.innerHTML = videos.map(v => {
        const url = escapeHtml(v.url || '');
        const title = escapeHtml(v.title || '');
        const description = escapeHtml(v.description || '');
        // 转义 data 属性值中的引号
        const urlAttr = escapeAttr(v.url || '');
        const titleAttr = escapeAttr(v.title || '');
        const descAttr = escapeAttr(v.description || '');
        return [
            '<div class="video-card" data-video-url="' + urlAttr + '" data-video-title="' + titleAttr + '" data-video-desc="' + descAttr + '">',
            '  <div class="thumbnail video-preview-container">',
            '    <video src="' + url + '#t=0.5" muted loop playsinline preload="metadata" onmouseover="this.play()" onmouseout="this.pause(); this.currentTime=0.5;" style="width:100%; height:100%; object-fit:cover;"></video>',
            '    <div class="play-overlay"><i class="fa-solid fa-play-circle"></i></div>',
            '  </div>',
            '  <div class="info"><h4>' + title + '</h4><p>' + description + '</p></div>',
            '</div>'
        ].join('');
    }).join('');
    
    // 使用事件委托绑定点击事件
    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.video-card');
        if (card) {
            const url = card.getAttribute('data-video-url') || '';
            const title = card.getAttribute('data-video-title') || '';
            const desc = card.getAttribute('data-video-desc') || '';
            playExample(url, title, desc);
        }
    });
}

export function playExample(videoSrc, title, desc) {
    const player = document.getElementById('example-video-player');
    const titleEl = document.getElementById('video-modal-title');
    const descEl = document.getElementById('video-modal-desc'); // 新增

    if (player) {
        player.src = videoSrc;
        player.load();
        player.play().catch(e => console.log("Autoplay blocked"));
    }

    if (titleEl) titleEl.innerText = title;
    if (descEl) descEl.innerText = desc || "暂无简介";

    toggleModal('video-modal', true);
}

export function closeVideoModal() {
    const player = document.getElementById('example-video-player');
    if (player) {
        player.pause();
        player.currentTime = 0;
        player.src = "";
    }
    toggleModal('video-modal', false);
}
