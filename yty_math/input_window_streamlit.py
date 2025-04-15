import streamlit as st
import os
import re
import wlw
from PIL import Image
import numpy as np
from io import BytesIO

# 全局变量：最后上传的图片路径、选定的模型版本、矩阵
last_path = None
selected_model_version = "v4.2"  # 默认模型版本
matrix = None
entries = None


# 显示图片的函数
def display_image(image_path, title):
    img = Image.open(image_path)
    st.image(img, caption=title, use_container_width=True)


# 选择图片并显示的函数
def select_and_display_image():
    global last_path
    uploaded_file = st.file_uploader("选择一张图片...", type=["jpg", "png", "jpeg"])
    if uploaded_file:
        img = Image.open(uploaded_file)
        last_path = uploaded_file  # 保存上传的文件路径
        st.image(img, caption="已选择的图片", use_container_width=True)
        return True
    return False


# 创建矩阵并输入名称的函数
def create_matrix():
    if not last_path:
        st.warning("没有选择图片。请先选择一张图片。")
        return

    # 创建矩阵
    matrix_name = st.text_input("输入矩阵名称:")

    if matrix_name:
        # 正则验证
        pattern = r'[a-zA-Z0-9_]*$'
        if not re.match(pattern, matrix_name):
            st.warning("无效的矩阵名称！仅允许字母、数字和下划线。")
            return

        # 检查矩阵是否已经存在
        destination_path = f"{matrix_name}.png"
        if os.path.exists(destination_path):
            st.warning(f"矩阵 '{matrix_name}' 已存在。请使用其他名称。")
            return

        # 处理矩阵并保存
        updated_matrix = fetch_matrix_from_entries()
        st.success(f"矩阵 '{matrix_name}' 创建成功！")
        save_matrix_to_file(destination_path, updated_matrix)

        # 显示结果图片
        img = Image.open(destination_path)
        st.image(img, caption=f"渲染的矩阵: {matrix_name}", use_container_width=True)


# 从用户输入中获取矩阵的函数
def fetch_matrix_from_entries():
    global matrix, entries
    # 这是一个占位函数，您可以根据您当前处理条目和存储矩阵的逻辑实现它
    return matrix


# 将矩阵保存到文件的函数
def save_matrix_to_file(file_path, matrix_data):
    # 示例保存逻辑（您应该用自己的逻辑替换它）
    # 目前保存一个虚拟的图像
    matrix_data = np.zeros((100, 100, 3), dtype=np.uint8)
    # cv2.imwrite(file_path, matrix_data)


# 主函数
def main():
    global selected_model_version

    st.title("矩阵输入与处理")

    st.sidebar.title("选项")
    action = st.sidebar.radio("选择操作", ["选择图片", "创建矩阵"])

    if action == "选择图片":
        if select_and_display_image():
            st.success("图片选择成功！")
        else:
            st.warning("请上传一张图片。")

    elif action == "创建矩阵":
        create_matrix()

    # 添加模型版本选择功能
    selected_model_version = st.sidebar.selectbox(
        "选择模型版本", ["v4.2", "v5xp", "v5x", "v4x", "v4n", "v3.5", "v3", "v2", "v1.5", "v1", "v0", "yolo"]
    )
    st.sidebar.text(f"已选择模型版本: {selected_model_version}")

    # 示例：图像处理
    if last_path:
        st.button("处理图片", on_click=process_and_display_image)


# 图像处理并显示的函数（示例）
def process_and_display_image():
    global last_path, selected_model_version
    if not last_path:
        st.warning("没有选择图片。")
        return

    # 使用PIL读取图片（由于last_path是一个文件类对象，而不是直接的路径）
    img = Image.open(last_path)
    img = np.array(img)  # 将PIL图像转换为numpy数组

    # 根据选择的模型处理图像（此处是占位，您可以在此应用实际的处理逻辑）
    processed_img = img  # 图像处理的占位符

    # 将处理后的图像转换为PIL格式显示
    processed_img_pil = Image.fromarray(processed_img)
    st.image(processed_img_pil, caption="处理后的图片", use_container_width=True)


if __name__ == "__main__":
    main()
