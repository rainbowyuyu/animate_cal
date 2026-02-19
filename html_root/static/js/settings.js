// static/js/settings.js

import { toggleModal, showToast } from './ui.js';
import * as Profile from './profile.js';

const SETTINGS_STORAGE_KEY = 'app_settings';
let saveToServerTimer = null;
const SAVE_DEBOUNCE_MS = 800;

// 画板快捷键（类 Photoshop），均可自定义
const DEFAULT_SHORTCUTS = {
    undo:            { key: 'z', ctrl: true,  shift: false, alt: false, meta: false },
    redo:            { key: 'z', ctrl: true,  shift: true,  alt: false, meta: false },
    clearCanvas:     { key: 'c', ctrl: true,  shift: true,  alt: false, meta: false },
    toolPen:         { key: 'b', ctrl: false, shift: false, alt: false, meta: false },
    toolEraser:      { key: 'e', ctrl: false, shift: false, alt: false, meta: false },
    brushSizeUp:     { key: ']', ctrl: false, shift: false, alt: false, meta: false },
    brushSizeDown:   { key: '[', ctrl: false, shift: false, alt: false, meta: false },
};
const SHORTCUT_LABELS = {
    undo: '撤销',
    redo: '重做',
    clearCanvas: '清空画布',
    toolPen: '画笔',
    toolEraser: '橡皮擦',
    brushSizeUp: '笔刷加粗',
    brushSizeDown: '笔刷变细',
};
function loadShortcuts() {
    const out = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
    try {
        const saved = JSON.parse(localStorage.getItem('app_shortcuts') || '{}');
        Object.keys(out).forEach(k => { if (saved[k] && typeof saved[k] === 'object') out[k] = saved[k]; });
    } catch (_) {}
    return out;
}
let shortcuts = loadShortcuts();
let recordingAction = null;

const AGENT_ENTER_SEND_KEY = 'agent_enter_send';
const DETECT_DEFAULT_INPUT_KEY = 'detect_default_input';
const CALC_DEFAULT_MODE_KEY = 'calc_default_mode';
const DEVTOOLS_DEFAULT_TAB_KEY = 'devtools_default_tab';
/** 手机版锁定画板：开启后画板区域仅可滑动不可书写 */
export const CANVAS_LOCK_MOBILE_KEY = 'canvas_lock_mobile';

export function getAgentEnterSend() {
    try {
        const v = localStorage.getItem(AGENT_ENTER_SEND_KEY);
        return v === null || v === 'true';
    } catch (_) { return true; }
}

export function setAgentEnterSend(value) {
    try {
        localStorage.setItem(AGENT_ENTER_SEND_KEY, value ? 'true' : 'false');
        persistAfterChange();
    } catch (_) {}
}

export function getDetectDefaultInput() {
    const v = localStorage.getItem(DETECT_DEFAULT_INPUT_KEY);
    return v === 'upload' ? 'upload' : 'draw';
}
export function setDetectDefaultInput(value) {
    localStorage.setItem(DETECT_DEFAULT_INPUT_KEY, value === 'upload' ? 'upload' : 'draw');
    persistAfterChange();
}

export function getCalcDefaultMode() {
    const v = localStorage.getItem(CALC_DEFAULT_MODE_KEY);
    return v || 'normal';
}
export function setCalcDefaultMode(value) {
    const allowed = ['normal', 'formular', 'visualization'];
    localStorage.setItem(CALC_DEFAULT_MODE_KEY, allowed.includes(value) ? value : 'normal');
    persistAfterChange();
}

export function getDevtoolsDefaultTab() {
    const v = localStorage.getItem(DEVTOOLS_DEFAULT_TAB_KEY);
    return v === 'manim' || v === 'rainbow' ? v : 'latex';
}
export function setDevtoolsDefaultTab(value) {
    const allowed = ['latex', 'manim', 'rainbow'];
    localStorage.setItem(DEVTOOLS_DEFAULT_TAB_KEY, allowed.includes(value) ? value : 'latex');
    persistAfterChange();
}

export function getCanvasLockMobile() {
    try {
        return localStorage.getItem(CANVAS_LOCK_MOBILE_KEY) === 'true';
    } catch (_) { return false; }
}
export function setCanvasLockMobile(value) {
    try {
        localStorage.setItem(CANVAS_LOCK_MOBILE_KEY, value ? 'true' : 'false');
        persistAfterChange();
    } catch (_) {}
}

/** 从本地组装完整设置（供保存到云端与恢复用） */
export function getFullSettings() {
    const theme = localStorage.getItem('theme') || 'light';
    const agentEnterSend = getAgentEnterSend();
    const appShortcuts = localStorage.getItem('app_shortcuts');
    let shortcuts = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
    try {
        if (appShortcuts) Object.assign(shortcuts, JSON.parse(appShortcuts));
    } catch (_) {}
    const payload = {
        theme,
        agent_enter_send: agentEnterSend,
        shortcuts,
        detect_default_input: getDetectDefaultInput(),
        calc_default_mode: getCalcDefaultMode(),
        devtools_default_tab: getDevtoolsDefaultTab(),
        canvas_lock_mobile: getCanvasLockMobile()
    };
    try {
        const extra = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
        Object.assign(payload, extra);
    } catch (_) {}
    return payload;
}

/** 应用一批设置到页面并写入本地（登录后加载云端用） */
export function applySettings(obj) {
    if (!obj || typeof obj !== 'object') return;
    try {
        if (obj.theme === 'dark' || obj.theme === 'light') {
            localStorage.setItem('theme', obj.theme);
            document.documentElement.setAttribute('data-theme', obj.theme);
            const icon = document.getElementById('theme-toggle-icon');
            if (icon) icon.className = obj.theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
            window.dispatchEvent(new CustomEvent('theme-change', { detail: obj.theme }));
        }
        if (typeof obj.agent_enter_send === 'boolean') {
            localStorage.setItem(AGENT_ENTER_SEND_KEY, obj.agent_enter_send ? 'true' : 'false');
            const cb = document.getElementById('agent-enter-send');
            if (cb) cb.checked = obj.agent_enter_send;
        }
        if (obj.shortcuts && typeof obj.shortcuts === 'object') {
            Object.keys(DEFAULT_SHORTCUTS).forEach(k => {
                if (obj.shortcuts[k] && typeof obj.shortcuts[k] === 'object') shortcuts[k] = obj.shortcuts[k];
            });
            localStorage.setItem('app_shortcuts', JSON.stringify(shortcuts));
            updateShortcutDisplay();
        }
        if (obj.detect_default_input === 'draw' || obj.detect_default_input === 'upload') {
            localStorage.setItem(DETECT_DEFAULT_INPUT_KEY, obj.detect_default_input);
            const sel = document.getElementById('settings-detect-default-input');
            if (sel) sel.value = obj.detect_default_input;
        }
        if (['normal', 'formular', 'visualization'].includes(obj.calc_default_mode)) {
            localStorage.setItem(CALC_DEFAULT_MODE_KEY, obj.calc_default_mode);
            const sel = document.getElementById('settings-calc-default-mode');
            if (sel) sel.value = obj.calc_default_mode;
        }
        if (['latex', 'manim', 'rainbow'].includes(obj.devtools_default_tab)) {
            localStorage.setItem(DEVTOOLS_DEFAULT_TAB_KEY, obj.devtools_default_tab);
            const sel = document.getElementById('settings-devtools-default-tab');
            if (sel) sel.value = obj.devtools_default_tab;
        }
        if (typeof obj.canvas_lock_mobile === 'boolean') {
            localStorage.setItem(CANVAS_LOCK_MOBILE_KEY, obj.canvas_lock_mobile ? 'true' : 'false');
            const cb = document.getElementById('settings-canvas-lock-mobile');
            if (cb) cb.checked = obj.canvas_lock_mobile;
        }
        const { theme, agent_enter_send, shortcuts: _, detect_default_input, calc_default_mode, devtools_default_tab, canvas_lock_mobile, ...rest } = obj;
        if (Object.keys(rest).length > 0) {
            const extra = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
            Object.assign(extra, rest);
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(extra));
        }
    } catch (e) {
        console.warn('applySettings', e);
    }
}

/** 延迟上报到云端（已登录时） */
export function persistAfterChange() {
    if (saveToServerTimer) clearTimeout(saveToServerTimer);
    saveToServerTimer = setTimeout(saveSettingsToServer, SAVE_DEBOUNCE_MS);
}

/** 仅内部/防抖用：上报到云端，返回是否成功 */
async function saveSettingsToServer() {
    try {
        const me = await fetch('/api/user/me').then(r => r.json());
        if (me.status !== 'success' || !me.username) return false;
        const settings = getFullSettings();
        const res = await fetch('/api/user/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings }),
            credentials: 'include'
        });
        const data = await res.json();
        return data.status === 'success';
    } catch (_) {
        return false;
    }
}

/** 用户点击「保存」：未登录则引导登录，已登录则立即同步到账号 */
export async function saveSettingsToAccount() {
    try {
        const me = await fetch('/api/user/me').then(r => r.json());
        if (me.status !== 'success' || !me.username) {
            if (typeof showToast === 'function') showToast('请登录后再保存到账号', 'info');
            if (typeof window.toggleAuthModal === 'function') window.toggleAuthModal(true);
            return;
        }
        const ok = await saveSettingsToServer();
        if (typeof showToast === 'function') {
            showToast(ok ? '已保存到账号' : '保存失败，请重试', ok ? 'success' : 'error');
        }
    } catch (_) {
        if (typeof showToast === 'function') showToast('网络错误', 'error');
    }
}

/** 登录后调用：拉取云端设置并应用到页面与本地 */
export async function loadUserSettings() {
    try {
        const res = await fetch('/api/user/settings', { credentials: 'include' });
        const data = await res.json();
        if (data.status === 'success' && data.settings && typeof data.settings === 'object') {
            applySettings(data.settings);
            updateShortcutDisplay();
            syncAgentEnterSendCheckbox();
        }
    } catch (e) {
        console.warn('loadUserSettings', e);
    }
}

function syncDetectDefaultInput() {
    const sel = document.getElementById('settings-detect-default-input');
    if (sel) sel.value = getDetectDefaultInput();
}
function syncCalcDefaultMode() {
    const sel = document.getElementById('settings-calc-default-mode');
    if (sel) sel.value = getCalcDefaultMode();
}
function syncDevtoolsDefaultTab() {
    const sel = document.getElementById('settings-devtools-default-tab');
    if (sel) sel.value = getDevtoolsDefaultTab();
}
function syncCanvasLockMobileCheckbox() {
    const cb = document.getElementById('settings-canvas-lock-mobile');
    if (cb) cb.checked = getCanvasLockMobile();
}

const SETTINGS_SECTION_IDS = ['settings-appearance', 'settings-profile', 'settings-agent', 'settings-detect', 'settings-shortcuts', 'settings-calc', 'settings-devtools'];

function initSettingsNav() {
    const container = document.getElementById('settings-scroll-container');
    const nav = document.getElementById('settings-nav');
    if (!container || !nav) return;

    nav.querySelectorAll('.settings-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-section');
            const el = document.getElementById(id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setSettingsNavActive(id);
            }
        });
    });

    let ticking = false;
    container.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const sections = SETTINGS_SECTION_IDS.map(id => document.getElementById(id)).filter(Boolean);
            const top = container.scrollTop;
            const viewMid = top + container.clientHeight / 3;
            let activeId = SETTINGS_SECTION_IDS[0];
            for (const el of sections) {
                if (el.offsetTop <= viewMid) activeId = el.id;
            }
            setSettingsNavActive(activeId);
            ticking = false;
        });
    });
}

function setSettingsNavActive(sectionId) {
    const nav = document.getElementById('settings-nav');
    if (!nav) return;
    nav.querySelectorAll('.settings-nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
    });
}

function updateSettingsFooterHint() {
    const hint = document.getElementById('settings-footer-hint');
    const welcome = document.getElementById('settings-welcome');
    if (!hint) return;
    fetch('/api/user/me', { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success' && data.username) {
                hint.textContent = '设置已自动保存并同步到账号';
                if (welcome) {
                    welcome.textContent = '欢迎，' + data.username;
                    welcome.style.display = '';
                }
            } else {
                hint.textContent = '当前仅本地生效，登录后可保存到账号';
                if (welcome) welcome.style.display = 'none';
            }
        })
        .catch(() => {
            hint.textContent = '当前仅本地生效，登录后可保存到账号';
            if (welcome) welcome.style.display = 'none';
        });
}

export function initSettings() {
    renderShortcutsList();
    updateShortcutDisplay();
    syncAgentEnterSendCheckbox();
    syncDetectDefaultInput();
    syncCalcDefaultMode();
    syncDevtoolsDefaultTab();
    syncCanvasLockMobileCheckbox();
    loadVersionFromUpdate();
    initSettingsNav();
    window.addEventListener('settings-changed', persistAfterChange);
}

export function onOpenSettings() {
    updateSettingsFooterHint();
    if (typeof Profile.loadProfile === 'function') Profile.loadProfile();
}

function syncAgentEnterSendCheckbox() {
    const cb = document.getElementById('agent-enter-send');
    if (cb) cb.checked = getAgentEnterSend();
}

function renderShortcutsList() {
    const list = document.getElementById('shortcuts-list');
    if (!list || list.dataset.rendered) return;
    list.dataset.rendered = '1';
    Object.keys(SHORTCUT_LABELS).forEach(action => {
        const row = document.createElement('div');
        row.className = 'shortcut-row';
        row.style.cssText = 'display: flex; align-items: center; margin-bottom: 1rem; gap: 10px;';
        const label = document.createElement('label');
        label.textContent = SHORTCUT_LABELS[action];
        label.style.cssText = 'width: 100px; font-weight: 600; color: var(--text-main); flex-shrink: 0;';
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `shortcut-${action}-display`;
        input.setAttribute('readonly', '');
        input.className = 'tech-input';
        input.style.cssText = 'margin:0; text-align: center; flex: 1; max-width: 200px;';
        const btn = document.createElement('button');
        btn.className = 'action-btn secondary';
        btn.style.padding = '0.5rem 1rem';
        btn.textContent = '修改';
        btn.id = `btn-record-${action}`;
        btn.onclick = () => startRecording(action);
        row.appendChild(label);
        row.appendChild(input);
        row.appendChild(btn);
        list.appendChild(row);
    });
}

// ... (getShortcuts, openSettings, startRecording, handleRecordKey, formatShortcut, updateShortcutDisplay, resetDefaults 保持不变) ...
export function getShortcuts() { return shortcuts; }
export function openSettings(anchor) {
    updateShortcutDisplay();
    syncAgentEnterSendCheckbox();
    syncDetectDefaultInput();
    syncCalcDefaultMode();
    syncDevtoolsDefaultTab();
    onOpenSettings();
    toggleModal('settings-modal', true);
    const scrollMap = { shortcuts: 'settings-shortcuts', agent: 'settings-agent', detect: 'settings-detect', calc: 'settings-calc', devtools: 'settings-devtools', profile: 'settings-profile' };
    if (scrollMap[anchor]) {
        requestAnimationFrame(() => {
            const sectionId = scrollMap[anchor];
            const el = document.getElementById(sectionId);
            if (el) {
                el.scrollIntoView({ block: 'start', behavior: 'smooth' });
                setSettingsNavActive(sectionId);
            }
        });
    }
}
export function startRecording(action) {
    recordingAction = action;
    const btn = document.getElementById(`btn-record-${action}`);
    if (btn) { btn.innerText = '按下键盘...'; btn.classList.add('recording'); }
    document.addEventListener('keydown', handleRecordKey, { once: true, capture: true });
}
function handleRecordKey(e) {
    e.preventDefault();
    e.stopPropagation();
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        document.addEventListener('keydown', handleRecordKey, { once: true, capture: true });
        return;
    }
    const newConfig = { key: e.key.toLowerCase(), ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, meta: e.metaKey };
    if (recordingAction) {
        const doneAction = recordingAction;
        shortcuts[doneAction] = newConfig;
        localStorage.setItem('app_shortcuts', JSON.stringify(shortcuts));
        updateShortcutDisplay();
        persistAfterChange();
        const btn = document.getElementById(`btn-record-${doneAction}`);
        if (btn) { btn.classList.remove('recording'); btn.innerText = '修改'; }
        recordingAction = null;
    }
}
function formatShortcut(config) {
    const parts = [];
    if (config.ctrl) parts.push('Ctrl');
    if (config.meta) parts.push('Cmd');
    if (config.alt) parts.push('Alt');
    if (config.shift) parts.push('Shift');
    parts.push(config.key.toUpperCase());
    return parts.join(' + ');
}
function updateShortcutDisplay() {
    Object.keys(DEFAULT_SHORTCUTS).forEach(action => {
        const el = document.getElementById(`shortcut-${action}-display`);
        const cfg = shortcuts[action] || DEFAULT_SHORTCUTS[action];
        if (el && cfg) el.value = formatShortcut(cfg);
    });
    updatePageShortcutHints();
}

/** 更新页面中带 data-shortcut 的按钮的 title（小括号内显示当前快捷键） */
function updatePageShortcutHints() {
    document.querySelectorAll('[data-shortcut]').forEach(el => {
        const action = el.getAttribute('data-shortcut');
        const label = SHORTCUT_LABELS[action];
        const cfg = shortcuts[action] || DEFAULT_SHORTCUTS[action];
        if (label && cfg) {
            el.setAttribute('title', label + ' (' + formatShortcut(cfg) + ')');
        }
    });
}
export function resetDefaults() {
    shortcuts = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
    localStorage.setItem('app_shortcuts', JSON.stringify(shortcuts));
    setAgentEnterSend(true);
    localStorage.setItem(DETECT_DEFAULT_INPUT_KEY, 'draw');
    localStorage.setItem(CALC_DEFAULT_MODE_KEY, 'normal');
    localStorage.setItem(DEVTOOLS_DEFAULT_TAB_KEY, 'latex');
    setCanvasLockMobile(false);
    updateShortcutDisplay();
    syncAgentEnterSendCheckbox();
    syncDetectDefaultInput();
    syncCalcDefaultMode();
    syncDevtoolsDefaultTab();
    syncCanvasLockMobileCheckbox();
    persistAfterChange();
}
export function getShortcutLabels() {
    return SHORTCUT_LABELS;
}

// --- 修复版：加载版本号 ---
async function loadVersionFromUpdate() {
  const displayEl = document.getElementById('version-display');
  if (!displayEl) return;

  try {
    // 1. 请求路径改为当前目录下的 update.md (假设已移动到 static 目录)
    // 加上时间戳防止缓存
    const res = await fetch('update.md?t=' + new Date().getTime());

    if (!res.ok) {
        console.warn('update.md not found in static folder.');
        displayEl.textContent = "Unknown";
        return;
    }

    const text = await res.text();

    // 2. 增强正则匹配
    // 匹配 v 0.1.0 或 v0.1.0，忽略大小写，允许v和数字间有空格
    const regex = /v\s*([\d.]+\.[\d]+)/gi;

    // 找到所有匹配项
    const matches = [...text.matchAll(regex)];

    if (matches.length > 0) {
        // 通常最后一个匹配的是最新版本（假设 update.md 是追加写入的）
        // 如果 update.md 是倒序（最新在最上），则取 matches[0]
        // 这里假设 update.md 是追加模式，取最后一个
        const latestVersion = 'v' + matches[matches.length - 1][1];
        displayEl.textContent = latestVersion;
    } else {
        displayEl.textContent = "v0.0.0";
    }

  } catch (err) {
    console.error('Version load failed:', err);
    displayEl.textContent = "Error";
  }
}