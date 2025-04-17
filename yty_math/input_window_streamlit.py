import streamlit as st
from input_streamlit import *
import tempfile

class FinalApp:
    def __init__(self):
        self.selected_model_version = None
        self.last_path = None

    def run(self):
        st.title("矩阵输入与处理")
        st.sidebar.title("选项")

        action = st.sidebar.radio("选择操作", ["识别算式", "手写输入"])

        if action == "识别算式":
            self.handle_image_selection()

            # 如果成功上传了图片，就显示处理按钮
            if self.last_path:
                if st.button("处理图片"):
                    process_and_display_image(self.last_path)

        elif action == "手写输入":
            self.create_matrix()

    def handle_image_selection(self):
        success, uploaded_file = select_and_display_image()
        if success:
            st.success("图片选择成功！")

            # 保存上传的图片到临时文件，并记录路径
            temp_dir = tempfile.gettempdir()
            temp_path = os.path.join(temp_dir, uploaded_file.name)
            with open(temp_path, "wb") as f:
                f.write(uploaded_file.getbuffer())
            self.last_path = temp_path

        else:
            st.warning("请上传一张图片。")
            self.last_path = None

        self.selected_model_version = st.sidebar.selectbox(
            "选择模型版本",
            ["v4.2", "v5xp", "v5x", "v4x", "v4n", "v3.5", "v3", "v2", "v1.5", "v1", "v0", "yolo"]
        )
        st.sidebar.text(f"已选择模型版本: {self.selected_model_version}")

    def create_matrix(self):
        pass


if __name__ == "__main__":
    app = FinalApp()
    app.run()
