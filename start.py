# start rainbow_yu 🐋✨
# start all the file in docker
# select file -> progress picture -> detect number -> select function -> animate result

import os
import argparse

from yty_math.import_file import *
from yty_math.manim_animation import *
from yty_math.yolo_detection import YOLO



def run(
        file_path,
        model_path,
        cal_func,
):
    img = cv2.imread(file_path)
    img = picture_roi.extract_roi(picture=img, output_mode="cv2")
    img, msk, detections = yolo_detection.detect_objects(img, YOLO(model_path))
    img, col, row = dbscan_line.create_line(img, msk)
    matrix = get_number.organize_detections(get_number.class_name_and_center(detections, img), row, col)
    matrix = np.array(matrix)

    if cal_func == "det":
        animate = MatrixDetShow(matrix)
        animate.render()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process an image and perform calculations")
    parser.add_argument("--file_path", type=str, default="handwritten_matrix_sample/p1.jpg", help="Path to the image file")
    parser.add_argument("--model_path", type=str, default="models/v4.2/weights/best.pt", help="Path to the model file")
    parser.add_argument("--cal_func", type=str, default="det", help="Function name (e.g., 'det')")

    args = parser.parse_args()

    run(args.file_path, args.model_path, args.cal_func)