import cv2
import numpy as np
from PIL import Image


def pillow_to_opencv(pillow_img):
    # Convert Pillow image to NumPy array
    open_cv_img = np.array(pillow_img)

    # Convert RGB (Pillow) to BGR (OpenCV)
    open_cv_img = open_cv_img[:, :, ::-1].copy()

    return open_cv_img


def opencv_to_pillow(opencv_img):
    # Convert BGR (OpenCV) to RGB (Pillow)
    rgb_img = cv2.cvtColor(opencv_img, cv2.COLOR_BGR2RGB)

    # Convert the NumPy array to a Pillow Image
    pillow_img = Image.fromarray(rgb_img)

    return pillow_img


def extract_roi(image_path=None, picture=None, output_mode="cv2"):
    # 加载图片并转换为灰度图
    if image_path is not None:
        image = cv2.imread(image_path)
    else:
        if isinstance(picture, Image.Image):
            image = pillow_to_opencv(picture)
        else:
            image = picture

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # 1. 高斯模糊减少噪点
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # 2. 自适应阈值处理
    adaptive_binary = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 5
    )

    # 3. 形态学操作（开运算去除噪点）
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    clean_binary = cv2.morphologyEx(adaptive_binary, cv2.MORPH_OPEN, kernel)

    # 4. Shi-Tomasi 角点检测
    corners = cv2.goodFeaturesToTrack(clean_binary, maxCorners=100, qualityLevel=0.01, minDistance=10)
    corners = np.intp(corners)

    # 找到角点的边界范围
    x_coords = [corner.ravel()[0] for corner in corners]
    y_coords = [corner.ravel()[1] for corner in corners]
    x_min, x_max = min(x_coords), max(x_coords)
    y_min, y_max = min(y_coords), max(y_coords)

    # 确保边界范围在图像范围内
    x_min = max(0, x_min - 10)
    y_min = max(0, y_min - 10)
    x_max = min(image.shape[1], x_max + 10)
    y_max = min(image.shape[0], y_max + 10)

    # 提取 ROI（感兴趣区域）
    roi = clean_binary[y_min:y_max, x_min:x_max]

    roi = cv2.cvtColor(roi, cv2.COLOR_GRAY2BGR)

    if output_mode == "pil":
        roi = opencv_to_pillow(roi)
    return roi