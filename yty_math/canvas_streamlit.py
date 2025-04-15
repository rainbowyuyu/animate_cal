import streamlit as st
from PIL import Image, ImageDraw
import os

# 保存文件路径
default_file_path = os.path.expanduser("~")  # 设置为你的默认路径，或根据需要修改

# Canvas 窗口的实现
class CanvasApp:
    def __init__(self):
        self.mode = "pen"
        self.pen_size = 2  # 默认画笔大小
        self.eraser_size = 40  # 默认橡皮擦大小
        self.lines = []  # 存储所有的线条
        self.redo_lines = []  # 存储撤销的线条
        self.loaded_image = None  # 存储加载的图像

        # 使用Streamlit的布局来创建页面
        st.title("画布工具")

        # 设置画笔和橡皮擦
        col1, col2 = st.columns(2)
        with col1:
            self.pen_button = st.button("画笔", on_click=self.set_pen_mode)
        with col2:
            self.eraser_button = st.button("橡皮擦", on_click=self.set_eraser_mode)

        # 设置画笔大小
        self.pen_size_slider = st.slider("画笔大小", min_value=2, max_value=20, value=self.pen_size)
        self.eraser_size_slider = st.slider("橡皮擦大小", min_value=10, max_value=200, value=self.eraser_size)

        # 加载图片按钮
        self.load_button = st.file_uploader("上传图片", type=["png", "jpg", "jpeg", "bmp"], label_visibility="collapsed")
        if self.load_button:
            self.load_image(self.load_button)

        # 清空按钮
        if st.button("清空画布"):
            self.clear_canvas()

        # 保存按钮
        if st.button("保存图片"):
            self.save_as_image()

        # 导出为矩阵按钮
        if st.button("导出为矩阵"):
            self.export_image()

        # 绘制区域
        self.canvas = st.empty()
        self.image = Image.new("RGB", (1400, 900), color="white")
        self.draw = ImageDraw.Draw(self.image)

        self.display_cursor()

        # 拖动画布来绘制
        self.drawing = False
        self.prev_x = 0
        self.prev_y = 0

    def set_pen_mode(self):
        """设置为画笔模式"""
        self.mode = "pen"
        st.session_state.mode = self.mode
        st.session_state.pen_button_color = "lightblue"
        st.session_state.eraser_button_color = "SystemButtonFace"

    def set_eraser_mode(self):
        """设置为橡皮擦模式"""
        self.mode = "eraser"
        st.session_state.mode = self.mode
        st.session_state.pen_button_color = "SystemButtonFace"
        st.session_state.eraser_button_color = "lightblue"

    def display_cursor(self):
        """显示当前画笔或橡皮擦的大小"""
        cursor_size = self.pen_size if self.mode == "pen" else self.eraser_size
        st.markdown(f"**当前工具：** {'画笔' if self.mode == 'pen' else '橡皮擦'} - 大小: {cursor_size}")

    def save_as_image(self):
        """将Canvas内容保存为PNG图像"""
        file_path = os.path.join(default_file_path, "canvas_output.png")
        self.image.save(file_path)
        st.success(f"图像已保存为：{file_path}")

    def load_image(self, file):
        """加载图像到画布"""
        image = Image.open(file)
        image = image.resize((1400, 900))  # 调整图像大小
        self.image.paste(image, (0, 0))
        self.draw = ImageDraw.Draw(self.image)  # 重新创建绘图对象
        st.image(self.image)

    def clear_canvas(self):
        """清空画布"""
        self.image = Image.new("RGB", (1400, 900), color="white")
        self.draw = ImageDraw.Draw(self.image)
        st.image(self.image)
        st.session_state.lines = []

    def export_image(self):
        """导出当前图像为矩阵格式"""
        matrix = list(self.image.getdata())
        st.write("图像矩阵数据：", matrix)

    def draw_line(self, x1, y1, x2, y2, size, color="black"):
        """绘制线条"""
        self.draw.line((x1, y1, x2, y2), fill=color, width=size)

# 启动Streamlit应用
if __name__ == "__main__":
    if 'mode' not in st.session_state:
        st.session_state.mode = "pen"
    if 'pen_button_color' not in st.session_state:
        st.session_state.pen_button_color = "lightblue"
    if 'eraser_button_color' not in st.session_state:
        st.session_state.eraser_button_color = "SystemButtonFace"

    app = CanvasApp()
