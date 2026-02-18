# 教学案例：获取示例视频列表
import json
import os
import logging
from fastapi import APIRouter

from ..config import ROOT_DIR

logger = logging.getLogger(__name__)
router = APIRouter(tags=["examples"])


@router.get("/examples")
async def get_examples():
    storage_dir = os.path.join(ROOT_DIR, "static", "assets", "storage")
    metadata_path = os.path.join(storage_dir, "metadata.json")
    videos = []
    meta_dict = {}
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                meta_list = json.load(f)
                for item in meta_list:
                    meta_dict[item["filename"]] = item
        except Exception as e:
            logger.error(f"Metadata load error: {e}")

    if os.path.exists(storage_dir):
        for file in os.listdir(storage_dir):
            if file.endswith(".mp4"):
                meta = meta_dict.get(file, {"title": file, "description": "暂无简介", "poster": ""})
                videos.append({
                    "filename": file,
                    "title": meta.get("title", file),
                    "description": meta.get("description", "暂无简介"),
                    "url": f"/assets/storage/{file}",
                    "poster": meta.get("poster", ""),
                })
    return {"status": "success", "data": videos}
