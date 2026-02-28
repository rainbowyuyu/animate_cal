# 开发者工具：Manim 云端渲染（同步与流式）
# [安全] RCE 高危：用户代码在服务端执行。当前有简单关键字拦截与超时。
# 推荐：Docker/Firecracker 沙箱隔离 + 网络限制 + 资源限制，详见项目根目录 SECURITY.md
import asyncio
import json
import logging
import re
import os
import subprocess
import sys
import traceback
import uuid
from typing import Optional
from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse

from ..config import VIDEOS_DIR, client, api_key
from ..models import ManimCodeModel, ManimCodeEditModel, ManimKeyframeModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/devtools", tags=["devtools"])


def _locate_manim_video(media_dir: str, output_file: str, py_path: str) -> Optional[str]:
    """Manim 渲染完成后查找并移动视频到 static/videos，返回 /videos/xxx.mp4 或 None。"""
    import shutil
    py_base = os.path.basename(py_path).replace(".py", "")
    final_path = os.path.join(media_dir, output_file)
    possible_paths = [
        os.path.join(media_dir, output_file),
        os.path.join(media_dir, "videos", py_base, "480p15", "GenScene.mp4"),
        os.path.join(media_dir, "videos", py_base, "480p15", output_file),
    ]
    for p in possible_paths:
        if os.path.exists(p):
            if os.path.abspath(p) != os.path.abspath(final_path):
                shutil.move(p, final_path)
            try:
                os.remove(py_path)
            except Exception:
                pass
            return f"/videos/{output_file}"
    td = os.path.join(media_dir, "videos", py_base, "480p15")
    if os.path.isdir(td):
        for f in os.listdir(td):
            if f.endswith(".mp4"):
                shutil.move(os.path.join(td, f), final_path)
                try:
                    os.remove(py_path)
                except Exception:
                    pass
                return f"/videos/{output_file}"
    if os.path.isdir(os.path.join(media_dir, "videos")):
        for root, _, files in os.walk(os.path.join(media_dir, "videos")):
            for f in files:
                if f.endswith(".mp4") and py_base in root:
                    shutil.move(os.path.join(root, f), final_path)
                    try:
                        os.remove(py_path)
                    except Exception:
                        pass
                    return f"/videos/{output_file}"
            break
    return None


def _locate_preview_png(media_dir: str, output_file: str, py_base: str) -> Optional[str]:
    """Manim -s 渲染后查找预览 PNG。"""
    import shutil
    for root, _, files in os.walk(media_dir):
        if output_file in files:
            src = os.path.join(root, output_file)
            final_path = os.path.join(media_dir, output_file)
            if os.path.abspath(src) != os.path.abspath(final_path):
                shutil.move(src, final_path)
            return final_path
    return None


def _apply_breakpoint(code: str, breakpoint_line: int) -> str:
    """在指定行后插入 return，使 construct 执行到该行后停止。breakpoint_line 为 1-based。支持最后一行。"""
    lines = code.splitlines(keepends=True)
    if breakpoint_line < 1:
        return code
    if breakpoint_line > len(lines):
        breakpoint_line = len(lines)  # 允许超出的行号，视为最后一行
    idx = breakpoint_line - 1
    indent = ""
    for c in lines[idx]:
        if c in " \t":
            indent += c
        else:
            break
    new_line = indent + "return  # breakpoint\n"
    before = "".join(lines[:breakpoint_line])
    after = "".join(lines[breakpoint_line:])
    if before and not before.endswith("\n"):
        before += "\n"  # 最后一行无换行时，补换行避免与 return 拼接
    return before + new_line + after


@router.post("/render_keyframe")
async def render_keyframe(data: ManimKeyframeModel):
    """渲染单张关键帧预览图（Manim -s）。可选 breakpoint_line 指定渲染到该行为止。"""
    forbidden = ["import os", "import sys", "import subprocess", "rm -rf", "shutil"]
    for keyword in forbidden:
        if keyword in data.code:
            return JSONResponse(status_code=400, content={"status": "error", "message": f"安全拦截: 禁止使用 '{keyword}'"})

    code = data.code
    if data.breakpoint_line is not None:
        code = _apply_breakpoint(code, data.breakpoint_line)

    task_id = str(uuid.uuid4())
    py_filename = f"kf_{task_id}.py"
    py_path = os.path.join(VIDEOS_DIR, py_filename)
    media_dir = os.path.abspath(VIDEOS_DIR)
    output_file = f"{task_id}_preview.png"

    try:
        os.makedirs(media_dir, exist_ok=True)
        with open(py_path, "w", encoding="utf-8") as f:
            f.write(code)
        cmd = [
            sys.executable,
            "-m",
            "manim",
            "-ql",
            "-s",
            "--media_dir",
            media_dir,
            "-o",
            output_file,
            os.path.abspath(py_path),
            "GenScene",
        ]
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            lambda: subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", timeout=90),
        )
        try:
            os.remove(py_path)
        except Exception:
            pass
        if result.returncode == 0:
            py_base = py_filename.replace(".py", "")
            found_path = _locate_preview_png(media_dir, output_file, py_base)
            if not found_path:
                for root, _, files in os.walk(media_dir):
                    for f in files:
                        if f == output_file or (task_id in f and f.endswith(".png")):
                            import shutil
                            src = os.path.join(root, f)
                            dst = os.path.join(media_dir, output_file)
                            if src != dst:
                                shutil.move(src, dst)
                            found_path = dst
                            break
                    if found_path:
                        break
            if found_path or os.path.exists(os.path.join(media_dir, output_file)):
                return {"status": "success", "preview_url": f"/videos/{output_file}"}
        err = (result.stderr or result.stdout or "")[-500:]
        return JSONResponse(status_code=400, content={"status": "error", "message": err or "渲染失败"})
    except subprocess.TimeoutExpired:
        try:
            os.remove(py_path)
        except Exception:
            pass
        return JSONResponse(status_code=400, content={"status": "error", "message": "渲染超时"})
    except Exception as e:
        logger.error("render_keyframe: %s", e)
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.post("/run_manim")
async def run_custom_manim(data: ManimCodeModel):
    forbidden = ["import os", "import sys", "import subprocess", "rm -rf", "shutil"]
    for keyword in forbidden:
        if keyword in data.code:
            return JSONResponse(status_code=400, content={"status": "error", "message": f"安全拦截: 禁止使用 '{keyword}'"})

    task_id = str(uuid.uuid4())
    py_filename = f"dev_{task_id}.py"
    py_path = os.path.join(VIDEOS_DIR, py_filename)
    media_dir = os.path.abspath(VIDEOS_DIR)
    output_file = f"{task_id}.mp4"

    try:
        with open(py_path, "w", encoding="utf-8") as f:
            f.write(data.code)
        cmd = [
            sys.executable, "-m", "manim",
            "-ql", "--media_dir", media_dir, "-o", output_file,
            os.path.abspath(py_path), "GenScene",
        ]
        logger.info(f"Running Manim DevTools: {' '.join(cmd)}")
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            lambda: subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", timeout=60),
        )
        if result.returncode == 0:
            possible_paths = [
                os.path.join(media_dir, output_file),
                os.path.join(media_dir, "videos", py_filename.replace(".py", ""), "480p15", "GenScene.mp4"),
                os.path.join(media_dir, "videos", py_filename.replace(".py", ""), "480p15", output_file),
            ]
            final_path = os.path.join(VIDEOS_DIR, output_file)
            found = False
            for p in possible_paths:
                if os.path.exists(p):
                    import shutil
                    shutil.move(p, final_path)
                    found = True
                    break
            if found:
                try:
                    os.remove(py_path)
                except Exception:
                    pass
                return {"status": "success", "video_url": f"/videos/{output_file}"}
            logger.error(f"Render success but file not found. Search paths: {possible_paths}")
            return JSONResponse(status_code=500, content={"status": "error", "message": "渲染成功但未找到输出文件"})
        error_msg = result.stderr if result.stderr else result.stdout
        error_lines = [line for line in error_msg.split("\n") if "Error" in line or "Exception" in line or "Traceback" in line]
        if not error_lines:
            error_lines = error_msg.split("\n")[-10:]
        return JSONResponse(status_code=400, content={"status": "error", "message": "\n".join(error_lines)})
    except subprocess.TimeoutExpired:
        return JSONResponse(status_code=400, content={"status": "error", "message": "渲染超时"})
    except Exception as e:
        logger.error(f"run_custom_manim: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.post("/run_manim_stream")
async def run_manim_stream_endpoint(data: ManimCodeModel):
    forbidden = ["import os", "import sys", "import subprocess", "rm -rf", "shutil"]
    for keyword in forbidden:
        if keyword in data.code:
            def err():
                yield f"data: {json.dumps({'type': 'error', 'message': f'安全拦截: 禁止使用 {keyword}'})}\n\n"
            return StreamingResponse(err(), media_type="text/event-stream")

    task_id = str(uuid.uuid4())
    py_filename = f"dev_{task_id}.py"
    py_path = os.path.join(VIDEOS_DIR, py_filename)
    media_dir = os.path.abspath(VIDEOS_DIR)
    output_file = f"{task_id}.mp4"

    def _run_manim_sync(cmd_list, put_sentinel):
        proc = subprocess.Popen(cmd_list, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, cwd=None)
        stderr_chunks = []
        try:
            for raw in iter(proc.stderr.readline, b""):
                stderr_chunks.append(raw)
                try:
                    text = raw.decode("utf-8", errors="replace").strip()
                    if text:
                        put_sentinel(("line", text))
                except Exception:
                    pass
        finally:
            proc.wait()
            err_full = b"".join(stderr_chunks).decode("utf-8", errors="replace")
            put_sentinel(("done", proc.returncode, err_full))

    async def event_stream():
        try:
            os.makedirs(media_dir, exist_ok=True)
            with open(py_path, "w", encoding="utf-8") as f:
                f.write(data.code)
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"
            return

        cmd = [
            sys.executable, "-m", "manim", "-ql",
            "--media_dir", media_dir, "-o", output_file,
            os.path.abspath(py_path), "GenScene",
        ]
        yield f"data: {json.dumps({'type': 'start', 'message': 'Manim 引擎启动中...'})}\n\n"

        try:
            loop = asyncio.get_event_loop()
            queue = asyncio.Queue()

            def put(item):
                loop.call_soon_threadsafe(queue.put_nowait, item)

            loop.run_in_executor(None, _run_manim_sync, cmd, put)

            returncode = -1
            stderr_full = ""
            while True:
                try:
                    kind = await asyncio.wait_for(queue.get(), timeout=300.0)
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'error', 'message': '渲染超时'}, ensure_ascii=False)}\n\n"
                    return
                if kind[0] == "line":
                    yield f"data: {json.dumps({'type': 'log', 'message': kind[1]}, ensure_ascii=False)}\n\n"
                else:
                    returncode = kind[1]
                    stderr_full = kind[2]
                    break

            if returncode != 0:
                err_text = (stderr_full or "渲染失败")[-2000:]
                yield f"data: {json.dumps({'type': 'error', 'message': err_text}, ensure_ascii=False)}\n\n"
                return

            import shutil
            py_base = py_filename.replace(".py", "")
            final_path = os.path.join(media_dir, output_file)
            possible_paths = [
                os.path.join(media_dir, output_file),
                os.path.join(media_dir, "videos", py_base, "480p15", "GenScene.mp4"),
                os.path.join(media_dir, "videos", py_base, "480p15", output_file),
            ]
            found = False
            for p in possible_paths:
                if os.path.exists(p):
                    if os.path.abspath(p) != os.path.abspath(final_path):
                        shutil.move(p, final_path)
                    found = True
                    break
            if not found:
                td = os.path.join(media_dir, "videos", py_base, "480p15")
                if os.path.isdir(td):
                    for f in os.listdir(td):
                        if f.endswith(".mp4"):
                            shutil.move(os.path.join(td, f), final_path)
                            found = True
                            break
            if not found and os.path.isdir(os.path.join(media_dir, "videos")):
                for root, _, files in os.walk(os.path.join(media_dir, "videos")):
                    for f in files:
                        if f.endswith(".mp4") and py_base in root:
                            shutil.move(os.path.join(root, f), final_path)
                            found = True
                            break
                    if found:
                        break

            if found:
                try:
                    os.remove(py_path)
                except Exception:
                    pass
                yield f"data: {json.dumps({'type': 'complete', 'video_url': f'/videos/{output_file}'})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'error', 'message': '渲染成功但未找到输出文件'})}\n\n"
        except asyncio.TimeoutError:
            yield f"data: {json.dumps({'type': 'error', 'message': '渲染超时'})}\n\n"
        except Exception as e:
            logger.error("run_manim_stream: %s\n%s", str(e), traceback.format_exc())
            yield f"data: {json.dumps({'type': 'error', 'message': str(e).strip() or repr(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/generate_video_copy")
async def generate_video_copy(data: ManimCodeModel):
    """
    根据 Manim 代码调用大模型生成视频文案（标题 + 简介 + 章节建议），
    供开发者工具「总结视频脚本内容」功能使用。
    """
    code = (data.code or "").strip()
    if not code:
        return JSONResponse(status_code=400, content={"status": "error", "message": "代码不能为空"})

    # 限制长度，避免上下文过长
    snippet = code[:4000]

    # 未配置大模型时给出降级文案，避免前端直接报错
    if not api_key or client is None:
        line_count = len(code.splitlines())
        fallback = f"本脚本为 Manim 动画示例（约 {line_count} 行代码），用于数学/几何演示。"
        return {"status": "success", "copy": fallback}

    prompt = (
        "你是一名为 Manim 动画写简要说明的助手。下面是一段 Manim Python 代码，请用一两句话概括这段脚本在演示什么（例如：画了什么图、做了哪种动画、涉及什么知识点），用于在脚本库中区分不同脚本。\n\n"
        "要求：\n"
        "- 输出 1～3 句简短说明即可，不需要标题、简介、章节等完整文案；\n"
        "- 使用 Markdown，可分段或用列表，但保持简洁；\n"
        "- 只输出说明内容，不要解释思路。\n\n"
        "Manim 代码：\n"
        "```python\n" + snippet + "\n```"
    )

    try:
        completion = client.chat.completions.create(
            model="qwen-plus",
            messages=[{"role": "user", "content": prompt}],
        )
        text = completion.choices[0].message.content.strip()
        return {"status": "success", "copy": text}
    except Exception as e:
        logger.error(f"generate_video_copy error: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": "生成视频文案时出错：" + str(e)})


def _is_add_or_play_line(line: str) -> bool:
    """判断该行是否为 add/play 行（对象在此行才显示在画面上）"""
    line = line.strip()
    if re.search(r"self\.add\s*\(", line):
        return True
    if re.search(r"self\.play\s*\(", line):
        return True
    return False


def _get_keyframe_lines(code: str, instruction: str = "") -> list:
    """
    根据 Manim 规则提取关键帧断点行号（1-based）。
    对象在 add 或 play(Create/Write/Transform 等) 时才显示在画面上，定义行不显示。
    instruction 含「添加」时优先取最后一个（新增对象通常在末尾）。
    """
    add_pattern = re.compile(r"self\.add\s*\(")
    anim_keywords = re.compile(
        r"\b(Create|Write|Transform|ReplacementTransform|FadeIn|FadeOut|GrowFromCenter|DrawBorderThenFill)\s*\("
    )
    play_pattern = re.compile(r"self\.play\s*\(")
    lines = code.splitlines()
    add_lines = []
    play_anim_lines = []
    play_other_lines = []
    for i, line in enumerate(lines):
        ln = i + 1
        if add_pattern.search(line):
            add_lines.append(ln)
        elif play_pattern.search(line):
            if anim_keywords.search(line):
                play_anim_lines.append(ln)
            else:
                play_other_lines.append(ln)
    result = add_lines or play_anim_lines or play_other_lines
    if not result:
        return []
    # 「添加」类指令：新对象通常在最后，取最后一个 add/play
    if instruction and ("添加" in instruction or "add" in instruction.lower()):
        return [result[-1]]
    return result[:3]


@router.post("/edit_code")
async def edit_manim_code(data: ManimCodeEditModel):
    """
    用自然语言指令编辑 Manim 代码（类似 Cursor）。
    接收当前代码与用户指令，可选渲染日志；返回修改后代码及关键帧断点。
    """
    code = (data.code or "").strip()
    instruction = (data.instruction or "").strip()
    render_log = (data.render_log or "").strip()

    if not instruction:
        return JSONResponse(status_code=400, content={"status": "error", "message": "请输入编辑指令"})
    if not code:
        return JSONResponse(status_code=400, content={"status": "error", "message": "当前代码为空，请先编写或导入脚本"})

    snippet = code[:6000]
    if not api_key or client is None:
        return JSONResponse(status_code=503, content={"status": "error", "message": "未配置大模型，无法使用自然语言编辑"})

    prompt = (
        "你是一个 Manim 动画代码编辑助手。用户会提供当前的 Manim Python 代码和一条自然语言编辑指令。"
        "请根据指令修改代码，直接输出修改后的**完整** Manim 代码，不要解释、不要 markdown 代码块包裹。\n\n"
        "要求：\n"
        "- 保留 from manim import * 和 class GenScene(Scene) 结构；\n"
        "- 只输出可执行的 Python 代码；\n"
        "- 若指令无法实现，输出原代码并尽量靠近用户意图。\n"
        "- 【形状颜色】用户要求改形状颜色（如「方形改为红色」「圆改成蓝色」）时，必须加 set_fill(color, opacity=0.5) 使填充生效，否则可能只显示描边。"
        "例：square = Square(color=RED)\nsquare.set_fill(RED, opacity=0.5)\n"
        "- 【新增形状】用户说「添加三角形」用 Triangle()，「添加方形」用 Square()，「添加圆」用 Circle()。\n\n"
        "【关键帧断点】（必须输出）在输出代码的最后，另起一行写：KEYFRAME_LINE: N\n\n"
        "【Manim 显示规则】对象只有在 add 或 play 时才出现在画面上，定义行（circle=Circle()）不会显示：\n"
        "self.add(obj)、self.play(Create/Write/FadeIn/Transform/ReplacementTransform 等)\n\n"
        "N 的选取规则：必须是**用户指令所针对的那个对象**在画面上出现的 add/play 行。\n"
        "- 修改现有对象（如「方形改红色」「圆变大」）→ N 选该对象（square/circle）的 add 或 play 行；\n"
        "- 新增对象（如「添加一个三角形」「加一段文字」）→ N 选**新对象**（triangle/text）的 add 或 play 行，不是已有对象的行；\n"
        "- 若代码中有多个 add/play，必须选与用户指令对应的那个，不能选第一个或无关的。\n"
        "示例：「添加一个三角形的动画」→ N 选 self.play(Create(triangle)) 或 self.add(triangle) 所在行（三角形），不能选 square/circle 的行；"
        "「方形改为红色」→ N 选 self.play(Create(square)) 所在行；"
        "「圆改为渐变色」→ N 选 self.play(Create(circle)) 所在行（绝不是 set_fill 或 Circle() 定义行，那些行不会把对象显示在画面上，会导致黑屏）。\n\n"
    )
    if render_log:
        prompt += (
            "【重要】用户当前意图为纠错/修复。下方为最近的 Manim 渲染日志，请结合报错信息修改代码：\n\n"
            "渲染日志：\n```\n" + render_log[:3000] + "\n```\n\n"
        )
    prompt += "当前代码：\n```python\n" + snippet + "\n```\n\n用户指令：" + instruction

    try:
        completion = client.chat.completions.create(
            model="qwen-plus",
            messages=[{"role": "user", "content": prompt}],
        )
        text = completion.choices[0].message.content.strip()
        if "```" in text:
            for block in text.split("```"):
                if block.strip().startswith("python"):
                    text = block.strip()[6:].strip()
                    break
                if "from manim" in block or "class GenScene" in block:
                    text = block.strip()
                    break

        # 解析智能体提供的断点行号（支持行内或独立行）
        keyframe_lines = []
        keyframe_match = re.search(r"KEYFRAME_LINE:\s*(\d+)", text, re.IGNORECASE)
        if keyframe_match:
            ln = int(keyframe_match.group(1))
            if 1 <= ln <= 9999:
                lines_arr = text.splitlines()
                if ln <= len(lines_arr) and _is_add_or_play_line(lines_arr[ln - 1]):
                    keyframe_lines = [ln]
                # 若 LLM 返回的是定义行（如 set_fill、Circle()），会导致黑屏，改用 fallback
        # 从代码中移除 KEYFRAME_LINE 行
        text = re.sub(r"^[ \t]*KEYFRAME_LINE:\s*\d+[ \t\r]*$", "", text, flags=re.IGNORECASE | re.MULTILINE)
        text = re.sub(r"\n\n+", "\n", text).strip()  # 合并多余空行

        if not keyframe_lines:
            keyframe_lines = _get_keyframe_lines(text, instruction)

        return {"status": "success", "code": text, "keyframe_lines": keyframe_lines}
    except Exception as e:
        logger.error(f"edit_manim_code error: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": "编辑失败：" + str(e)})
