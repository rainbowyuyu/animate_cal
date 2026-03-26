<template>
  <section id="calculate" class="section">
    <h2 class="section-title">数学运算可视化</h2>
    <div class="calc-layout">
      <!-- 左侧配置区 -->
      <div class="calc-sidebar glass-panel calc-sidebar-panel">
        <div class="calc-mode-block">
          <label class="calc-block-label">
            <i class="fa-solid fa-layer-group"></i>
            演示模式
          </label>
          <select id="calc-method" class="tech-select calc-select">
            <option value="normal">通用公式推演+可视化 (推荐)</option>
            <option value="formular">公式推演</option>
            <option value="visualization">可视化演示</option>
            <option value="solution">完整解题演示</option>
            <option value="det" disabled>矩阵专项</option>
            <option value="int" disabled>微积分专项</option>
          </select>
          <p class="calc-block-hint">
            * "通用模式"下，将自动分析您输入的算式并生成对应动画。
          </p>
        </div>

        <!-- 核心：单一大公式输入区 -->
        <div class="formula-input-wrapper calc-input-card">
          <div class="input-header">
            <label class="calc-input-label">
              <i class="fa-solid fa-calculator"></i>
              数学表达式
            </label>
            <div class="header-actions">
              <button
                class="btn-import"
                @click="openFormulaSelector('A')"
                title="从库中导入"
              >
                <i class="fa-solid fa-book-bookmark"></i>
                导入
              </button>
              <button
                class="btn-import btn-import-danger"
                @click="clearCalcInput"
                title="清空"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>

          <!-- MathLive 可视化编辑（可滚动，长题看全） -->
          <div
            class="math-field-container main-input"
            id="math-field-container-main"
          >
            <math-field
              id="math-field-main"
              virtual-keyboard-mode="manual"
              placeholder="例如 \int_0^{\frac{\pi}{2}}\frac{\sin x}{1+x^2}\,dx&lt;\int_0^{\frac{\pi}{2}}\frac{\cos x}{1+x^2}\,dx"
            >
              \int_{0}^{\frac{\pi}{2}} \frac{\sin x}{1 + x^{2}} \, dx <
              \int_{0}^{\frac{\pi}{2}} \frac{\cos x}{1 + x^{2}} \, dx
            </math-field>
          </div>

          <!-- 代码折叠区 -->
          <details class="code-details">
            <summary>
              <span>
                <i class="fa-solid fa-code"></i>
                编辑 LaTeX 源码
              </span>
            </summary>
            <textarea
              id="latex-code-main"
              placeholder="\int_0^{\frac{\pi}{2}}\frac{\sin x}{1+x^2}\,dx<\int_0^{\frac{\pi}{2}}\frac{\cos x}{1+x^2}\,dx"
            ></textarea>
          </details>
        </div>

        <!-- 底部操作按钮 -->
        <div class="calc-cta-wrap">
          <button
            type="button"
            class="calc-cta-btn action-btn full-width"
            @click="startAnimation"
          >
            <i class="fa-solid fa-clapperboard"></i>
            生成可视化动画
          </button>
        </div>
      </div>

      <!-- 右侧显示区 (重构：分屏布局) -->
      <div
        class="calc-display glass-panel"
        style="display: flex; flex-direction: column; overflow: hidden; padding: 0"
      >
        <!-- 1. 顶部：视频切换选项卡 (JS动态控制显示) -->
        <div
          id="video-tabs"
          style="
            display: none;
            background: #0f172a;
            border-bottom: 1px solid #334155;
            padding: 0 10px;
          "
        >
          <!-- JS 注入 -->
        </div>

        <!-- 2. 上半部分：视频播放区 -->
        <div
          id="calc-video-wrapper"
          class="calc-video-wrapper-bg"
          style="
            flex: 3;
            position: relative;
            display: flex;
            flex-direction: column;
            border-bottom: 1px solid #334155;
            min-height: 300px;
            overflow: hidden;
          "
        >
          <!-- 默认占位符（初始状态） -->
          <div id="video-placeholder-content" class="calc-video-placeholder">
            <i class="fa-solid fa-cube"></i>
            <p>等待指令...</p>
            <span>配置左侧参数后点击生成</span>
          </div>

          <!-- 单阶段模式双窗口：解题步骤 | 视频 -->
          <div
            id="calc-single-wrap"
            class="calc-stack-wrap"
            style="display: none"
          >
            <div class="calc-stack-tabs">
              <button
                type="button"
                class="calc-stack-tab"
                data-tab="steps"
                aria-label="解题步骤"
              >
                解题步骤
              </button>
              <button
                type="button"
                class="calc-stack-tab active"
                data-tab="video"
                aria-label="视频"
              >
                视频
              </button>
            </div>
            <div class="calc-stack-windows">
              <div
                class="calc-stack-window calc-stack-window-steps"
                id="calc-window-steps-single"
              >
                <div class="calc-window-inner calc-steps-window-inner">
                  <div
                    id="calc-steps-content-single"
                    class="calc-steps-content markdown-body calc-steps-waiting"
                  >
                    <span>等待解题步骤</span>
                    <span class="loading-dots">
                      <span class="dot">.</span>
                      <span class="dot">.</span>
                      <span class="dot">.</span>
                    </span>
                  </div>
                </div>
              </div>
              <div
                class="calc-stack-window calc-stack-window-video active"
                id="calc-window-video-single"
              >
                <div class="calc-window-inner">
                  <div
                    id="calc-window-loading-single"
                    class="calc-window-loading"
                    style="display: none"
                    aria-hidden="true"
                  >
                    <i class="fa-solid fa-circle-notch fa-spin calc-window-loading-spinner"></i>
                    <p class="calc-window-loading-text">正在渲染</p>
                  </div>
                  <video
                    id="result-video-player"
                    controls
                    style="display: none; outline: none"
                  ></video>
                  <div
                    id="calc-placeholder-single"
                    class="calc-window-placeholder"
                  >
                    <span>等待渲染</span>
                    <span class="loading-dots">
                      <span class="dot">.</span>
                      <span class="dot">.</span>
                      <span class="dot">.</span>
                    </span>
                  </div>
                  <div
                    id="calc-save-script-wrap"
                    class="calc-window-save"
                    style="display: none"
                  >
                    <button
                      type="button"
                      class="action-btn secondary"
                      id="btn-save-to-scripts"
                      @click="saveLastCodeToScripts()"
                      style="
                        font-size: 0.85rem;
                        padding: 8px 14px;
                      "
                    >
                      <i class="fa-solid fa-bookmark"></i>
                      保存到动画脚本库
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 渲染中加载层 -->
          <div
            id="calc-render-loading"
            class="calc-render-loading"
            style="display: none"
          >
            <i class="fa-solid fa-circle-notch fa-spin calc-render-loading-spinner"></i>
            <p class="calc-render-loading-text">正在生成与渲染...</p>
          </div>

          <!-- 通用模式三窗口：解题步骤 | 计算 | 可视化 -->
          <div
            id="calc-dual-videos-wrap"
            class="calc-stack-wrap"
            style="display: none"
          >
            <div class="calc-stack-tabs">
              <button
                type="button"
                class="calc-stack-tab"
                data-tab="steps"
                aria-label="解题步骤"
              >
                解题步骤
              </button>
              <button
                type="button"
                class="calc-stack-tab active"
                data-tab="calc"
                aria-label="计算"
              >
                计算
              </button>
              <button
                type="button"
                class="calc-stack-tab"
                data-tab="vis"
                aria-label="可视化"
              >
                可视化
              </button>
            </div>
            <div class="calc-stack-windows">
              <div
                class="calc-stack-window calc-stack-window-steps"
                id="calc-window-steps"
              >
                <div class="calc-window-inner calc-steps-window-inner">
                  <div
                    id="calc-steps-content"
                    class="calc-steps-content markdown-body calc-steps-waiting"
                  >
                    <span>等待解题步骤</span>
                    <span class="loading-dots">
                      <span class="dot">.</span>
                      <span class="dot">.</span>
                      <span class="dot">.</span>
                    </span>
                  </div>
                </div>
              </div>
              <div
                class="calc-stack-window calc-stack-window-calc active"
                id="calc-window-calc"
              >
                <div class="calc-window-inner">
                  <div
                    id="calc-window-loading-calc"
                    class="calc-window-loading"
                    style="display: none"
                    aria-hidden="true"
                  >
                    <i class="fa-solid fa-circle-notch fa-spin calc-window-loading-spinner"></i>
                    <p class="calc-window-loading-text">正在计算</p>
                  </div>
                  <video
                    id="result-video-player-calc"
                    controls
                    style="display: none; outline: none"
                  ></video>
                  <div
                    id="calc-placeholder-calc"
                    class="calc-window-placeholder"
                  >
                    <span>等待「计算」渲染</span>
                    <span class="loading-dots">
                      <span class="dot">.</span>
                      <span class="dot">.</span>
                      <span class="dot">.</span>
                    </span>
                  </div>
                  <div
                    id="calc-save-calc-wrap"
                    class="calc-window-save"
                    style="display: none"
                  >
                    <button
                      type="button"
                      class="action-btn secondary"
                      @click="saveLastCodeToScripts('calc')"
                    >
                      <i class="fa-solid fa-bookmark"></i>
                      保存计算脚本
                    </button>
                  </div>
                </div>
              </div>
              <div
                class="calc-stack-window calc-stack-window-vis"
                id="calc-window-vis"
              >
                <div class="calc-window-inner">
                  <div
                    id="calc-window-loading-vis"
                    class="calc-window-loading"
                    style="display: none"
                    aria-hidden="true"
                  >
                    <i class="fa-solid fa-circle-notch fa-spin calc-window-loading-spinner"></i>
                    <p class="calc-window-loading-text">正在可视化</p>
                  </div>
                  <video
                    id="result-video-player-vis"
                    controls
                    style="display: none; outline: none"
                  ></video>
                  <div
                    id="calc-placeholder-vis"
                    class="calc-window-placeholder"
                  >
                    <span>等待「可视化」渲染</span>
                    <span class="loading-dots">
                      <span class="dot">.</span>
                      <span class="dot">.</span>
                      <span class="dot">.</span>
                    </span>
                  </div>
                  <div
                    id="calc-save-vis-wrap"
                    class="calc-window-save"
                    style="display: none"
                  >
                    <button
                      type="button"
                      class="action-btn secondary"
                      @click="saveLastCodeToScripts('vis')"
                    >
                      <i class="fa-solid fa-bookmark"></i>
                      保存可视化脚本
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. 下半部分：代码/日志控制台 -->
        <div id="calc-terminal-wrapper" class="calc-terminal-wrapper">
          <div class="calc-terminal-header">
            <span class="calc-terminal-title">
              <i class="fa-solid fa-terminal"></i>
              <span id="console-title">系统日志</span>
            </span>
            <span id="gen-percent" class="calc-terminal-percent">0%</span>
          </div>
          <div class="calc-terminal-progress-track">
            <div id="gen-progress" class="calc-terminal-progress-bar"></div>
          </div>
          <div id="gen-log" class="calc-terminal-log">
            <div class="log-entry">&gt; 系统就绪，等待输入...</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
function openFormulaSelector(slot: string) {
  (window as any).openFormulaSelector?.(slot);
}

function clearCalcInput() {
  (window as any).clearCalcInput?.();
}

function startAnimation() {
  (window as any).startAnimation?.();
}

function saveLastCodeToScripts(mode?: "calc" | "vis") {
  (window as any).Calculate?.saveLastCodeToScripts?.(mode);
}
</script>

<template>
  <section id="calculate" class="section">
    <div class="placeholder-section">
      <h2>动态计算</h2>
      <p>这里将迁移为 Vue 化的动态计算与可视化页面。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
</script>

