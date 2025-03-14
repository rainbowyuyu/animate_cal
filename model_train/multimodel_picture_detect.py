import cv2
import numpy as np
from PIL import Image, ImageTk
import tkinter as tk
from tkinter import filedialog
from ultralytics import YOLO
import supervision as sv
import os

# 指定目录路径
directory = r"E:\项目\课堂识别\SCB5-2024-9-20"

# 获取该目录下所有文件和文件夹的列表
folders = [f for f in os.listdir(directory) if os.path.isdir(os.path.join(directory, f))]

# 初始化多个YOLO模型
model_paths = []
for folder in folders:
    model_path = os.path.join(directory,folder, r"exp\weights\best.pt")
    model_paths.append(model_path)

models = [YOLO(model_path) for model_path in model_paths]

# 初始化监督库的注解器
bounding_box_annotator = sv.BoundingBoxAnnotator()
label_annotator = sv.LabelAnnotator()

# 创建Tkinter窗口
root = tk.Tk()
root.title("YOLO Object Detection with Multiple Models")

# 创建Canvas以显示图片
canvas = tk.Canvas(root, width=900, height=600)
canvas.pack()


# 选择图片函数
def select_image():
    # 打开文件选择对话框
    file_path = filedialog.askopenfilename(filetypes=[("Image Files", "*.png;*.jpg;*.jpeg;*.bmp")])
    if file_path:
        process_image(file_path)


# 处理图片并进行识别
def process_image(image_path):
    # 读取图片
    image = cv2.imread(image_path)

    # 转换为RGB，因为OpenCV读取图片默认是BGR
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    for model in models:
        # 使用YOLO模型进行检测
        results = model(image)[0]
        detections = sv.Detections.from_ultralytics(results)

        # 打印检测框坐标（如果 detections.xyxy 非空）
        if detections.xyxy.size > 0:
            for idx, box in enumerate(detections.xyxy):
                print(f"Detection {idx}: {box}")
        else:
            print("No detections found.")

        # 注解图像
        image_rgb = bounding_box_annotator.annotate(
            scene=image_rgb, detections=detections)
        image_rgb = label_annotator.annotate(
            scene=image_rgb, detections=detections)

    # 将图像转换为PIL格式
    pil_image = Image.fromarray(image_rgb)

    # 获取原始图像的宽高
    width, height = pil_image.size

    # 计算缩放比例
    max_width = 900
    max_height = 600
    scale = min(max_width / width, max_height / height)

    # 等比缩放图片
    new_width = int(width * scale)
    new_height = int(height * scale)
    pil_image = pil_image.resize((new_width, new_height), Image.Resampling.LANCZOS)

    # 显示缩放后的图像
    img_tk = ImageTk.PhotoImage(pil_image)

    # 更新Canvas上的图像
    canvas.create_image(0, 0, anchor=tk.NW, image=img_tk)
    canvas.image = img_tk  # 保持对图像的引用


# 创建选择图片按钮
button = tk.Button(root, text="选择图片", command=select_image)
button.pack()

# 运行Tkinter主循环
root.mainloop()
