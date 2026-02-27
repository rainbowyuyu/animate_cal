# 星云成就系统：数据库存储，读写 API
import logging
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..config import get_db_connection

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/achievements", tags=["achievements"])

# 成就定义：id, label, icon, stat_key, target
ACHIEVEMENT_DEFS = [
    {"id": "tutorial", "label": "新手教程", "icon": "fa-circle-check", "stat_key": "tutorial", "target": 1, "condition": "完成新手引导"},
    {"id": "formulas_10", "label": "算式积累", "icon": "fa-calculator", "stat_key": "formulas", "target": 10, "condition": "保存 10 个算式"},
    {"id": "scripts_5", "label": "脚本达人", "icon": "fa-video", "stat_key": "scripts", "target": 5, "condition": "创建 5 个动画脚本"},
    {"id": "templates_3", "label": "模板就绪", "icon": "fa-wand-magic-sparkles", "stat_key": "templates", "target": 3, "condition": "保存 3 个智能体模板"},
    {"id": "wrongbook_5", "label": "错题收录", "icon": "fa-bookmark", "stat_key": "wrongbook", "target": 5, "condition": "收录 5 道错题"},
]


def _ensure_table(cursor):
    """按需创建 user_achievements 表。"""
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS user_achievements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                achievement_id VARCHAR(64) NOT NULL,
                progress INT NOT NULL DEFAULT 0,
                unlocked TINYINT(1) NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_user_ach (user_id, achievement_id)
            )
            """
        )
    except Exception as e:
        logger.warning(f"ensure user_achievements table failed: {e}")


def _get_db_progress(cursor, user_id):
    """从数据库读取用户成就进度。"""
    cursor.execute(
        """SELECT achievement_id, progress, unlocked FROM user_achievements WHERE user_id = %s""",
        (user_id,),
    )
    rows = cursor.fetchall()
    return {r[0]: {"progress": r[1], "unlocked": bool(r[2])} for r in rows}


def _compute_achievements(stats, db_progress):
    """合并 stats 与 db 计算成就列表。"""
    out = []
    for defn in ACHIEVEMENT_DEFS:
        aid = defn["id"]
        stat_key = defn["stat_key"]
        target = defn["target"]
        db = db_progress.get(aid)
        if stat_key == "tutorial":
            progress = 1 if stats.get("tutorialDone") else 0
        else:
            progress = min(int(stats.get(stat_key) or 0), target)
        unlocked = progress >= target
        out.append({
            "id": aid,
            "label": defn["label"],
            "icon": defn["icon"],
            "condition": defn["condition"],
            "target": target,
            "progress": progress,
            "unlocked": unlocked,
        })
    return out


@router.get("/list")
async def list_achievements(formulas: int = 0, scripts: int = 0, templates: int = 0, wrongbook: int = 0, tutorial_done: bool = False, username: str = ""):
    """
    获取用户成就列表。
    前端传入 stats（formulas/scripts/templates/wrongbook/tutorial_done），
    服务端合并 DB 中的 tutorial 等状态后返回成就列表。
    """
    conn = None
    cursor = None
    try:
        stats = {
            "formulas": formulas,
            "scripts": scripts,
            "templates": templates,
            "wrongbook": wrongbook,
            "tutorialDone": tutorial_done,
        }
        db_progress = {}
        if username:
            conn = get_db_connection()
            cursor = conn.cursor()
            _ensure_table(cursor)
            db_progress = _get_db_progress(cursor, username)
            # tutorial 优先用 DB 中的状态
            if "tutorial" in db_progress:
                stats["tutorialDone"] = bool(db_progress["tutorial"].get("unlocked"))
        data = _compute_achievements(stats, db_progress)
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"list_achievements: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


class AchievementUpsert(BaseModel):
    username: str
    achievement_id: str
    progress: int = 0
    unlocked: bool = False


@router.post("/upsert")
async def upsert_achievement(data: AchievementUpsert):
    """写入/更新成就进度到数据库。"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        _ensure_table(cursor)
        cursor.execute(
            """
            INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE progress = VALUES(progress), unlocked = VALUES(unlocked)
            """,
            (data.username, data.achievement_id, data.progress, 1 if data.unlocked else 0),
        )
        conn.commit()
        return {"status": "success", "message": "已更新成就"}
    except Exception as e:
        logger.error(f"upsert_achievement: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
