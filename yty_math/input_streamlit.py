import streamlit as st
import os
import re
from PIL import Image
import numpy as np
from io import BytesIO
import pandas as pd
import subprocess
import time

# 自己的包
import picture_roi
import yolo_detection
import dbscan_line
import get_number
import cv2
import file_operation
import manim_animation

def select_and_display_image():
    uploaded_file = st.file_uploader("选择一张图片", type=["jpg", "jpeg", "png"])

    if uploaded_file is not None:
        # 读取文件内容为字节流（只读一次）
        image_bytes = uploaded_file.read()

        # 显示图片（可以用 BytesIO）
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        st.image(image, caption="上传的图片", use_container_width=True)

        # 保存状态
        st.session_state.uploaded_image = image
        st.session_state.image_bytes = image_bytes
        return True
    return False


def process_and_display_image():
    if "image_bytes" not in st.session_state:
        st.warning("未找到上传图片，请先上传。")
        return

    selected_model_version = st.session_state.get("selected_model_version", "v4.2")

    # 转换为 OpenCV 图像
    file_bytes = np.asarray(bytearray(st.session_state.image_bytes), dtype=np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if img is None:
        st.error("图片加载失败")
        return

    img = picture_roi.extract_roi(picture=img, output_mode="cv2")
    img, msk, detections = yolo_detection.detect_objects(
        img, yolo_detection.load_model(selected_model_version)
    )

    img, col_list, row_list = dbscan_line.create_line(img, msk)
    matrix = get_number.organize_detections(
        get_number.class_name_and_center(detections, img),
        row_list, col_list
    )

    st.session_state.matrix = matrix
    st.session_state.col = len(col_list)
    st.session_state.row = len(row_list)

    img = picture_roi.opencv_to_pillow(img)
    st.image(img, caption="处理后的图片", use_container_width=True)

    update_entry_widgets()

def update_entry_widgets():
    matrix = st.session_state.matrix
    num_rows = len(matrix)
    num_cols = len(matrix[0]) if matrix else 0

    df = pd.DataFrame(matrix,
                      index=[f"R{i}" for i in range(num_rows)],
                      columns=[f"C{j}" for j in range(num_cols)])

    st.write("识别出的矩阵：")
    edited_df = st.data_editor(df, num_rows="dynamic", hide_index=True, use_container_width=True)
    st.session_state.matrix = edited_df.values.tolist()

def create_matrix():
    if "matrix" not in st.session_state:
        st.warning("请先识别并生成矩阵。")
        return

    matrix = st.session_state.matrix

    # 显示进度条
    progress_text = "正在使用 Manim 渲染矩阵动画，请稍候..."
    progress_bar = st.progress(0, text=progress_text)

    # 模拟进度：加载阶段
    progress_bar.progress(10, text="准备动画类和参数...")
    time.sleep(0.5)

    try:
        # 渲染动画
        from manim_animation import MatrixCreation  # 假设你在这个模块定义了 MatrixCreation 类
        animation = MatrixCreation(matrix)

        progress_bar.progress(30, text="创建动画对象...")
        time.sleep(0.5)

        animation.render()
        progress_bar.progress(100, text="🎉 渲染完成！")

        st.success("Manim 渲染完成 ✅")
    except Exception as e:
        st.error(f"渲染失败：{e}")
        progress_bar.empty()

    st.image(file_operation.default_manim_path, caption="生成的矩阵", use_container_width=True)

