/**
 * 智算视界 - 独有右键菜单
 * 替代浏览器原生右键，展示与网站强关联的快捷功能，支持多级子菜单与编辑操作
 */
const MENU_ID = 'app-context-menu';
const SUBMENU_ID = 'app-context-submenu';

function showSection(sectionId) {
  if (typeof window.showSection === 'function') window.showSection(sectionId);
}

// 编辑操作（复制/粘贴等）
const EDIT_ITEMS = [
  { icon: 'fa-regular fa-copy', label: '复制', shortcut: 'Ctrl+C', cmd: 'copy' },
  { icon: 'fa-regular fa-scissors', label: '剪切', shortcut: 'Ctrl+X', cmd: 'cut' },
  { icon: 'fa-regular fa-clipboard', label: '粘贴', shortcut: 'Ctrl+V', cmd: 'paste' },
  { icon: 'fa-solid fa-text-width', label: '全选', shortcut: 'Ctrl+A', cmd: 'selectAll' },
];

// 原生类操作（精简：仅保留上一页、下一页、刷新）
const NATIVE_ITEMS = [
  { icon: 'fa-solid fa-arrow-left', label: '上一页', shortcut: 'Alt+←', action: () => (window.appSectionBack && window.appSectionBack()), useSectionHistory: true, canUse: () => (window.appSectionCanBack && window.appSectionCanBack()) },
  { icon: 'fa-solid fa-arrow-right', label: '下一页', shortcut: 'Alt+→', action: () => (window.appSectionForward && window.appSectionForward()), useSectionHistory: true, canUse: () => (window.appSectionCanForward && window.appSectionCanForward()) },
  { icon: 'fa-solid fa-rotate-right', label: '刷新', shortcut: 'Ctrl+R', action: () => window.location.reload() },
];

// 合并为单组「更多」子菜单
const SUBMENU_GROUPS = [
  {
    group: '更多',
    icon: 'fa-solid fa-ellipsis',
    items: [
      { icon: 'fa-solid fa-house', label: '首页', action: () => showSection('home') },
      { icon: 'fa-solid fa-robot', label: '智能体', action: () => showSection('agent') },
      { icon: 'fa-solid fa-camera', label: '智能识别', action: () => showSection('detect') },
      { icon: 'fa-solid fa-book', label: '我的算式', action: () => showSection('my-formulas') },
      { icon: 'fa-solid fa-calculator', label: '动态计算', action: () => showSection('calculate') },
      { icon: 'fa-solid fa-play', label: '教学案例', action: () => showSection('examples') },
      { icon: 'fa-solid fa-code', label: '开发者工具', action: () => { showSection('devtools'); } },
      { icon: 'fa-solid fa-circle-question', label: '使用文档', action: () => showSection('help') },
      { icon: 'fa-solid fa-file-lines', label: '更新日志', action: () => { if (window.openDoc) window.openDoc('update.md', '更新日志'); } },
    ],
  },
];

function escapeHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
function escapeAttr(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isEditableTarget(el) {
  return el && el.closest('input, textarea, [contenteditable="true"]');
}

function runEditCommand(editableEl, cmd) {
  const el = editableEl || (document.activeElement && isEditableTarget(document.activeElement) ? document.activeElement.closest('input, textarea, [contenteditable="true"]') : null);
  try {
    if (cmd === 'copy') {
      document.execCommand('copy', false, null);
      return;
    }
    if (el) {
      el.focus();
      document.execCommand(cmd, false, null);
    }
  } catch (_) {}
}

function findSubmenuAction(group, label) {
  for (const g of SUBMENU_GROUPS) {
    if (g.group !== group) continue;
    const item = g.items.find(i => i.label === label);
    if (item) return item.action;
  }
  return null;
}

function buildRegionItems(target) {
  const items = [];
  const activeSection = document.querySelector('.section.active-section');
  const sectionId = activeSection ? activeSection.id : 'home';
  if (target.closest('#agent, .agent-messages, .agent-chat-container, .agent-chat-wrap')) {
    if (typeof window.Agent?.reExecuteLastMessage === 'function') {
      items.push({ icon: 'fa-solid fa-rotate-right', label: '重新执行', action: () => window.Agent.reExecuteLastMessage() });
    }
  }
  if (target.closest('#detect .canvas-wrapper, #detect #drawing-board, .drawing-board, .canvas-wrapper')) {
    if (typeof window.setTool === 'function') items.push({ icon: 'fa-solid fa-pen', label: '画笔', action: () => window.setTool('pen') });
    if (typeof window.setTool === 'function') items.push({ icon: 'fa-solid fa-eraser', label: '橡皮擦', action: () => window.setTool('eraser') });
    if (typeof window.undo === 'function') items.push({ icon: 'fa-solid fa-rotate-left', label: '撤销', shortcut: 'Ctrl+Z', action: () => window.undo() });
    if (typeof window.redo === 'function') items.push({ icon: 'fa-solid fa-rotate-right', label: '重做', shortcut: 'Ctrl+Shift+Z', action: () => window.redo() });
    if (typeof window.clearCanvas === 'function') items.push({ icon: 'fa-solid fa-trash', label: '清空画布', shortcut: 'Ctrl+Shift+C', action: () => window.clearCanvas(), danger: true });
  }
  const videoWrapper = target.closest('#video-player-wrapper, .video-player-wrapper, .bilibili-player-area');
  const videoPlayer = document.getElementById('example-video-player');
  if (videoWrapper && videoPlayer) {
    items.push({
      icon: videoPlayer.paused ? 'fa-solid fa-play' : 'fa-solid fa-pause',
      label: videoPlayer.paused ? '播放' : '暂停',
      action: () => { if (videoPlayer.paused) videoPlayer.play(); else videoPlayer.pause(); }
    });
    items.push({ icon: 'fa-solid fa-volume-high', label: '音量 +10%', action: () => {
      const slider = document.getElementById('custom-player-volume-slider');
      if (slider && videoPlayer) {
        const v = Math.min(100, (videoPlayer.volume * 100) + 10);
        videoPlayer.volume = v / 100;
        slider.value = v;
      }
    }});
    items.push({ icon: 'fa-solid fa-volume-low', label: '音量 -10%', action: () => {
      const slider = document.getElementById('custom-player-volume-slider');
      if (slider && videoPlayer) {
        const v = Math.max(0, (videoPlayer.volume * 100) - 10);
        videoPlayer.volume = v / 100;
        slider.value = v;
      }
    }});
    items.push({ icon: 'fa-solid fa-expand', label: document.fullscreenElement ? '退出全屏' : '全屏', action: () => {
      if (document.fullscreenElement) document.exitFullscreen(); else videoWrapper.requestFullscreen().catch(() => {});
    }});
  }
  const calcVideoArea = target.closest('#calculate') && target.closest('.calc-stack-window-video, .calc-stack-window-calc, .calc-stack-window-vis, video');
  const vidUnderCursor = target.closest('video');
  const calcPlayer = vidUnderCursor || (calcVideoArea && (document.getElementById('result-video-player') || document.getElementById('result-video-player-calc') || document.getElementById('result-video-player-vis')));
  if (calcVideoArea && calcPlayer) {
    items.push({
      icon: calcPlayer.paused ? 'fa-solid fa-play' : 'fa-solid fa-pause',
      label: calcPlayer.paused ? '播放' : '暂停',
      action: () => { if (calcPlayer.paused) calcPlayer.play(); else calcPlayer.pause(); }
    });
    items.push({ icon: 'fa-solid fa-expand', label: document.fullscreenElement ? '退出全屏' : '全屏', action: () => {
      const wrap = calcPlayer.closest('.calc-window-inner, .calc-stack-window');
      if (document.fullscreenElement) document.exitFullscreen();
      else if (wrap) wrap.requestFullscreen().catch(() => {});
    }});
  }
  if (items.length === 0) {
    if (sectionId === 'home' && typeof window.startTutorial === 'function') {
      items.push({ icon: 'fa-solid fa-graduation-cap', label: '新手指南', action: () => window.startTutorial() });
    }
    if (sectionId === 'my-formulas') {
      items.push({ icon: 'fa-solid fa-plus', label: '新建算式', action: () => showSection('detect') });
    }
    if (sectionId === 'calculate' && typeof window.startAnimation === 'function') {
      items.push({ icon: 'fa-solid fa-play', label: '开始计算', action: () => window.startAnimation() });
      if (typeof window.openFormulaSelector === 'function') {
        items.push({ icon: 'fa-solid fa-book', label: '选择算式', action: () => window.openFormulaSelector() });
      }
    }
    if (sectionId === 'examples' && typeof window.loadExamples === 'function') {
      items.push({ icon: 'fa-solid fa-rotate', label: '刷新列表', action: () => window.loadExamples() });
    }
    if (sectionId === 'devtools') {
      if (typeof window.switchDevTool === 'function') {
        items.push({ icon: 'fa-solid fa-square-root-variable', label: 'LaTeX 编辑器', action: () => window.switchDevTool('latex') });
        items.push({ icon: 'fa-solid fa-code', label: 'Manim 工作台', action: () => window.switchDevTool('manim') });
      }
    }
  }
  return items;
}

function buildMainMenuHTML(showEdit, regionItems = [], canBack = false, canForward = false) {
  const parts = [];
  if (regionItems.length > 0) {
    parts.push('<div class="ctx-menu-group ctx-region-group"><div class="ctx-menu-group-title">当前区域</div>');
    regionItems.forEach(({ icon, label, shortcut, danger }, idx) => {
      const cls = danger ? 'ctx-menu-item ctx-region-item ctx-region-danger' : 'ctx-menu-item ctx-region-item';
      parts.push(`<button type="button" class="${cls}" data-region-idx="${idx}"><i class="${escapeAttr(icon)}"></i><span>${escapeHtml(label)}</span>${shortcut ? `<span class="ctx-shortcut">${escapeHtml(shortcut)}</span>` : ''}</button>`);
    });
    parts.push('</div>');
  }
  if (showEdit) {
    parts.push('<div class="ctx-menu-group ctx-edit-group"><div class="ctx-menu-group-title">编辑</div>');
    EDIT_ITEMS.forEach(({ icon, label, shortcut, cmd }) => {
      parts.push(`<button type="button" class="ctx-menu-item ctx-edit-item" data-cmd="${escapeAttr(cmd)}"><i class="${escapeAttr(icon)}"></i><span>${escapeHtml(label)}</span><span class="ctx-shortcut">${escapeHtml(shortcut || '')}</span></button>`);
    });
    parts.push('</div>');
  }
  parts.push('<div class="ctx-menu-group ctx-native-group"><div class="ctx-menu-group-title">页面</div>');
  NATIVE_ITEMS.forEach(({ icon, label, shortcut, action, useSectionHistory, canUse }, i) => {
    const disabled = useSectionHistory && typeof canUse === 'function' && !canUse();
    const cls = disabled ? 'ctx-menu-item ctx-native-item ctx-item-disabled' : 'ctx-menu-item ctx-native-item';
    parts.push(`<button type="button" class="${cls}" data-native="${i}" ${disabled ? 'disabled tabindex="-1"' : ''}><i class="${escapeAttr(icon)}"></i><span>${escapeHtml(label)}</span><span class="ctx-shortcut">${escapeHtml(shortcut || '')}</span></button>`);
  });
  parts.push('</div>');
  SUBMENU_GROUPS.forEach((g, idx) => {
    parts.push(`<div class="ctx-menu-item ctx-has-sub" data-sub="${idx}" tabindex="0"><i class="${escapeAttr(g.icon)}"></i><span>${escapeHtml(g.group)}</span><i class="fa-solid fa-chevron-right ctx-arrow"></i></div>`);
  });
  parts.push(`<div class="ctx-menu-item ctx-direct" data-action="settings"><i class="fa-solid fa-gear"></i><span>系统设置</span></div>`);
  return parts.join('');
}

function buildSubmenuHTML(groupIdx) {
  const g = SUBMENU_GROUPS[groupIdx];
  if (!g) return '';
  const parts = g.items.map(({ icon, label }) =>
    `<button type="button" class="ctx-menu-item ctx-sub-item" data-group="${escapeAttr(g.group)}" data-label="${escapeAttr(label)}"><i class="${escapeAttr(icon)}"></i><span>${escapeHtml(label)}</span></button>`
  ).join('');
  return `<div class="ctx-submenu-inner">${parts}</div>`;
}

function createMenuElement() {
  const wrap = document.createElement('div');
  wrap.className = 'app-context-menu-wrap';
  wrap.id = MENU_ID;

  const menu = document.createElement('div');
  menu.className = 'app-context-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', '智算视界快捷菜单');

  const submenu = document.createElement('div');
  submenu.id = SUBMENU_ID;
  submenu.className = 'app-context-submenu';

  wrap.appendChild(menu);
  document.body.appendChild(wrap);
  document.body.appendChild(submenu);
  return { wrap, menu, submenu };
}

function positionMenu(el, x, y, preferRight = true) {
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = x;
  let top = y;
  if (left + rect.width > vw - 8) left = vw - rect.width - 8;
  if (left < 8) left = 8;
  if (top + rect.height > vh - 8) top = vh - rect.height - 8;
  if (top < 8) top = 8;
  el.style.left = left + 'px';
  el.style.top = top + 'px';
}

function positionSubmenu(subEl, menuRect, parentItem) {
  const gap = 2;
  subEl.classList.add('visible');
  const subRect = subEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const itemRect = parentItem.getBoundingClientRect();
  let left = menuRect.right + gap;
  let top = itemRect.top;
  if (left + subRect.width > vw - 8) left = menuRect.left - subRect.width - gap;
  if (top + subRect.height > vh - 8) top = vh - subRect.height - 8;
  if (top < 8) top = 8;
  subEl.style.left = left + 'px';
  subEl.style.top = top + 'px';
}

export function initContextMenu() {
  let wrap = document.getElementById(MENU_ID);
  let menu, submenu;
  if (!wrap) {
    const created = createMenuElement();
    wrap = created.wrap;
    menu = created.menu;
    submenu = document.getElementById(SUBMENU_ID);
  } else {
    menu = wrap.querySelector('.app-context-menu');
    submenu = document.getElementById(SUBMENU_ID);
  }

  let lastEditableEl = null;
  let hoverTimer = null;
  let lastRegionItems = [];

  function openMenu(e) {
    const target = e.target;
    if (target.closest('#video-modal')) return;
    e.preventDefault();
    const editable = isEditableTarget(target);
    lastEditableEl = editable ? target.closest('input, textarea, [contenteditable="true"]') : null;
    lastRegionItems = buildRegionItems(target);
    const canBack = typeof window.appSectionCanBack === 'function' && window.appSectionCanBack();
    const canForward = typeof window.appSectionCanForward === 'function' && window.appSectionCanForward();
    menu.innerHTML = buildMainMenuHTML(true, lastRegionItems, canBack, canForward);
    wrap.classList.add('visible');
    submenu.classList.remove('visible');
    submenu.innerHTML = '';
    positionMenu(wrap, e.clientX, e.clientY);
  }

  function closeAll() {
    wrap.classList.remove('visible');
    submenu.classList.remove('visible');
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  }

  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.role-graph-wrap')) return;
    if (e.ctrlKey && e.altKey) return;
    openMenu(e);
  });

  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.ctx-menu-item');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (btn.classList.contains('ctx-region-item') && !btn.disabled) {
      const idx = parseInt(btn.getAttribute('data-region-idx'), 10);
      if (!isNaN(idx) && lastRegionItems[idx] && typeof lastRegionItems[idx].action === 'function') {
        lastRegionItems[idx].action();
      }
    } else if (btn.classList.contains('ctx-edit-item')) {
      const cmd = btn.getAttribute('data-cmd');
      if (cmd) runEditCommand(lastEditableEl, cmd);
    } else if (btn.classList.contains('ctx-native-item') && !btn.classList.contains('ctx-item-disabled')) {
      const i = parseInt(btn.getAttribute('data-native'), 10);
      if (!isNaN(i) && NATIVE_ITEMS[i] && NATIVE_ITEMS[i].action) NATIVE_ITEMS[i].action();
    } else if (btn.classList.contains('ctx-direct')) {
      if (btn.getAttribute('data-action') === 'settings' && window.openSettings) window.openSettings();
    } else if (btn.classList.contains('ctx-sub-item')) {
      const group = btn.getAttribute('data-group');
      const label = btn.getAttribute('data-label');
      const action = findSubmenuAction(group, label);
      if (action) action();
    }
    closeAll();
  });

  wrap.addEventListener('mouseenter', () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  });

  wrap.addEventListener('mouseleave', () => {
    hoverTimer = setTimeout(() => {
      submenu.classList.remove('visible');
      submenu.innerHTML = '';
      hoverTimer = null;
    }, 150);
  });

  menu.addEventListener('mouseover', (e) => {
    const item = e.target.closest('.ctx-has-sub');
    if (!item) {
      submenu.classList.remove('visible');
      return;
    }
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    const idx = parseInt(item.getAttribute('data-sub'), 10);
    if (isNaN(idx)) return;
    submenu.innerHTML = buildSubmenuHTML(idx);
    submenu.classList.add('visible');
    positionSubmenu(submenu, menu.getBoundingClientRect(), item);
  });

  submenu.addEventListener('mouseenter', () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  });

  submenu.addEventListener('click', (e) => {
    const btn = e.target.closest('.ctx-sub-item');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const group = btn.getAttribute('data-group');
    const label = btn.getAttribute('data-label');
    const action = findSubmenuAction(group, label);
    if (action) action();
    closeAll();
  });

  document.addEventListener('click', closeAll);
  document.addEventListener('scroll', closeAll, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });
}
