import cv2
import numpy as np
from PIL import ImageGrab
import pygetwindow as gw
from ultralytics import YOLO
import supervision as sv
import time

# 初始化YOLO模型
model = YOLO(r'/pyhton课设/models/train_class/weights/best.pt')

# 初始化监督库的注解器
bounding_box_annotator = sv.BoundingBoxAnnotator()
label_annotator = sv.LabelAnnotator()

# 目标窗口标题（替换为实际的图库窗口标题）
target_window_title = "电影和电视"

while True:
    # 获取目标窗口
    window = None
    windows = gw.getWindowsWithTitle(target_window_title)
    if windows:
        window = windows[0]
    else:
        print(f"找不到窗口: {target_window_title}")
        time.sleep(1)
        continue

    # 获取窗口的位置和尺寸
    x, y, width, height = window.left, window.top, window.width, window.height

    # 窗口乘以倍数
    window_times = 1.5

    # 截取窗口图像
    screenshot = ImageGrab.grab(bbox=(x, y, x + window_times*width, y + window_times*height))
    frame = np.array(screenshot)

    # 转换颜色空间从RGB到BGR (OpenCV 使用BGR)
    frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

    # 使用YOLO模型进行检测
    results = model(frame)[0]
    detections = sv.Detections.from_ultralytics(results)

    # 打印检测框坐标（如果 detections.xyxy 非空）
    if detections.xyxy.size > 0:
        for i, box in enumerate(detections.xyxy):
            print(f"Detection {i}: {box}")
    else:
        print("No detections found.")
    #print(detections.xyxy[0],detections.xyxy[1],detections.xyxy[2],detections.xyxy[3])

    # 注解图像
    annotated_image = bounding_box_annotator.annotate(
        scene=frame, detections=detections)
    annotated_image = label_annotator.annotate(
        scene=annotated_image, detections=detections)

    # 显示注解图像
    cv2.imshow('Detection', annotated_image)
    k = cv2.waitKey(1)
    if k % 256 == 27:
        print("Escape hit, closing...")
        break

cv2.destroyAllWindows()
