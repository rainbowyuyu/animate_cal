import { computed, onMounted, ref, type Ref } from "vue";

/**
 * 与「智能识别」页面相关的核心逻辑：
 * - 管理识别中的状态
 * - 同步 MathLive 与源码 textarea
 * - 调用后端 /api/detect
 * - 将结果导出到计算页 / Devtools
 *
 * 注意：为了兼容旧版静态页，这里仍然通过 DOM id 访问 MathLive 与 textarea，
 * 但对外只暴露响应式状态与函数，Vue 组件不再直接依赖 window.*。
 */

function checkContent(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  return (
    t.length > 0 &&
    !t.includes("等待识别") &&
    !t.includes("正在识别") &&
    !t.includes("等待输入") &&
    !t.startsWith("\\text{Error")
  );
}

export interface UseDetectServiceResult {
  currentLatex: Ref<string>;
  isRecognizing: Ref<boolean>;
  canOperate: Ref<boolean>;
  initDomBindings: () => void;
  processRecognition: () => Promise<void>;
  copyToCalc: () => Promise<void>;
  openInDevLatexFromDetect: () => void;
}

export function useDetectService(): UseDetectServiceResult {
  const currentLatex = ref("");
  const isRecognizing = ref(false);
  const domBound = ref(false);

  const canOperate = computed(
    () => checkContent(currentLatex.value) && !isRecognizing.value,
  );

  function syncFromMathField() {
    const mathField = document.getElementById(
      "latex-output",
    ) as any | null | undefined;
    if (mathField && typeof mathField.getValue === "function") {
      currentLatex.value = String(mathField.getValue() ?? "");
    }
  }

  function initDomBindings() {
    if (domBound.value) return;
    const mathField = document.getElementById(
      "latex-output",
    ) as any | null | undefined;
    const codeArea = document.getElementById(
      "latex-code-detect",
    ) as HTMLTextAreaElement | null;

    if (mathField && codeArea) {
      // MathLive -> Textarea
      mathField.addEventListener("input", (e: any) => {
        const val = e?.target?.value ?? "";
        codeArea.value = val;
        currentLatex.value = val;
      });

      // Textarea -> MathLive
      codeArea.addEventListener("input", (e) => {
        const target = e.target as HTMLTextAreaElement;
        const val = target.value;
        if (typeof mathField.setValue === "function") {
          mathField.setValue(val);
        }
        currentLatex.value = val;
      });

      // 初始化一次
      syncFromMathField();
      domBound.value = true;
    }
  }

  async function processRecognition() {
    const mathField = document.getElementById(
      "latex-output",
    ) as any | null | undefined;
    const codeArea = document.getElementById(
      "latex-code-detect",
    ) as HTMLTextAreaElement | null;

    isRecognizing.value = true;

    if (mathField && typeof mathField.setValue === "function") {
      mathField.setValue(String.raw`\\text{正在识别...}`);
    }
    if (codeArea) {
      codeArea.value = String.raw`\\text{正在识别...}`;
    }
    currentLatex.value = String.raw`\\text{正在识别...}`;

    let blob: Blob | null = null;

    // 判断当前是手写模式还是上传模式
    const drawTab = document.querySelector(
      ".tab-btn[onclick*=\"draw\"]",
    ) as HTMLElement | null;
    const isDrawMode = drawTab?.classList.contains("active");

    try {
      if (isDrawMode) {
        const maybeGetCanvasBlob = (window as any).getCanvasBlob as
          | (() => Promise<Blob | null>)
          | undefined;
        if (maybeGetCanvasBlob) {
          blob = await maybeGetCanvasBlob();
        }
      } else {
        const fileInput = document.getElementById(
          "image-upload",
        ) as HTMLInputElement | null;
        if (fileInput?.files && fileInput.files.length > 0) {
          blob = fileInput.files[0];
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (!blob) {
      const msg = isDrawMode ? "请先绘制内容" : "请先上传图片";
      if (typeof (window as any).showAlert === "function") {
        await (window as any).showAlert(msg, "提示");
      }
      if (mathField && typeof mathField.setValue === "function") {
        mathField.setValue(String.raw`\\text{等待输入...}`);
      }
      if (codeArea) {
        codeArea.value = String.raw`\\text{等待输入...}`;
      }
      currentLatex.value = String.raw`\\text{等待输入...}`;
      isRecognizing.value = false;
      return;
    }

    const formData = new FormData();
    formData.append("file", blob);

    try {
      const response = await fetch("/api/detect", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.status === "success") {
        const latex = String(data.latex ?? "");
        if (mathField && typeof mathField.setValue === "function") {
          mathField.setValue(latex);
        }
        if (codeArea) {
          codeArea.value = latex;
        }
        currentLatex.value = latex;

        // vision_prompt 持久化，供动态计算复用
        try {
          if (data.vision_prompt && typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(
              "last_detect_vision_prompt",
              String(data.vision_prompt),
            );
          } else if (typeof sessionStorage !== "undefined") {
            sessionStorage.removeItem("last_detect_vision_prompt");
          }
        } catch (e) {
          console.warn("persist vision_prompt failed", e);
        }

        const container = document.querySelector(
          ".result-panel",
        ) as HTMLElement | null;
        if (container) {
          const original = container.style.boxShadow;
          container.style.boxShadow = "0 0 0 2px var(--primary-color)";
          setTimeout(() => {
            container.style.boxShadow = original;
          }, 1000);
        }
      } else {
        const msg = String(data.message ?? "识别失败");
        if (mathField && typeof mathField.setValue === "function") {
          mathField.setValue(String.raw`\\text{Error: }` + msg);
        }
        if (codeArea) {
          codeArea.value = String.raw`\\text{Error: }` + msg;
        }
        currentLatex.value = String.raw`\\text{Error: }` + msg;
      }
    } catch (e: any) {
      console.error(e);
      if (mathField && typeof mathField.setValue === "function") {
        mathField.setValue(String.raw`\\text{网络错误}`);
      }
      if (codeArea) {
        codeArea.value = String.raw`\\text{网络错误}`;
      }
      currentLatex.value = String.raw`\\text{网络错误}`;
    } finally {
      isRecognizing.value = false;
    }
  }

  async function copyToCalc() {
    syncFromMathField();
    const latex = currentLatex.value;
    if (!checkContent(latex)) {
      if (typeof (window as any).showAlert === "function") {
        await (window as any).showAlert(
          "请先进行识别或输入有效公式",
          "提示",
        );
      }
      return;
    }

    if (typeof (window as any).showSection === "function") {
      (window as any).showSection("calculate");
    }

    setTimeout(() => {
      const field = document.getElementById(
        "math-field-main",
      ) as any | null | undefined;
      const code = document.getElementById(
        "latex-code-main",
      ) as HTMLTextAreaElement | null;
      if (field && typeof field.setValue === "function") {
        field.setValue(latex);
      }
      if (code) {
        code.value = latex;
      }
    }, 100);
  }

  function openInDevLatexFromDetect() {
    syncFromMathField();
    const latex = currentLatex.value;
    if (!checkContent(latex)) {
      if (typeof (window as any).showAlert === "function") {
        (window as any).showAlert(
          "请先识别出有效公式后再编辑",
          "提示",
        );
      }
      return;
    }

    if (typeof (window as any).showSection === "function") {
      (window as any).showSection("devtools");
    }
    setTimeout(() => {
      if (typeof (window as any).switchDevTool === "function") {
        (window as any).switchDevTool("latex");
      }
      const DevTools = (window as any).DevTools;
      if (DevTools && typeof DevTools.fillLatexInDevtools === "function") {
        DevTools.fillLatexInDevtools(latex);
      }
    }, 200);
  }

  // 默认在组件挂载时尝试做一次 DOM 绑定
  onMounted(() => {
    initDomBindings();
  });

  return {
    currentLatex,
    isRecognizing,
    canOperate: computed(() => canOperate.value),
    initDomBindings,
    processRecognition,
    copyToCalc,
    openInDevLatexFromDetect,
  };
}

