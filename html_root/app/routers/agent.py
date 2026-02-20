# 智能体：理解用户意图，返回跳转与动作
import json
import logging
import re
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..config import client, api_key
from ..models import AgentRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent", tags=["agent"])


def sanitize_latex_for_mathlive(latex: str) -> str:
    """将 LaTeX 规范化为 MathLive 可正确解析的格式。"""
    if not latex or not isinstance(latex, str):
        return ""
    s = latex.strip()
    s = s.replace("\\\\", "\\")
    s = re.sub(r"^```(?:latex)?\s*", "", s)
    s = re.sub(r"\s*```\s*$", "", s)
    s = re.sub(r"^\\\[\s*", "", s)
    s = re.sub(r"\s*\\\]\s*$", "", s)
    s = re.sub(r"^\$\$\s*", "", s)
    s = re.sub(r"\s*\$\$\s*$", "", s)
    s = re.sub(r"^\\\(\s*", "", s)  # 处理 \(
    s = re.sub(r"\s*\\\)\s*$", "", s)  # 处理 \)
    s = re.sub(r"\\\(", "", s)  # 移除内联的 \(
    s = re.sub(r"\\\)", "", s)  # 移除内联的 \)
    s = re.sub(r"^\\begin\s*\{\s*displaymath\s*\}\s*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s*\\end\s*\{\s*displaymath\s*\}\s*$", "", s, flags=re.IGNORECASE)
    s = re.sub(r"^\\begin\s*\{\s*equation\s*\}\s*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s*\\end\s*\{\s*equation\s*\}\s*$", "", s, flags=re.IGNORECASE)
    s = s.replace("\\n", "\n").replace("\r\n", "\n").replace("\r", "\n")
    s = re.sub(r"\s+", " ", s)
    s = "".join(c for c in s if c != "\x00" and (ord(c) >= 32 or c in "\n\t"))
    return s.strip()


@router.post("/execute")
async def agent_execute(data: AgentRequest):
    """智能体：理解用户意图，返回要跳转的页面与预填/触发的动作。"""
    latex_from_image = None
    if data.image_base64:
        try:
            base64_image = re.sub(r"^data:image/[^;]+;base64,", "", data.image_base64.strip())
            if not api_key:
                latex_from_image = r"E = mc^2"
            else:
                completion = client.chat.completions.create(
                    model="qwen-vl-max",
                    messages=[{
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "识别图片中的公式，只输出LaTeX代码，不要任何解释。"},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                        ],
                    }],
                )
                latex_from_image = completion.choices[0].message.content.strip()
                latex_from_image = latex_from_image.replace("```latex", "").replace("```", "").replace("\\[", "").replace("\\]", "").strip()
        except Exception as e:
            logger.error(f"Agent image recognition: {e}")
            return JSONResponse(status_code=200, content={"status": "error", "message": "图片识别失败：" + str(e)})

    prompt_for_llm = (
        "本网站包含以下功能页面：detect=智能识别（手写/上传识别公式）、calculate=动态计算（输入公式生成动画）、"
        "devtools=开发者工具（含 LaTeX 可视化编辑器、LaTeX 源码、Manim 工作台/云端渲染、Rainbow 拓展库）、my-formulas=我的算式、examples=教学案例、help=帮助。\n\n"
        "用户说：" + data.prompt + "\n\n"
        + ("用户上传了图片，识别到的公式为：" + latex_from_image + "。若需用到公式请以此为准。" if latex_from_image else "用户未上传图片，若需公式请从描述中提取 LaTeX。")
        + '\n\n【解析要求】当用户给出题目、算式或图片时，请先将题目解析为可编辑的 LaTeX 或可渲染的 Manim 算式（可拆解为步骤），在 formula、fill_latex 或 fill_manim_code 中体现该解析结果；若有拆解说明可放在 reply 中简要写出。'
        '\n\n【重要】根据用户意图决定行为：'
        ' (1) 若用户只是提问、打招呼、闲聊，则 section="chat", 输出 reply 为友好回复。'
        ' (2) 若用户说"在 LaTeX 编辑器填入 xxx""打开 LaTeX 并填入质能方程"等，则 section=devtools, devtool=latex, fill_latex 为 LaTeX。'
        '     **常见数学概念转换**：质能方程→E=mc^2；勾股定理→a^2+b^2=c^2；欧拉公式→e^{i\\pi}+1=0 等，转为标准内联 LaTeX。'
        ' (3) 若用户说"打开云端渲染工作台/开发者工具并写一段 Manim 示例代码填入""打开 Manim 工作台并填入代码"等，则 section=devtools, devtool=manim, fill_manim_code 为一段完整的 Manim Python 代码（from manim import * 开头，含 class Scene 的 construct）。'
        ' (4) 若用户说"只识别""识别这张图（不跳转）"，则 section=detect, trigger=recognize。'
        ' (5) 若用户说"识别公式并保存到我的算式""识别并保存"等，则先识别再保存：输出 steps 数组，第一步 section=detect, trigger=recognize；第二步 section=my-formulas 且 save_to_formulas=true（表示把上一步识别结果保存到我的算式）。'
        ' (6) 其他多步需求（如先打开工作台再填入代码、先识别再去计算等）：用 steps 数组按顺序列出每一步。单步则只输出一个 JSON 对象（不含 steps）。'
        '\n\n动态计算页有三种演示模式：operation 选 normal|formular|visualization。'
        '\n\nformula 与 fill_latex：标准内联 LaTeX，不要 \\[ \\]、$$、\\begin{equation}。'
        '\n\n请只输出一个 JSON。单步格式：{"section":"...", "devtool":"latex|manim|rainbow"(可选), "formula":"", "fill_latex":"", "fill_manim_code":"", "operation":"normal|formular|visualization", "trigger":"generate|recognize|none", "reply":"回复"(仅 chat 时)}。'
        '多步格式：{"steps":[ 上述单步对象1, 单步对象2, ... ]}。可选字段 save_to_formulas: true 表示该步后把当前识别结果保存到我的算式。'
        " trigger：立刻生成动画填 generate；仅识别填 recognize；只跳转填 none。"
    )
    try:
        completion = client.chat.completions.create(model="qwen-plus", messages=[{"role": "user", "content": prompt_for_llm}])
        raw = completion.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()

        def normalize_step(obj: dict) -> dict:
            section = str(obj.get("section") or "chat").strip()
            if section not in ("detect", "calculate", "devtools", "my-formulas", "examples", "help", "chat"):
                section = "chat"
            reply = (str(obj.get("reply") or "")).replace("\\n", "\n").strip() if section == "chat" else ""
            devtool = obj.get("devtool") or None
            formula = str(obj.get("formula") or (latex_from_image or "")).replace("\\\\", "\\").strip()
            if not formula and latex_from_image:
                formula = latex_from_image
            formula = sanitize_latex_for_mathlive(formula)
            fill_latex = str(obj.get("fill_latex") or "").replace("\\\\", "\\").strip()
            fill_latex = sanitize_latex_for_mathlive(fill_latex) if fill_latex else ""
            fill_manim_code = str(obj.get("fill_manim_code") or "").replace("\\n", "\n").replace("\\\\", "\\").strip()
            save_to_formulas = obj.get("save_to_formulas") is True
            operation = str(obj.get("operation") or "normal")
            if operation not in ("formular", "visualization", "normal"):
                operation = "normal"
            trigger = str(obj.get("trigger") or "none")
            if trigger not in ("generate", "recognize", "none"):
                trigger = "none"
            return {
                "section": section,
                "reply": reply,
                "devtool": devtool,
                "formula": formula,
                "fill_latex": fill_latex,
                "fill_manim_code": fill_manim_code,
                "save_to_formulas": save_to_formulas,
                "operation": operation,
                "trigger": trigger,
            }

        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {}

        if isinstance(parsed.get("steps"), list) and len(parsed["steps"]) > 0:
            steps_arr = [normalize_step(s) if isinstance(s, dict) else normalize_step({}) for s in parsed["steps"]]
        else:
            steps_arr = [normalize_step(parsed)]

        if not data.image_base64 and any(s.get("trigger") == "recognize" for s in steps_arr):
            return JSONResponse(
                status_code=200,
                content={"status": "error", "message": "进行识别需要您先上传或粘贴一张公式图片，请上传后再试。"},
            )

        return {
            "status": "success",
            "steps": steps_arr,
            "message": "已按步骤执行" if len(steps_arr) > 1 else ("已为您跳转到对应步骤" if steps_arr and steps_arr[0].get("section") != "chat" else ""),
        }
    except Exception as e:
        logger.error(f"Agent LLM parse: {e}")
        return JSONResponse(status_code=200, content={"status": "error", "message": "理解您的描述时出错：" + str(e)})
