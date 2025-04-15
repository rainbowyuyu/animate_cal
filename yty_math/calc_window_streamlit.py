import streamlit as st
import os
import shutil
import numpy as np
from PIL import Image

import file_operation

# 初始化 session_state
if 'matrix_name' not in st.session_state:
    st.session_state.matrix_name = ["", ""]
if 'operation' not in st.session_state:
    st.session_state.operation = None
if 'matrix1' not in st.session_state:
    st.session_state.matrix1 = None
if 'matrix2' not in st.session_state:
    st.session_state.matrix2 = None
if 'latex_img_path' not in st.session_state:
    st.session_state.latex_img_path = None


def is_matrix_valid():
    matrix1 = np.array(file_operation.read_matrix_from_file(st.session_state.matrix_name[0]))
    matrix2 = np.array(file_operation.read_matrix_from_file(st.session_state.matrix_name[1]))

    st.session_state.matrix1 = matrix1
    st.session_state.matrix2 = matrix2

    op = st.session_state.operation
    if op == 'add' and matrix1.shape == matrix2.shape:
        return True
    elif op == 'mul' and matrix1.shape[1] == matrix2.shape[0]:
        return True
    elif op == 'det' and matrix1.shape[0] == matrix1.shape[1]:
        return True
    else:
        return False


def select_matrix(number, image_name):
    folder = file_operation.default_save_path
    txt_path = os.path.join(folder, f"{image_name}.txt")
    if os.path.exists(txt_path):
        st.session_state.matrix_name[number] = txt_path
        shutil.copy(txt_path, os.path.join(file_operation.default_file_path, f"matrix{number}_cache.txt"))


def generate_latex_result():
    # 生成LaTeX结果图像的逻辑
    # 这个可以根据您自己生成LaTeX文件的方式进行替换
    latex_img_path = "results/result_latex.png"  # 假设这是生成的路径
    st.session_state.latex_img_path = latex_img_path


# UI 渲染
st.title("矩阵计算器（Streamlit版本）")

# 图片选择区域
st.header("选择矩阵图像")
folder = file_operation.default_save_path
images = [f for f in os.listdir(folder) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
image_names = [os.path.splitext(img)[0] for img in images]

selected_image = st.selectbox("从以下图像中选择：", image_names)

# 预览图像
if selected_image:
    img_path = os.path.join(folder, f"{selected_image}.png")
    if os.path.exists(img_path):
        st.image(img_path, caption=selected_image, width=300)

# 操作选择区域
st.header("选择矩阵操作")
col1, col2, col3 = st.columns(3)
with col1:
    if st.button("行列式"):
        st.session_state.operation = 'det'
with col2:
    if st.button("矩阵加法"):
        st.session_state.operation = 'add'
with col3:
    if st.button("矩阵乘法"):
        st.session_state.operation = 'mul'

if st.session_state.operation:
    st.subheader(f"当前操作: {st.session_state.operation}")
    if st.session_state.operation == 'det':
        if st.button("选择为矩阵"):
            select_matrix(0, selected_image)
    else:
        col1, col2 = st.columns(2)
        with col1:
            if st.button("选择为矩阵1"):
                select_matrix(0, selected_image)
        with col2:
            if st.button("选择为矩阵2"):
                select_matrix(1, selected_image)

    # 显示选中矩阵名
    st.text(f"矩阵1: {os.path.basename(st.session_state.matrix_name[0])}")
    if st.session_state.operation != 'det':
        st.text(f"矩阵2: {os.path.basename(st.session_state.matrix_name[1])}")

    # 验证并显示结果
    if is_matrix_valid():
        st.success("矩阵验证通过，可以进行计算。")
        if st.button("生成 LaTeX 结果图像"):
            generate_latex_result()  # 生成LaTeX结果

            # 显示生成的LaTeX结果图像
            if st.session_state.latex_img_path and os.path.exists(st.session_state.latex_img_path):
                st.image(st.session_state.latex_img_path, caption="计算结果（LaTeX）")
            else:
                st.warning("LaTeX 结果图像未生成，请确保路径正确。")
    else:
        st.error("矩阵维度不匹配或无效，请重新选择。")
