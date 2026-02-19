# 智能识别、动态计算动画（含流式）
import asyncio
import base64
import json
import logging
import os
import subprocess
import sys
import uuid
from fastapi import APIRouter, File, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from logic.manim_generator import render_matrix_animation
from logic.prompt import return_prompt

from ..config import client, api_key, VIDEOS_DIR
from ..models import CalcModel

logger = logging.getLogger(__name__)
router = APIRouter(tags=["detect"])


def _run_manim_subprocess_sync(cmd_list, cwd, put_fn):
    """在线程中运行 Manim 子进程，逐行通过 put_fn(('log', text)) 送出 stderr，最后 put_fn(('done', returncode, stderr_full))。"""
    try:
        proc = subprocess.Popen(
            cmd_list,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            cwd=cwd,
        )
        stderr_chunks = []
        for raw in iter(proc.stderr.readline, b""):
            stderr_chunks.append(raw)
            try:
                text = raw.decode("utf-8", errors="replace").rstrip()
                if text:
                    put_fn(("log", text))
            except Exception:
                pass
        proc.wait()
        err_full = b"".join(stderr_chunks).decode("utf-8", errors="replace")
        put_fn(("done", proc.returncode, err_full))
    except Exception as ex:
        logger.error(f"Manim subprocess: {ex}", exc_info=True)
        put_fn(("done", -1, str(ex) or repr(ex)))


def generate_manim_prompt(latex_a, latex_b, operation):
    op_desc = {"formular": "公式推演", "visualization": "可视化演示", "normal": "通用演示"}.get(operation, "数学展示")
    return return_prompt(op_desc, latex_a, latex_b)


@router.post("/detect")
async def detect_image(file: UploadFile = File(...)):
    try:
        image_content = await file.read()
        base64_image = base64.b64encode(image_content).decode("utf-8")
        if not api_key:
            return {"status": "success", "latex": r"E = mc^2"}
        completion = client.chat.completions.create(
            model="qwen-vl-max",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "识别图片中的公式，只输出LaTeX代码。"},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                ],
            }],
        )
        latex = completion.choices[0].message.content.strip()
        latex = latex.replace("```latex", "").replace("```", "").replace("\\[", "").replace("\\]", "").strip()
        return {"status": "success", "latex": latex}
    except Exception as e:
        return {"status": "success", "latex": r"\text{Error}"}


@router.post("/animate")
async def generate_animation(data: CalcModel):
    try:
        task_id = str(uuid.uuid4())
        video_path = render_matrix_animation(data.matrixA, data.matrixB, data.operation, task_id)
        if video_path and os.path.exists(video_path):
            filename = os.path.basename(video_path)
            return {"status": "success", "video_url": f"/videos/{filename}"}
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Failed")
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@router.post("/animate/stream")
async def generate_animation_stream(data: CalcModel):
    async def event_generator():
        # 所有模式都最先生成并返回解题步骤（文字结果），再执行计算/可视化
        try:
            text_prompt = (
                f"用户输入的数学表达式或题目为：{data.matrixA}\n\n"
                "请给出该题目的解题步骤：包括化简、计算过程与结论，分条简要输出。不要输出任何代码，只输出文字解题步骤。"
            )
            text_completion = client.chat.completions.create(
                model="qwen-plus",
                messages=[{"role": "user", "content": text_prompt}],
            )
            text_result = (text_completion.choices[0].message.content or "").strip()
            if text_result:
                yield f"data: {json.dumps({'step': 'text_result', 'content': text_result})}\n\n"
        except Exception as e:
            logger.warning(f"Text result fallback: {e}")

        if data.operation == "normal":
            yield f"data: {json.dumps({'step': 'normal_split', 'message': '通用演示将分两步：先计算推演，再可视化演示', 'progress': 5})}\n\n"
            for (phase_name, part, op_desc) in [("计算", "calc", "公式推演"), ("可视化", "vis", "可视化演示")]:
                task_id = str(uuid.uuid4())
                yield f"data: {json.dumps({'step': 'generating_code', 'message': f'正在构思「{phase_name}」Manim 代码...', 'progress': 10})}\n\n"
                prompt = return_prompt(op_desc, data.matrixA, data.matrixB)
                code = ""
                try:
                    completion = client.chat.completions.create(model="qwen-plus", messages=[{"role": "user", "content": prompt}])
                    code = completion.choices[0].message.content.strip().replace("```python", "").replace("```", "").strip()
                    yield f"data: {json.dumps({'step': 'code_generated', 'message': f'「{phase_name}」代码生成完毕，准备渲染...', 'code': code, 'progress': 30, 'part': part})}\n\n"
                except Exception as e:
                    logger.error(f"LLM Error ({phase_name}): {e}")
                    yield f"data: {json.dumps({'step': 'error', 'message': f'「{phase_name}」生成失败: {str(e)}'})}\n\n"
                    continue
                py_filename = f"gen_{task_id}.py"
                py_path = os.path.join(VIDEOS_DIR, py_filename)
                try:
                    with open(py_path, "w", encoding="utf-8") as f:
                        f.write(code)
                except Exception as e:
                    logger.error(f"File Write Error: {e}")
                    yield f"data: {json.dumps({'step': 'error', 'message': '写入代码文件失败'})}\n\n"
                    continue
                media_dir = os.path.abspath(VIDEOS_DIR)
                output_file = f"{task_id}.mp4"
                cmd = [sys.executable, "-m", "manim", "-ql", "--media_dir", media_dir, "-o", output_file, os.path.abspath(py_path), "GenScene"]
                yield f"data: {json.dumps({'step': 'rendering', 'message': f'「{phase_name}」Manim 渲染中...', 'progress': 40})}\n\n"

                async def run_manim_stream_logs(cmd_list):
                    loop = asyncio.get_event_loop()
                    q = asyncio.Queue()
                    def put(item):
                        loop.call_soon_threadsafe(q.put_nowait, item)
                    loop.run_in_executor(None, lambda: _run_manim_subprocess_sync(cmd_list, os.path.dirname(os.path.abspath(py_path)), put))
                    while True:
                        item = await q.get()
                        yield item
                        if item[0] == "done":
                            break

                manim_returncode, manim_stderr = -1, ""
                async for item in run_manim_stream_logs(cmd):
                    if item[0] == "log":
                        yield f"data: {json.dumps({'step': 'rendering', 'message': item[1], 'progress': 40})}\n\n"
                    else:
                        manim_returncode, manim_stderr = item[1], item[2]
                        break

                def locate_video():
                    base_search_path = os.path.join(media_dir, "videos", py_filename.replace(".py", ""), "480p15")
                    expected_file = os.path.join(base_search_path, output_file)
                    if not os.path.exists(expected_file):
                        target_dir = os.path.join(media_dir, "videos", py_filename.replace(".py", ""), "480p15")
                        if os.path.exists(target_dir):
                            for f in os.listdir(target_dir):
                                if f.endswith(".mp4"):
                                    return os.path.join(target_dir, f)
                    return expected_file if os.path.exists(expected_file) else None

                found = locate_video()
                if manim_returncode == 0 and found:
                    import shutil
                    final_path = os.path.join(VIDEOS_DIR, output_file)
                    shutil.move(found, final_path)
                    final_url = f"/videos/{output_file}"
                    try:
                        os.remove(py_path)
                    except Exception:
                        pass
                    yield f"data: {json.dumps({'step': 'complete', 'message': f'「{phase_name}」渲染完成！', 'video_url': final_url, 'progress': 100, 'part': part, 'code': code})}\n\n"
                    continue
                err_msg = manim_stderr or "Unknown Error or Timeout"
                yield f"data: {json.dumps({'step': 'fixing_code', 'message': f'「{phase_name}」渲染报错，正在修正并重试...', 'progress': 35})}\n\n"
                fix_prompt = (
                    "上述 Manim 代码在渲染时报错，错误信息如下：\n\n```\n" + (err_msg[:3000] if err_msg else "Unknown Error") + "\n```\n\n"
                    "请根据错误信息修正代码。只输出完整 Python 代码，不要解释。必须保留 from manim import * 和类名 GenScene，所有动画在 def construct(self): 中。"
                )
                try:
                    completion2 = client.chat.completions.create(
                        model="qwen-plus",
                        messages=[{"role": "user", "content": prompt}, {"role": "assistant", "content": code}, {"role": "user", "content": fix_prompt}],
                    )
                    code2 = completion2.choices[0].message.content.strip().replace("```python", "").replace("```", "").strip()
                    with open(py_path, "w", encoding="utf-8") as f:
                        f.write(code2)
                    yield f"data: {json.dumps({'step': 'rendering', 'message': f'「{phase_name}」重新渲染中...', 'progress': 40})}\n\n"
                    manim_returncode2, manim_stderr2 = -1, ""
                    async for item in run_manim_stream_logs(cmd):
                        if item[0] == "log":
                            yield f"data: {json.dumps({'step': 'rendering', 'message': item[1], 'progress': 40})}\n\n"
                        else:
                            manim_returncode2, manim_stderr2 = item[1], item[2]
                            break
                    found2 = locate_video()
                    if manim_returncode2 == 0 and found2:
                        import shutil
                        final_path = os.path.join(VIDEOS_DIR, output_file)
                        shutil.move(found2, final_path)
                        final_url = f"/videos/{output_file}"
                        try:
                            os.remove(py_path)
                        except Exception:
                            pass
                        yield f"data: {json.dumps({'step': 'complete', 'message': f'「{phase_name}」修正后渲染完成！', 'video_url': final_url, 'progress': 100, 'part': part, 'code': code2})}\n\n"
                    else:
                        yield f"data: {json.dumps({'step': 'error', 'message': f'「{phase_name}」修正后仍失败，将继续下一阶段。'})}\n\n"
                except Exception as e:
                    logger.error(f"LLM fix Error ({phase_name}): {e}")
                    yield f"data: {json.dumps({'step': 'error', 'message': f'「{phase_name}」修正请求异常，将继续下一阶段。'})}\n\n"
            return

        task_id = str(uuid.uuid4())
        yield f"data: {json.dumps({'step': 'generating_code', 'message': '正在构思 Manim 代码...', 'progress': 10})}\n\n"
        prompt = generate_manim_prompt(data.matrixA, data.matrixB, data.operation)
        code = ""
        try:
            completion = client.chat.completions.create(model="qwen-plus", messages=[{"role": "user", "content": prompt}])
            code = completion.choices[0].message.content.strip().replace("```python", "").replace("```", "").strip()
            yield f"data: {json.dumps({'step': 'code_generated', 'message': '代码生成完毕，准备渲染...', 'code': code, 'progress': 30})}\n\n"
        except Exception as e:
            logger.error(f"LLM Error: {e}")
            yield f"data: {json.dumps({'step': 'error', 'message': f'生成失败: {str(e)}'})}\n\n"
            return

        py_filename = f"gen_{task_id}.py"
        py_path = os.path.join(VIDEOS_DIR, py_filename)
        try:
            with open(py_path, "w", encoding="utf-8") as f:
                f.write(code)
        except Exception as e:
            logger.error(f"File Write Error: {e}")
            yield f"data: {json.dumps({'step': 'error', 'message': '写入代码文件失败'})}\n\n"
            return

        media_dir = os.path.abspath(VIDEOS_DIR)
        output_file = f"{task_id}.mp4"
        py_abs_path = os.path.abspath(py_path)
        cmd = [sys.executable, "-m", "manim", "-ql", "--media_dir", media_dir, "-o", output_file, py_abs_path, "GenScene"]
        yield f"data: {json.dumps({'step': 'rendering', 'message': 'Manim 引擎启动中...', 'progress': 40})}\n\n"

        async def run_manim_stream_logs(cmd_list):
            loop = asyncio.get_event_loop()
            queue = asyncio.Queue()
            def put(item):
                loop.call_soon_threadsafe(queue.put_nowait, item)
            loop.run_in_executor(None, _run_manim_subprocess_sync, cmd_list, os.path.dirname(py_abs_path), put)
            while True:
                item = await queue.get()
                yield item
                if item[0] == "done":
                    break

        def locate_and_yield_complete():
            base_search_path = os.path.join(media_dir, "videos", py_filename.replace(".py", ""), "480p15")
            expected_file = os.path.join(base_search_path, output_file)
            if not os.path.exists(expected_file):
                if os.path.exists(os.path.join(media_dir, output_file)):
                    expected_file = os.path.join(media_dir, output_file)
                else:
                    target_dir = os.path.join(media_dir, "videos", py_filename.replace(".py", ""), "480p15")
                    if os.path.exists(target_dir):
                        for f in os.listdir(target_dir):
                            if f.endswith(".mp4"):
                                expected_file = os.path.join(target_dir, f)
                                break
            if os.path.exists(expected_file):
                import shutil
                final_path = os.path.join(VIDEOS_DIR, output_file)
                shutil.move(expected_file, final_path)
                final_url = f"/videos/{output_file}"
                try:
                    os.remove(py_path)
                except Exception:
                    pass
                return True, final_url
            return False, None

        manim_returncode = -1
        manim_stderr = ""
        async for item in run_manim_stream_logs(cmd):
            if item[0] == "log":
                yield f"data: {json.dumps({'step': 'rendering', 'message': item[1], 'progress': 40})}\n\n"
            else:
                manim_returncode, manim_stderr = item[1], item[2]
                break

        if manim_returncode == 0:
            yield f"data: {json.dumps({'step': 'rendering', 'message': '渲染完成，处理文件中...', 'progress': 90})}\n\n"
            ok, final_url = locate_and_yield_complete()
            if ok:
                yield f"data: {json.dumps({'step': 'complete', 'message': '渲染完成！', 'video_url': final_url, 'progress': 100})}\n\n"
            else:
                yield f"data: {json.dumps({'step': 'error', 'message': '渲染成功但未找到视频文件，请检查日志。'})}\n\n"
            return

        err_msg = manim_stderr or "Unknown Error or Timeout"
        yield f"data: {json.dumps({'step': 'fixing_code', 'message': '渲染报错，正在根据错误信息修正代码并重试...', 'progress': 35})}\n\n"
        fix_prompt = (
            "上述 Manim 代码在渲染时报错，错误信息如下：\n\n"
            "```\n" + (err_msg[:3000] if err_msg else "Unknown Error or Timeout") + "\n```\n\n"
            "请根据错误信息修正代码。要求：只输出修正后的完整 Python 代码，不要输出任何解释或 Markdown。"
            "必须保留 `from manim import *` 和类名 `GenScene`，所有动画逻辑在 `def construct(self):` 中。"
        )
        try:
            completion2 = client.chat.completions.create(
                model="qwen-plus",
                messages=[{"role": "user", "content": prompt}, {"role": "assistant", "content": code}, {"role": "user", "content": fix_prompt}],
            )
            code2 = completion2.choices[0].message.content.strip().replace("```python", "").replace("```", "").strip()
            with open(py_path, "w", encoding="utf-8") as f:
                f.write(code2)
            yield f"data: {json.dumps({'step': 'rendering', 'message': 'Manim 重新渲染中...', 'progress': 40})}\n\n"
            manim_returncode2, manim_stderr2 = -1, ""
            async for item in run_manim_stream_logs(cmd):
                if item[0] == "log":
                    yield f"data: {json.dumps({'step': 'rendering', 'message': item[1], 'progress': 40})}\n\n"
                else:
                    manim_returncode2, manim_stderr2 = item[1], item[2]
                    break
            if manim_returncode2 == 0:
                yield f"data: {json.dumps({'step': 'rendering', 'message': '渲染完成，处理文件中...', 'progress': 90})}\n\n"
                ok, final_url = locate_and_yield_complete()
                if ok:
                    yield f"data: {json.dumps({'step': 'complete', 'message': '修正后渲染完成！', 'video_url': final_url, 'progress': 100})}\n\n"
                else:
                    yield f"data: {json.dumps({'step': 'error', 'message': '渲染成功但未找到视频文件，请检查日志。'})}\n\n"
            else:
                err_msg2 = manim_stderr2 or "Unknown Error or Timeout"
                short_err = err_msg2.split("\n")[-5:]
                error_msg = "已根据报错修正并重试一次，仍失败：\n" + "\n".join(short_err)
                yield "data: " + json.dumps({"step": "error", "message": error_msg}, ensure_ascii=False) + "\n\n"
        except Exception as e:
            logger.error(f"LLM fix Error: {e}")
            yield "data: " + json.dumps({"step": "error", "message": "渲染失败，且自动修正请求异常：\n" + str(e)}, ensure_ascii=False) + "\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
