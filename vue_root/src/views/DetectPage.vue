<template>
  <section id="detect" class="section">
    <h2 class="section-title" style="margin: 1.5rem 0 1rem; font-size: 1.8rem">
      智能算式识别
    </h2>

    <div class="workspace">
      <div class="tools-panel">
        <div class="tab-switch">
          <button
            class="tab-btn"
            :class="{ active: inputMode === 'draw' }"
            @click="switchInputMode('draw')"
          >
            ✍️ 手写
          </button>
          <button
            class="tab-btn"
            :class="{ active: inputMode === 'upload' }"
            @click="switchInputMode('upload')"
          >
            📤 上传
          </button>
        </div>

        <div id="draw-tools" v-show="inputMode === 'draw'">
          <div class="control-group">
            <label>绘图工具</label>
            <div class="tools-grid">
              <button
                class="tool-btn active"
                @click="setTool('pen')"
                data-shortcut="toolPen"
                title="画笔 (B)"
              >
                <i class="fa-solid fa-pen"></i>
              </button>
              <button
                class="tool-btn"
                @click="setTool('eraser')"
                data-shortcut="toolEraser"
                title="橡皮擦 (E)"
              >
                <i class="fa-solid fa-eraser"></i>
              </button>
              <button class="tool-btn" @click="undo" data-shortcut="undo" title="撤销 (Ctrl+Z)">
                <i class="fa-solid fa-rotate-left"></i>
              </button>
              <button
                class="tool-btn"
                @click="redo"
                data-shortcut="redo"
                title="重做 (Ctrl+Shift+Z)"
              >
                <i class="fa-solid fa-rotate-right"></i>
              </button>
              <button
                class="tool-btn"
                @click="clearCanvas"
                data-shortcut="clearCanvas"
                title="清空画布 (Ctrl+Shift+C)"
                style="color: #ef4444"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>

            <button
              class="tutorial-link shortcut-hint-btn"
              @click="openSettings('shortcuts')"
              title="画板快捷键设置"
            >
              <i class="fa-solid fa-keyboard"></i>
              点击设置快捷键
            </button>
            <div
              style="
                margin-top: 1.25rem;
                padding-top: 1rem;
                border-top: 1px solid var(--border-color);
                display: flex;
                align-items: center;
                gap: 0.75rem;
              "
            >
              <label
                style="
                  margin: 0;
                  min-width: 48px;
                  font-size: 0.875rem;
                  font-weight: 600;
                  color: var(--text-main);
                  display: flex;
                  align-items: center;
                "
              >
                粗细
              </label>
              <input
                type="range"
                id="brush-size"
                min="1"
                max="20"
                value="3"
                style="flex: 1"
              />
            </div>
          </div>
        </div>

        <div id="upload-tools" v-show="inputMode === 'upload'">
          <label for="image-upload" class="upload-label">
            <i class="fa-solid fa-cloud-arrow-up upload-icon"></i>
            <span class="upload-text">点击或拖拽图片到此处</span>
            <span class="upload-text">或直接粘贴剪贴板图片</span>
            <input id="image-upload" type="file" accept="image/*" />
          </label>
          <div id="file-name-display" class="file-name"></div>
        </div>

        <div
          style="
            margin-top: auto;
            padding-top: 1rem;
            border-top: 1px solid var(--border-color);
          "
        >
          <button
            class="action-btn full-width"
            :disabled="isRecognizing"
            @click="processRecognitionHandler"
            style="
              height: 52px;
              font-size: 1rem;
              font-weight: 700;
              border-radius: 12px;
              background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
              color: #fff;
              border: none;
              box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            "
          >
            <i class="fa-solid fa-magnifying-glass"></i>
            立即识别
          </button>
          <p
            style="
              text-align: center;
              color: var(--text-secondary);
              font-size: 0.8rem;
              margin-top: 0.75rem;
              font-weight: 500;
            "
          >
            识别结果将显示在右侧底部
          </p>
        </div>
      </div>

      <div class="workspace-main">
        <div class="canvas-wrapper">
          <div id="canvas-container">
            <canvas id="drawing-board"></canvas>

            <div
              id="uploaded-preview-container"
              style="display: none; position: relative; width: 100%; height: 100%"
            >
              <img
                id="uploaded-preview"
                src=""
                alt="预览"
                style="display: none; width: 100%; height: 100%; object-fit: contain"
                @click="openImageEditor"
              />
              <div class="canvas-image-edit-hint">点击编辑</div>
            </div>
          </div>

          <button
            id="canvas-lock-btn"
            class="canvas-lock-btn"
            type="button"
            title="锁定画板（仅滑动不书写）"
            aria-label="锁定画板"
          >
            <i class="fa-solid fa-lock-open canvas-lock-icon" id="canvas-lock-icon"></i>
            <span class="canvas-lock-label" id="canvas-lock-label">锁定画板</span>
          </button>

          <div id="canvas-hint" class="canvas-hint">
            <i class="fa-solid fa-pen"></i>
            在此区域进行手写
          </div>
        </div>

        <div class="detect-action-bar">
          <button
            class="btn-detect-primary"
            type="button"
            :disabled="isRecognizing"
            @click="processRecognitionHandler"
            title="对手写或上传的公式进行识别"
          >
            <i class="fa-solid fa-magnifying-glass"></i>
            立即识别
          </button>
          <p class="detect-action-hint">识别结果将显示在下方</p>
        </div>

        <div class="result-panel">
          <div class="result-header">
            <div class="result-title">
              <i class="fa-solid fa-code"></i>
              识别结果
            </div>
            <details style="position: relative">
              <summary
                style="
                  font-size: 0.85rem;
                  color: var(--text-secondary);
                  cursor: pointer;
                "
              >
                <i class="fa-solid fa-terminal"></i>
                查看源码
              </summary>
              <div class="code-detail-popup">
                <textarea
                  id="latex-code-detect"
                  placeholder="LaTeX 代码..."
                  style="width: 100%; height: 100px; font-family: monospace; box-sizing: border-box"
                ></textarea>
              </div>
            </details>
          </div>

          <div class="math-field-container">
            <math-field id="latex-output" virtual-keyboard-mode="manual">
              \text{等待识别...}
            </math-field>
          </div>

          <div class="result-actions">
            <div style="font-size: 0.85rem; color: var(--text-secondary)">
              <i class="fa-regular fa-keyboard"></i>
              点击公式可直接修改
            </div>

            <div style="display: flex; gap: 10px; flex-wrap: wrap">
              <button
                id="btn-save-check"
                class="btn-calc-go"
                :disabled="!canOperate"
                @click="saveAndShowFormula"
                style="
                  background: linear-gradient(135deg, #10b981, #059669);
                  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                "
              >
                <i class="fa-regular fa-floppy-disk"></i>
                保存并查看
              </button>

              <button
                id="btn-copy-calc"
                class="action-btn secondary"
                :disabled="!canOperate"
                @click="copyToCalcHandler"
                style="padding: 0.8rem 1.5rem; border-radius: 99px"
                title="仅跳转到计算页，不保存"
              >
                去计算
                <i class="fa-solid fa-arrow-right"></i>
              </button>

              <button
                id="btn-edit-in-latex"
                class="action-btn tertiary"
                type="button"
                :disabled="!canOperate"
                @click="openInDevLatexFromDetectHandler"
                style="padding: 0.8rem 1.5rem; border-radius: 99px"
              >
                <i class="fa-solid fa-pen-to-square"></i>
                去 LaTeX 编辑器
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useDetectService } from "../services/detectService";

type InputMode = "draw" | "upload";

const inputMode = ref<InputMode>("draw");

const {
  isRecognizing,
  canOperate,
  processRecognition,
  copyToCalc,
  openInDevLatexFromDetect,
} = useDetectService();

function switchInputMode(mode: InputMode) {
  inputMode.value = mode;
}

function setTool(tool: "pen" | "eraser") {
  (window as any).setTool?.(tool);
}

function undo() {
  (window as any).undo?.();
}

function redo() {
  (window as any).redo?.();
}

function clearCanvas() {
  (window as any).clearCanvas?.();
}

function processRecognitionHandler() {
  processRecognition();
}

function openSettings(section?: string) {
  (window as any).openSettings?.(section);
}

function openImageEditor() {
  (window as any).ImageEditor?.openEditor?.("uploaded-preview", "canvas");
}

function saveAndShowFormula() {
  (window as any).saveAndShowFormula?.();
}

function copyToCalcHandler() {
  copyToCalc();
}

function openInDevLatexFromDetectHandler() {
  openInDevLatexFromDetect();
}
</script>

