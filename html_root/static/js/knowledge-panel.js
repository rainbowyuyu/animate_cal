/**
 * 智算星云 - 全局浮动面板
 * 统计性与功能性并存，每页展示相关用户统计与快捷入口
 */
// showSection / openDoc / switchDevTool 由 window 全局提供

const AGENT_TEMPLATES_KEY = 'agent_automation_templates';
const WRONGBOOK_STORAGE_KEY = 'wcp_examples_wrongbook_v1';

function getCurrentUser() {
    const userSpan = document.getElementById('username-span');
    const userDisplay = document.getElementById('user-display');
    if (userDisplay && userDisplay.style.display !== 'none' && userSpan) {
        return userSpan.innerText;
    }
    return null;
}

/** 获取用户相关统计数据（供各页星云展示） */
async function fetchUserStats() {
    const user = getCurrentUser();
    const stats = {
        formulas: 0,
        scripts: 0,
        templates: 0,
        wrongbook: 0,
        tutorialDone: !!localStorage.getItem('tutorial_played')
    };
    if (user) {
        try {
            const [formulasRes, scriptsRes] = await Promise.all([
                fetch(`/api/formulas/list?username=${encodeURIComponent(user)}`).catch(() => null),
                fetch(`/api/animation_scripts/list?username=${encodeURIComponent(user)}`).catch(() => null)
            ]);
            if (formulasRes) {
                const d = await formulasRes.json();
                if (d.status === 'success' && Array.isArray(d.data)) stats.formulas = d.data.length;
            }
            if (scriptsRes) {
                const d = await scriptsRes.json();
                if (d.status === 'success' && Array.isArray(d.data)) stats.scripts = d.data.length;
            }
        } catch (_) {}
    }
    try {
        const t = JSON.parse(localStorage.getItem(AGENT_TEMPLATES_KEY) || '[]');
        stats.templates = Array.isArray(t) ? t.length : 0;
    } catch (_) {}
    try {
        const w = JSON.parse(localStorage.getItem(WRONGBOOK_STORAGE_KEY) || '[]');
        stats.wrongbook = Array.isArray(w) ? w.length : 0;
    } catch (_) {}
    return stats;
}

/** 成就式进度条（条状图） */
function renderAchievementBar(label, value, max, icon = '') {
    const cap = Math.max(1, max || 20);
    const pct = Math.min(100, Math.round((Number(value) || 0) / cap * 100));
    const ico = icon ? `<i class="fa-solid ${icon}"></i>` : '';
    return `
        <div class="knowledge-achievement-item">
            <div class="knowledge-achievement-header">
                <span class="knowledge-achievement-label">${ico} ${escapeHtml(label)}</span>
                <span class="knowledge-achievement-meta">${value} / ${cap}</span>
            </div>
            <div class="knowledge-achievement-bar">
                <div class="knowledge-achievement-bar-inner" style="width:${pct}%;"></div>
            </div>
        </div>
    `;
}

/** 环形进度图 */
function renderRingChart(label, value, max) {
    const cap = Math.max(1, max || 100);
    const pct = Math.min(100, Math.round((Number(value) || 0) / cap * 100));
    const r = 18;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return `
        <div class="knowledge-ring-item">
            <svg class="knowledge-ring-svg" viewBox="0 0 44 44">
                <circle class="knowledge-ring-bg" cx="22" cy="22" r="${r}"/>
                <circle class="knowledge-ring-fill" cx="22" cy="22" r="${r}" stroke-dasharray="${dash} ${circ}"/>
            </svg>
            <span class="knowledge-ring-label">${escapeHtml(label)}<br>${value}</span>
        </div>
    `;
}

/** 多栏并排条状图 */
function renderMultiBar(items, maxEach = 20) {
    const cap = Math.max(1, maxEach);
    return `
        <div class="knowledge-multibar">
            ${items.filter(it => it && it.label != null).map(it => {
                const v = Number(it.value) || 0;
                const pct = Math.min(100, Math.round(v / cap * 100));
                return `
                <div class="knowledge-multibar-row">
                    <span class="knowledge-multibar-label">${escapeHtml(it.label)}</span>
                    <div class="knowledge-multibar-track">
                        <div class="knowledge-multibar-fill" style="width:${pct}%;"></div>
                    </div>
                    <span class="knowledge-multibar-value">${v}</span>
                </div>
            `}).join('')}
        </div>
    `;
}

/** 成就徽章 */
function renderBadge(label, value, icon, unlocked) {
    const cls = unlocked ? 'knowledge-badge unlocked' : 'knowledge-badge';
    const ico = icon || 'fa-star';
    return `<div class="${cls}"><i class="fa-solid ${ico}"></i><span>${escapeHtml(label)} ${value}</span></div>`;
}

/** 星云气泡（创意展示：不同大小圆点代表数据，类似词云但更有空间感） */
function renderCloudBubbles(items, maxEach = 20) {
    const cap = Math.max(1, maxEach);
    return `
        <div class="knowledge-cloud-bubbles">
            ${items.filter(it => it && it.label != null).map((it, i) => {
                const v = Number(it.value) || 0;
                const pct = Math.min(100, Math.round(v / cap * 100));
                const size = 8 + Math.min(14, Math.max(0, pct / 100 * 12));  /* 8–20px */
                const hue = 220 + (i * 35) % 80;
                return `<span class="knowledge-bubble" data-label="${escapeHtml(it.label)}" data-value="${v}" style="--size:${size}px; --hue:${hue};"></span>`;
            }).join('')}
            <span class="knowledge-cloud-hint">悬停查看</span>
        </div>
    `;
}

/** 里程碑提示（达成或接近时显示鼓励文案） */
function renderMilestoneHint(stats, milestones = { formulas: 10, scripts: 5, templates: 3 }) {
    const hints = [];
    if (stats.formulas >= milestones.formulas) hints.push({ icon: 'fa-calculator', text: '算式积累破 10，继续深耕数学可视化！' });
    else if (stats.formulas >= milestones.formulas - 2) hints.push({ icon: 'fa-fire', text: '还差一点，算式数量即将突破 10！' });
    if (stats.scripts >= milestones.scripts) hints.push({ icon: 'fa-video', text: '脚本创作达人，Manim 动画玩得溜～' });
    if (stats.templates >= milestones.templates) hints.push({ icon: 'fa-wand-magic-sparkles', text: '模板已就绪，智能体效率拉满' });
    if (!hints.length) hints.push({ icon: 'fa-seedling', text: '点滴积累，汇成星云。' });
    const h = hints[Math.floor(Math.random() * hints.length)];
    return `<div class="knowledge-milestone-hint"><i class="fa-solid ${h.icon}"></i> ${escapeHtml(h.text)}</div>`;
}

function escapeHtml(s) {
    if (s == null) return '';
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
}

/** 旧版简单统计行（兼容） */
function renderStatsRow(items) {
    if (!items || items.length === 0) return '';
    const filtered = items.filter(it => it != null && (it.value !== undefined && it.value !== null && it.label));
    if (filtered.length === 0) return '';
    return `
        <div class="knowledge-stats-row">
            ${filtered.map(it => `
                <div class="knowledge-stat-item">
                    <span class="knowledge-stat-value">${it.value}</span>
                    <span class="knowledge-stat-label">${it.label}</span>
                </div>
            `).join('')}
        </div>
    `;
}

const MILESTONE = 20;

const SECTION_CONFIG = {
    home: {
        title: '智算星云',
        subtitle: '成就与快捷入口',
        renderCharts: s => {
            let html = '<div class="knowledge-ring-wrap">';
            html += renderRingChart('算式', s.formulas, MILESTONE);
            html += renderRingChart('脚本', s.scripts, MILESTONE);
            html += renderRingChart('模板', s.templates, MILESTONE);
            html += '</div>';
            html += renderCloudBubbles([
                { label: '算式', value: s.formulas },
                { label: '脚本', value: s.scripts },
                { label: '模板', value: s.templates },
                { label: '错题', value: s.wrongbook }
            ], MILESTONE);
            html += renderMilestoneHint(s);
            if (s.tutorialDone) {
                html += '<div class="knowledge-badge-wrap">' + renderBadge('新手教程', '已完成', 'fa-circle-check', true) + '</div>';
            }
            return html;
        },
        body: `
            <div class="knowledge-panel-shortcuts">
                <button type="button" class="knowledge-shortcut-btn" onclick="showSection('agent'); event.stopPropagation();"><i class="fa-solid fa-robot"></i> 智能体</button>
                <button type="button" class="knowledge-shortcut-btn" onclick="showSection('detect'); event.stopPropagation();"><i class="fa-solid fa-camera"></i> 识别</button>
                <button type="button" class="knowledge-shortcut-btn" onclick="showSection('calculate'); event.stopPropagation();"><i class="fa-solid fa-calculator"></i> 计算</button>
                <button type="button" class="knowledge-shortcut-btn" onclick="showSection('examples'); event.stopPropagation();"><i class="fa-solid fa-play"></i> 案例</button>
            </div>
        `
    },
    agent: {
        title: '智能体助手',
        subtitle: '用自然语言完成任务',
        renderCharts: s => renderMultiBar([
            { label: '已存模板', value: s.templates },
            { label: '算式数', value: s.formulas }
        ], MILESTONE),
        body: `
            <div class="knowledge-panel-tips">
                <p>可对我说：</p>
                <ul>
                    <li>「识别这张图片中的公式」</li>
                    <li>「帮我推演 ∫x²dx」</li>
                    <li>「生成矩阵乘法的 Manim 动画」</li>
                </ul>
                <button type="button" class="knowledge-shortcut-btn full" onclick="showSection('my-formulas'); event.stopPropagation();"><i class="fa-solid fa-book"></i> 我的算式库</button>
            </div>
        `
    },
    detect: {
        title: '智能识别',
        subtitle: '手写 / 图片转公式',
        renderCharts: s => renderAchievementBar('已保存算式', s.formulas, MILESTONE, 'fa-camera'),
        body: `
            <div class="knowledge-panel-tips">
                <p>支持手写、拍照、上传图片识别公式，一键复制到动态计算或保存至算式库。</p>
                <button type="button" class="knowledge-shortcut-btn full" onclick="showSection('calculate'); event.stopPropagation();"><i class="fa-solid fa-calculator"></i> 去动态计算</button>
            </div>
        `
    },
    'my-formulas': {
        title: '知识星云',
        subtitle: '基于你的算式统计掌握度',
        body: 'dynamic'
    },
    calculate: {
        title: '动态计算',
        subtitle: '公式推演与可视化',
        renderCharts: s => {
            let html = renderMultiBar([
                { label: '可选用算式', value: s.formulas },
                { label: '已存脚本', value: s.scripts }
            ], MILESTONE);
            html += renderMilestoneHint(s);
            return html;
        },
        body: `
            <div class="knowledge-panel-tips">
                <p>输入 LaTeX 公式一键生成动画。通用模式自动拆分为计算推演 + 可视化演示。</p>
                <button type="button" class="knowledge-shortcut-btn full" onclick="showSection('my-formulas'); event.stopPropagation();"><i class="fa-solid fa-book"></i> 我的算式</button>
            </div>
        `
    },
    examples: {
        title: '教学案例',
        subtitle: '精选数学动画',
        renderCharts: s => renderAchievementBar('错题本收录', s.wrongbook, 15, 'fa-bookmark'),
        body: `
            <div class="knowledge-panel-tips">
                <p>浏览微积分、线性代数、几何等分类的 Manim 动画，可加入课件包或复用到工作台。</p>
                <button type="button" class="knowledge-shortcut-btn full" onclick="showSection('agent'); event.stopPropagation();"><i class="fa-solid fa-robot"></i> 用智能体创建课包</button>
            </div>
        `
    },
    devtools: {
        title: '开发者工具',
        subtitle: 'Manim 工作台',
        renderCharts: s => renderMultiBar([
            { label: '脚本', value: s.scripts },
            { label: '算式', value: s.formulas }
        ], MILESTONE),
        body: `
            <div class="knowledge-panel-shortcuts">
                <button type="button" class="knowledge-shortcut-btn" onclick="showSection('devtools'); switchDevTool('manim'); event.stopPropagation();"><i class="fa-solid fa-code"></i> Manim</button>
                <button type="button" class="knowledge-shortcut-btn" onclick="showSection('devtools'); switchDevTool('latex'); event.stopPropagation();"><i class="fa-solid fa-square-root-variable"></i> LaTeX</button>
                <button type="button" class="knowledge-shortcut-btn full" onclick="showSection('my-formulas'); event.stopPropagation();"><i class="fa-solid fa-book"></i> 从算式库导入</button>
            </div>
        `
    },
    help: {
        title: '帮助中心',
        subtitle: '使用文档',
        renderCharts: s => s.tutorialDone
            ? '<div class="knowledge-badge-wrap">' + renderBadge('新手教程', '已完成', 'fa-circle-check', true) + '</div>'
            : renderAchievementBar('完成新手教程', 0, 1, 'fa-graduation-cap'),
        body: `
            <div class="knowledge-panel-tips">
                <p>查看使用说明、隐私政策、更新日志等。</p>
                <button type="button" class="knowledge-shortcut-btn full" onclick="openDoc('update.md','更新日志'); event.stopPropagation();"><i class="fa-solid fa-file-lines"></i> 更新日志</button>
            </div>
        `
    }
};

function ensureCollapsedOnMobile(panel) {
    if (typeof window.matchMedia !== 'undefined' && window.matchMedia('(max-width: 768px)').matches && panel && !panel.classList.contains('collapsed')) {
        panel.classList.add('collapsed');
        panel.style.width = '56px';
        panel.style.height = '56px';
        const cnt = document.getElementById('knowledge-panel-content');
        const bbl = document.getElementById('knowledge-panel-bubble');
        if (cnt) cnt.style.display = 'none';
        if (bbl) bbl.style.display = 'flex';
        if (panel) panel.title = '点击打开智算星云';
    }
}

export async function refreshKnowledgePanel(sectionId) {
    const panel = document.getElementById('knowledge-panel');
    const titleEl = document.getElementById('knowledge-panel-title');
    const subtitleEl = document.getElementById('knowledge-panel-subtitle');
    const dynamicEl = document.getElementById('knowledge-panel-dynamic');
    const staticEl = document.getElementById('knowledge-panel-static');

    if (!panel || !titleEl || !subtitleEl || !dynamicEl || !staticEl) return;

    const config = SECTION_CONFIG[sectionId] || SECTION_CONFIG.home;

    titleEl.textContent = config.title;
    subtitleEl.textContent = config.subtitle;

    if (config.body === 'dynamic') {
        dynamicEl.style.display = '';
        staticEl.style.display = 'none';
        staticEl.innerHTML = '';
        const statsEl = document.getElementById('knowledge-panel-dynamic-stats');
        if (statsEl) {
            fetchUserStats().then(stats => {
                statsEl.innerHTML = renderMultiBar([
                    { label: '算式', value: stats.formulas },
                    { label: '脚本', value: stats.scripts }
                ], MILESTONE);
                statsEl.style.display = '';
                const bodyEl = document.getElementById('knowledge-panel-body');
                if (bodyEl) bodyEl.scrollTop = 0;
            });
        }
        return;
    }

    dynamicEl.style.display = 'none';
    staticEl.style.display = '';

    const stats = await fetchUserStats();
    const chartsHtml = config.renderCharts ? config.renderCharts(stats) : '';
    staticEl.innerHTML = (chartsHtml ? chartsHtml + '<div class="knowledge-panel-divider"></div>' : '') + config.body;
    const bodyEl = document.getElementById('knowledge-panel-body');
    if (bodyEl) bodyEl.scrollTop = 0;
    ensureCollapsedOnMobile(panel);
}
