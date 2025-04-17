import streamlit as st
from streamlit_drawable_canvas import st_canvas
from PIL import Image
import numpy as np
import copy

def draw_canvas(
    canvas_key="canvas",
    canvas_height=400,
    canvas_width=600,
    bg_color="#FFFFFF",
):
    st.title("🖌️ 手写画板 - 函数版")

    # 初始化 session_state
    if "history" not in st.session_state:
        st.session_state.history = []

    if "current_image" not in st.session_state:
        st.session_state.current_image = None

    # 工具选择
    tool = st.radio("选择工具", ["笔", "橡皮擦"], horizontal=True)
    stroke_width = st.slider("笔刷大小", 1, 50, 5)
    stroke_color = "#000000" if tool == "笔" else "#FFFFFF"

    # 创建画布
    canvas_result = st_canvas(
        fill_color="rgba(255,255,255,1)",
        stroke_width=stroke_width,
        stroke_color=stroke_color,
        background_color=bg_color,
        height=canvas_height,
        width=canvas_width,
        drawing_mode="freedraw",
        key=canvas_key,
        update_streamlit=True,
    )

    # 保存当前步骤
    if st.button("保存当前步骤"):
        if canvas_result.image_data is not None:
            img_copy = copy.deepcopy(canvas_result.image_data)
            st.session_state.history.append(img_copy)
            st.session_state.current_image = img_copy

    # 撤销操作
    if st.button("撤回"):
        if st.session_state.history:
            st.session_state.history.pop()
            if st.session_state.history:
                st.session_state.current_image = st.session_state.history[-1]
            else:
                st.session_state.current_image = None
        else:
            st.warning("没有可以撤回的步骤")

    # 显示当前画布
    if st.session_state.current_image is not None:
        st.image(st.session_state.current_image, caption="当前画布", use_column_width=True)

    # 返回当前图像（可保存或后续使用）
    return st.session_state.current_image
