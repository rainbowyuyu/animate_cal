// static/js/examples.js — 教学案例：B 站风预览、点赞、评论与弹幕（登录后可发）
import { toggleModal, toggleAuthModal, showToast } from './ui.js';
import * as Settings from './settings.js';

let examplesFilterMode = 'all';
let examplesTag = '';
let allTagsSet = new Set();
let examplesFilterTabsInited = false;

function escapeAttr(str) { if (!str) return ''; return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/** 安全播放：捕获 AbortError（被 load/pause 打断时）和 NotAllowedError，避免未处理的 Promise 拒绝 */
function safePlay(el) { if (el && typeof el.play === 'function') el.play().catch(() => {}); }

export async function loadExamples() {
    const grid = document.getElementById('examples-grid');
    if (!grid) return;

    const filterTab = document.querySelector('.examples-filter-tab.active');
    const filterMode = (filterTab && filterTab.dataset.filter) || 'all';
    const tagSelect = document.getElementById('examples-tag-select');
    const tag = (tagSelect && tagSelect.value) || '';

    grid.innerHTML = '<div class="video-grid-loading"><i class="fa-solid fa-spinner"></i>加载案例中...</div>';

    const params = new URLSearchParams();
    if (filterMode !== 'all') params.set('filter_mode', filterMode);
    if (tag) params.set('tag', tag);
    const qs = params.toString();
    const url = '/api/examples' + (qs ? '?' + qs : '');

    try {
        const res = await fetch(url, { credentials: 'include' });
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (_) {
            data = { status: 'error', message: res.ok ? '响应格式错误' : (text && text.length < 200 ? text : '服务异常(500)，请查看控制台或访问 /api/examples/health 排查') };
        }
        if (data.status === 'success') {
            const videos = data.data || [];
            if (filterMode === 'all' && !tag && Array.isArray(videos)) {
                videos.forEach(v => { (v.tags || []).forEach(t => allTagsSet.add(String(t))); });
                if (tagSelect) {
                    const cur = tagSelect.value;
                    tagSelect.innerHTML = '<option value="">全部</option>' + Array.from(allTagsSet).sort().map(t => '<option value="' + escapeAttr(t) + '">' + escapeHtml(t) + '</option>').join('');
                    if (cur) tagSelect.value = cur;
                }
            }
            renderExampleCards(videos);
            if (data.error) {
                grid.innerHTML = grid.innerHTML + '<div class="video-grid-error" style="margin-top:0.5rem;"><i class="fa-solid fa-info-circle"></i> ' + escapeHtml(data.error) + '</div>';
            }
        } else {
            const msg = data.message || '加载失败，请稍后再试';
            grid.innerHTML = '<div class="video-grid-error"><i class="fa-solid fa-circle-exclamation"></i>' + escapeHtml(msg) + '</div>';
        }
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<div class="video-grid-error"><i class="fa-solid fa-wifi"></i>网络错误，请检查网络后重试</div>';
    }
}

/**
 * 切换教学案例筛选（供知识图谱、智能体调用）
 * @param {string} mode - 'all' | 'favorites' | 'watch_later' | 'courseware'
 * @returns {Promise<boolean>} 是否成功切换（登录校验失败时返回 false）
 */
export async function switchExamplesFilter(mode) {
    const valid = ['all', 'favorites', 'watch_later', 'courseware'].includes(mode);
    const filterMode = valid ? mode : 'all';
    if (filterMode === 'favorites' || filterMode === 'watch_later' || filterMode === 'courseware') {
        try {
            const res = await fetch('/api/user/me', { credentials: 'include' });
            const me = await res.json();
            if (!me || me.status !== 'success' || !me.username) {
                if (typeof toggleAuthModal === 'function') toggleAuthModal(true);
                if (typeof showToast === 'function') showToast('登录后可查看我的收藏、稍后看和课件包', 'info');
                return false;
            }
        } catch (_) {
            if (typeof showToast === 'function') showToast('网络错误，请稍后重试', 'error');
            return false;
        }
    }
    const tab = document.querySelector(`.examples-filter-tab[data-filter="${filterMode}"]`);
    if (tab) {
        document.querySelectorAll('.examples-filter-tab').forEach(b => b.classList.remove('active'));
        tab.classList.add('active');
    }
    initExamplesFilterTabs();
    loadExamples();
    return true;
}

function initExamplesFilterTabs() {
    if (examplesFilterTabsInited) return;
    examplesFilterTabsInited = true;
    document.querySelectorAll('.examples-filter-tab').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const mode = (btn.dataset && btn.dataset.filter) || 'all';
            await switchExamplesFilter(mode);
        });
    });
    const tagSelect = document.getElementById('examples-tag-select');
    if (tagSelect) tagSelect.addEventListener('change', () => loadExamples());

    const createCourseBtn = document.getElementById('examples-create-course-btn');
    if (createCourseBtn) {
        createCourseBtn.addEventListener('click', () => openCoursePackModal());
    }

    // 创建课包弹窗：智能体 / 手动流程
    const agentBtn = document.getElementById('course-pack-modal-agent-btn');
    if (agentBtn) {
        agentBtn.addEventListener('click', () => {
            if (typeof closeCoursePackModal === 'function') closeCoursePackModal();
            if (window.Agent && typeof window.Agent.startRoleFlow === 'function') {
                window.Agent.startRoleFlow('teacher');
            } else if (typeof showSection === 'function') {
                showSection('agent');
            }
        });
    }
    const manualBtn = document.getElementById('course-pack-modal-manual-btn');
    if (manualBtn) {
        manualBtn.addEventListener('click', () => {
            if (typeof closeCoursePackModal === 'function') closeCoursePackModal();
            if (typeof showSection === 'function') showSection('examples');
            if (typeof showToast === 'function') showToast('请按步骤：智能识别/我的算式 → Manim 工作台 → 教学案例中加入课件包', 'info');
        });
    }
    document.querySelectorAll('.course-pack-step-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const step = link.getAttribute('data-course-pack-step');
            if (!step || typeof showSection !== 'function') return;
            if (typeof closeCoursePackModal === 'function') closeCoursePackModal();
            showSection(step === 'my-formulas' ? 'my-formulas' : step);
            if (step === 'devtools' && typeof window.switchDevTool === 'function') window.switchDevTool('manim');
        });
    });
}

/** 教师：打开创建课包说明弹窗（入口统一在教学案例页） */
function openCoursePackModal() {
    const modal = document.getElementById('course-pack-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('show'));
}
window.closeCoursePackModal = function () {
    const modal = document.getElementById('course-pack-modal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
};

function formatDuration(sec) {
    if (sec == null || !Number.isFinite(sec) || sec < 0) return '';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    if (m >= 60) {
        const h = Math.floor(m / 60);
        return h + ':' + String(m % 60).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
    return m + ':' + String(s).padStart(2, '0');
}

function renderExampleCards(videos) {
    const grid = document.getElementById('examples-grid');
    if (!grid) return;

    if (!Array.isArray(videos) || videos.length === 0) {
        const filterTab = document.querySelector('.examples-filter-tab.active');
        const isCourseware = filterTab && (filterTab.dataset.filter === 'courseware');
        grid.innerHTML = isCourseware
            ? '<div class="video-grid-empty video-grid-empty-courseware"><i class="fa-solid fa-chalkboard-user"></i>暂无课件包<p class="video-grid-empty-hint">点击「创建课包」将公式→动画打包成课堂案例，并生成课堂链接</p><button type="button" class="action-btn secondary" id="examples-create-course-btn-inline">创建课包</button></div>'
            : '<div class="video-grid-empty"><i class="fa-solid fa-film"></i>暂无视频案例</div>';
        const inlineBtn = document.getElementById('examples-create-course-btn-inline');
        if (inlineBtn) inlineBtn.onclick = () => document.getElementById('examples-create-course-btn')?.click();
        return;
    }

    const escapeHtml = (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
    const escapeAttr = (str) => {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    };

    grid.innerHTML = videos.map(v => {
        const url = escapeHtml(v.url || '');
        const title = escapeHtml(v.title || '');
        const description = escapeHtml(v.description || '');
        const videoId = escapeAttr(v.video_id || (v.filename ? v.filename.replace(/\.mp4$/i, '') : ''));
        const urlAttr = escapeAttr(v.url || '');
        const titleAttr = escapeAttr(v.title || '');
        const descAttr = escapeAttr(v.description || '');
        const spriteAttr = escapeAttr(v.sprite_url || '');
        const hlsAttr = escapeAttr(v.hls_url || '');
        const maskAttr = escapeAttr(v.mask_url || '');
        const highEnergyAttr = escapeAttr(Array.isArray(v.high_energy) ? JSON.stringify(v.high_energy) : '');
        const durationSec = v.duration_sec != null && Number.isFinite(v.duration_sec) ? String(v.duration_sec) : '';
        const spriteCols = v.sprite_cols != null ? String(v.sprite_cols) : '10';
        const spriteRows = v.sprite_rows != null ? String(v.sprite_rows) : '10';
        const durationLabel = v.duration_sec != null ? formatDuration(v.duration_sec) : '';
        const likeCount = Math.max(0, parseInt(v.like_count, 10) || 0);
        const durationBadge = durationLabel ? ('<span class="video-duration-badge">' + escapeHtml(durationLabel) + '</span>') : '';
        const fav = v.user_favorited ? ' fa-solid' : ' fa-regular';
        const watch = v.user_watch_later ? ' fa-solid' : ' fa-regular';
        const tagsList = Array.isArray(v.tags) && v.tags.length ? v.tags.slice(0, 4).map(t => '<span class="video-card-tag">' + escapeHtml(String(t)) + '</span>').join('') : '';
        return [
            '<div class="video-card" data-video-url="' + urlAttr + '" data-video-id="' + videoId + '" data-video-title="' + titleAttr + '" data-video-desc="' + descAttr + '" data-video-sprite="' + spriteAttr + '" data-video-duration="' + durationSec + '" data-video-sprite-cols="' + spriteCols + '" data-video-sprite-rows="' + spriteRows + '" data-video-hls="' + hlsAttr + '" data-video-mask="' + maskAttr + '" data-video-high-energy="' + highEnergyAttr + '">',
            '  <div class="thumbnail video-preview-container">',
            '    <video src="' + url + '#t=0.5" muted loop playsinline preload="metadata" onmouseover="this.play().catch(function(){})" onmouseout="this.pause(); this.currentTime=0.5;" style="width:100%; height:100%; object-fit:cover;"></video>',
            '    <div class="play-overlay"><i class="fa-solid fa-play-circle"></i></div>',
            durationBadge,
            '    <div class="video-card-meta"><span><i class="fa-regular fa-thumbs-up"></i> ' + likeCount + '</span></div>',
            '    <div class="video-card-actions" onclick="event.stopPropagation()">',
            '      <button type="button" class="video-card-action-btn' + (v.user_favorited ? ' active' : '') + '" data-action="favorite" data-video-id="' + videoId + '" title="收藏"><i class="' + fav + ' fa-star"></i></button>',
            '      <button type="button" class="video-card-action-btn' + (v.user_watch_later ? ' active' : '') + '" data-action="watch_later" data-video-id="' + videoId + '" title="稍后看"><i class="' + watch + ' fa-clock"></i></button>',
            '    </div>',
            '  </div>',
            '  <div class="info"><h4>' + title + '</h4><p>' + description + '</p>' + (tagsList ? '<div class="video-card-tags">' + tagsList + '</div>' : '') + '</div>',
            '</div>'
        ].join('');
    }).join('');

    if (!grid.dataset.delegateBound) {
        grid.dataset.delegateBound = '1';
        grid.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('.video-card-action-btn');
            if (actionBtn) {
                e.preventDefault();
                e.stopPropagation();
                const videoId = actionBtn.dataset.videoId;
                const action = actionBtn.dataset.action;
                if (action === 'favorite') toggleFavoriteOnCard(videoId, actionBtn);
                else if (action === 'watch_later') toggleWatchLaterOnCard(videoId, actionBtn);
                return;
            }
            const card = e.target.closest('.video-card');
            if (card) {
                const durationSec = card.getAttribute('data-video-duration');
                let highEnergy;
                try {
                    const s = card.getAttribute('data-video-high-energy');
                    highEnergy = s ? JSON.parse(s) : undefined;
                } catch (_) { highEnergy = undefined; }
                const opts = {
                    spriteUrl: card.getAttribute('data-video-sprite') || undefined,
                    durationSec: durationSec !== '' && durationSec != null ? parseFloat(durationSec, 10) : undefined,
                    spriteCols: parseInt(card.getAttribute('data-video-sprite-cols'), 10) || 10,
                    spriteRows: parseInt(card.getAttribute('data-video-sprite-rows'), 10) || 10,
                    hlsUrl: card.getAttribute('data-video-hls') || undefined,
                    maskUrl: card.getAttribute('data-video-mask') || undefined,
                    highEnergy: Array.isArray(highEnergy) ? highEnergy : undefined
                };
                playExample(
                    card.getAttribute('data-video-url') || '',
                    card.getAttribute('data-video-title') || '',
                    card.getAttribute('data-video-desc') || '',
                    card.getAttribute('data-video-id') || '',
                    opts
                );
            }
        });
    }
    initExamplesFilterTabs();
}

async function toggleFavoriteOnCard(videoId, btn) {
    try {
        const meRes = await fetch('/api/user/me', { credentials: 'include' });
        const me = await meRes.json();
        if (me.status !== 'success' || !me.username) {
            toggleAuthModal(true);
            return;
        }
    } catch (_) {
        if (typeof showToast === 'function') showToast('请先登录', 'error');
        return;
    }
    const isActive = btn.classList.contains('active');
    const method = isActive ? 'DELETE' : 'POST';
    const url = isActive ? '/api/examples/favorites?video_id=' + encodeURIComponent(videoId) : '/api/examples/favorites';
    const body = method === 'POST' ? JSON.stringify({ video_id: videoId }) : undefined;
    try {
        const res = await fetch(url, { method, credentials: 'include', headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {}, body });
        const data = await res.json();
        if (data.status === 'success') {
            btn.classList.toggle('active', !!data.user_favorited);
            btn.querySelector('i').className = (data.user_favorited ? 'fa-solid' : 'fa-regular') + ' fa-star';
            if (typeof showToast === 'function') showToast(data.user_favorited ? '已收藏' : '已取消收藏', 'success');
        } else if (data.message && typeof showToast === 'function') showToast(data.message, 'error');
    } catch (_) { if (typeof showToast === 'function') showToast('网络错误', 'error'); }
}

async function toggleWatchLaterOnCard(videoId, btn) {
    try {
        const meRes = await fetch('/api/user/me', { credentials: 'include' });
        const me = await meRes.json();
        if (me.status !== 'success' || !me.username) {
            toggleAuthModal(true);
            return;
        }
    } catch (_) {
        if (typeof showToast === 'function') showToast('请先登录', 'error');
        return;
    }
    const isActive = btn.classList.contains('active');
    const method = isActive ? 'DELETE' : 'POST';
    const url = isActive ? '/api/examples/watch-later?video_id=' + encodeURIComponent(videoId) : '/api/examples/watch-later';
    const body = method === 'POST' ? JSON.stringify({ video_id: videoId }) : undefined;
    try {
        const res = await fetch(url, { method, credentials: 'include', headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {}, body });
        const data = await res.json();
        if (data.status === 'success') {
            btn.classList.toggle('active', !!data.user_watch_later);
            btn.querySelector('i').className = (data.user_watch_later ? 'fa-solid' : 'fa-regular') + ' fa-clock';
            if (typeof showToast === 'function') showToast(data.user_watch_later ? '已加入稍后看' : '已移除', 'success');
        } else if (data.message && typeof showToast === 'function') showToast(data.message, 'error');
    } catch (_) { if (typeof showToast === 'function') showToast('网络错误', 'error'); }
}

let currentVideoId = '';
let currentVideoTitle = '';
/** 续播时间（秒），用于复习推荐「继续观看」 */
let currentVideoResumeTime = 0;
let danmakuList = [];
const danmakuShownCountRef = { value: 0 };
let heartbeatTimerId = null;

/** 核心播放逻辑：HLS(MSE) 与 MP4 回退 */
let currentHlsInstance = null;

function destroyHls() {
    if (currentHlsInstance) {
        try { currentHlsInstance.destroy(); } catch (_) {}
        currentHlsInstance = null;
    }
}

function setVideoSource(player, url, opts = {}) {
    if (!player) return;
    destroyHls();
    const hlsUrl = opts.hlsUrl || (url && /\.m3u8(\?|$)/i.test(url) ? url : null);
    const Hls = typeof window !== 'undefined' && window.Hls;

    if (hlsUrl && Hls && Hls.isSupported()) {
        currentHlsInstance = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60
        });
        currentHlsInstance.loadSource(hlsUrl);
        currentHlsInstance.attachMedia(player);
        currentHlsInstance.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal && data.type === Hls.ErrorTypes.NETWORK) {
                player.src = url && !/\.m3u8/i.test(url) ? url : '';
                player.load();
            }
        });
        player.removeAttribute('src');
    } else if (hlsUrl && player.canPlayType && player.canPlayType('application/vnd.apple.mpegurl')) {
        player.src = hlsUrl;
        player.load();
    } else {
        player.src = url || '';
        player.load();
    }
}

/** 雪碧图预览：当前视频的 sprite 元数据（由 playExample 设置） */
let currentSpriteUrl = '';
let currentSpriteCols = 10;
let currentSpriteRows = 10;
let currentSpriteDuration = 0;

function updatePreviewBox(progressTooltip, previewBox, previewTime, timeSec, duration) {
    const timeEl = previewTime || (progressTooltip && progressTooltip.querySelector('.custom-player-preview-time'));
    const boxEl = previewBox || (progressTooltip && progressTooltip.querySelector('.custom-player-preview-box'));
    if (timeEl) timeEl.textContent = formatDuration(timeSec);

    if (!boxEl || !currentSpriteUrl || !duration || duration <= 0) {
        if (progressTooltip) progressTooltip.classList.remove('has-sprite');
        return;
    }
    progressTooltip.classList.add('has-sprite');
    const total = currentSpriteCols * currentSpriteRows;
    const index = Math.min(Math.floor((timeSec / duration) * total), total - 1);
    const col = index % currentSpriteCols;
    const row = Math.floor(index / currentSpriteCols);
    const cellW = 160;
    const cellH = 90;
    boxEl.style.backgroundImage = `url(${currentSpriteUrl})`;
    boxEl.style.backgroundSize = `${currentSpriteCols * cellW}px ${currentSpriteRows * cellH}px`;
    boxEl.style.backgroundPosition = `-${col * cellW}px -${row * cellH}px`;
}
const DANMAKU_TRACKS = 8;
const DANMAKU_SPEED = 120;
const DANMAKU_GAP = 24;
const DANMAKU_POOL_MAX = 256;

/** Canvas 弹幕：requestAnimationFrame 60fps + 轨道碰撞 + 对象池 + 可选防挡蒙版 */
function createDanmakuCanvasManager() {
    let canvas = null;
    let container = null;
    let getTime = () => 0;
    let getVisible = () => true;
    let getList = () => [];
    let shownCountRef = { value: 0 };
    let rafId = null;
    const active = [];
    const pool = [];
    const trackRight = [];
    let lastTime = 0;
    let maskImage = null;

    function getOpacity() {
        return Settings.getDanmakuOpacity ? Settings.getDanmakuOpacity() / 100 : 0.9;
    }
    function getFontSize() {
        const s = Settings.getDanmakuFontSize ? Settings.getDanmakuFontSize() : 'medium';
        return s === 'small' ? 14 : s === 'large' ? 18 : 16;
    }

    function allocItem() {
        if (pool.length) return pool.pop();
        return { x: 0, y: 0, text: '', width: 0, track: 0, isMine: false };
    }

    function recycleItem(item) {
        item.text = '';
        if (pool.length < DANMAKU_POOL_MAX) pool.push(item);
    }

    /** 轨道管理：上一条弹幕右缘 + 间距 < 屏幕宽度则该轨可用，优先填满顶部轨道 */
    function findTrack(w) {
        const cw = canvas ? canvas.width : 0;
        for (let t = 0; t < DANMAKU_TRACKS; t++) {
            const right = trackRight[t] ?? -9999;
            if (right + DANMAKU_GAP < cw) return t;
        }
        return 0;
    }

    function emit(text, isMine) {
        if (!canvas || !getVisible()) return;
        const ctx = canvas.getContext('2d');
        const fontSize = getFontSize();
        ctx.font = `600 ${fontSize}px sans-serif`;
        const width = Math.ceil(ctx.measureText(text).width);
        const track = findTrack(width);
        const trackH = (canvas.height / DANMAKU_TRACKS);
        const y = track * trackH + trackH / 2 + fontSize / 2 - 2;
        const item = allocItem();
        item.x = canvas.width;
        item.y = y;
        item.text = text;
        item.width = width;
        item.track = track;
        item.isMine = !!isMine;
        active.push(item);
        const right = item.x + item.width;
        if (trackRight[track] == null || right > trackRight[track]) trackRight[track] = right;
    }

    function tick(now) {
        rafId = requestAnimationFrame(tick);
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d');
        const cw = canvas.width;
        const ch = canvas.height;
        const dt = lastTime ? (now - lastTime) / 1000 : 0.016;
        lastTime = now;

        const t = getTime();
        const list = getList();
        const ref = shownCountRef;
        while (ref.value < list.length && list[ref.value].time <= t) {
            const d = list[ref.value];
            ref.value++;
            emit(d.text || '', !!(d.username && d.username === currentDanmakuUsername));
        }

        const speed = DANMAKU_SPEED * dt;
        for (let i = active.length - 1; i >= 0; i--) {
            const item = active[i];
            item.x -= speed;
            if (item.x + item.width < 0) {
                active.splice(i, 1);
                recycleItem(item);
                continue;
            }
            const right = item.x + item.width;
            if (trackRight[item.track] === right) {
                let max = item.x;
                for (let j = 0; j < active.length; j++) {
                    if (active[j].track === item.track && active[j].x + active[j].width > max)
                        max = active[j].x + active[j].width;
                }
                trackRight[item.track] = max;
            }
        }

        ctx.clearRect(0, 0, cw, ch);
        if (!getVisible()) return;
        const opacity = getOpacity();
        const fontSize = getFontSize();
        ctx.font = `600 ${fontSize}px sans-serif`;
        ctx.textBaseline = 'middle';
        const danmakuBlue = 'rgba(0, 174, 236, ';
        const danmakuBlueStroke = 'rgba(0, 140, 200, 0.95)';
        for (const item of active) {
            if (item.isMine) {
                const pad = 4;
                ctx.fillStyle = danmakuBlue + (opacity * 0.35) + ')';
                ctx.strokeStyle = danmakuBlueStroke;
                ctx.lineWidth = 1;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(item.x - pad, item.y - fontSize / 2 - pad, item.width + pad * 2, fontSize + pad * 2, 6);
                else ctx.rect(item.x - pad, item.y - fontSize / 2 - pad, item.width + pad * 2, fontSize + pad * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = danmakuBlue + opacity + ')';
                ctx.strokeStyle = 'rgba(0, 100, 160, 0.85)';
            } else {
                ctx.fillStyle = danmakuBlue + opacity + ')';
                ctx.strokeStyle = 'rgba(0, 100, 160, 0.85)';
                ctx.lineWidth = 2;
            }
            ctx.strokeText(item.text, item.x, item.y);
            ctx.fillText(item.text, item.x, item.y);
        }

        /* 智能防挡弹幕：蒙版区域用 destination-out 擦除，弹幕从人背后穿过 */
        if (maskImage && maskImage.complete && maskImage.naturalWidth) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.drawImage(maskImage, 0, 0, cw, ch);
            ctx.restore();
        }
    }

    function setMask(urlOrImage) {
        if (!urlOrImage) {
            maskImage = null;
            return;
        }
        if (typeof urlOrImage === 'object' && urlOrImage instanceof HTMLImageElement) {
            maskImage = urlOrImage;
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { maskImage = img; };
        img.onerror = () => { maskImage = null; };
        img.src = String(urlOrImage);
    }

    return {
        init(opts) {
            canvas = opts.canvas;
            container = opts.container;
            getTime = opts.getTime || getTime;
            getVisible = opts.getVisible || getVisible;
            getList = opts.getList || (() => []);
            shownCountRef = opts.shownCountRef || { value: 0 };
            lastTime = 0;
            setMask(opts.maskUrl || null);
            for (let t = 0; t < DANMAKU_TRACKS; t++) trackRight[t] = -9999;
            active.length = 0;
            if (canvas && container) {
                const rect = container.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                canvas.style.width = rect.width + 'px';
                canvas.style.height = rect.height + 'px';
                canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
            }
        },
        start() {
            if (rafId) return;
            lastTime = 0;
            rafId = requestAnimationFrame(tick);
        },
        stop() {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
        },
        resize() {
            if (!canvas || !container) return;
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
        },
        setGetList(fn) { getList = fn; },
        setShownCountRef(ref) { shownCountRef = ref; },
        setMask,
        emit(text, isMine) { emit(text, isMine); }
    };
}

let danmakuCanvasManager = null;

function loadVideoNotes(videoId) {
    const listEl = document.getElementById('video-notes-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="video-comment-item" style="color:rgba(255,255,255,0.5);">加载中…</div>';
    fetch('/api/examples/notes?video_id=' + encodeURIComponent(videoId), { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            if (data.status !== 'success' || !Array.isArray(data.data)) {
                listEl.innerHTML = '<div class="video-comment-item" style="color:rgba(255,255,255,0.5);">暂无笔记</div>';
                return;
            }
            const items = data.data;
            if (items.length === 0) {
                listEl.innerHTML = '<div class="video-comment-item" style="color:rgba(255,255,255,0.5);">暂无笔记，点击下方添加</div>';
                return;
            }
            listEl.innerHTML = items.map(n => {
                const t = Number(n.time_sec);
                const timeStr = formatDuration(t);
                const fullContent = (n.content || '').trim();
                const content = fullContent.slice(0, 80) + (fullContent.length > 80 ? '…' : '');
                const contentAttr = escapeAttr(fullContent.slice(0, 500));
                const titleAttr = escapeAttr(currentVideoTitle || '');
                return '<div class="video-note-item" data-time="' + t + '" data-content="' + contentAttr + '" data-time-sec="' + t + '" data-video-title="' + titleAttr + '" role="button" tabindex="0">' +
                    '<span class="video-note-time">' + escapeHtml(timeStr) + '</span><span class="video-note-content">' + escapeHtml(content) + '</span>' +
                    '<button type="button" class="video-note-to-exercise-btn" title="根据此笔记让智能体出一道同类练习题"><i class="fa-solid fa-pen-to-square"></i></button></div>';
            }).join('');
            listEl.querySelectorAll('.video-note-item').forEach(el => {
                el.addEventListener('click', (e) => {
                    if (e.target.closest('.video-note-to-exercise-btn')) return;
                    const player = document.getElementById('example-video-player');
                    const time = parseFloat(el.dataset.time, 10);
                    if (player && Number.isFinite(time)) { player.currentTime = time; safePlay(player); }
                });
            });
            listEl.querySelectorAll('.video-note-to-exercise-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const item = btn.closest('.video-note-item');
                    if (!item) return;
                    const content = (item.dataset.content || '').trim();
                    const timeSec = item.dataset.timeSec || '0';
                    const videoTitle = (item.dataset.videoTitle || '').trim();
                    const timeStr = item.querySelector('.video-note-time') ? item.querySelector('.video-note-time').textContent : timeSec;
                    const prompt = '请根据以下学习笔记出一道同类数学练习题（含步骤与答案），以 Markdown 格式回复。\n\n笔记内容：' + (content || '(无)') + '\n视频时间点：' + timeStr + (videoTitle ? '\n视频：' + videoTitle : '');
                    if (window.Agent && typeof window.Agent.prefillAndShow === 'function') window.Agent.prefillAndShow(prompt);
                    else if (typeof showToast === 'function') showToast('请刷新页面后重试', 'info');
                });
            });
        })
        .catch(() => { listEl.innerHTML = '<div class="video-comment-item" style="color:rgba(255,255,255,0.5);">加载失败</div>'; });
}

let videoNotesBound = false;
function bindVideoNotesOnce() {
    if (videoNotesBound) return;
    videoNotesBound = true;
    const noteInput = document.getElementById('video-note-input');
    const noteSend = document.getElementById('video-note-send');
    if (!noteSend || !noteInput) return;
    noteSend.addEventListener('click', () => {
        const content = noteInput.value ? noteInput.value.trim() : '';
        if (!content || !currentVideoId) return;
        const player = document.getElementById('example-video-player');
        const timeSec = player && Number.isFinite(player.currentTime) ? player.currentTime : 0;
        noteSend.disabled = true;
        fetch('/api/examples/notes', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_id: currentVideoId, time_sec: timeSec, content })
        })
            .then(r => r.json())
            .then(data => {
                if (data.status === 'success') {
                    noteInput.value = '';
                    loadVideoNotes(currentVideoId);
                    if (typeof showToast === 'function') showToast('笔记已添加', 'success');
                } else if (data.message && typeof showToast === 'function') showToast(data.message, 'error');
            })
            .catch(() => { if (typeof showToast === 'function') showToast('网络错误', 'error'); })
            .finally(() => { noteSend.disabled = false; });
    });
    noteInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') noteSend.click(); });
}

function loadComments(videoId) {
    const listEl = document.getElementById('video-comments-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="video-comment-item" style="color:rgba(255,255,255,0.5);">加载中…</div>';
    fetch('/api/examples/comments?video_id=' + encodeURIComponent(videoId), { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            if (data.status !== 'success' || !Array.isArray(data.data)) {
                listEl.innerHTML = '<div class="video-comment-item" style="color:rgba(255,255,255,0.5);">暂无评论</div>';
                return;
            }
            const items = data.data;
            if (items.length === 0) {
                listEl.innerHTML = '<div class="video-comment-item" style="color:rgba(255,255,255,0.5);">暂无评论，登录后抢沙发～</div>';
                return;
            }
            listEl.innerHTML = items.map(c => {
                const timeStr = c.created_at ? new Date(c.created_at * 1000).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                return '<div class="video-comment-item"><span class="video-comment-user">' + escapeHtml(c.username || '') + '</span><span class="video-comment-content">' + escapeHtml(c.content || '') + '</span><div class="video-comment-time">' + escapeHtml(timeStr) + '</div></div>';
            }).join('');
        })
        .catch(() => {
            listEl.innerHTML = '<div class="video-comment-item" style="color:rgba(255,255,255,0.5);">加载失败</div>';
        });
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/** 弹幕分段时长（秒），与后端 segment 一致 */
const DANMAKU_SEGMENT_SECONDS = 360;

/** 本地错题本存储键（未登录时存于当前浏览器，登录后走数据库） */
const WRONGBOOK_STORAGE_KEY = 'wcp_examples_wrongbook_v1';

function getWrongbookUsername() {
    const userSpan = document.getElementById('username-span');
    const userDisplay = document.getElementById('user-display');
    if (userDisplay && userDisplay.style.display !== 'none' && userSpan) return userSpan.innerText || null;
    return null;
}

function getWrongbookListFromStorage() {
    try {
        const raw = localStorage.getItem(WRONGBOOK_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
}

function setWrongbookListToStorage(list) {
    try {
        localStorage.setItem(WRONGBOOK_STORAGE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    } catch (_) {}
}

/** 获取错题列表（登录走 API，未登录走 localStorage） */
async function getWrongbookList(videoId) {
    const user = getWrongbookUsername();
    if (user) {
        try {
            const params = new URLSearchParams({ username: user });
            if (videoId) params.set('video_id', videoId);
            const res = await fetch('/api/wrongbook/list?' + params, { credentials: 'include' });
            const d = await res.json();
            if (d.status === 'success' && Array.isArray(d.data)) return d.data;
        } catch (_) {}
        return [];
    }
    const list = getWrongbookListFromStorage();
    if (videoId) return list.filter(item => item.video_id === videoId);
    return list;
}

function loadDanmaku(videoId, onLoaded) {
    danmakuList = [];
    danmakuShownCountRef.value = 0;
    if (!videoId) {
        if (onLoaded) onLoaded();
        return;
    }
    const loadSegment = (segmentIndex) =>
        fetch('/api/v1/danmaku/list?video_id=' + encodeURIComponent(videoId) + (segmentIndex != null ? '&segment_index=' + segmentIndex : ''), { credentials: 'include' })
            .then(r => r.json());
    loadSegment(null)
        .then(data => {
            const list = (data.code === 0 && Array.isArray(data.data)) ? data.data : [];
            const merged = list.map(d => {
                const [time, , , author, content] = Array.isArray(d) ? d : [d.time, 1, 16777215, d.username, d.text];
                return { time: Number(time), text: content || '', username: author || '' };
            });
            danmakuList = merged.filter(d => Number.isFinite(d.time)).sort((a, b) => a.time - b.time);
            if (onLoaded) onLoaded();
            if (danmakuCanvasManager) danmakuCanvasManager.resize();
        })
        .catch(() => {
            if (onLoaded) onLoaded();
        });
}

let danmakuVisible = true;
let currentDanmakuUsername = '';
let customPlayerBound = false;

/** WebSocket：在线人数 + 新弹幕实时推送 + 30s 心跳 */
let currentVideoWs = null;
let currentVideoWsHeartbeat = null;

function closeVideoWs() {
    if (currentVideoWsHeartbeat) {
        clearInterval(currentVideoWsHeartbeat);
        currentVideoWsHeartbeat = null;
    }
    if (currentVideoWs) {
        try { currentVideoWs.close(); } catch (_) {}
        currentVideoWs = null;
    }
    const el = document.getElementById('video-viewer-count');
    if (el) el.textContent = '';
}

function connectVideoWs(videoId) {
    closeVideoWs();
    if (!videoId) return;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${location.host}/api/examples/ws/${encodeURIComponent(videoId)}`;
    try {
        const ws = new WebSocket(url);
        currentVideoWs = ws;
        ws.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.type === 'viewer_count') {
                    const el = document.getElementById('video-viewer-count');
                    if (el) el.textContent = msg.count > 0 ? msg.count + ' 人正在看' : '';
                } else if (msg.type === 'new_danmaku' && msg.data) {
                    danmakuList.push({ text: msg.data.text, time: msg.data.time, username: msg.data.username });
                    danmakuList.sort((a, b) => a.time - b.time);
                }
            } catch (_) {}
        };
        ws.onclose = () => { currentVideoWs = null; };
        ws.onopen = () => {
            currentVideoWsHeartbeat = setInterval(() => {
                if (currentVideoWs && currentVideoWs.readyState === WebSocket.OPEN)
                    currentVideoWs.send(JSON.stringify({ type: 'ping' }));
            }, 30000);
        };
    } catch (_) {}
}

function updateModalAuthUI(loggedIn) {
    const commentForm = document.getElementById('video-comment-form');
    const commentHint = document.getElementById('video-comment-login-hint');
    const danmakuWrap = document.getElementById('video-danmaku-input-wrap');
    const danmakuHint = document.getElementById('video-danmaku-login-hint');
    const noteForm = document.getElementById('video-note-form');
    const noteHint = document.getElementById('video-note-login-hint');
    if (commentForm) commentForm.style.display = loggedIn ? 'flex' : 'none';
    if (commentHint) commentHint.style.display = loggedIn ? 'none' : 'block';
    if (danmakuWrap) danmakuWrap.style.display = loggedIn ? 'flex' : 'none';
    if (danmakuHint) danmakuHint.style.display = loggedIn ? 'none' : 'block';
    if (noteForm) noteForm.style.display = loggedIn ? 'flex' : 'none';
    if (noteHint) noteHint.style.display = loggedIn ? 'none' : 'block';
}

if (typeof window !== 'undefined') {
    window.addEventListener('auth-success', () => {
        const modal = document.getElementById('video-modal');
        if (modal && modal.classList.contains('show')) {
            fetch('/api/user/me', { credentials: 'include' })
                .then(r => r.status === 200 ? r.json() : null)
                .then(data => {
                    const loggedIn = !!(data && data.status === 'success' && data.username);
                    updateModalAuthUI(loggedIn);
                    if (loggedIn) currentDanmakuUsername = data.username;
                })
                .catch(() => {});
        }
    });
}

function initCustomPlayer() {
    if (customPlayerBound) return;
    customPlayerBound = true;

    const player = document.getElementById('example-video-player');
    const wrapper = document.getElementById('video-player-wrapper');
    const centerPlay = document.getElementById('custom-player-center-play');
    const playBtn = document.getElementById('custom-player-play');
    const timeEl = document.getElementById('custom-player-time');
    const progressWrap = document.getElementById('custom-player-progress-wrap');
    const progressTrack = document.getElementById('custom-player-progress-track');
    const progressPlayed = document.getElementById('custom-player-progress-played');
    const progressLoaded = document.getElementById('custom-player-progress-loaded');
    const progressHover = document.getElementById('custom-player-progress-hover');
    const progressTooltip = document.getElementById('custom-player-progress-tooltip');
    const volumeBtn = document.getElementById('custom-player-volume-btn');
    const volumeSlider = document.getElementById('custom-player-volume-slider');
    const speedBtn = document.getElementById('custom-player-speed-btn');
    const speedMenu = document.getElementById('custom-player-speed-menu');
    const fullscreenBtn = document.getElementById('custom-player-fullscreen');

    function syncPlayPauseUI() {
        const paused = !player || player.paused;
        if (centerPlay) {
            centerPlay.classList.toggle('hidden', !paused);
            const icon = centerPlay.querySelector('i');
            if (icon) icon.className = 'fa-solid fa-play';
        }
        if (playBtn) {
            const icon = playBtn.querySelector('i');
            if (icon) icon.className = paused ? 'fa-solid fa-play' : 'fa-solid fa-pause';
        }
    }

    function syncTimeUI() {
        const cur = player ? player.currentTime : 0;
        const dur = player && player.duration && Number.isFinite(player.duration) ? player.duration : 0;
        if (timeEl) timeEl.textContent = formatDuration(cur) + ' / ' + formatDuration(dur);
        if (progressPlayed && dur > 0) progressPlayed.style.width = (cur / dur * 100) + '%';
    }

    function syncBufferUI() {
        if (!player || !progressLoaded) return;
        try {
            const b = player.buffered;
            if (b.length && player.duration) progressLoaded.style.width = (b.end(b.length - 1) / player.duration * 100) + '%';
        } catch (_) {}
    }

    function seekFromProgress(e) {
        if (!player || !progressTrack) return;
        const rect = progressTrack.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const p = Math.max(0, Math.min(1, x / rect.width));
        player.currentTime = p * (player.duration || 0);
    }

    if (player) {
        player.removeAttribute('controls');
        player.addEventListener('click', () => {
            if (player.paused) safePlay(player); else player.pause();
        });
        player.addEventListener('play', syncPlayPauseUI);
        player.addEventListener('pause', syncPlayPauseUI);
        player.addEventListener('timeupdate', syncTimeUI);
        player.addEventListener('progress', syncBufferUI);
        player.addEventListener('loadedmetadata', () => { syncTimeUI(); syncBufferUI(); });
    }

    if (centerPlay) centerPlay.addEventListener('click', (e) => { e.stopPropagation(); if (player) safePlay(player); });

    if (playBtn) playBtn.addEventListener('click', (e) => { e.stopPropagation(); if (player) (player.paused ? safePlay(player) : player.pause()); });

    if (progressWrap && progressTrack) {
        const previewTimeEl = document.getElementById('custom-player-preview-time');
        const previewBoxEl = document.getElementById('custom-player-preview-box');
        progressWrap.addEventListener('click', (e) => { e.stopPropagation(); seekFromProgress(e); });
        progressWrap.addEventListener('mousemove', (e) => {
            if (!player || !progressTrack || !progressTooltip || !progressHover) return;
            const rect = progressTrack.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const p = Math.max(0, Math.min(1, x / rect.width));
            const duration = player.duration && Number.isFinite(player.duration) ? player.duration : currentSpriteDuration;
            const t = p * (duration || 0);
            progressTooltip.style.left = (p * 100) + '%';
            progressHover.style.width = (p * 100) + '%';
            updatePreviewBox(progressTooltip, previewBoxEl, previewTimeEl, t, duration);
        });
        progressWrap.addEventListener('mouseleave', () => {
            if (progressHover) progressHover.style.width = '0%';
        });
    }

    const volumeWrap = document.getElementById('custom-player-volume-wrap');
    if (volumeSlider && player) {
        volumeSlider.addEventListener('input', () => {
            player.volume = volumeSlider.value / 100;
            if (volumeBtn) {
                const icon = volumeBtn.querySelector('i');
                if (icon) icon.className = player.volume === 0 ? 'fa-solid fa-volume-xmark' : player.volume < 0.5 ? 'fa-solid fa-volume-low' : 'fa-solid fa-volume-high';
            }
        });
    }
    if (volumeBtn && player) {
        volumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (volumeWrap) volumeWrap.classList.toggle('volume-open');
            const icon = volumeBtn.querySelector('i');
            if (icon) icon.className = player.volume === 0 ? 'fa-solid fa-volume-xmark' : player.volume < 0.5 ? 'fa-solid fa-volume-low' : 'fa-solid fa-volume-high';
        });
        volumeBtn.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (player.volume > 0) {
                player.dataset.prevVolume = String(player.volume);
                player.volume = 0;
                volumeSlider.value = 0;
            } else {
                player.volume = parseFloat(player.dataset.prevVolume || '1', 10);
                volumeSlider.value = player.volume * 100;
            }
            const icon = volumeBtn.querySelector('i');
            if (icon) icon.className = player.volume === 0 ? 'fa-solid fa-volume-xmark' : player.volume < 0.5 ? 'fa-solid fa-volume-low' : 'fa-solid fa-volume-high';
        });
    }
    document.addEventListener('click', (e) => {
        if (volumeWrap && !volumeWrap.contains(e.target)) volumeWrap.classList.remove('volume-open');
    });

    if (speedMenu && speedBtn && player) {
        const rateStr = (r) => r + 'x';
        speedBtn.textContent = rateStr(player.playbackRate || 1);
        speedMenu.querySelectorAll('button').forEach(b => {
            if (Math.abs(parseFloat(b.getAttribute('data-rate'), 10) - (player.playbackRate || 1)) < 0.01) b.classList.add('active');
            b.addEventListener('click', () => {
                const rate = parseFloat(b.getAttribute('data-rate'), 10);
                player.playbackRate = rate;
                speedBtn.textContent = rateStr(rate);
                speedMenu.classList.remove('show');
                speedMenu.querySelectorAll('button').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
            });
        });
        speedBtn.addEventListener('click', (e) => { e.stopPropagation(); speedMenu.classList.toggle('show'); });
    }

    document.addEventListener('click', (e) => {
        if (speedMenu && speedBtn && !speedMenu.contains(e.target) && e.target !== speedBtn) speedMenu.classList.remove('show');
    });

    if (fullscreenBtn && wrapper) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                wrapper.requestFullscreen().then(() => {
                    const icon = fullscreenBtn.querySelector('i');
                    if (icon) icon.className = 'fa-solid fa-compress';
                }).catch(() => {});
            } else {
                document.exitFullscreen().then(() => {
                    const icon = fullscreenBtn.querySelector('i');
                    if (icon) icon.className = 'fa-solid fa-expand';
                }).catch(() => {});
            }
        });
    }
    document.addEventListener('fullscreenchange', () => {
        if (fullscreenBtn) {
            const icon = fullscreenBtn.querySelector('i');
            if (icon) icon.className = document.fullscreenElement ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
        }
    });

    /* 键盘：空格播放/暂停，左右 5 秒，上下音量 */
    if (wrapper) {
        wrapper.addEventListener('keydown', (e) => {
            if (e.target.closest('input, textarea') || e.target.closest('.custom-player-speed-menu')) return;
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    if (player) (player.paused ? safePlay(player) : player.pause());
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (player) player.currentTime = Math.max(0, player.currentTime - 5);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (player) player.currentTime = Math.min(player.duration || 0, player.currentTime + 5);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (player && volumeSlider) {
                        const v = Math.min(100, (player.volume * 100) + 10);
                        player.volume = v / 100;
                        volumeSlider.value = v;
                        showVolumeToast(Math.round(v));
                        if (volumeBtn) {
                            const icon = volumeBtn.querySelector('i');
                            if (icon) icon.className = player.volume === 0 ? 'fa-solid fa-volume-xmark' : player.volume < 0.5 ? 'fa-solid fa-volume-low' : 'fa-solid fa-volume-high';
                        }
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (player && volumeSlider) {
                        const v = Math.max(0, (player.volume * 100) - 10);
                        player.volume = v / 100;
                        volumeSlider.value = v;
                        showVolumeToast(Math.round(v));
                        if (volumeBtn) {
                            const icon = volumeBtn.querySelector('i');
                            if (icon) icon.className = player.volume === 0 ? 'fa-solid fa-volume-xmark' : player.volume < 0.5 ? 'fa-solid fa-volume-low' : 'fa-solid fa-volume-high';
                        }
                    }
                    break;
            }
        });
        wrapper.addEventListener('dblclick', (e) => {
            if (e.target.closest('.custom-player-controls')) return;
            e.preventDefault();
            if (!document.fullscreenElement) wrapper.requestFullscreen().catch(() => {});
            else document.exitFullscreen().catch(() => {});
        });
    }

    bindPlayerContextMenu();
    bindPlayerStatsPanel();
    bindHighEnergyBar();
    bindVolumeToast();

    window.syncCustomPlayerUI = function () {
        syncPlayPauseUI();
        syncTimeUI();
        syncBufferUI();
    };
}

let volumeToastTimer = null;
function showVolumeToast(percent) {
    const el = document.getElementById('player-volume-toast');
    if (!el) return;
    el.textContent = percent + '%';
    el.classList.add('show');
    clearTimeout(volumeToastTimer);
    volumeToastTimer = setTimeout(() => el.classList.remove('show'), 800);
}

function bindVolumeToast() {
    const volumeSlider = document.getElementById('custom-player-volume-slider');
    const player = document.getElementById('example-video-player');
    if (volumeSlider && player) {
        volumeSlider.addEventListener('input', () => {
            showVolumeToast(Math.round(volumeSlider.value));
        });
    }
}

function bindPlayerContextMenu() {
    const wrapper = document.getElementById('video-player-wrapper');
    const menu = document.getElementById('player-context-menu');
    if (!wrapper || !menu) return;
    wrapper.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        menu.classList.add('show');
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        menu.querySelectorAll('button').forEach(btn => {
            const action = btn.getAttribute('data-action');
            if (action === 'loop') {
                const player = document.getElementById('example-video-player');
                btn.innerHTML = (player && player.loop ? '<i class="fa-solid fa-check"></i> ' : '<i class="fa-solid fa-repeat"></i> ') + '循环播放';
            }
        });
    });
    menu.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            const player = document.getElementById('example-video-player');
            if (action === 'loop' && player) {
                player.loop = !player.loop;
                if (typeof showToast === 'function') showToast(player.loop ? '已开启循环' : '已关闭循环', 'success');
            } else if (action === 'copy' && player) {
                const url = player.src || (currentVideoId ? location.origin + '/api/v1/player/stream/' + currentVideoId : '');
                if (url) navigator.clipboard.writeText(url).then(() => {
                    if (typeof showToast === 'function') showToast('已复制视频地址', 'success');
                }).catch(() => {});
            } else if (action === 'stats') {
                showPlayerStatsPanel();
            } else if (action === 'color' && typeof showToast === 'function') {
                showToast('视频色彩调整功能敬请期待', 'info');
            } else if (action === 'sound' && typeof showToast === 'function') {
                showToast('可在控制栏调节音量', 'info');
            } else if (action === 'shortcuts' && typeof showToast === 'function') {
                showToast('空格 播放/暂停 · 左右键 进退 5 秒 · 上下键 音量', 'info');
            } else if (action === 'changelog' && typeof showToast === 'function') {
                showToast('更新历史请见站点文档', 'info');
            }
            menu.classList.remove('show');
        });
    });
    document.addEventListener('click', () => menu.classList.remove('show'));
}

function hidePlayerContextMenu() {
    const menu = document.getElementById('player-context-menu');
    if (menu) menu.classList.remove('show');
}

function showPlayerStatsPanel() {
    const panel = document.getElementById('player-stats-panel');
    const body = document.getElementById('player-stats-body');
    const player = document.getElementById('example-video-player');
    if (!panel || !body) return;
    const w = player ? player.videoWidth : 0;
    const h = player ? player.videoHeight : 0;
    const viewport = window.innerWidth + ' x ' + window.innerHeight;
    const lines = [
        'Player Logic: WisComPer Custom Player v1',
        'Video ID: ' + (currentVideoId || '-'),
        'Resolution: ' + (w && h ? w + ' x ' + h : '-'),
        'Codecs: avc1 (MP4)',
        'Viewport: ' + viewport,
        'Dropped Frames: N/A',
        'Network: N/A'
    ];
    body.textContent = lines.join('\n');
    panel.classList.add('show');
}

function hidePlayerStatsPanel() {
    const panel = document.getElementById('player-stats-panel');
    if (panel) panel.classList.remove('show');
}

function bindPlayerStatsPanel() {
    const closeBtn = document.getElementById('player-stats-close');
    const panel = document.getElementById('player-stats-panel');
    if (closeBtn && panel) closeBtn.addEventListener('click', () => hidePlayerStatsPanel());
}

const HIGH_ENERGY_SAMPLES = 100;
const HIGH_ENERGY_PEAK_THRESHOLD = 70;

let currentHighEnergyData = [];
let watchedSegments = [];

function getHighEnergyData(duration) {
    if (currentHighEnergyData.length > 0) return currentHighEnergyData;
    const len = Math.max(10, Math.min(HIGH_ENERGY_SAMPLES, Math.floor((duration || 60) / 2)));
    const arr = [];
    for (let i = 0; i < len; i++) {
        arr.push(Math.floor(Math.random() * 40) + (i % 5 === 0 ? 50 : 0));
    }
    currentHighEnergyData = arr;
    return arr;
}

function mergeWatchedSegment(start, end) {
    const seg = [start, end];
    const out = [];
    for (const s of watchedSegments) {
        if (s[1] < seg[0] || s[0] > seg[1]) out.push(s);
        else seg[0] = Math.min(seg[0], s[0]); seg[1] = Math.max(seg[1], s[1]);
    }
    out.push(seg);
    out.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const s of out) {
        if (merged.length && merged[merged.length - 1][1] >= s[0] - 0.5)
            merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], s[1]);
        else merged.push([...s]);
    }
    watchedSegments = merged;
}

/** 复习推荐：显示「从 x:xx 继续观看」并绑定继续按钮 */
function updateResumeRecommendUI() {
    const block = document.getElementById('video-resume-recommend');
    const textEl = document.getElementById('video-resume-text');
    const btn = document.getElementById('video-resume-btn');
    const player = document.getElementById('example-video-player');
    if (!block || !textEl || !btn) return;
    if (currentVideoResumeTime > 0 && player && player.duration && currentVideoResumeTime < player.duration - 2) {
        block.style.display = 'flex';
        textEl.textContent = '上次观看到 ' + formatDuration(Math.floor(currentVideoResumeTime)) + '，';
        btn.onclick = () => {
            if (player && Number.isFinite(currentVideoResumeTime)) {
                player.currentTime = currentVideoResumeTime;
                safePlay(player);
            }
        };
    } else {
        block.style.display = 'none';
    }
}

/** 更新「已观看约 xx%」摘要文案 */
function updateVideoProgressSummary() {
    const el = document.getElementById('video-progress-summary');
    const player = document.getElementById('example-video-player');
    if (!el || !player || !Number.isFinite(player.duration) || player.duration <= 0) {
        if (el) el.textContent = '';
        return;
    }
    const dur = player.duration;
    let watched = 0;
    for (const [s, e] of watchedSegments) {
        watched += Math.max(0, e - s);
    }
    const pct = Math.max(0, Math.min(100, (watched / dur) * 100));
    el.textContent = `已观看约 ${pct.toFixed(0)}%`;
}

/** 将当前时间点加入错题本（登录走数据库，未登录走 localStorage） */
async function addCurrentTimeToWrongbook() {
    if (!currentVideoId) return;
    const player = document.getElementById('example-video-player');
    const titleEl = document.getElementById('video-modal-title');
    const noteInput = document.getElementById('video-note-input');
    const time = player && Number.isFinite(player.currentTime) ? Math.max(0, Math.floor(player.currentTime)) : 0;
    const title = (titleEl && titleEl.innerText) ? titleEl.innerText.trim() : '';
    const content = (noteInput && noteInput.value) ? noteInput.value.trim() : '';
    const user = getWrongbookUsername();
    if (user) {
        try {
            const res = await fetch('/api/wrongbook/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, video_id: currentVideoId, title, time_sec: time, note: content }),
                credentials: 'include',
            });
            const d = await res.json();
            if (d.status === 'success') {
                if (d.duplicate && typeof showToast === 'function') showToast('该时间点已在错题本中', 'info');
                else if (typeof showToast === 'function') showToast('已加入错题本', 'success');
            } else if (typeof showToast === 'function') showToast(d.message || '添加失败', 'error');
        } catch (_) {
            if (typeof showToast === 'function') showToast('网络错误', 'error');
        }
        return;
    }
    const list = getWrongbookListFromStorage();
    const key = `${currentVideoId}-${time}-${content || ''}`;
    if (list.some(item => item.key === key)) {
        if (typeof showToast === 'function') showToast('该时间点已在错题本中', 'info');
        return;
    }
    list.push({ key, video_id: currentVideoId, title, time_sec: time, note: content, created_at: Date.now() });
    setWrongbookListToStorage(list);
    if (typeof showToast === 'function') showToast('已加入本地错题本', 'success');
}

/** 创作者：导出发布包（标题+弹幕+字幕模板 JSON，供 B 站等平台使用） */
function exportPublishPack() {
    if (!currentVideoId) return;
    const titleEl = document.getElementById('video-modal-title');
    const descEl = document.getElementById('video-modal-desc');
    const title = (titleEl && titleEl.innerText) ? titleEl.innerText.trim() : '';
    const description = (descEl && descEl.innerText) ? descEl.innerText.trim() : '';
    fetch('/api/v1/danmaku/list?video_id=' + encodeURIComponent(currentVideoId), { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            const list = (data.code === 0 && Array.isArray(data.data)) ? data.data : [];
            const danmaku = list.map(d => {
                const [time, mode, color, author, text] = Array.isArray(d) ? d : [d.time, 1, 16777215, d.username, d.text];
                return { time: Number(time), mode: mode || 1, color: color || 16777215, author: author || '', text: text || '' };
            });
            const pack = {
                title,
                description,
                video_id: currentVideoId,
                export_time: new Date().toISOString(),
                danmaku,
                subtitle_template: []
            };
            const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'publish_' + (currentVideoId || 'video') + '_' + Date.now() + '.json';
            a.click();
            URL.revokeObjectURL(a.href);
            if (typeof showToast === 'function') showToast('发布包已下载', 'success');
        })
        .catch(() => { if (typeof showToast === 'function') showToast('获取弹幕失败', 'error'); });
}

/** 教师：导出 HTML 课件（内嵌当前视频播放器，方便直接插入 PPT 或单独展示） */
function exportHtmlCourseware() {
    if (!currentVideoId) return;
    const videoEl = document.getElementById('example-video-player');
    const titleEl = document.getElementById('video-modal-title');
    const descEl = document.getElementById('video-modal-desc');
    const title = (titleEl && titleEl.innerText) ? titleEl.innerText.trim() : '数学可视化课件';
    const description = (descEl && descEl.innerText) ? descEl.innerText.trim() : '';
    const src = videoEl && videoEl.currentSrc ? videoEl.currentSrc : (videoEl && videoEl.src ? videoEl.src : '');
    if (!src) {
        if (typeof showToast === 'function') showToast('当前视频地址不可用，无法导出课件', 'error');
        return;
    }

    // 简单的独立 HTML 页面：内嵌响应式视频播放器与标题说明，可直接在浏览器打开或插入到 PPT 的 Web 控件中
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeDesc = description.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; padding:1.5rem; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#020617; color:#e5e7eb; }
    .wrap { max-width:960px; margin:0 auto; }
    h1 { font-size:1.6rem; margin-bottom:0.75rem; }
    p.desc { font-size:0.95rem; color:#9ca3af; margin-bottom:1.25rem; }
    .player-frame { position:relative; width:100%; padding-top:56.25%; border-radius:0.75rem; overflow:hidden; box-shadow:0 18px 45px rgba(15,23,42,0.8); background:#020617; }
    .player-frame video { position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; background:#020617; }
    .hint { margin-top:1rem; font-size:0.8rem; color:#9ca3af; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${safeTitle}</h1>
    ${safeDesc ? `<p class="desc">${safeDesc}</p>` : ''}
    <div class="player-frame">
      <video src="${src}" controls playsinline></video>
    </div>
    <p class="hint">提示：可将此 HTML 文件直接拖入浏览器播放，或在 PowerPoint / Keynote 中通过“插入对象/网页”嵌入展示。</p>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'courseware_' + (currentVideoId || 'video') + '_' + Date.now() + '.html';
    a.click();
    URL.revokeObjectURL(a.href);
    if (typeof showToast === 'function') showToast('HTML 课件已下载', 'success');
}

/** 教师：将当前视频加入课件包（自动为用户创建默认课件包） */
async function addCurrentVideoToCoursePack() {
    if (!currentVideoId) return;

    // 登录校验
    try {
        const meRes = await fetch('/api/user/me', { credentials: 'include' });
        const me = await meRes.json();
        if (!me || me.status !== 'success' || !me.username) {
            if (typeof toggleAuthModal === 'function') toggleAuthModal(true);
            else if (typeof showToast === 'function') showToast('请先登录', 'error');
            return;
        }
    } catch (_) {
        if (typeof showToast === 'function') showToast('请先登录', 'error');
        return;
    }

    try {
        const res = await fetch('/api/examples/course-pack/add', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_id: currentVideoId })
        });
        const data = await res.json();
        if (data.status === 'success') {
            if (typeof showToast === 'function') {
                showToast('已加入「我的课件」分组，可在筛选栏选择「我的课件」查看', 'success');
            }
        } else if (data.message && typeof showToast === 'function') {
            showToast(data.message, 'error');
        }
    } catch (_) {
        if (typeof showToast === 'function') showToast('网络错误', 'error');
    }
}

/** 查看当前视频的错题记录 */
async function showWrongbookForCurrentVideo() {
    if (!currentVideoId) return;
    const list = await getWrongbookList(currentVideoId);
    if (!list.length) {
        if (typeof showToast === 'function') showToast('当前视频还没有错题记录', 'info');
        return;
    }
    const sorted = list.slice().sort((a, b) => (a.time_sec || 0) - (b.time_sec || 0));
    const lines = sorted.map(item => {
        const tStr = formatDuration(item.time_sec || 0);
        const note = (item.note || '').slice(0, 60);
        return `[${tStr}] ${note || '(未填写笔记，可在上方补充)'}`;
    });
    const text = lines.join('\n');
    if (typeof showAlert === 'function') {
        showAlert(text, '本视频的错题记录');
    } else {
        alert(text);
    }
}

function bindHighEnergyBar() {
    const player = document.getElementById('example-video-player');
    const barEl = document.getElementById('player-layer-high-energy');
    const pathEl = document.getElementById('high-energy-path');
    const watchedPathEl = document.getElementById('high-energy-watched-path');
    const svgEl = document.getElementById('high-energy-svg');
    const tooltipEl = document.getElementById('high-energy-tooltip');
    if (!barEl || !pathEl || !svgEl) return;
    let lastData = [];
    function draw() {
        const dur = player && player.duration && Number.isFinite(player.duration) ? player.duration : 60;
        const data = getHighEnergyData(dur);
        lastData = data;
        const w = barEl.offsetWidth || 400;
        const h = barEl.offsetHeight || 18;
        const max = Math.max(1, ...data);
        const pts = data.map((v, i) => {
            const x = (i / (data.length - 1 || 1)) * w;
            const y = h - (v / max) * h * 0.88 - 1;
            return [x, y];
        });
        if (pts.length < 2) {
            pathEl.setAttribute('d', '');
        } else {
            const n = pts.length;
            const k = 1 / 6;
            let d = 'M0,' + h + ' L0,' + pts[0][1];
            for (let i = 0; i < n - 1; i++) {
                const [x0, y0] = pts[i];
                const [x1, y1] = pts[i + 1];
                const prev = i > 0 ? pts[i - 1] : [x0, y0];
                const next = i + 2 < n ? pts[i + 2] : [x1, y1];
                const cp1x = x0 + (x1 - prev[0]) * k;
                const cp1y = y0 + (y1 - prev[1]) * k;
                const cp2x = x1 - (next[0] - x0) * k;
                const cp2y = y1 - (next[1] - y0) * k;
                d += ' C' + cp1x + ',' + cp1y + ' ' + cp2x + ',' + cp2y + ' ' + x1 + ',' + y1;
            }
            d += ' L' + w + ',' + h + ' Z';
            pathEl.setAttribute('d', d);
        }
        if (watchedPathEl && dur > 0 && watchedSegments.length > 0) {
            let wd = '';
            for (const [s, e] of watchedSegments) {
                const x0 = (s / dur) * w;
                const x1 = (e / dur) * w;
                wd += 'M' + x0 + ',' + h + ' L' + x0 + ',0 L' + x1 + ',0 L' + x1 + ',' + h + ' Z ';
            }
            watchedPathEl.setAttribute('d', wd);
        } else if (watchedPathEl) watchedPathEl.setAttribute('d', '');
        svgEl.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    }
    barEl.addEventListener('mousemove', (e) => {
        if (!tooltipEl || lastData.length === 0) return;
        const rect = barEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const w = rect.width;
        const idx = Math.floor((x / w) * (lastData.length - 1));
        const idxClamped = Math.max(0, Math.min(idx, lastData.length - 1));
        const value = lastData[idxClamped];
        if (value >= HIGH_ENERGY_PEAK_THRESHOLD) {
            tooltipEl.classList.add('show');
            tooltipEl.style.left = (x / w * 100) + '%';
            tooltipEl.style.transform = 'translateX(-50%)';
        } else {
            tooltipEl.classList.remove('show');
        }
    });
    barEl.addEventListener('mouseleave', () => { if (tooltipEl) tooltipEl.classList.remove('show'); });
    if (player) {
        player.addEventListener('loadedmetadata', draw);
        player.addEventListener('resize', draw);
        player.addEventListener('timeupdate', () => {
            const t = player.currentTime;
            if (Number.isFinite(t) && t >= 0) mergeWatchedSegment(Math.max(0, t - 2), t);
            draw();
            updateVideoProgressSummary();
        });
    }
    const ro = new ResizeObserver(draw);
    ro.observe(barEl);
    draw();
}

function setWatchedSegmentsFromLastProgress(lastPlayTime) {
    if (lastPlayTime > 0) watchedSegments = [[0, lastPlayTime]];
    else watchedSegments = [];
}

function stopHeartbeat() {
    if (heartbeatTimerId) {
        clearInterval(heartbeatTimerId);
        heartbeatTimerId = null;
    }
}

function startHeartbeat() {
    stopHeartbeat();
    if (!currentVideoId) return;
    const player = document.getElementById('example-video-player');
    const send = () => {
        if (!player || !currentVideoId) return;
        fetch('/api/v1/player/heartbeat', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_id: currentVideoId, progress: player.currentTime || 0 })
        }).catch(() => {});
    };
    send();
    heartbeatTimerId = setInterval(send, 30000);
}

export function playExample(videoSrc, title, desc, videoId, options = {}) {
    const player = document.getElementById('example-video-player');
    const titleEl = document.getElementById('video-modal-title');
    const descEl = document.getElementById('video-modal-desc');

    initCustomPlayer();

    if (videoId) currentVideoId = videoId;
    else if (videoSrc) {
        const base = videoSrc.split('/').pop() || '';
        currentVideoId = base.replace(/\.(mp4|m3u8)$/i, '');
    } else currentVideoId = '';
    currentVideoTitle = title || '';

    currentSpriteUrl = options.spriteUrl || '';
    currentSpriteCols = Math.max(1, options.spriteCols || 10);
    currentSpriteRows = Math.max(1, options.spriteRows || 10);
    currentSpriteDuration = options.durationSec != null && Number.isFinite(options.durationSec) ? options.durationSec : 0;
    currentHighEnergyData = Array.isArray(options.highEnergy) ? options.highEnergy : [];

    const initialTime = options.initialTime != null && Number.isFinite(options.initialTime) ? options.initialTime : null;
    const applyConfig = (videoSrcFromConfig, lastPlayTime, fallbackSrc) => {
        const startTime = initialTime != null ? initialTime : (lastPlayTime > 0 && Number.isFinite(lastPlayTime) ? lastPlayTime : 0);
        setWatchedSegmentsFromLastProgress(startTime);
        if (player) {
            setVideoSource(player, videoSrcFromConfig, { hlsUrl: options.hlsUrl });
            const onReady = () => {
                if (startTime > 0) player.currentTime = startTime;
                safePlay(player);
            };
            if (player.readyState >= 2) onReady();
            else player.addEventListener('loadedmetadata', onReady, { once: true });
            if (fallbackSrc) {
                const onError = () => {
                    player.removeEventListener('error', onError);
                    setVideoSource(player, fallbackSrc, { hlsUrl: options.hlsUrl });
                    player.load();
                    safePlay(player);
                };
                player.addEventListener('error', onError, { once: true });
            }
        }
        if (typeof window.syncCustomPlayerUI === 'function') setTimeout(window.syncCustomPlayerUI, 0);
    };

    fetch('/api/v1/player/config/' + encodeURIComponent(currentVideoId), { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            if (data && data.code === 0 && data.data && data.data.video_src) {
                const lastPlay = initialTime != null ? initialTime : (data.data.last_play_time ?? 0);
                if (initialTime == null && lastPlay > 0) currentVideoResumeTime = lastPlay;
                else currentVideoResumeTime = 0;
                applyConfig(data.data.video_src, lastPlay, data.data.fallback_src || null);
            } else {
                currentVideoResumeTime = 0;
                applyConfig(videoSrc, initialTime != null ? initialTime : 0, null);
            }
            updateResumeRecommendUI();
        })
        .catch(() => {
            currentVideoResumeTime = 0;
            applyConfig(videoSrc, initialTime != null ? initialTime : 0, null);
            updateResumeRecommendUI();
        });
    if (titleEl) titleEl.innerText = title;
    if (descEl) descEl.innerText = desc || "暂无简介";

    const commentsList = document.getElementById('video-comments-list');
    if (commentsList) commentsList.innerHTML = '';
    loadComments(currentVideoId);

    const layer = document.getElementById('video-danmaku-layer');
    const canvas = document.getElementById('video-danmaku-canvas');
    if (layer) {
        danmakuVisible = Settings.getDanmakuEnabled ? Settings.getDanmakuEnabled() : true;
        const screenMode = Settings.getDanmakuScreen ? Settings.getDanmakuScreen() : 'full';
        layer.classList.remove('half-screen', 'quarter-screen');
        if (screenMode === 'half') layer.classList.add('half-screen');
        else if (screenMode === 'quarter') layer.classList.add('quarter-screen');
        layer.style.display = danmakuVisible ? '' : 'none';
    }
    if (!danmakuCanvasManager) danmakuCanvasManager = createDanmakuCanvasManager();
    danmakuCanvasManager.init({
        canvas,
        container: layer,
        getTime: () => (player ? player.currentTime : 0),
        getVisible: () => danmakuVisible,
        getList: () => danmakuList,
        shownCountRef: danmakuShownCountRef,
        maskUrl: options.maskUrl || null
    });
    danmakuCanvasManager.start();
    loadDanmaku(currentVideoId, () => danmakuCanvasManager && danmakuCanvasManager.resize());
    connectVideoWs(currentVideoId);

    const toggleBtn = document.getElementById('video-danmaku-toggle-btn');
    if (toggleBtn) {
        toggleBtn.classList.toggle('active', danmakuVisible);
        toggleBtn.onclick = () => {
            danmakuVisible = !danmakuVisible;
            if (layer) layer.style.display = danmakuVisible ? '' : 'none';
            toggleBtn.classList.toggle('active', danmakuVisible);
        };
    }
    const screenBtn = document.getElementById('video-danmaku-screen-btn');
    const screenLabel = document.getElementById('video-danmaku-screen-label');
    const screenIcon = document.getElementById('video-danmaku-screen-icon');
    function updateScreenUI(mode) {
        if (layer) {
            layer.classList.remove('half-screen', 'quarter-screen');
            if (mode === 'half') layer.classList.add('half-screen');
            else if (mode === 'quarter') layer.classList.add('quarter-screen');
        }
        if (screenLabel) screenLabel.textContent = mode === 'quarter' ? '1/4屏' : mode === 'half' ? '半屏' : '全屏';
        if (screenIcon) {
            screenIcon.className = mode === 'quarter' ? 'fa-solid fa-compress' : mode === 'half' ? 'fa-solid fa-rectangle-half' : 'fa-solid fa-expand';
        }
    }
    const screenMode = Settings.getDanmakuScreen ? Settings.getDanmakuScreen() : 'full';
    updateScreenUI(screenMode);
    if (screenBtn) {
        screenBtn.onclick = () => {
            const current = Settings.getDanmakuScreen ? Settings.getDanmakuScreen() : 'full';
            const next = current === 'full' ? 'half' : current === 'half' ? 'quarter' : 'full';
            if (Settings.setDanmakuScreen) Settings.setDanmakuScreen(next);
            updateScreenUI(next);
        };
    }
    const likeBtn = document.getElementById('video-like-btn');
    const likeCountEl = document.getElementById('video-like-count');
    let userHasLiked = false;
    let likeCount = 0;
    function updateLikeUI() {
        if (likeCountEl) likeCountEl.textContent = likeCount;
        if (likeBtn) {
            likeBtn.classList.toggle('liked', userHasLiked);
            likeBtn.querySelector('i').className = userHasLiked ? 'fa-solid fa-thumbs-up' : 'fa-regular fa-thumbs-up';
        }
    }
    fetch('/api/examples/likes?video_id=' + encodeURIComponent(currentVideoId), { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success') {
                likeCount = data.like_count || 0;
                userHasLiked = !!data.user_has_liked;
                updateLikeUI();
            }
        })
        .catch(() => updateLikeUI());
    if (likeBtn) {
        likeBtn.onclick = () => {
            fetch('/api/user/me', { credentials: 'include' })
                .then(r => r.json())
                .then(me => {
                    if (me.status !== 'success' || !me.username) {
                        if (typeof toggleAuthModal === 'function') toggleAuthModal(true);
                        return;
                    }
                    return fetch('/api/examples/like', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ video_id: currentVideoId, action: userHasLiked ? 'unlike' : 'like' })
                    }).then(r => r.json());
                })
                .then(data => {
                    if (!data) return;
                    if (data.status === 'success') {
                        likeCount = data.like_count || 0;
                        userHasLiked = !!data.user_has_liked;
                        updateLikeUI();
                        if (typeof showToast === 'function') showToast(userHasLiked ? '已点赞' : '已取消', 'success');
                    } else if (data.message && typeof showToast === 'function') showToast(data.message, 'error');
                })
                .catch(() => { if (typeof showToast === 'function') showToast('网络错误', 'error'); });
        };
    }

    let userFavorited = false;
    let userWatchLater = false;
    fetch('/api/user/me', { credentials: 'include' })
        .then(r => r.json())
        .then(me => {
            if (me.status === 'success' && me.username) {
                return Promise.all([
                    fetch('/api/examples/favorites', { credentials: 'include' }).then(r => r.json()),
                    fetch('/api/examples/watch-later', { credentials: 'include' }).then(r => r.json())
                ]).then(([favRes, wlRes]) => {
                    const favList = (favRes.status === 'success' && favRes.data) ? favRes.data : [];
                    const wlList = (wlRes.status === 'success' && wlRes.data) ? wlRes.data : [];
                    userFavorited = favList.some(x => x.video_id === currentVideoId);
                    userWatchLater = wlList.some(x => x.video_id === currentVideoId);
                    updateModalFavoriteWatchLaterUI(userFavorited, userWatchLater);
                });
            } else {
                updateModalFavoriteWatchLaterUI(false, false);
            }
        })
        .catch(() => updateModalFavoriteWatchLaterUI(false, false));

    function updateModalFavoriteWatchLaterUI(fav, wl) {
        const favBtn = document.getElementById('video-favorite-btn');
        const wlBtn = document.getElementById('video-watch-later-btn');
        if (favBtn) {
            favBtn.classList.toggle('active', fav);
            const icon = favBtn.querySelector('i');
            if (icon) icon.className = fav ? 'fa-solid fa-star' : 'fa-regular fa-star';
            favBtn.onclick = () => {
                fetch('/api/user/me', { credentials: 'include' }).then(r => r.json()).then(me => {
                    if (me.status !== 'success' || !me.username) { if (typeof toggleAuthModal === 'function') toggleAuthModal(true); return Promise.reject(new Error('未登录')); }
                    const method = fav ? 'DELETE' : 'POST';
                    const url = fav ? '/api/examples/favorites?video_id=' + encodeURIComponent(currentVideoId) : '/api/examples/favorites';
                    return fetch(url, { method, credentials: 'include', headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {}, body: method === 'POST' ? JSON.stringify({ video_id: currentVideoId }) : undefined }).then(r => r.json());
                }).then(data => {
                    if (data && data.status === 'success') {
                        userFavorited = !!data.user_favorited;
                        updateModalFavoriteWatchLaterUI(userFavorited, userWatchLater);
                        if (typeof showToast === 'function') showToast(data.user_favorited ? '已收藏' : '已取消收藏', 'success');
                    } else if (data && data.message && typeof showToast === 'function') {
                        showToast(data.message, 'error');
                    }
                }).catch(() => { if (typeof showToast === 'function') showToast('网络错误或请先登录', 'error'); });
            };
        }
        if (wlBtn) {
            wlBtn.classList.toggle('active', wl);
            const icon = wlBtn.querySelector('i');
            if (icon) icon.className = wl ? 'fa-solid fa-clock' : 'fa-regular fa-clock';
            wlBtn.onclick = () => {
                fetch('/api/user/me', { credentials: 'include' }).then(r => r.json()).then(me => {
                    if (me.status !== 'success' || !me.username) { if (typeof toggleAuthModal === 'function') toggleAuthModal(true); return Promise.reject(new Error('未登录')); }
                    const method = wl ? 'DELETE' : 'POST';
                    const url = wl ? '/api/examples/watch-later?video_id=' + encodeURIComponent(currentVideoId) : '/api/examples/watch-later';
                    return fetch(url, { method, credentials: 'include', headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {}, body: method === 'POST' ? JSON.stringify({ video_id: currentVideoId }) : undefined }).then(r => r.json());
                }).then(data => {
                    if (data && data.status === 'success') {
                        userWatchLater = !!data.user_watch_later;
                        updateModalFavoriteWatchLaterUI(userFavorited, userWatchLater);
                        if (typeof showToast === 'function') showToast(data.user_watch_later ? '已加入稍后看' : '已移除', 'success');
                    } else if (data && data.message && typeof showToast === 'function') {
                        showToast(data.message, 'error');
                    }
                }).catch(() => { if (typeof showToast === 'function') showToast('网络错误或请先登录', 'error'); });
            };
        }
    }

    const shareBtn = document.getElementById('video-share-btn');
    if (shareBtn) {
        shareBtn.onclick = () => {
            const t = player && Number.isFinite(player.currentTime) ? Math.floor(player.currentTime) : 0;
            const url = location.origin + location.pathname + '?section=examples&video=' + encodeURIComponent(currentVideoId) + (t > 0 ? '&t=' + t : '');
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(() => { if (typeof showToast === 'function') showToast('链接已复制（含当前时间点）', 'success'); }).catch(() => { prompt('复制链接：', url); });
            } else { prompt('复制链接：', url); }
        };
    }

    loadVideoNotes(currentVideoId);
    updateVideoProgressSummary();

    // 绑定学习闭环按钮
    const wrongBtn = document.getElementById('video-mark-wrong-btn');
    const openWrongBtn = document.getElementById('video-open-wrongbook-btn');
    if (wrongBtn) {
        wrongBtn.onclick = () => addCurrentTimeToWrongbook();
    }
    if (openWrongBtn) {
        openWrongBtn.onclick = () => showWrongbookForCurrentVideo();
    }

    // 创作者 / 教师：导出发布包 & 加入课件包
    const exportPublishBtn = document.getElementById('video-export-publish-btn');
    if (exportPublishBtn) {
        exportPublishBtn.onclick = () => exportPublishPack();
    }
    const exportHtmlBtn = document.getElementById('video-export-html-btn');
    if (exportHtmlBtn) {
        exportHtmlBtn.onclick = () => exportHtmlCourseware();
    }
    const addCoursePackBtn = document.getElementById('video-add-course-pack-btn');
    if (addCoursePackBtn) {
        addCoursePackBtn.onclick = () => addCurrentVideoToCoursePack();
    }
    bindVideoNotesOnce();

    fetch('/api/user/me', { credentials: 'include' })
        .then(r => r.status === 200 ? r.json() : null)
        .then(data => {
            currentDanmakuUsername = (data && data.status === 'success' && data.username) ? data.username : '';
            updateModalAuthUI(!!currentDanmakuUsername);
        })
        .catch(() => {
            currentDanmakuUsername = '';
            updateModalAuthUI(false);
        });

    toggleModal('video-modal', true);
    const wrapper = document.getElementById('video-player-wrapper');
    if (wrapper) setTimeout(() => wrapper.focus(), 100);

    startHeartbeat();
    bindCommentAndDanmakuOnce();
}

let commentDanmakuBound = false;

function bindCommentAndDanmakuOnce() {
    if (commentDanmakuBound) return;
    commentDanmakuBound = true;

    const commentInput = document.getElementById('video-comment-input');
    const commentSend = document.getElementById('video-comment-send');
    const danmakuInput = document.getElementById('video-danmaku-input');
    const danmakuSend = document.getElementById('video-danmaku-send');

    function sendComment() {
        const content = commentInput && commentInput.value ? commentInput.value.trim() : '';
        if (!content || !currentVideoId) return;
        commentSend.disabled = true;
        fetch('/api/examples/comments', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_id: currentVideoId, content })
        })
            .then(r => r.json())
            .then(data => {
                if (data.status === 'success') {
                    if (commentInput) commentInput.value = '';
                    loadComments(currentVideoId);
                    if (typeof showToast === 'function') showToast('评论已发送', 'success');
                } else {
                    if (typeof showToast === 'function') showToast(data.message || '发送失败', 'error');
                }
            })
            .catch(() => { if (typeof showToast === 'function') showToast('网络错误', 'error'); })
            .finally(() => { if (commentSend) commentSend.disabled = false; });
    }

    function sendDanmaku() {
        const text = danmakuInput && danmakuInput.value ? danmakuInput.value.trim() : '';
        const player = document.getElementById('example-video-player');
        const time = player ? player.currentTime : 0;
        if (!text || !currentVideoId) return;
        danmakuSend.disabled = true;
        fetch('/api/v1/danmaku/send', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_id: currentVideoId, text, time })
        })
            .then(r => r.json())
            .then(data => {
                const ok = data.status === 'success' || (data && data.code === 0);
                const payload = data.data || {};
                if (ok && payload) {
                    if (danmakuInput) danmakuInput.value = '';
                    danmakuList.push({ text: payload.text || '', time: payload.time ?? 0, username: payload.username || currentDanmakuUsername });
                    danmakuList.sort((a, b) => a.time - b.time);
                    if (typeof showToast === 'function') showToast('弹幕已发送', 'success');
                } else {
                    if (typeof showToast === 'function') showToast(data.message || '发送失败', 'error');
                }
            })
            .catch(() => { if (typeof showToast === 'function') showToast('网络错误', 'error'); })
            .finally(() => { if (danmakuSend) danmakuSend.disabled = false; });
    }

    if (commentSend) commentSend.addEventListener('click', sendComment);
    if (commentInput) commentInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendComment(); });
    if (danmakuSend) danmakuSend.addEventListener('click', sendDanmaku);
    if (danmakuInput) danmakuInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendDanmaku(); });
}

/** 根据 video_id 打开视频（用于直达链接）。可选 initialTime 秒。 */
export function playExampleByVideoId(videoId, initialTime) {
    if (!videoId) return;
    fetch('/api/examples', { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            if (data.status !== 'success' || !Array.isArray(data.data)) return;
            const v = data.data.find(x => (x.video_id || x.filename?.replace(/\.mp4$/i, '')) === videoId);
            if (!v) return;
            const opts = {
                spriteUrl: v.sprite_url,
                durationSec: v.duration_sec,
                spriteCols: v.sprite_cols || 10,
                spriteRows: v.sprite_rows || 10,
                hlsUrl: v.hls_url,
                maskUrl: v.mask_url,
                highEnergy: Array.isArray(v.high_energy) ? v.high_energy : undefined,
                initialTime: initialTime != null && Number.isFinite(Number(initialTime)) ? Number(initialTime) : undefined
            };
            playExample(v.url || '', v.title || '', v.description || '', v.video_id || videoId, opts);
        })
        .catch(() => {});
}

export function closeVideoModal() {
    const player = document.getElementById('example-video-player');
    stopHeartbeat();
    closeVideoWs();
    destroyHls();
    if (danmakuCanvasManager) danmakuCanvasManager.stop();
    currentVideoId = '';
    currentSpriteUrl = '';
    if (player) {
        player.pause();
        player.currentTime = 0;
        player.src = '';
    }
    hidePlayerContextMenu();
    hidePlayerStatsPanel();
    toggleModal('video-modal', false);
}
