// static/js/examples.js — 教学案例：B 站风预览、点赞、评论与弹幕（登录后可发）
import { toggleModal } from './ui.js';
import * as Settings from './settings.js';

export async function loadExamples() {
    const grid = document.getElementById('examples-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="video-grid-loading"><i class="fa-solid fa-spinner"></i>加载案例中...</div>';

    try {
        const res = await fetch('/api/examples', { credentials: 'include' });
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (_) {
            data = { status: 'error', message: res.ok ? '响应格式错误' : (text && text.length < 200 ? text : '服务异常(500)，请查看控制台或访问 /api/examples/health 排查') };
        }
        if (data.status === 'success') {
            renderExampleCards(data.data);
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
        grid.innerHTML = '<div class="video-grid-empty"><i class="fa-solid fa-film"></i>暂无视频案例</div>';
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
        return [
            '<div class="video-card" data-video-url="' + urlAttr + '" data-video-id="' + videoId + '" data-video-title="' + titleAttr + '" data-video-desc="' + descAttr + '" data-video-sprite="' + spriteAttr + '" data-video-duration="' + durationSec + '" data-video-sprite-cols="' + spriteCols + '" data-video-sprite-rows="' + spriteRows + '" data-video-hls="' + hlsAttr + '" data-video-mask="' + maskAttr + '" data-video-high-energy="' + highEnergyAttr + '">',
            '  <div class="thumbnail video-preview-container">',
            '    <video src="' + url + '#t=0.5" muted loop playsinline preload="metadata" onmouseover="this.play()" onmouseout="this.pause(); this.currentTime=0.5;" style="width:100%; height:100%; object-fit:cover;"></video>',
            '    <div class="play-overlay"><i class="fa-solid fa-play-circle"></i></div>',
            durationBadge,
            '    <div class="video-card-meta"><span><i class="fa-regular fa-thumbs-up"></i> ' + likeCount + '</span></div>',
            '  </div>',
            '  <div class="info"><h4>' + title + '</h4><p>' + description + '</p></div>',
            '</div>'
        ].join('');
    }).join('');

    if (!grid.dataset.delegateBound) {
        grid.dataset.delegateBound = '1';
        grid.addEventListener('click', (e) => {
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
}

let currentVideoId = '';
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
    if (commentForm) commentForm.style.display = loggedIn ? 'flex' : 'none';
    if (commentHint) commentHint.style.display = loggedIn ? 'none' : 'block';
    if (danmakuWrap) danmakuWrap.style.display = loggedIn ? 'flex' : 'none';
    if (danmakuHint) danmakuHint.style.display = loggedIn ? 'none' : 'block';
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
            if (player.paused) player.play(); else player.pause();
        });
        player.addEventListener('play', syncPlayPauseUI);
        player.addEventListener('pause', syncPlayPauseUI);
        player.addEventListener('timeupdate', syncTimeUI);
        player.addEventListener('progress', syncBufferUI);
        player.addEventListener('loadedmetadata', () => { syncTimeUI(); syncBufferUI(); });
    }

    if (centerPlay) centerPlay.addEventListener('click', (e) => { e.stopPropagation(); if (player) player.play(); });

    if (playBtn) playBtn.addEventListener('click', (e) => { e.stopPropagation(); if (player) (player.paused ? player.play() : player.pause()); });

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
                    if (player) (player.paused ? player.play() : player.pause());
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

    currentSpriteUrl = options.spriteUrl || '';
    currentSpriteCols = Math.max(1, options.spriteCols || 10);
    currentSpriteRows = Math.max(1, options.spriteRows || 10);
    currentSpriteDuration = options.durationSec != null && Number.isFinite(options.durationSec) ? options.durationSec : 0;
    currentHighEnergyData = Array.isArray(options.highEnergy) ? options.highEnergy : [];

    const applyConfig = (videoSrcFromConfig, lastPlayTime, fallbackSrc) => {
        setWatchedSegmentsFromLastProgress(lastPlayTime);
        if (player) {
            setVideoSource(player, videoSrcFromConfig, { hlsUrl: options.hlsUrl });
            const onReady = () => {
                if (lastPlayTime > 0 && Number.isFinite(lastPlayTime)) {
                    player.currentTime = lastPlayTime;
                }
                player.play().catch(() => {});
            };
            if (player.readyState >= 2) onReady();
            else player.addEventListener('loadedmetadata', onReady, { once: true });
            if (fallbackSrc) {
                const onError = () => {
                    player.removeEventListener('error', onError);
                    setVideoSource(player, fallbackSrc, { hlsUrl: options.hlsUrl });
                    player.load();
                    player.play().catch(() => {});
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
                applyConfig(data.data.video_src, data.data.last_play_time ?? 0, data.data.fallback_src || null);
            } else {
                applyConfig(videoSrc, 0, null);
            }
        })
        .catch(() => {
            applyConfig(videoSrc, 0, null);
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
