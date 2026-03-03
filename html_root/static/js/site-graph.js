/**
 * 全站功能图谱 - 节点为工具/功能，边为关系
 * 供：全站知识图谱、智能体意图识别、智算星云地铁式导航 使用
 */

/** 节点类型 */
export const NODE_TYPE = {
  SECTION: 'section',
  SUBTOOL: 'subtool',
  ROLE: 'role',
  HUB: 'hub',
};

/**
 * 全站节点定义 - 深挖至所有小功能
 */
export const NODES = [
  { id: 'center', name: '智算视界', section: null, type: NODE_TYPE.HUB, val: 24, color: '#818cf8', fx: 0, fy: 0, fz: 0 },
  { id: 'home', name: '首页', section: 'home', type: NODE_TYPE.SECTION, icon: 'fa-solid fa-house', keywords: ['首页','主页'], val: 12, color: '#94a3b8' },
  { id: 'hero-cta', name: '主 CTA 入口', section: 'home', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-rocket', keywords: ['开始'], val: 8, color: '#a5b4fc' },
  { id: 'tutorial', name: '30 秒教程', section: 'home', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-graduation-cap', keywords: ['教程','新手','引导'], val: 9, color: '#94a3b8' },
  { id: 'search', name: '全站搜索', section: 'home', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-search', keywords: ['搜索','查找'], val: 8, color: '#94a3b8' },
  { id: 'agent', name: '智能体', section: 'agent', type: NODE_TYPE.SECTION, icon: 'fa-solid fa-robot', keywords: ['智能体','助手','AI','对话'], val: 14, color: '#6366f1' },
  { id: 'agent-course', name: '创建课包', section: 'agent', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-folder-plus', keywords: ['课包','课件包'], val: 10, color: '#818cf8' },
  { id: 'agent-template', name: '从模板运行', section: 'agent', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-wand-magic-sparkles', keywords: ['模板'], val: 9, color: '#a5b4fc' },
  { id: 'agent-examples', name: '功能示例', section: 'agent', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-lightbulb', keywords: ['示例'], val: 8, color: '#c4b5fd' },
  { id: 'agent-clear', name: '清空对话', section: 'agent', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-trash', keywords: ['清空'], val: 7, color: '#a5b4fc' },
  { id: 'agent-settings', name: '智能体设置', section: 'agent', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-gear', keywords: ['设置'], val: 7, color: '#c4b5fd' },
  { id: 'detect', name: '智能识别', section: 'detect', type: NODE_TYPE.SECTION, icon: 'fa-solid fa-camera', keywords: ['识别','公式识别','OCR','手写','上传'], val: 14, color: '#22d3ee' },
  { id: 'detect-handwrite', name: '手写模式', section: 'detect', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-pen', keywords: ['手写'], val: 9, color: '#67e8f9' },
  { id: 'detect-upload', name: '上传图片', section: 'detect', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-upload', keywords: ['上传','图片'], val: 9, color: '#67e8f9' },
  { id: 'detect-pen', name: '画笔', section: 'detect', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-pen-fancy', keywords: ['画笔'], val: 7, color: '#a5f3fc' },
  { id: 'detect-eraser', name: '橡皮擦', section: 'detect', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-eraser', keywords: ['橡皮'], val: 7, color: '#a5f3fc' },
  { id: 'detect-undo', name: '撤销/重做', section: 'detect', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-rotate-left', keywords: ['撤销','重做'], val: 7, color: '#a5f3fc' },
  { id: 'detect-clear', name: '清空画布', section: 'detect', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-trash', keywords: ['清空'], val: 7, color: '#a5f3fc' },
  { id: 'detect-lock', name: '锁定画板', section: 'detect', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-lock', keywords: ['锁定'], val: 7, color: '#a5f3fc' },
  { id: 'detect-recognize', name: '立即识别', section: 'detect', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-magnifying-glass', keywords: ['识别'], val: 9, color: '#22d3ee' },
  { id: 'detect-save', name: '保存并查看算式', section: 'detect', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-bookmark', keywords: ['保存并查看','保存算式'], val: 9, color: '#67e8f9' },
  { id: 'detect-copy-calc', name: '去动态计算', section: 'detect', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-calculator', keywords: ['去计算'], val: 9, color: '#67e8f9' },
  { id: 'detect-open-devtools-latex', name: '去 LaTeX 编辑器', section: 'detect', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-pen-to-square', keywords: ['去 LaTeX 编辑器','编辑公式'], val: 9, color: '#67e8f9' },
  { id: 'calculate', name: '动态计算', section: 'calculate', type: NODE_TYPE.SECTION, icon: 'fa-solid fa-calculator', keywords: ['动态计算','计算','推演','可视化','动画'], val: 14, color: '#34d399' },
  { id: 'calc-normal', name: '通用推演', section: 'calculate', calc_operation: 'normal', type: NODE_TYPE.SUBTOOL, keywords: ['通用'], val: 8, color: '#6ee7b7' },
  { id: 'calc-formula', name: '公式推演', section: 'calculate', calc_operation: 'formular', type: NODE_TYPE.SUBTOOL, keywords: ['公式推演'], val: 8, color: '#6ee7b7' },
  { id: 'calc-visual', name: '可视化', section: 'calculate', calc_operation: 'visualization', type: NODE_TYPE.SUBTOOL, keywords: ['可视化'], val: 8, color: '#6ee7b7' },
  { id: 'calc-solution', name: '完整解题', section: 'calculate', calc_operation: 'solution', type: NODE_TYPE.SUBTOOL, keywords: ['解题'], val: 8, color: '#6ee7b7' },
  { id: 'calc-import', name: '从库导入', section: 'calculate', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-book-bookmark', keywords: ['导入'], val: 8, color: '#5eead4' },
  { id: 'calc-clear', name: '清空输入', section: 'calculate', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-trash', keywords: ['清空'], val: 7, color: '#6ee7b7' },
  { id: 'calc-generate', name: '生成动画', section: 'calculate', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-clapperboard', keywords: ['生成'], val: 10, color: '#34d399' },
  { id: 'calc-steps', name: '解题步骤', section: 'calculate', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-list-ol', keywords: ['步骤'], val: 8, color: '#6ee7b7' },
  { id: 'calc-save-script', name: '保存到脚本库', section: 'calculate', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-bookmark', keywords: ['保存脚本'], val: 8, color: '#5eead4' },
  { id: 'examples', name: '教学案例', section: 'examples', type: NODE_TYPE.SECTION, icon: 'fa-solid fa-play', keywords: ['教学案例','案例','视频'], val: 14, color: '#f59e0b' },
  { id: 'examples-filter-all', name: '全部案例', section: 'examples', filter_mode: 'all', type: NODE_TYPE.SUBTOOL, keywords: ['全部','全部案例'], val: 8, color: '#fbbf24' },
  { id: 'examples-favorites', name: '收藏', section: 'examples', filter_mode: 'favorites', type: NODE_TYPE.SUBTOOL, icon: 'fa-regular fa-star', keywords: ['收藏','我的收藏'], val: 8, color: '#fcd34d' },
  { id: 'examples-watch-later', name: '稍后看', section: 'examples', filter_mode: 'watch_later', type: NODE_TYPE.SUBTOOL, icon: 'fa-regular fa-clock', keywords: ['稍后看'], val: 8, color: '#fde047' },
  { id: 'examples-courseware', name: '我的课件', section: 'examples', filter_mode: 'courseware', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-chalkboard-user', keywords: ['课件','我的课件','课件包'], val: 9, color: '#fbbf24' },
  { id: 'examples-create-course', name: '创建课包', section: 'examples', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-folder-plus', keywords: ['创建课包'], val: 9, color: '#f59e0b' },
  { id: 'examples-tag-filter', name: '标签筛选', section: 'examples', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-tags', keywords: ['标签'], val: 8, color: '#fde047' },
  { id: 'errorbook', name: '错题本', section: 'examples', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-book', keywords: ['错题本'], val: 9, color: '#fcd34d' },
  { id: 'examples-notes', name: '时间戳笔记', section: 'examples', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-bookmark', keywords: ['笔记','时间戳'], val: 8, color: '#fde047' },
  { id: 'my-formulas', name: '我的算式', section: 'my-formulas', type: NODE_TYPE.SECTION, icon: 'fa-solid fa-book', keywords: ['算式','算式库'], val: 14, color: '#14b8a6' },
  { id: 'formulas-tab', name: '算式库', section: 'my-formulas', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-square-root-variable', keywords: ['算式'], val: 10, color: '#2dd4bf' },
  { id: 'formulas-scripts', name: '动画脚本库', section: 'my-formulas', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-code', keywords: ['脚本'], val: 10, color: '#2dd4bf' },
  { id: 'formulas-templates', name: '智能体模板', section: 'my-formulas', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-wand-magic-sparkles', keywords: ['模板'], val: 9, color: '#5eead4' },
  { id: 'formulas-refresh', name: '刷新列表', section: 'my-formulas', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-rotate', keywords: ['刷新'], val: 7, color: '#5eead4' },
  { id: 'formulas-edit', name: '编辑算式', section: 'my-formulas', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-pen-to-square', keywords: ['编辑算式','修改公式'], val: 9, color: '#2dd4bf' },
  { id: 'formulas-edit-open-devtools-latex', name: '在 LaTeX 编辑器中编辑', section: 'my-formulas', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-square-root-variable', keywords: ['去 LaTeX 编辑器','继续编辑'], val: 8, color: '#2dd4bf' },
  { id: 'formulas-edit-save', name: '保存算式修改', section: 'my-formulas', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-floppy-disk', keywords: ['保存修改','更新公式'], val: 8, color: '#2dd4bf' },
  { id: 'formulas-new-script', name: '新建脚本', section: 'my-formulas', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-plus', keywords: ['新建'], val: 8, color: '#2dd4bf' },
  { id: 'formulas-run', name: '运行', section: 'my-formulas', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-play', keywords: ['运行'], val: 8, color: '#5eead4' },
  { id: 'devtools', name: '开发者工具', section: 'devtools', type: NODE_TYPE.SECTION, icon: 'fa-solid fa-code', keywords: ['开发者','工作台'], val: 14, color: '#8b5cf6' },
  { id: 'devtools-latex', name: 'LaTeX 编辑器', section: 'devtools', devtool: 'latex', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-square-root-variable', keywords: ['LaTeX'], val: 11, color: '#a78bfa' },
  { id: 'devtools-latex-import', name: '导入算式', section: 'devtools', devtool: 'latex', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-database', keywords: ['导入算式','从算式库导入'], val: 8, color: '#c4b5fd' },
  { id: 'devtools-latex-save', name: '保存算式', section: 'devtools', devtool: 'latex', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-floppy-disk', keywords: ['保存算式','保存公式'], val: 8, color: '#c4b5fd' },
  { id: 'devtools-latex-copy', name: '复制 LaTeX', section: 'devtools', devtool: 'latex', type: NODE_TYPE.SUBTOOL, icon: 'fa-regular fa-copy', keywords: ['复制','复制 LaTeX'], val: 7, color: '#c4b5fd' },
  { id: 'devtools-latex-word', name: '复制到 Word', section: 'devtools', devtool: 'latex', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-file-word', keywords: ['Word','MathML','Temml'], val: 8, color: '#c4b5fd' },
  { id: 'devtools-latex-temml', name: 'Temml 导出设置', section: 'devtools', devtool: 'latex', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-sliders', keywords: ['Temml','MathML','Flat MML','XML','Annotate'], val: 7, color: '#c4b5fd' },
  { id: 'devtools-manim', name: 'Manim 工作台', section: 'devtools', devtool: 'manim', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-video', keywords: ['Manim','工作台'], val: 12, color: '#c4b5fd' },
  { id: 'devtools-ai-edit', name: 'AI 编写代码', section: 'devtools', devtool: 'manim', devtool_action: 'ai_edit', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-wand-magic-sparkles', keywords: ['AI 编辑','自然语言','Cursor'], val: 10, color: '#a78bfa' },
  { id: 'devtools-import', name: '导入脚本', section: 'devtools', devtool: 'manim', devtool_action: 'import', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-file-import', keywords: ['导入','脚本','导入脚本'], val: 9, color: '#a78bfa' },
  { id: 'devtools-save', name: '保存脚本', section: 'devtools', devtool: 'manim', devtool_action: 'save', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-floppy-disk', keywords: ['保存','保存脚本'], val: 9, color: '#a78bfa' },
  { id: 'devtools-summary', name: '生成视频文案', section: 'devtools', devtool: 'manim', devtool_action: 'summary', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-align-left', keywords: ['总结','文案','视频文案','生成文案'], val: 9, color: '#a78bfa' },
  { id: 'devtools-keyframe', name: '关键帧预览', section: 'devtools', devtool: 'manim', devtool_action: 'keyframe', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-film', keywords: ['关键帧','预览关键帧','断点'], val: 9, color: '#a78bfa' },
  { id: 'devtools-run', name: '运行 Manim', section: 'devtools', devtool: 'manim', devtool_action: 'run', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-play', keywords: ['运行','渲染','执行'], val: 10, color: '#a78bfa' },
  { id: 'devtools-rainbow', name: 'Rainbow 拓展', section: 'devtools', devtool: 'rainbow', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-puzzle-piece', keywords: ['Rainbow','拓展'], val: 10, color: '#ddd6fe' },
  { id: 'devtools-shortcuts', name: '快捷键', section: 'devtools', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-keyboard', keywords: ['快捷键'], val: 7, color: '#c4b5fd' },
  { id: 'help', name: '使用文档', section: 'help', type: NODE_TYPE.SECTION, icon: 'fa-solid fa-circle-question', keywords: ['帮助','文档','FAQ','教程'], val: 11, color: '#94a3b8' },
  { id: 'help-update', name: '更新日志', section: 'help', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-file-lines', keywords: ['更新日志'], val: 8, color: '#cbd5e1' },
  { id: 'help-open-doc', name: '打开文档', section: 'help', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-file', keywords: ['文档'], val: 8, color: '#94a3b8' },
  { id: 'settings', name: '系统设置', section: null, type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-gear', keywords: ['设置','偏好','系统设置'], val: 9, color: '#64748b' },
  { id: 'settings-appearance', name: '外观与关于', settings_section: 'appearance', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-palette', keywords: ['外观','主题','深色','浅色'], val: 8, color: '#94a3b8' },
  { id: 'settings-profile', name: '账户与资料', settings_section: 'profile', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-user', keywords: ['账户','资料','头像','昵称'], val: 8, color: '#94a3b8' },
  { id: 'settings-agent', name: '智能体设置', settings_section: 'agent', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-robot', keywords: ['智能体设置','回车发送'], val: 8, color: '#94a3b8' },
  { id: 'settings-detect', name: '智能识别与画板', settings_section: 'detect', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-pen', keywords: ['识别设置','画板','手写','上传'], val: 8, color: '#94a3b8' },
  { id: 'settings-shortcuts', name: '画板快捷键', settings_section: 'shortcuts', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-keyboard', keywords: ['快捷键'], val: 8, color: '#94a3b8' },
  { id: 'settings-calc', name: '动态计算', settings_section: 'calc', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-calculator', keywords: ['计算设置','默认模式'], val: 8, color: '#94a3b8' },
  { id: 'settings-devtools', name: '开发者工具', settings_section: 'devtools', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-code', keywords: ['开发设置','默认标签'], val: 8, color: '#94a3b8' },
  { id: 'settings-examples', name: '教学案例与弹幕', settings_section: 'examples', type: NODE_TYPE.SUBTOOL, icon: 'fa-solid fa-film', keywords: ['弹幕','案例设置'], val: 8, color: '#94a3b8' },
  { id: 'student', name: '学生', section: null, type: NODE_TYPE.ROLE, role: 'student', val: 10, color: '#14b8a6' },
  { id: 'teacher', name: '教师', section: null, type: NODE_TYPE.ROLE, role: 'teacher', val: 10, color: '#f59e0b' },
  { id: 'creator', name: '创作者', section: null, type: NODE_TYPE.ROLE, role: 'creator', val: 10, color: '#8b5cf6' },
  { id: 'developer', name: '开发者', section: null, type: NODE_TYPE.ROLE, role: 'developer', val: 10, color: '#3b82f6' },
];

/**
 * 边定义：source -> target
 */
export const EDGES = [
  { source: 'center', target: 'home' },
  { source: 'center', target: 'agent' },
  { source: 'center', target: 'detect' },
  { source: 'center', target: 'calculate' },
  { source: 'center', target: 'examples' },
  { source: 'center', target: 'devtools' },
  { source: 'center', target: 'my-formulas' },
  { source: 'center', target: 'help' },
  { source: 'center', target: 'student' },
  { source: 'center', target: 'teacher' },
  { source: 'center', target: 'creator' },
  { source: 'center', target: 'developer' },
  { source: 'home', target: 'hero-cta' },
  { source: 'home', target: 'agent' },
  { source: 'home', target: 'detect' },
  { source: 'home', target: 'examples' },
  { source: 'home', target: 'tutorial' },
  { source: 'home', target: 'search' },
  { source: 'agent', target: 'agent-course' },
  { source: 'agent', target: 'agent-template' },
  { source: 'agent', target: 'agent-examples' },
  { source: 'agent', target: 'agent-clear' },
  { source: 'agent', target: 'agent-settings' },
  { source: 'agent', target: 'detect' },
  { source: 'agent', target: 'calculate' },
  { source: 'agent', target: 'examples' },
  { source: 'agent', target: 'my-formulas' },
  { source: 'agent', target: 'devtools' },
  { source: 'agent', target: 'devtools-latex' },
  { source: 'agent', target: 'devtools-manim' },
  { source: 'agent', target: 'devtools-rainbow' },
  { source: 'agent', target: 'help' },
  { source: 'detect', target: 'detect-handwrite' },
  { source: 'detect', target: 'detect-upload' },
  { source: 'detect-handwrite', target: 'detect-pen' },
  { source: 'detect-handwrite', target: 'detect-eraser' },
  { source: 'detect-handwrite', target: 'detect-undo' },
  { source: 'detect-handwrite', target: 'detect-clear' },
  { source: 'detect-handwrite', target: 'detect-lock' },
  { source: 'detect', target: 'detect-recognize' },
  { source: 'detect', target: 'detect-save' },
  { source: 'detect', target: 'detect-copy-calc' },
  { source: 'detect', target: 'detect-open-devtools-latex' },
  { source: 'detect', target: 'calculate' },
  { source: 'detect', target: 'my-formulas' },
  { source: 'calculate', target: 'calc-normal' },
  { source: 'calculate', target: 'calc-formula' },
  { source: 'calculate', target: 'calc-visual' },
  { source: 'calculate', target: 'calc-solution' },
  { source: 'calculate', target: 'calc-import' },
  { source: 'calculate', target: 'calc-clear' },
  { source: 'calculate', target: 'calc-generate' },
  { source: 'calculate', target: 'calc-steps' },
  { source: 'calculate', target: 'calc-save-script' },
  { source: 'calculate', target: 'my-formulas' },
  { source: 'calculate', target: 'devtools-manim' },
  { source: 'examples', target: 'examples-filter-all' },
  { source: 'examples', target: 'examples-favorites' },
  { source: 'examples', target: 'examples-watch-later' },
  { source: 'examples', target: 'examples-courseware' },
  { source: 'examples', target: 'examples-create-course' },
  { source: 'examples', target: 'examples-tag-filter' },
  { source: 'examples', target: 'errorbook' },
  { source: 'examples', target: 'examples-notes' },
  { source: 'examples', target: 'agent' },
  { source: 'examples', target: 'agent-course' },
  { source: 'my-formulas', target: 'formulas-tab' },
  { source: 'my-formulas', target: 'formulas-scripts' },
  { source: 'my-formulas', target: 'formulas-templates' },
  { source: 'my-formulas', target: 'formulas-refresh' },
  { source: 'my-formulas', target: 'formulas-edit' },
  { source: 'formulas-edit', target: 'formulas-edit-open-devtools-latex' },
  { source: 'formulas-edit', target: 'formulas-edit-save' },
  { source: 'formulas-scripts', target: 'formulas-new-script' },
  { source: 'formulas-scripts', target: 'formulas-run' },
  { source: 'my-formulas', target: 'detect' },
  { source: 'my-formulas', target: 'calculate' },
  { source: 'my-formulas', target: 'devtools' },
  { source: 'devtools', target: 'devtools-latex' },
  { source: 'devtools-latex', target: 'devtools-latex-import' },
  { source: 'devtools-latex', target: 'devtools-latex-save' },
  { source: 'devtools-latex', target: 'devtools-latex-copy' },
  { source: 'devtools-latex', target: 'devtools-latex-word' },
  { source: 'devtools-latex', target: 'devtools-latex-temml' },
  { source: 'devtools', target: 'devtools-manim' },
  { source: 'devtools-manim', target: 'devtools-ai-edit' },
  { source: 'devtools-manim', target: 'devtools-import' },
  { source: 'devtools-manim', target: 'devtools-save' },
  { source: 'devtools-manim', target: 'devtools-summary' },
  { source: 'devtools-manim', target: 'devtools-keyframe' },
  { source: 'devtools-manim', target: 'devtools-run' },
  { source: 'devtools', target: 'devtools-rainbow' },
  { source: 'devtools', target: 'devtools-shortcuts' },
  { source: 'devtools', target: 'my-formulas' },
  { source: 'devtools', target: 'examples' },
  { source: 'help', target: 'help-update' },
  { source: 'help', target: 'help-open-doc' },
  { source: 'help', target: 'agent' },
  { source: 'center', target: 'settings' },
  { source: 'settings', target: 'settings-appearance' },
  { source: 'settings', target: 'settings-profile' },
  { source: 'settings', target: 'settings-agent' },
  { source: 'settings', target: 'settings-detect' },
  { source: 'settings', target: 'settings-shortcuts' },
  { source: 'settings', target: 'settings-calc' },
  { source: 'settings', target: 'settings-devtools' },
  { source: 'settings', target: 'settings-examples' },
  { source: 'agent', target: 'settings-agent' },
  { source: 'detect', target: 'settings-detect' },
  { source: 'calculate', target: 'settings-calc' },
  { source: 'examples', target: 'settings-examples' },
];

/** 角色推荐路径（与 ROLE_FLOWS 结构一致） */
export const ROLE_FLOWS = {
  student: [
    { section: 'examples', label: '教学案例', icon: 'fa-solid fa-play', desc: '观看精选例题与讲解' },
    { section: 'calculate', label: '动态计算', icon: 'fa-solid fa-wand-magic-sparkles', desc: '公式可视化推演' },
    { section: 'examples', label: '错题本', icon: 'fa-solid fa-book', desc: '时间戳笔记与复习' },
  ],
  teacher: [
    { section: 'agent', label: '智能体创建课包', icon: 'fa-solid fa-robot', desc: '一键生成课件流水线' },
    { section: 'examples', label: '教学案例', icon: 'fa-solid fa-play', desc: '管理案例与课件包' },
    { section: 'detect', label: '智能识别', icon: 'fa-solid fa-eye', desc: '图片转公式补充素材' },
  ],
  creator: [
    { section: 'detect', label: '智能识别', icon: 'fa-solid fa-eye', desc: '图片转 LaTeX 公式' },
    { section: 'devtools', label: 'Manim 工作台', icon: 'fa-solid fa-code', desc: '编写动画脚本' },
    { section: 'examples', label: '教学案例', icon: 'fa-solid fa-play', desc: '发布与分享' },
  ],
  developer: [
    { section: 'devtools', label: '开发者工具', icon: 'fa-solid fa-code', desc: 'LaTeX / Manim / Rainbow' },
    { section: 'my-formulas', label: '我的算式', icon: 'fa-solid fa-book', desc: '组件与脚本复用' },
    { section: 'calculate', label: '动态计算', icon: 'fa-solid fa-wand-magic-sparkles', desc: '调试可视化' },
  ],
};

export const ROLE_LABELS = { student: '学生', teacher: '教师', creator: '内容创作者', developer: '开发者' };

/** section -> 显示名称（供智能体 getStepLabel 等使用） */
export function getSectionDisplayName(sectionId) {
  const node = NODES.find((n) => n.section === sectionId && n.type === NODE_TYPE.SECTION);
  return node ? node.name : sectionId;
}

/** 节点 id -> section 映射（用于根据 section 找节点） */
const SECTION_TO_NODE_IDS = {};
NODES.forEach((n) => {
  if (n.section) {
    if (!SECTION_TO_NODE_IDS[n.section]) SECTION_TO_NODE_IDS[n.section] = [];
    SECTION_TO_NODE_IDS[n.section].push(n.id);
  }
});

/** 获取节点 */
export function getNodeById(id) {
  return NODES.find((n) => n.id === id) || null;
}

/** 获取所有节点 */
export function getNodes() {
  return [...NODES];
}

/** 获取所有边 */
export function getEdges() {
  return [...EDGES];
}

/** 获取完整图（3d-force-graph 格式） */
export function getGraphData() {
  return { nodes: getNodes(), links: getEdges() };
}

/** 获取 3D 图谱用完整图（全部节点） */
export function getGraphDataFor3D() {
  return getGraphData();
}

/**
 * 地铁式导航：返回有序路径 [prev... , current, next...]
 * 用于智算星云横向展示：◀ prev1 — prev2 — [当前] — next1 — next2 ▶
 */
export function getMetroPathForSection(sectionId, devtool) {
  const { prev, next } = getPrevNextForSection(sectionId, devtool);
  const nodeIds = SECTION_TO_NODE_IDS[sectionId] || [];
  const currentNodeId = devtool ? `devtools-${devtool}` : nodeIds[0] || sectionId;
  const node = getNodeById(currentNodeId) || NODES.find((n) => n.section === sectionId);
  const current = node ? [{ id: node.id, name: node.name, section: node.section, devtool: node.devtool, current: true }] : [];
  return [...prev.slice(0, 3).reverse(), ...current, ...next.slice(0, 3)];
}

/** 获取节点的后继（从该节点出发的边） */
export function getOutNeighbors(nodeId) {
  return EDGES.filter((e) => e.source === nodeId)
    .map((e) => getNodeById(e.target))
    .filter(Boolean);
}

/** 获取节点的前驱（指向该节点的边） */
export function getInNeighbors(nodeId) {
  return EDGES.filter((e) => e.target === nodeId)
    .map((e) => getNodeById(e.source))
    .filter(Boolean);
}

/**
 * 根据当前 section 获取「上一步 / 下一步」节点
 * @param {string} sectionId - 当前所在 section（home/agent/detect/calculate/examples/devtools/my-formulas/help）
 * @param {string} [devtool] - 若在 devtools 页，可传入 latex/manim/rainbow
 * @returns {{ prev: Array<{id, name, section, devtool}>, next: Array<{id, name, section, devtool}> }}
 */
export function getPrevNextForSection(sectionId, devtool) {
  const prev = [];
  const next = [];
  const nodeIds = SECTION_TO_NODE_IDS[sectionId] || [];
  const currentNodeId = devtool ? `devtools-${devtool}` : nodeIds[0] || sectionId;
  const node = getNodeById(currentNodeId) || NODES.find((n) => n.section === sectionId);

  if (node) {
    getInNeighbors(node.id).forEach((n) => {
      if (n.section) prev.push({ id: n.id, name: n.name, section: n.section, devtool: n.devtool });
    });
    getOutNeighbors(node.id).forEach((n) => {
      if (n.section) next.push({ id: n.id, name: n.name, section: n.section, devtool: n.devtool });
    });
  }

  return { prev, next };
}

/**
 * 执行节点对应的功能（供知识图谱点击、智能体步骤执行使用）
 * @param {object} node - 知识图谱节点
 * @param {object} [opts] - { skipFocus: boolean } 是否跳过相机聚焦（role-graph 内部聚焦时传 true）
 * @returns {boolean} 是否已处理
 */
export function executeNodeAction(node, opts = {}) {
  if (!node) return false;
  const { skipFocus } = opts;

  if (node.role) {
    if (typeof window.RoleGraph !== 'undefined' && typeof window.RoleGraph.openFlow === 'function') {
      window.RoleGraph.openFlow(node.role);
    }
    return true;
  }

  if (node.id === 'center') return true;

  if (node.settings_section) {
    if (typeof window.openSettings === 'function') {
      window.openSettings(node.settings_section);
    }
    return true;
  }

  if (node.id === 'settings' && typeof window.openSettings === 'function') {
    window.openSettings();
    return true;
  }

  if (node.section && typeof window.showSection === 'function') {
    window.showSection(node.section);
  }

  if (node.section === 'devtools' && node.devtool && typeof window.switchDevTool === 'function') {
    setTimeout(() => window.switchDevTool(node.devtool), 80);
  }

  if (node.section === 'examples' && node.filter_mode) {
    if (typeof window.Examples !== 'undefined' && typeof window.Examples.switchExamplesFilter === 'function') {
      setTimeout(() => window.Examples.switchExamplesFilter(node.filter_mode), 150);
    }
  }

  if (node.section === 'calculate' && node.calc_operation) {
    const method = document.getElementById('calc-method');
    if (method) method.value = node.calc_operation;
  }

  if (node.section === 'devtools' && node.devtool === 'manim' && node.devtool_action) {
    const D = window.DevTools;
    const act = () => {
      switch (node.devtool_action) {
        case 'ai_edit': if (D?.toggleAiEditPanel) D.toggleAiEditPanel(); break;
        case 'import': if (D?.toggleImportPanel) D.toggleImportPanel(); break;
        case 'save': if (D?.saveScriptFromWorkbench) D.saveScriptFromWorkbench(); break;
        case 'summary': if (D?.generateVideoCopy) D.generateVideoCopy(); break;
        case 'keyframe': if (D?.previewKeyframes) D.previewKeyframes(); break;
        case 'run': if (typeof window.runDevManim === 'function') window.runDevManim(); break;
        default: break;
      }
    };
    setTimeout(act, 400);
  }

  if (node.section === 'detect' && node.id === 'detect-open-devtools-latex') {
    if (typeof window.openInDevLatexFromDetect === 'function') {
      setTimeout(() => window.openInDevLatexFromDetect(), 200);
    }
  }

  if (node.section === 'examples' && node.id === 'examples-create-course') {
    if (typeof window.openCoursePackModal === 'function') setTimeout(() => window.openCoursePackModal(), 200);
  }

  if (node.section === 'my-formulas' && node.id === 'formulas-refresh') {
    if (typeof window.loadMyFormulas === 'function') setTimeout(() => window.loadMyFormulas(), 200);
  }

  return true;
}

/**
 * 获取知识图谱摘要（供智能体意图识别与工具调用）
 * 返回结构化描述，便于 LLM 理解节点与功能映射
 */
export function getKnowledgeGraphForAgent() {
  const items = NODES.filter((n) => n.section && n.type !== NODE_TYPE.ROLE && n.id !== 'center')
    .map((n) => {
      const parts = [n.name, `section=${n.section}`];
      if (n.filter_mode) parts.push(`filter_mode=${n.filter_mode}`);
      if (n.calc_operation) parts.push(`operation=${n.calc_operation}`);
      if (n.devtool) parts.push(`devtool=${n.devtool}`);
      if (n.devtool_action) parts.push(`devtool_action=${n.devtool_action}`);
      return { id: n.id, keywords: (n.keywords || []).join(','), action: parts.join(', ') };
    });
  return items;
}

/**
 * 根据节点 id 转为智能体 step 格式
 */
export function nodeToAgentStep(node) {
  if (!node || !node.section) return null;
  const step = { section: node.section };
  if (node.filter_mode) step.examples_filter = node.filter_mode;
  if (node.calc_operation) step.operation = node.calc_operation;
  if (node.devtool) step.devtool = node.devtool;
  if (node.devtool_action) step.devtool_action = node.devtool_action;
  return step;
}

/**
 * 意图解析：根据用户输入关键词匹配到节点
 * @param {string} text - 用户输入
 * @returns {Array<{node, score}>} 匹配到的节点及得分
 */
export function resolveIntent(text) {
  if (!text || typeof text !== 'string') return [];
  const lower = text.trim().toLowerCase();
  const results = [];
  NODES.forEach((node) => {
    if (!node.keywords || node.keywords.length === 0) return;
    let score = 0;
    for (const kw of node.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += 1;
        if (kw.length >= 2) score += 0.5;
      }
    }
    if (score > 0) results.push({ node, score });
  });
  results.sort((a, b) => b.score - a.score);
  return results;
}
