# 我的算式：保存、列表、删除、更新
import logging
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..config import get_db_connection
from ..models import FormulaModel, FormulaUpdateModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/formulas", tags=["formulas"])


@router.post("/save")
async def save_formula(data: FormulaModel):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO formulas (user_id, latex, note) VALUES (%s, %s, %s)",
            (data.username, data.latex, data.note),
        )
        conn.commit()
        return {"status": "success", "message": "保存成功"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.get("/list")
async def list_formulas(username: str):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM formulas WHERE user_id = %s ORDER BY created_at DESC", (username,))
        formulas = cursor.fetchall()
        for f in formulas:
            f["created_at"] = f["created_at"].isoformat()
        return {"status": "success", "data": formulas}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.delete("/delete")
async def delete_formula(id: int, username: str):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM formulas WHERE id = %s AND user_id = %s", (id, username))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.put("/update")
async def update_formula(data: FormulaUpdateModel):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE formulas SET latex = %s, note = %s WHERE id = %s AND user_id = %s",
            (data.latex, data.note, data.id, data.username),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return JSONResponse(status_code=404, content={"status": "error", "message": "未找到算式或无权修改"})
        return {"status": "success", "message": "更新成功"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
