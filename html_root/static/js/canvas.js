// static/js/canvas.js

import { switchInputMode } from './ui.js'; // 引入 switchInputMode 用于自动切换

let canvas, ctx;
let isDrawing = false;
let points = [];
const historyStack = [];
let historyStep = -1;
const MAX_HISTORY = 50;

// 画笔光标（小圆圈）与 Alt+右键拖动调笔刷
let brushCursorEl = null;
let isResizeGesture = false;
let resizeStartX = 0;
let resizeStartVal = 0;

// 手机端触摸处理
// 设置中「锁定画板（手机版）」开启时，触摸仅滚动、不绘制
const CANVAS_LOCK_MOBILE_KEY = 'canvas_lock_mobile';
let touchCommittedToDraw = false;

function isCanvasLockedForTouch() {
    try {
        return localStorage.getItem(CANVAS_LOCK_MOBILE_KEY) === 'true';
    } catch (_) { return false; }
}

// 深色模式下画板与笔/橡皮颜色与主题一致，避免颜色错误
function isDarkTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}
function getCanvasBgColor() {
    return isDarkTheme() ? '#1e293b' : '#FFFFFF';
}
function getPenColor() {
    return isDarkTheme() ? '#e2e8f0' : '#000000';
}

export function setupCanvas() {
    canvas = document.getElementById('drawing-board');
    if (!canvas) return;

    ctx = canvas.getContext('2d', { willReadFrequently: true });

    // 1. ResizeObserver
    const parent = canvas.parentElement;
    const observer = new ResizeObserver(() => {
        requestAnimationFrame(resizeCanvas);
    });
    observer.observe(parent);

    // 2. 画笔光标（小圆圈，随画笔大小）
    const container = canvas.parentElement;
    if (container) {
        brushCursorEl = document.createElement('div');
        brushCursorEl.className = 'brush-cursor';
        brushCursorEl.setAttribute('aria-hidden', 'true');
        container.appendChild(brushCursorEl);
    }

    // 3. 鼠标/触摸事件
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('mouseout', onCanvasMouseOut);
    canvas.addEventListener('contextmenu', onCanvasContextMenu);
    // 触摸事件：锁定状态下使用 passive: true 允许滚动，解锁状态下使用 passive: false 阻止滚动
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    // 4. 监听模式切换 (自定义事件)
    window.addEventListener('mode-change', (e) => {
        const mode = e.detail;
        const dpr = window.devicePixelRatio || 1;
        if (mode === 'draw') {
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = getCanvasBgColor();
            ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            ctx.globalCompositeOperation = 'source-over';
        } else {
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        }
    });

    // 4. 主题切换时重绘画布背景，使手写面板与深浅色模式一致
    window.addEventListener('theme-change', () => {
        if (!canvas || !ctx) return;
        const preview = document.getElementById('uploaded-preview');
        const isUploadMode = preview && preview.style.display !== 'none' && preview.getAttribute('src');
        const dpr = window.devicePixelRatio || 1;
        if (!isUploadMode) {
            ctx.fillStyle = getCanvasBgColor();
            ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            historyStack.length = 0;
            historyStep = -1;
            saveState();
        }
    });

    // 5. 文件上传 Input 监听
    const uploadInput = document.getElementById('image-upload');
    if (uploadInput) {
        uploadInput.addEventListener('change', function(e) {
            if(e.target.files && e.target.files[0]) {
                handleImageFile(e.target.files[0]);
            }
        });
    }

    // --- 新增：全局粘贴监听 ---
    document.addEventListener('paste', handlePaste);
}

// 处理粘贴事件
function handlePaste(e) {
    // 只有在 detect 页面可见时才处理粘贴
    const detectSection = document.getElementById('detect');
    if (!detectSection || !detectSection.classList.contains('active-section')) return;

    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            const blob = item.getAsFile();

            // 1. 自动切换到上传模式
            if(window.switchInputMode) window.switchInputMode('upload');
            // 或者使用 import 的 switchInputMode
            // switchInputMode('upload');

            // 2. 将文件赋值给 input (为了兼容 detect.js 的逻辑)
            const fileInput = document.getElementById('image-upload');
            if (fileInput) {
                // 创建一个新的 FileList (Hack)
                const container = new DataTransfer();
                container.items.add(blob);
                fileInput.files = container.files;
            }

            // 3. 显示预览
            handleImageFile(blob);

            e.preventDefault(); // 阻止默认粘贴行为
            return;
        }
    }
}

/** 检测是否为移动设备 */
function isMobileDevice() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/** 显示画板编辑按钮 */
function showCanvasEditButton() {
    let btn = document.getElementById('canvas-edit-btn');
    if (!btn) {
        // 创建按钮
        btn = document.createElement('button');
        btn.id = 'canvas-edit-btn';
        btn.className = 'canvas-edit-btn';
        btn.innerHTML = '<i class="fa-solid fa-crop"></i> <span>编辑图片</span>';
        btn.title = '编辑图片（裁剪等）';
        btn.onclick = () => {
            const preview = document.getElementById('uploaded-preview');
            if (preview && preview.src && window.ImageEditor && window.ImageEditor.openEditor) {
                window.ImageEditor.openEditor('uploaded-preview', 'canvas');
            }
        };
        const canvasWrapper = document.querySelector('.canvas-wrapper');
        if (canvasWrapper) {
            canvasWrapper.appendChild(btn);
        }
    }
    btn.style.display = 'flex';
}

/** 隐藏画板编辑按钮 */
function hideCanvasEditButton() {
    const btn = document.getElementById('canvas-edit-btn');
    if (btn) {
        btn.style.display = 'none';
    }
}

// 统一处理图片加载与预览
// @param {File} file - 图片文件
// @param {boolean} skipAutoOpen - 是否跳过移动端自动打开编辑器（用于从编辑器应用时）
function handleImageFile(file, skipAutoOpen = false) {
    const fileNameDisplay = document.getElementById('file-name-display');
    if(fileNameDisplay) fileNameDisplay.innerText = file.name || "Pasted Image";

    const reader = new FileReader();
    reader.onload = function(evt) {
        const previewContainer = document.getElementById('uploaded-preview-container');
        const preview = document.getElementById('uploaded-preview');
        const dataUrl = evt.target.result;
        
        // 将图片绘制到 Canvas 上作为背景，而不是只显示预览图
        if (canvas && ctx) {
            const img = new Image();
            img.onload = function() {
                const dpr = window.devicePixelRatio || 1;
                const canvasWidth = canvas.width / dpr;
                const canvasHeight = canvas.height / dpr;
                
                // 清空画布
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                
                // 计算图片缩放以适应画布（保持宽高比）
                const imgAspect = img.width / img.height;
                const canvasAspect = canvasWidth / canvasHeight;
                
                let drawWidth, drawHeight, drawX, drawY;
                
                if (imgAspect > canvasAspect) {
                    // 图片更宽，以宽度为准
                    drawWidth = canvasWidth;
                    drawHeight = canvasWidth / imgAspect;
                    drawX = 0;
                    drawY = (canvasHeight - drawHeight) / 2;
                } else {
                    // 图片更高，以高度为准
                    drawWidth = canvasHeight * imgAspect;
                    drawHeight = canvasHeight;
                    drawX = (canvasWidth - drawWidth) / 2;
                    drawY = 0;
                }
                
                // 绘制图片到 canvas
                ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                
                // 保存状态到历史记录
                historyStack.length = 0;
                historyStep = -1;
                saveState();
                
                // 更新预览图（用于编辑器）
                if (preview) {
                    // 如果 skipAutoOpen 为 true，先清理可能存在的 onload 事件监听器
                    if (skipAutoOpen) {
                        preview.onload = null;
                    }
                    preview.src = dataUrl;
                }
                
                // 显示编辑按钮
                showCanvasEditButton();
                
                // 移动端：图片绘制完成后自动打开编辑器（除非是从编辑器应用来的）
                if (isMobileDevice() && !skipAutoOpen) {
                    // 等待预览图加载完成，然后打开编辑器
                    const openEditorWhenReady = () => {
                        // 检查是否应该跳过自动打开
                        if (skipAutoOpen || (window.ImageEditor && window.ImageEditor._editorJustClosed)) {
                            return;
                        }
                        
                        // 确保预览图已加载
                        if (preview && preview.complete && preview.naturalWidth > 0) {
                            setTimeout(() => {
                                // 再次检查标志
                                if (skipAutoOpen || (window.ImageEditor && window.ImageEditor._editorJustClosed)) {
                                    return;
                                }
                                
                                if (window.ImageEditor && typeof window.ImageEditor.openEditor === 'function') {
                                    try {
                                        window.ImageEditor.openEditor('uploaded-preview', 'canvas');
                                    } catch (e) {
                                        console.error('Failed to open editor:', e);
                                        if (typeof showToast === 'function') {
                                            showToast('打开编辑器失败，请重试', 'error');
                                        }
                                    }
                                } else {
                                    console.warn('ImageEditor not available, retrying...');
                                    setTimeout(openEditorWhenReady, 200);
                                }
                            }, 150);
                        } else {
                            // 等待预览图加载
                            preview.onload = openEditorWhenReady;
                        }
                    };
                    openEditorWhenReady();
                } else {
                    // 桌面端：隐藏预览容器（图片已绘制到 canvas）
                    if (previewContainer) {
                        previewContainer.style.display = 'none';
                    }
                }
            };
            img.onerror = function() {
                console.error('Failed to load image for canvas');
            };
            img.src = dataUrl;
        } else {
            // 如果 canvas 不可用，回退到原来的预览模式
            if(preview && previewContainer) {
                // 如果 skipAutoOpen 为 true，先清理可能存在的 onload 事件监听器
                if (skipAutoOpen) {
                    preview.onload = null;
                    preview.onerror = null;
                }
                
                preview.src = dataUrl;
                preview.style.display = 'block';
                previewContainer.style.display = 'block';
                
                // 移动端：图片加载完成后自动打开编辑器（除非是从编辑器应用来的）
                if (isMobileDevice() && !skipAutoOpen) {
                    const openEditorOnLoad = () => {
                        // 检查是否应该跳过自动打开
                        if (skipAutoOpen || (window.ImageEditor && window.ImageEditor._editorJustClosed)) {
                            return;
                        }
                        
                        setTimeout(() => {
                            // 再次检查标志
                            if (skipAutoOpen || (window.ImageEditor && window.ImageEditor._editorJustClosed)) {
                                return;
                            }
                            
                            if (window.ImageEditor && typeof window.ImageEditor.openEditor === 'function') {
                                try {
                                    window.ImageEditor.openEditor('uploaded-preview', 'canvas');
                                } catch (e) {
                                    console.error('Failed to open editor:', e);
                                    if (typeof showToast === 'function') {
                                        showToast('打开编辑器失败，请重试', 'error');
                                    }
                                }
                            } else {
                                console.warn('ImageEditor not available, retrying...');
                                setTimeout(openEditorOnLoad, 200);
                            }
                        }, 150);
                    };
                    preview.onload = openEditorOnLoad;
                    if (preview.complete && preview.naturalWidth > 0) {
                        openEditorOnLoad();
                    }
                }
                
                // 强制 Canvas 变透明
                const dpr = window.devicePixelRatio || 1;
                if (ctx && canvas) {
                    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
                }
            }
        }
    }
    reader.readAsDataURL(file);
}

// 导出供 image-editor.js 使用
export { handleImageFile };
// 同时挂载到全局，供 HTML 调用
window.handleImageFile = handleImageFile;


export function resizeCanvas() {
    if (!canvas || !ctx) return;

    const parent = canvas.parentElement;
    const rect = parent.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.floor(rect.width * dpr);
    const targetHeight = Math.floor(rect.height * dpr);

    if (canvas.width === targetWidth && canvas.height === targetHeight) return;

    let savedContent = null;
    if (canvas.width > 0 && canvas.height > 0) {
        savedContent = document.createElement('canvas');
        savedContent.width = canvas.width;
        savedContent.height = canvas.height;
        savedContent.getContext('2d').drawImage(canvas, 0, 0);
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const preview = document.getElementById('uploaded-preview');
    // 如果预览图是显示的，说明是上传模式，背景透明
    const isUploadMode = preview && preview.style.display !== 'none' && preview.getAttribute('src');

    if (!isUploadMode) {
        ctx.fillStyle = getCanvasBgColor();
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    } else {
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }

    if (savedContent) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(savedContent, 0, 0);
        ctx.restore();
    } else {
        if (historyStack.length === 0 && !isUploadMode) saveState();
    }
}

// ... (getPos, Touch Events, Draw Logic 保持不变) ...

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

/** 更新画笔光标圆圈的位置与大小，并显示；鼠标离开时由 onCanvasMouseOut 隐藏 */
function updateBrushCursor(e) {
    if (!brushCursorEl || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const diameter = Math.max(2, getBrushSize());
    const radius = diameter / 2;
    brushCursorEl.style.width = diameter + 'px';
    brushCursorEl.style.height = diameter + 'px';
    brushCursorEl.style.left = (e.clientX - rect.left - radius) + 'px';
    brushCursorEl.style.top = (e.clientY - rect.top - radius) + 'px';
    brushCursorEl.style.display = 'block';
    canvas.style.cursor = 'none';
}

function hideBrushCursor() {
    if (brushCursorEl) brushCursorEl.style.display = 'none';
    if (canvas) canvas.style.cursor = '';
}

/** Alt + 右键按下：开始拖动调整笔刷大小 */
function startResizeGesture(e) {
    e.preventDefault();
    isResizeGesture = true;
    resizeStartX = e.clientX;
    const el = document.getElementById('brush-size');
    resizeStartVal = el ? parseInt(el.value, 10) : 3;
}

/** Alt + 右键拖动：左滑变小、右滑变大，实时更新滑块与光标 */
function updateBrushByDrag(e) {
    const el = document.getElementById('brush-size');
    if (!el) return;
    const deltaX = e.clientX - resizeStartX;
    const step = 2; // 每 2 像素改变 1 档
    let v = resizeStartVal + Math.round(deltaX / step);
    v = Math.max(1, Math.min(20, v));
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

function endResizeGesture() {
    isResizeGesture = false;
}

function onCanvasContextMenu(e) {
    if (e.altKey) e.preventDefault();
}

function onCanvasMouseDown(e) {
    if (e.button === 2 && e.altKey) {
        startResizeGesture(e);
        return;
    }
    if (e.button === 0) startDraw(e);
}

function onCanvasMouseMove(e) {
    updateBrushCursor(e);
    if (isResizeGesture) {
        updateBrushByDrag(e);
        return;
    }
    draw(e);
}

function onCanvasMouseUp(e) {
    if (e.button === 2) endResizeGesture();
    if (e.button === 0) stopDraw();
}

function onCanvasMouseOut(e) {
    const parent = canvas && canvas.parentElement;
    if (e.relatedTarget && parent && parent.contains(e.relatedTarget)) return;
    stopDraw();
    endResizeGesture();
    hideBrushCursor();
}

function handleTouchStart(e) {
    if (!e.touches.length) return;
    
    // 锁定画板（手机版）：不拦截触摸，允许页面滑动
    if (isCanvasLockedForTouch()) {
        // 锁定状态下，不阻止默认行为，允许滚动
        touchCommittedToDraw = false;
        return;
    }
    
    // 解锁状态：立即开始绘制，自由书写
    e.preventDefault();
    const touch = e.touches[0];
    const mockEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => {}
    };
    startDraw(mockEvent);
    touchCommittedToDraw = true;
}

function handleTouchMove(e) {
    if (!e.touches.length) return;
    
    // 锁定画板（手机版）：不拦截触摸，允许页面滑动
    if (isCanvasLockedForTouch()) {
        // 锁定状态下，不阻止默认行为，允许滚动
        return;
    }
    
    // 解锁状态：继续绘制（自由书写，任何方向都可以绘制）
    if (touchCommittedToDraw) {
        e.preventDefault();
        const touch = e.touches[0];
        const mockEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {}
        };
        draw(mockEvent);
    }
}

function handleTouchEnd(e) {
    // 锁定画板（手机版）：不处理触摸结束事件
    if (isCanvasLockedForTouch()) {
        touchCommittedToDraw = false;
        return;
    }
    
    // 解锁状态：如果正在绘制，结束绘制
    if (touchCommittedToDraw) {
        e.preventDefault();
        stopDraw();
    }
    touchCommittedToDraw = false;
}

function startDraw(e) {
    isDrawing = true;
    // 第一笔之前若没有历史状态，先保存当前画布，这样第一笔也能撤回
    if (historyStack.length === 0) {
        saveState();
    }
    const pos = getPos(e);
    points = [pos];
    const brushSize = getBrushSize();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = getBrushColor();
    ctx.fill();
}

function draw(e) {
    if (!isDrawing) return;
    const pos = getPos(e);
    points.push(pos);
    if (points.length < 3) return;

    const brushSize = getBrushSize();
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = getBrushColor();

    ctx.beginPath();
    const len = points.length;
    ctx.moveTo(points[len - 2].x, points[len - 2].y);
    const midX = (points[len - 2].x + points[len - 1].x) / 2;
    const midY = (points[len - 2].y + points[len - 1].y) / 2;
    ctx.quadraticCurveTo(points[len - 2].x, points[len - 2].y, midX, midY);
    ctx.lineTo(points[len - 1].x, points[len - 1].y);
    ctx.stroke();
}

function stopDraw() {
    if (!isDrawing) return;
    isDrawing = false;
    points = [];
    saveState();
}

function getBrushSize() {
    const el = document.getElementById('brush-size');
    const val = el ? parseInt(el.value) : 3;
    return window.currentToolType === 'eraser' ? val * 5 : val;
}

function getBrushColor() {
    return window.currentToolType === 'eraser' ? getCanvasBgColor() : getPenColor();
}

function saveState() {
    if (historyStep < historyStack.length - 1) {
        historyStack.length = historyStep + 1;
    }
    historyStack.push(canvas.toDataURL());
    historyStep++;
    if (historyStack.length > MAX_HISTORY) {
        historyStack.shift();
        historyStep--;
    }
}

export function undo() {
    if (historyStep > 0) {
        historyStep--;
        restoreState();
    }
}

export function redo() {
    if (historyStep < historyStack.length - 1) {
        historyStep++;
        restoreState();
    }
}

function restoreState() {
    const img = new Image();
    img.src = historyStack[historyStep];
    img.onload = () => {
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        ctx.fillStyle = getCanvasBgColor();
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
    };
}

export function clearCanvas() {
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    const preview = document.getElementById('uploaded-preview');
    const isUploadMode = preview && preview.style.display !== 'none';

    if (!isUploadMode) {
        ctx.fillStyle = getCanvasBgColor();
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        // 清空画布后隐藏编辑按钮
        hideCanvasEditButton();
    } else {
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    saveState();
}

export function setTool(tool) {
    window.currentToolType = tool;
}

/** 笔刷粗细增减（供快捷键调用），delta 为 +1 或 -1 */
export function setBrushSizeDelta(delta) {
    const el = document.getElementById('brush-size');
    if (!el) return;
    const v = Math.max(1, Math.min(20, parseInt(el.value, 10) + delta));
    el.value = String(v);
}

export function getCanvasBlob() {
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
}