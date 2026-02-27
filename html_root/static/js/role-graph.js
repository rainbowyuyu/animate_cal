/**
 * 全站知识图谱 - 3D 力导向图
 * 节点：图标（img-nodes 风格 Sprite+Texture）+ 文字（text-nodes 风格 SpriteText）
 * 使用 site-graph 数据，依赖全局 THREE / ForceGraph3D / SpriteText（ES 模块）
 */

import { getGraphDataFor3D, ROLE_FLOWS, ROLE_LABELS } from './site-graph.js';

/** 图标映射 */
const ICON_MAP = {
  'fa-house': '⌂', 'fa-robot': '◇', 'fa-camera': '◎', 'fa-calculator': '∑', 'fa-play': '▶',
  'fa-book': '☰', 'fa-code': '</>', 'fa-folder-plus': '⊕', 'fa-wand-magic-sparkles': '✦',
  'fa-pen': '✎', 'fa-upload': '↑', 'fa-square-root-variable': '√', 'fa-video': '▷',
  'fa-puzzle-piece': '⊞', 'fa-circle-question': '?', 'fa-gear': '⚙', 'fa-search': '⌕',
  'fa-graduation-cap': '▤', 'fa-rocket': '➤', 'fa-lightbulb': '◐', 'fa-trash': '✕',
  'fa-eraser': '◻', 'fa-rotate-left': '↺', 'fa-lock': '⌒', 'fa-magnifying-glass': '⌕',
  'fa-bookmark': '▣', 'fa-book-bookmark': '▤', 'fa-clapperboard': '▶', 'fa-list-ol': '≡',
  'fa-star': '★', 'fa-clock': '◷', 'fa-chalkboard-user': '▤', 'fa-tags': '☰',
  'fa-plus': '+', 'fa-file-lines': '◆', 'fa-file': '◆', 'fa-keyboard': '⌨'
};

/** 获取当前主题 */
function isDarkTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

/** 主题配色（与主页 feature-card 一致） */
const THEME = {
  light: {
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    text: '#0f172a',
    iconBg: 'rgba(37, 99, 235, 0.1)',
    iconColor: '#2563eb',
    nodeColor: '#6366f1',
  },
  dark: {
    cardBg: '#1e293b',
    cardBorder: '#334155',
    text: '#f1f5f9',
    iconBg: 'rgba(59, 130, 246, 0.2)',
    iconColor: '#60a5fa',
    nodeColor: '#818cf8',
  },
};

/** 深色模式下软化节点颜色：降饱和、略降明度，避免在暗底上过于刺眼 */
function softenColorForDarkMode(hex) {
  const m = (hex || '#818cf8').match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  let r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  s = Math.max(0, s * 0.5);
  l = Math.min(0.75, l * 0.85 + 0.1);
  const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };
  if (s === 0) { r = g = b = l; } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return '#' + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

/** 圆球 + 标签卡片（图标在左、文字在右，卡片在球体正上方，无遮挡） */
function createSphereNodeWithText(node, theme) {
  const THREE = window.THREE;
  if (!THREE) return null;
  const t = THEME[theme] || THEME.light;
  const rawColor = node.color || t.nodeColor;
  const nodeColor = theme === 'dark' ? softenColorForDarkMode(rawColor) : rawColor;
  const r = Math.max(5, (node.val || 10) * 0.5);
  const iconClass = (node.icon || '').split(' ').pop() || '';
  const symbol = ICON_MAP[iconClass] || (node.role ? '◆' : (node.id === 'center' ? '✦' : '●'));
  const text = node.name || node.id;

  const scale = 2;
  const iconSize = 28 * scale;
  const fontSize = 16 * scale;
  const padding = 12 * scale;
  const iconBoxSize = 40 * scale;
  const gap = 10 * scale;

  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `600 ${fontSize}px "Plus Jakarta Sans","Microsoft YaHei",sans-serif`;
  const tw = Math.max(ctx.measureText(text).width, text.length * fontSize * 0.9);
  const cardW = Math.ceil(iconBoxSize + gap + tw + padding * 2);
  const cardH = Math.ceil(Math.max(iconBoxSize, fontSize * 1.4) + padding * 2);

  const canvas = document.createElement('canvas');
  canvas.width = cardW;
  canvas.height = cardH;
  const c = canvas.getContext('2d');
  const rad = 12;

  if (theme === 'dark') {
    const cx = cardW / 2;
    const cy = cardH / 2;
    const R = Math.sqrt(cx * cx + cy * cy) * 1.2;
    const parseRgb = (hex) => {
      const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
      return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [30, 41, 59];
    };
    const [cr, cg, cb] = parseRgb(t.cardBg);
    const grad = c.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, `rgba(${cr},${cg},${cb},0.92)`);
    grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.75)`);
    grad.addColorStop(0.85, `rgba(${cr},${cg},${cb},0.15)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = grad;
  } else {
    c.fillStyle = t.cardBg;
    c.strokeStyle = t.cardBorder;
    c.lineWidth = 1;
  }
  if (c.roundRect) {
    c.beginPath();
    c.roundRect(0, 0, cardW, cardH, rad);
    c.fill();
    if (theme === 'light') c.stroke();
  } else {
    c.fillRect(0, 0, cardW, cardH);
  }

  const iconX = padding + iconBoxSize / 2;
  const iconY = cardH / 2;
  c.beginPath();
  c.arc(iconX, iconY, iconBoxSize / 2 - 2, 0, Math.PI * 2);
  c.fillStyle = t.iconBg;
  c.fill();
  c.strokeStyle = t.iconColor;
  c.lineWidth = 1;
  c.stroke();
  c.fillStyle = t.iconColor;
  c.font = `700 ${iconSize}px "Plus Jakarta Sans","Microsoft YaHei",sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(symbol, iconX, iconY);

  c.fillStyle = t.text;
  c.font = `600 ${fontSize}px "Plus Jakarta Sans","Microsoft YaHei",sans-serif`;
  c.textAlign = 'left';
  c.fillText(text, padding + iconBoxSize + gap, cardH / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const labelMat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    depthTest: false,
  });
  const labelSprite = new THREE.Sprite(labelMat);
  labelSprite.renderOrder = 1000;
  labelSprite.scale.set(cardW * 0.2, cardH * 0.2, 1);
  labelSprite.position.y = r + cardH * 0.12;

  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(r, 24, 20);
  const sphereMat = new THREE.MeshLambertMaterial({
    color: nodeColor,
    transparent: true,
    opacity: 0.95,
    emissive: nodeColor,
    emissiveIntensity: 0.15,
  });
  const sphere = new THREE.Mesh(geo, sphereMat);
  sphere.renderOrder = 0;
  group.add(sphere);
  group.add(labelSprite);
  return group;
}

function buildGraphData() {
  const raw = getGraphDataFor3D();
  const nodes = raw.nodes || [];
  const links = raw.links || [];
  const id2node = new Map(nodes.map((n) => [n.id, n]));
  const resolvedLinks = links.map((l) => {
    const src = typeof l.source === 'object' ? l.source : id2node.get(l.source);
    const tgt = typeof l.target === 'object' ? l.target : id2node.get(l.target);
    return { ...l, source: src, target: tgt };
  }).filter((l) => l.source && l.target);
  resolvedLinks.forEach((link) => {
    const a = link.source;
    const b = link.target;
    if (!a.neighbors) a.neighbors = [];
    if (!b.neighbors) b.neighbors = [];
    if (!a.neighbors.includes(b)) a.neighbors.push(b);
    if (!b.neighbors.includes(a)) b.neighbors.push(a);
    if (!a.links) a.links = [];
    if (!b.links) b.links = [];
    a.links.push(link);
    b.links.push(link);
  });
  return { nodes, links: resolvedLinks };
}

export function initRoleGraph() {
  const container = document.getElementById('role-graph-3d');
  const flowPanel = document.getElementById('role-flow-panel');
  const flowTitle = document.getElementById('role-flow-title');
  const flowChain = document.getElementById('role-flow-chain');
  const flowBack = document.getElementById('role-flow-back');

  const ForceGraph3D = window.ForceGraph3D;
  if (!container || !flowPanel || !ForceGraph3D) return;

  const wrap = container.closest('.role-graph-wrap');
  if (wrap) {
    wrap.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, true);
    wrap.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }

  function openFlow(role) {
    const flow = ROLE_FLOWS[role];
    if (!flow) return;
    flowTitle.textContent = ROLE_LABELS[role] + ' · 推荐路径';
    flowChain.innerHTML = flow.map((step, i) => `
      <div class="role-flow-step" data-step="${i}">
        <div class="role-flow-step-node">
          <i class="${step.icon}"></i>
          <span>${step.label}</span>
          <p>${step.desc}</p>
          <button type="button" class="role-flow-enter" data-section="${step.section}">进入</button>
        </div>
        ${i < flow.length - 1 ? '<div class="role-flow-arrow"><i class="fa-solid fa-chevron-right"></i></div>' : ''}
      </div>
    `).join('');
    flowPanel.classList.add('visible');
    flowChain.querySelectorAll('.role-flow-enter').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const section = btn.dataset.section;
        if (typeof window.showSection === 'function') window.showSection(section);
        flowPanel.classList.remove('visible');
      });
    });
  }

  if (flowBack) flowBack.addEventListener('click', () => flowPanel.classList.remove('visible'));
  flowPanel.addEventListener('click', (e) => { if (e.target === flowPanel) flowPanel.classList.remove('visible'); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && flowPanel.classList.contains('visible')) flowPanel.classList.remove('visible');
  });

  let Graph;
  const highlightNodes = new Set();
  const highlightLinks = new Set();
  let hoverNode = null;

  function updateHighlight() {
    if (!Graph) return;
    Graph.linkColor(Graph.linkColor());
    Graph.linkWidth(Graph.linkWidth());
    Graph.linkDirectionalParticles(Graph.linkDirectionalParticles());
  }

  function getThemeColors() {
    const dark = isDarkTheme();
    const t = THEME[dark ? 'dark' : 'light'];
    return {
      bg: dark ? '#0f172a' : '#f8fafc',
      link: dark ? 'rgba(139, 92, 246, 0.5)' : 'rgba(37, 99, 235, 0.5)',
      linkHighlight: dark ? 'rgba(139, 92, 246, 0.9)' : 'rgba(37, 99, 235, 0.85)',
      node: (n) => dark ? softenColorForDarkMode(n.color || t.nodeColor) : (n.color || t.nodeColor),
      theme: dark ? 'dark' : 'light',
    };
  }

  function doInit() {
    const w = Math.max(container.offsetWidth, container.clientWidth, 400);
    const h = Math.max(container.offsetHeight, container.clientHeight, 360);
    const data = buildGraphData();
    const colors = getThemeColors();

    const useCustomNodes = typeof window.THREE !== 'undefined';
    const getLinkColor = (l) => (highlightLinks.has(l) ? colors.linkHighlight : colors.link);
    const getLinkWidth = (l) => (highlightLinks.has(l) ? 3 : 2);
    const getLinkParticles = (l) => (highlightLinks.has(l) ? 5 : 0);

    let g = new ForceGraph3D(container, {
      controlType: 'orbit',
      rendererConfig: { antialias: true, alpha: true },
    })
      .width(w)
      .height(h)
      .graphData(data)
      .backgroundColor('rgba(0,0,0,0)')
      .nodeVal((n) => Math.max(10, (n.val || 12) * 0.7))
      .nodeColor(colors.node)
      .nodeLabel((n) => n.name || n.id);
    if (useCustomNodes) {
      g = g
        .nodeThreeObject((node) => createSphereNodeWithText(node, colors.theme))
        .nodeThreeObjectExtend(false)
        .nodePositionUpdate((obj, coords, node) => {
          const sprite = obj.children[1];
          if (sprite?.material && Graph) {
            const cam = Graph.camera();
            const dx = cam.position.x - coords.x;
            const dy = cam.position.y - coords.y;
            const dz = cam.position.z - coords.z;
            const dist = Math.hypot(dx, dy, dz);
            const near = 200;
            const far = 420;
            let opacity = 1 - (dist - near) / (far - near);
            sprite.material.opacity = Math.max(0.22, Math.min(1, opacity));
          }
        });
    }
    Graph = g
      .linkOpacity(0.8)
      .linkColor(getLinkColor)
      .linkWidth(getLinkWidth)
      .linkDirectionalParticles(getLinkParticles)
      .linkDirectionalParticleWidth(1.5)
      .linkDirectionalParticleSpeed(0.008)
      .linkCurvature(0.12)
      .linkResolution(48)
      .onNodeHover((node, prev) => {
        if (container) container.style.cursor = node ? 'pointer' : 'grab';
        if ((!node && !highlightNodes.size) || (node && hoverNode === node)) return;
        highlightNodes.clear();
        highlightLinks.clear();
        if (node) {
          highlightNodes.add(node);
          (node.neighbors || []).forEach((nb) => highlightNodes.add(nb));
          (node.links || []).forEach((lk) => highlightLinks.add(lk));
        }
        hoverNode = node || null;
        updateHighlight();
      })
      .onLinkHover((link) => {
        highlightNodes.clear();
        highlightLinks.clear();
        if (link) {
          highlightLinks.add(link);
          highlightNodes.add(link.source);
          highlightNodes.add(link.target);
        }
        hoverNode = null;
        updateHighlight();
      })
      .enableNodeDrag(false)
      .onNodeClick((node) => {
        const nx = Number(node.x);
        const ny = Number(node.y);
        const nz = Number(node.z);
        const hasPos = !Number.isNaN(nx) && !Number.isNaN(ny) && !Number.isNaN(nz);
        const x = hasPos ? nx : 0, y = hasPos ? ny : 0, z = hasPos ? nz : 0;
        const dist = Math.hypot(x, y, z) || 1;
        const distance = 50;
        const distRatio = 1 + distance / dist;
        const newPos = hasPos
          ? { x: x * distRatio, y: y * distRatio, z: z * distRatio }
          : { x: 0, y: 0, z: distance };
        const lookAt = { x, y, z };
        Graph.cameraPosition(newPos, lookAt, 1200);
        const TRANSITION_MS = 1200;
        setTimeout(() => {
          if (node.role) {
            openFlow(node.role);
          } else if (node.id === 'center') {
          } else if (node.section && typeof window.showSection === 'function') {
            window.showSection(node.section);
            if (node.section === 'devtools' && node.devtool && typeof window.switchDevTool === 'function') {
              setTimeout(() => window.switchDevTool(node.devtool), 80);
            }
            if (node.id === 'devtools-ai-edit' && typeof window.DevTools !== 'undefined' && typeof window.DevTools.toggleAiEditPanel === 'function') {
              setTimeout(() => window.DevTools.toggleAiEditPanel(), 400);
            }
          } else if (node.id === 'settings' && typeof window.openSettings === 'function') {
            window.openSettings();
          }
        }, TRANSITION_MS + 80);
      })
      .showNavInfo(false);

    const renderer = Graph.renderer();
    if (renderer) renderer.setClearColor(0x000000, 0);

    Graph.cameraPosition({ z: 400 });
    Graph.d3Force('charge').strength(-220);
    Graph.d3Force('link').distance(80);
    Graph.d3Force('center').strength(0.08);

    const ctrl = Graph.controls();
    if (ctrl) {
      const M = window.THREE?.MOUSE;
      const ROTATE = M?.ROTATE ?? 0;
      const PAN = M?.PAN ?? 2;
      ctrl.mouseButtons = { LEFT: ROTATE, RIGHT: PAN };
      ctrl.enablePan = true;
    }

    const zoomIn = () => {
      const cam = Graph.camera();
      const target = ctrl?.target || { x: 0, y: 0, z: 0 };
      const dx = cam.position.x - target.x;
      const dy = cam.position.y - target.y;
      const dz = cam.position.z - target.z;
      const scale = 0.82;
      Graph.cameraPosition(
        { x: target.x + dx * scale, y: target.y + dy * scale, z: target.z + dz * scale },
        target,
        200
      );
    };
    const zoomOut = () => {
      const cam = Graph.camera();
      const target = ctrl?.target || { x: 0, y: 0, z: 0 };
      const dx = cam.position.x - target.x;
      const dy = cam.position.y - target.y;
      const dz = cam.position.z - target.z;
      const scale = 1.22;
      Graph.cameraPosition(
        { x: target.x + dx * scale, y: target.y + dy * scale, z: target.z + dz * scale },
        target,
        200
      );
    };
    const zoomReset = () => Graph.cameraPosition({ x: 0, y: 0, z: 400 }, { x: 0, y: 0, z: 0 }, 300);
    const zoomInBtn = document.getElementById('role-graph-zoom-in');
    const zoomOutBtn = document.getElementById('role-graph-zoom-out');
    const zoomResetBtn = document.getElementById('role-graph-reset');
    if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', zoomReset);

    const applyResize = () => {
      if (!container?.offsetParent) return;
      const cw = Math.max(container.offsetWidth, container.clientWidth, 300);
      const ch = Math.max(container.offsetHeight, container.clientHeight, 280);
      Graph.width(cw).height(ch);
    };
    window.addEventListener('resize', applyResize);
    const ro = new ResizeObserver(() => requestAnimationFrame(applyResize));
    ro.observe(container);

    const applyTheme = () => {
      const c = getThemeColors();
      Graph.backgroundColor('rgba(0,0,0,0)');
      Graph.linkColor(Graph.linkColor());
      Graph.nodeColor(Graph.nodeColor());
      const wrap = container.closest('.role-graph-wrap');
      if (wrap) wrap.dataset.graphTheme = c.theme;
    };
    const themeObs = new MutationObserver(applyTheme);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  function ensureDimensions() {
    const rect = container.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function ready() {
    return ensureDimensions() && window.ForceGraph3D && window.THREE;
  }
  if (ready()) doInit();
  else {
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (ready() || tries > 80) {
        clearInterval(t);
        if (ready()) doInit();
      }
    }, 100);
  }
}
