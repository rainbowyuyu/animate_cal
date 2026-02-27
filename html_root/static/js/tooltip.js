/**
 * 智算视界 - 独有浮动提示与面板
 * 替代浏览器原生 title 提示，展示与网站强关联的浮动文字与面板
 */
import * as Settings from './settings.js';

const TOOLTIP_ID = 'app-floating-tooltip';
const SHOW_DELAY = 320;
const HIDE_DELAY = 60;

// 用于 data-shortcut 的快捷键展示
const SHORTCUT_LABELS = {
  undo: '撤销',
  redo: '重做',
  clearCanvas: '清空画布',
  toolPen: '画笔',
  toolEraser: '橡皮擦',
  brushSizeUp: '笔刷加粗',
  brushSizeDown: '笔刷变细',
};

function formatShortcut(config) {
  if (!config || typeof config !== 'object') return '';
  const parts = [];
  if (config.ctrl) parts.push('Ctrl');
  if (config.meta) parts.push('Cmd');
  if (config.alt) parts.push('Alt');
  if (config.shift) parts.push('Shift');
  parts.push((config.key || '').toUpperCase());
  return parts.join(' + ');
}

function getTooltipContent(el) {
  const dataTooltip = el.getAttribute('data-tooltip');
  if (dataTooltip) return { text: dataTooltip, panel: el.hasAttribute('data-tooltip-panel') };
  const title = el.getAttribute('title');
  if (title) return { text: title, panel: el.hasAttribute('data-tooltip-panel') };
  const shortcut = el.getAttribute('data-shortcut');
  if (shortcut && window.Settings) {
    const s = Settings.getShortcuts();
    const cfg = s[shortcut];
    const label = SHORTCUT_LABELS[shortcut];
    if (label) {
      const shortcutStr = cfg ? formatShortcut(cfg) : '';
      const text = shortcutStr ? `${label} (${shortcutStr})` : label;
      return { text, panel: true };
    }
  }
  return null;
}

function createTooltipElement() {
  const el = document.createElement('div');
  el.id = TOOLTIP_ID;
  el.className = 'app-floating-tooltip';
  el.setAttribute('role', 'tooltip');
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  return el;
}

function positionTooltip(tipEl, anchorRect, isPanel) {
  const rect = tipEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 10;
  let left = anchorRect.left + anchorRect.width / 2 - rect.width / 2;
  let top = anchorRect.top - rect.height - gap;
  if (left < 8) left = 8;
  if (left + rect.width > vw - 8) left = vw - rect.width - 8;
  if (top < 8) top = anchorRect.bottom + gap;
  if (top + rect.height > vh - 8) top = anchorRect.top - rect.height - gap;
  if (top < 8) top = 8;
  tipEl.style.left = left + 'px';
  tipEl.style.top = top + 'px';
}

export function initTooltip() {
  let tip = document.getElementById(TOOLTIP_ID);
  if (!tip) tip = createTooltipElement();

  let showTimer = null;
  let hideTimer = null;
  let currentEl = null;
  let storedTitle = null;

  function hide() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    tip.classList.remove('visible', 'is-panel');
    if (currentEl && storedTitle != null) {
      currentEl.setAttribute('title', storedTitle);
    }
    currentEl = null;
    storedTitle = null;
  }

  function show(el, content) {
    if (!content || !content.text) return;
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
    if (currentEl && currentEl !== el) {
      if (storedTitle != null) currentEl.setAttribute('title', storedTitle);
      currentEl = null;
      storedTitle = null;
    }
    currentEl = el;
    storedTitle = el.hasAttribute('title') ? el.getAttribute('title') : null;
    if (el.hasAttribute('title')) el.removeAttribute('title');
    tip.textContent = content.text;
    tip.classList.toggle('is-panel', !!content.panel);
    tip.classList.add('visible');
    const anchorRect = el.getBoundingClientRect();
    positionTooltip(tip, anchorRect, content.panel);
  }

  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[title], [data-tooltip], [data-shortcut]');
    if (!el || el.closest('.app-context-menu-wrap, .app-context-submenu, [role="menu"]')) return;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    const content = getTooltipContent(el);
    if (!content) return;
    if (showTimer) clearTimeout(showTimer);
    showTimer = setTimeout(() => show(el, content), SHOW_DELAY);
  });

  document.addEventListener('mouseout', (e) => {
    const el = e.target.closest('[title], [data-tooltip], [data-shortcut]');
    if (!el) return;
    const related = e.relatedTarget;
    if (related && el.contains(related)) return;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, related === null ? 0 : HIDE_DELAY);
  });

  document.documentElement.addEventListener('mouseleave', () => { hide(); });
  document.body.addEventListener('mouseleave', () => { hide(); }, true);

  document.addEventListener('mousemove', (e) => {
    if (!currentEl) return;
    if (!document.body.contains(currentEl)) {
      hide();
      return;
    }
    const el = e.target.closest('[title], [data-tooltip], [data-shortcut]');
    if (el === currentEl && tip.classList.contains('visible')) {
      const anchorRect = currentEl.getBoundingClientRect();
      positionTooltip(tip, anchorRect, tip.classList.contains('is-panel'));
    }
  });

  document.addEventListener('contextmenu', () => { hide(); });
  document.addEventListener('click', () => { hide(); }, true);
  window.addEventListener('blur', () => { hide(); });
  document.addEventListener('scroll', () => {
    if (!currentEl) return;
    if (!document.body.contains(currentEl)) {
      hide();
      return;
    }
    if (tip.classList.contains('visible')) {
      const anchorRect = currentEl.getBoundingClientRect();
      positionTooltip(tip, anchorRect, tip.classList.contains('is-panel'));
    }
  }, true);
}
