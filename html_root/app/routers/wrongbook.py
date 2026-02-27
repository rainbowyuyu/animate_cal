# 错题本：数据库存储，增删改查
import logging
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from ..config import get_db_connection

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/wrongbook", tags=["wrongbook"])


class WrongbookCreate(BaseModel):
    username: str
    video_id: str
    title: str = ""
    time_sec: int = 0
    note: str = ""


class WrongbookUpdate(BaseModel):
    id: int
    username: str
    title: Optional[str] = None
    time_sec: Optional[int] = None
    note: Optional[str] = None


def _ensure_table(cursor):
    """按需创建 user_wrongbook 表。"""
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS user_wrongbook (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                video_id VARCHAR(256) NOT NULL,
                title VARCHAR(512) DEFAULT '',
                time_sec INT NOT NULL DEFAULT 0,
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
    except Exception as e:
        logger.warning(f"ensure user_wrongbook table failed: {e}")


@router.get("/list")
async def list_wrongbook(username: str, video_id: str = ""):
    """查询用户的错题记录，可选按 video_id 筛选。"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        _ensure_table(cursor)
        if video_id:
            cursor.execute(
                """SELECT id, video_id, title, time_sec, note, created_at
                   FROM user_wrongbook WHERE user_id = %s AND video_id = %s ORDER BY time_sec ASC""",
                (username, video_id),
            )
        else:
            cursor.execute(
                """SELECT id, video_id, title, time_sec, note, created_at
                   FROM user_wrongbook WHERE user_id = %s ORDER BY created_at DESC""",
                (username,),
            )
        rows = cursor.fetchall()
        out = []
        for r in rows:
            out.append({
                "id": r["id"],
                "key": f"{r['video_id']}-{r['time_sec']}-{r.get('note') or ''}",
                "video_id": r.get("video_id") or "",
                "title": r.get("title") or "",
                "time_sec": r.get("time_sec") or 0,
                "note": r.get("note") or "",
                "created_at": int(r["created_at"].timestamp() * 1000) if r.get("created_at") else None,
            })
        return {"status": "success", "data": out}
    except Exception as e:
        logger.error(f"list_wrongbook: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.post("/add")
async def add_wrongbook(data: WrongbookCreate):
    """新增错题记录。"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        _ensure_table(cursor)
        note_val = data.note or ""
        cursor.execute(
            """SELECT id FROM user_wrongbook
               WHERE user_id = %s AND video_id = %s AND time_sec = %s AND COALESCE(note, '') = %s""",
            (data.username, data.video_id, data.time_sec, note_val),
        )
        if cursor.fetchone():
            return {"status": "success", "message": "该时间点已在错题本中", "duplicate": True}
        cursor.execute(
            """INSERT INTO user_wrongbook (user_id, video_id, title, time_sec, note)
               VALUES (%s, %s, %s, %s, %s)""",
            (data.username, data.video_id, (data.title or "")[:512], data.time_sec, data.note or ""),
        )
        conn.commit()
        return {"status": "success", "message": "已加入错题本", "id": cursor.lastrowid}
    except Exception as e:
        logger.error(f"add_wrongbook: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.put("/update")
async def update_wrongbook(data: WrongbookUpdate):
    """更新错题记录。"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        _ensure_table(cursor)
        updates = []
        params = []
        if data.title is not None:
            updates.append("title = %s")
            params.append((data.title or "")[:512])
        if data.time_sec is not None:
            updates.append("time_sec = %s")
            params.append(data.time_sec)
        if data.note is not None:
            updates.append("note = %s")
            params.append(data.note or "")
        if not updates:
            return {"status": "success", "message": "无变更"}
        params.extend([data.id, data.username])
        cursor.execute(
            f"UPDATE user_wrongbook SET {', '.join(updates)} WHERE id = %s AND user_id = %s",
            params,
        )
        conn.commit()
        if cursor.rowcount == 0:
            return JSONResponse(status_code=404, content={"status": "error", "message": "未找到记录"})
        return {"status": "success", "message": "已更新"}
    except Exception as e:
        logger.error(f"update_wrongbook: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.delete("/delete")
async def delete_wrongbook(id: int, username: str):
    """删除错题记录。"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        _ensure_table(cursor)
        cursor.execute("DELETE FROM user_wrongbook WHERE id = %s AND user_id = %s", (id, username))
        conn.commit()
        if cursor.rowcount == 0:
            return JSONResponse(status_code=404, content={"status": "error", "message": "未找到记录"})
        return {"status": "success", "message": "已删除"}
    except Exception as e:
        logger.error(f"delete_wrongbook: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
