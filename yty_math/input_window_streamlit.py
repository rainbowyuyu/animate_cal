# rainbow_yu streamlit_app 🐋✨

import streamlit as st
from index_streamlit import *
from input_streamlit import *
from canvas_streamlit import *
from calc_window_streamlit import *
import tempfile
import os

class FinalApp:
    def __init__(self):
        self.selected_model_version = None

    def run(self):
        st.set_page_config(page_title="智算视界", page_icon="pure_logo.png", layout="centered")

        st.sidebar.image("logo.png", use_container_width=True)
        st.sidebar.title("页面")

        if "page" not in st.session_state:
            st.session_state.page = "主页"

        # 读取状态或用户点击
        action = st.sidebar.radio("选择页面", ["主页", "识别算式", "手写输入", "动画演示"],
                                  index=["主页", "识别算式", "手写输入", "动画演示"].index(st.session_state.page))

        if action == "主页":
            self.index_streamlit()
            st.session_state.page = action

        elif action == "识别算式":
            st.session_state.page = action
            st.title("识别算式")
            self.handle_image_selection()

            if "image_bytes" in st.session_state:
                if st.button("识别图片"):
                    process_and_display_image()

            if "matrix" in st.session_state:
                if st.button("创建矩阵"):
                    create_matrix()

        elif action == "手写输入":
            st.session_state.page = action
            st.title("手写输入")
            self.canvas()

        elif action == "动画演示":
            st.session_state.page = action
            st.title("动画演示")
            self.animate()

    def handle_image_selection(self):
        success = select_and_display_image()
        if success:
            st.success("图片上传成功！")

        self.selected_model_version = st.sidebar.selectbox(
            "选择模型版本",
            ["v4.2", "v5xp", "v5x", "v4x", "v4n", "v3.5", "v3", "v2", "v1.5", "v1", "v0", "yolo"]
        )
        st.sidebar.text(f"已选择模型版本: {self.selected_model_version}")
        st.session_state.selected_model_version = self.selected_model_version
    def index_streamlit(self):
        index_streamlit()

    def canvas(self):
        draw_canvas()

    def animate(self):
        matrix_calculator_app()

if __name__ == "__main__":
    app = FinalApp()
    app.run()