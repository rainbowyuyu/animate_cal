import streamlit as st
from PIL import Image

from input_streamlit import *
from calc_window_streamlit import *

def index_streamlit():
    # logo 和标题
    logo = Image.open("logo.png")
    st.image(logo, use_container_width=True)
    st.markdown("<h1 style='text-align: center; color: #4B8BBE;'>智算视界</h1>", unsafe_allow_html=True)
    st.markdown("<h4 style='text-align: center; color: gray;'>让数学计算更动态、更可视化</h4>", unsafe_allow_html=True)

    st.markdown("---")

    # 🚀 快速开始
    st.subheader("🚀 快速开始")
    col_a, col_b = st.columns(2)
    with col_a:
        if st.button("👉 快速开始识别算式"):
            st.session_state.page = "识别算式"

    with col_b:
        if st.button("👉 快速分步动画演示"):
            st.session_state.page = "动画演示"

    st.markdown("---")

    # 🎬 视频演示
    st.subheader("🎬 视频演示")

    # 方式一：本地视频文件（推荐 .mp4）
    try:
        video_file = open('introduction.mp4', 'rb')  # 确保你有这个视频文件
        video_bytes = video_file.read()
        st.video(video_bytes)
    except FileNotFoundError:
        st.warning("未找到演示视频 introduction.mp4，可将其放入项目目录以展示。")

    st.markdown("---")

    # 🌟 功能特性
    st.subheader("🌟 产品亮点")
    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown("🔍 **算式识别**")
        st.markdown("上传图片，一键识别其中的数学表达式。")

    with col2:
        st.markdown("✍️ **手写输入**")
        st.markdown("支持手写板，自由书写表达式并识别。")

    with col3:
        st.markdown("🚀 **高效模型**")
        st.markdown("支持多版本模型选择，准确率高，响应快速。")


    # 页脚
    st.markdown("---")
    st.markdown(
        "<p style='text-align: center; color: gray;'>© 2025 智算视界 · Authored by RainbowYu</p>",
        unsafe_allow_html=True
    )

