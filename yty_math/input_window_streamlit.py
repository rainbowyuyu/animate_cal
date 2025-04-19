# rainbow_yu streamlit_app 🐋✨

import streamlit as st
from PIL import Image
from streamlit_extras import let_it_rain

def add_empty_lines(n=1):
    """添加指定数量的空行"""
    for _ in range(n):
        st.markdown("<br>", unsafe_allow_html=True)

def index_streamlit():
    st.set_page_config(page_title="智算视界", page_icon="pure_logo.png", layout="centered")
    st.markdown(
        """
        <style>
        /* 展开侧边栏 */
        [data-testid="collapsedControl"] {
            display: none;
        }
        [data-testid="stSidebar"] {
            min-width: 300px;
            max-width: 300px;
        }
        </style>
        """,
        unsafe_allow_html=True
    )

    # 设置背景色
    let_it_rain.rain(
        emoji="✨",
        font_size=60,
        falling_speed=6,
        animation_length=1,
    )

    st.markdown(
        """
        <style>
        body {
            background-color: #f4f7fa;
        }
        .main-header {
            font-size: 28px;
            font-weight: bold;
            color: #4B8BBE;
            text-align: center;
            padding: 20px;
        }
        .sub-header {
            text-align: center;
            color: gray;
            font-size: 18px;
            margin-top: -10px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 30px 20px;
        }
        .card {
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            margin: 10px;
        }
        .button-container {
            display: flex;
            justify-content: center;
            gap: 60px;
            margin-top: 30px;
        }
        .custom-button {
            font-size: 30px;
            padding: 12px 32px;
            border-radius: 12px;
            background: linear-gradient(to right, #1c83e1, #2a8ce5);
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease-in-out;
        }
        .custom-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        .feature-col {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        </style>
        """,
        unsafe_allow_html=True
    )

    # logo 和标题
    logo = Image.open("logo.png")
    st.image(logo, use_container_width=True)

    st.markdown(
        """
        <style>
        .animated-text {
            font-size: 120px;  /* 增加字体大小 */
            font-weight: bold;
            text-align: center;
            background: linear-gradient(to right, #4B8BBE, #306998);  /* 更炫酷的渐变色 */
            -webkit-background-clip: text;
            color: transparent;
            animation: textAnimation 5s ease-in-out infinite;  /* 延长动画时长 */
        }

        @keyframes textAnimation {
            0% {
                transform: scale(1.5);
                opacity: 0.8;
            }
            50% {
                transform: scale(2);  /* 放大效果 */
                opacity: 1;
            }
            100% {
                transform: scale(1.5);
                opacity: 0.8;
            }
        }
        </style>

        <h4 class="animated-text">让数学计算更动态、更可视化</h4>
        """,
        unsafe_allow_html=True
    )


    add_empty_lines(2)

    col1, col2, col3 = st.columns([0.1, 3, 0.1])  # 中间宽度更大

    with col2:
        st.markdown(
            """
            <div class="button-container">
                <a href="operate_page" target="_self">
                    <button class="custom-button">快速开始</button>
                </a>
                <a href="documents" target="_self">
                    <button class="custom-button">教程文档</button>
                </a>
            </div>
            """,
            unsafe_allow_html=True
        )

    add_empty_lines(1)

    st.markdown("""
        <style>
            .video-container {
                display: flex;
                justify-content: center;
                align-items: center;
                margin-top: 30px;
            }
            .stVideo {
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            .stWarning {
                background-color: #f9d6d5;
                border: 1px solid #f5a9a3;
                color: #9b2d20;
                padding: 10px;
                border-radius: 5px;
            }
        </style>
    """, unsafe_allow_html=True)

    try:
        video_file = open('introduction.mp4', 'rb')  # Make sure this file exists
        video_bytes = video_file.read()
        st.markdown('<div class="video-container">', unsafe_allow_html=True)
        st.video(video_bytes)
        st.markdown('</div>', unsafe_allow_html=True)
    except FileNotFoundError:
        st.markdown('<div class="stWarning">未找到演示视频 introduction.mp4，可将其放入项目目录以展示。</div>',
                    unsafe_allow_html=True)

    add_empty_lines(3)

    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown(
            """
            <div class="feature-col">
                <h5>🔍 算式识别</h5>
                上传图片，一键识别其中的数学表达式。
            </div>
            """, unsafe_allow_html=True)
    with col2:
        st.markdown(
            """
            <div class="feature-col">
                <h5>✍️ 手写输入</h5>
                支持手写板，自由书写表达式并识别。
            </div>
            """, unsafe_allow_html=True)
    with col3:
        st.markdown(
            """
            <div class="feature-col">
                <h5>🚀 高效模型</h5>
                支持多版本模型选择，准确率高，响应快速。
            </div>
            """, unsafe_allow_html=True)

    # 页脚
    st.markdown("---")
    st.markdown(
        "<p style='text-align: center; color: gray;'>© 2025 智算视界 · Authored by RainbowYu</p>",
        unsafe_allow_html=True
    )

if __name__ == "__main__":
    index_streamlit()
