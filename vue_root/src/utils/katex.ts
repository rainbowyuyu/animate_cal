export function renderMathIn(container: HTMLElement | null | undefined) {
  if (!container) return;
  const anyWindow = window as any;
  const render = anyWindow.renderMathInElement;
  if (typeof render === "function") {
    const opts =
      (anyWindow.App &&
        anyWindow.App.config &&
        anyWindow.App.config.KATEX_RENDER_OPTS) ||
      {};
    try {
      render(container, opts);
    } catch (e) {
      console.warn("KaTeX render error", e);
    }
  }
}

