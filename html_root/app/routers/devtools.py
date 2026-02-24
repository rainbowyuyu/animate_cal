# 开发者工具：Manim 云端渲染（同步与流式）
import asyncio
import json
import logging
import os
import subprocess
import sys
import traceback
import uuid
from typing import Optional
from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse

from ..config import VIDEOS_DIR, client, api_key
from ..models import ManimCodeModel

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
