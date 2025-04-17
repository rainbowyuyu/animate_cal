import streamlit as st
import os
import re
from PIL import Image
import numpy as np
from io import BytesIO
import pandas as pd

# 自己的包
import picture_roi
import yolo_detection
import dbscan_line
import get_number
import cv2

def select_and_display_image():
    uploaded_file = st.file_uploader("选择一张图片", type=["jpg", "jpeg", "png"])

    if uploaded_file is not None:
        # 显示图片
        image = Image.open(uploaded_file)
        st.image(image, caption="上传的图片", use_container_width=True)

        # 存入 session_state（可选）
        st.session_state.last_path = uploaded_file.name

        return True, uploaded_file
    else:
        return False, None


def process_and_display_image(last_path):
    if "last_path" not in st.session_state or st.session_state.last_path is None:
        st.warning("未选择图片，请先上传一张图片。")
        return

    selected_model_version = st.session_state.get("selected_model_version", "v4.2")

    # 加载并处理图片
    img = cv2.imread(last_path)
    if img is None:
        st.error(f"图片路径无效：{last_path}")
        return

    # 使用 picture_roi 和 yolo_detection 处理图片
    img = picture_roi.extract_roi(picture=img, output_mode="cv2")
    img, msk, detections = yolo_detection.detect_objects(
        img, yolo_detection.load_model(selected_model_version)
    )

    img, col_list, row_list = dbscan_line.create_line(img, msk)
    col = len(col_list)
    row = len(row_list)
    matrix = get_number.organize_detections(
        get_number.class_name_and_center(detections, img), row_list, col_list
    )

    # 保存识别结果
    st.session_state.matrix = matrix
    st.session_state.col = col
    st.session_state.row = row

    # 显示处理后的图像
    img = picture_roi.opencv_to_pillow(img)
    st.image(img, caption="处理后的图片", use_container_width=True)

    # 显示可编辑矩阵表格
    update_entry_widgets(matrix)

def update_entry_widgets(matrix):

    num_rows = len(matrix)
    num_cols = len(matrix[0]) if matrix else 0

    df = pd.DataFrame(matrix,
                      index=[f"R{i}" for i in range(num_rows)],
                      columns=[f"C{j}" for j in range(num_cols)])

    st.write("识别出的矩阵：")
    st.dataframe(df)
