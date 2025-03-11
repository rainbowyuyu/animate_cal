# start rainbow_yu 🐋✨
# start all the file in docker
# select file -> process picture -> detect number -> select function -> animate result

import os
import argparse
import numpy as np
import cv2

from yty_math.import_file import *
from yty_math.manim_animation import *
from yty_math.yolo_detection import YOLO


def run(file_paths, model_path, cal_func):
    def run_operate(file, yolo_model):
        """处理单个文件，返回矩阵"""
        img = cv2.imread(file)
        img = picture_roi.extract_roi(picture=img, output_mode="cv2")
        img, msk, detections = yolo_detection.detect_objects(img, yolo_model)
        img, col, row = dbscan_line.create_line(img, msk)
        matrix = get_number.organize_detections(get_number.class_name_and_center(detections, img), row, col)
        return np.array(matrix)

    # 确保 file_paths 是列表
    if isinstance(file_paths, str):
        file_paths = [file_paths]
    elif not isinstance(file_paths, list):
        raise TypeError("file_path 必须是字符串或字符串列表")

    # 载入 YOLO 模型（避免多次加载）
    yolo_model = YOLO(model_path)

    # 处理文件
    matrices = [run_operate(file, yolo_model) for file in file_paths]

    # 选择计算方法
    if cal_func == "det":
        animate = MatrixDetShow(matrices[0])
    elif cal_func == "add" and len(matrices) > 1:
        animate = MatrixAdditionShow(matrices[0], matrices[1])
    elif cal_func == "mul" and len(matrices) > 1:
        animate = MatrixMulShow(matrices[0], matrices[1])
    else:
        raise ValueError("无效的计算函数或文件数量错误")

    # 运行动画
    animate.render()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process images and perform matrix calculations")

    parser.add_argument("--file_paths", type=str, nargs="+", default=["handwritten_matrix_sample/p1.jpg"],
                        help="Path(s) to the image file(s), separated by space for multiple files")
    parser.add_argument("--model_path", type=str, default="models/v4.2/weights/best.pt",
                        help="Path to the model file")
    parser.add_argument("--cal_func", type=str, default="det",
                        choices=["det", "add", "mul"], help="Function name (e.g., 'det', 'add', 'mul')")

    args = parser.parse_args()

    run(args.file_paths, args.model_path, args.cal_func)
