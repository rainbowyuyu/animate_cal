/**
 * 子页面浏览历史：返回/前进在智能体、计算、案例等子页面间切换，而非浏览器 URL
 */
const MAX_HISTORY = 32;
let stack = [];
let index = -1;

export function pushSection(sectionId) {
  if (index >= 0 && stack[index] === sectionId) return;
  stack = stack.slice(0, index + 1);
  if (stack.length >= MAX_HISTORY) stack.shift();
  else index++;
  stack.push(sectionId);
  index = stack.length - 1;
}

export function canGoBack() {
  return index > 0;
}

export function canGoForward() {
  return index >= 0 && index < stack.length - 1;
}

export function getBackSection() {
  return canGoBack() ? stack[index - 1] : null;
}

export function getForwardSection() {
  return canGoForward() ? stack[index + 1] : null;
}

export function goBack() {
  if (!canGoBack()) return null;
  index--;
  return stack[index];
}

export function goForward() {
  if (!canGoForward()) return null;
  index++;
  return stack[index];
}

export function getCurrentSection() {
  return index >= 0 ? stack[index] : null;
}

/** 与浏览器 History API 同步：popstate 后根据目标 section 更新索引 */
export function syncIndexToSection(sectionId) {
  const idx = stack.indexOf(sectionId);
  if (idx >= 0) index = idx;
  else {
    stack = stack.slice(0, index + 1);
    stack.push(sectionId);
    index = stack.length - 1;
  }
}

export function initSectionHistory(showSectionFn) {
  return {
    back: () => {
      const s = goBack();
      if (s && showSectionFn) showSectionFn(s);
    },
    forward: () => {
      const s = goForward();
      if (s && showSectionFn) showSectionFn(s);
    },
    canBack: canGoBack,
    canForward: canGoForward,
  };
}
