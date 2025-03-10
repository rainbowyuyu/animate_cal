import cv2
import numpy as np
from sklearn.cluster import DBSCAN


def detect_division_lines(detection_mask):
    # 转为灰度
    image = cv2.cvtColor(detection_mask, cv2.COLOR_BGR2GRAY)

    # 二值化
    _, binary_image = cv2.threshold(image, 127, 255, cv2.THRESH_BINARY_INV)

    # 膨胀操作
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (10, 10))
    dilated_image = cv2.dilate(binary_image, kernel, iterations=1)

    # 去除小噪点
    kernel_open = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    opened_image = cv2.morphologyEx(dilated_image, cv2.MORPH_OPEN, kernel_open)

    # 查找连通域
    contours, _ = cv2.findContours(opened_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # 获取连通域的中心坐标
    centroids = []
    for contour in contours:
        M = cv2.moments(contour)
        if M["m00"] != 0:
            cX = int(M["m10"] / M["m00"])
            cY = int(M["m01"] / M["m00"])
            centroids.append([cX, cY])

    # 获取图像尺寸
    height, width = image.shape

    # 使用 DBSCAN 聚类
    eps = min(height, width)//20
    min_samples = 1
    dbscan = DBSCAN(eps=eps, min_samples=min_samples)
    labels = dbscan.fit_predict(centroids)

    # 排除噪声点
    centroids_no_noise = [centroids[i] for i in range(len(centroids)) if labels[i] != -1]

    # 根据聚类结果计算分割线
    row = int(np.ceil(np.sqrt(len(centroids_no_noise))))
    col = int(np.ceil(len(centroids_no_noise) / row))

    sub_rects = []
    for cX, cY in centroids_no_noise:
        sub_width = width // col
        sub_height = height // row

        start_y = max(0, cY - sub_height // 2)
        end_y = min(height, cY + sub_height // 2)
        start_x = max(0, cX - sub_width // 2)
        end_x = min(width, cX + sub_width // 2)
        sub_rects.append((start_x, start_y, end_x, end_y))

    vertical_lines = []
    horizontal_lines = []
    for i in range(1, len(sub_rects)):
        prev_x, prev_y, prev_end_x, prev_end_y = sub_rects[i - 1]
        curr_x, curr_y, curr_end_x, curr_end_y = sub_rects[i]

        if prev_x != curr_x:
            vertical_lines.append(curr_x)
        if prev_y != curr_y:
            horizontal_lines.append(curr_y)

    # 去重函数
    def deduplicate_lines(lines, centroids, axis):
        lines = sorted(lines)
        deduplicated = []
        line_centroid_map = {}
        for line in lines:

            # 获取当前线左侧和右侧的质心
            left_centroids = [c for c in centroids if c[axis] < line]
            right_centroids = [c for c in centroids if c[axis] >= line]

            # 根据左右质心组合创建一个唯一的键
            key = (tuple(sorted(map(tuple, left_centroids))), tuple(sorted(map(tuple, right_centroids))))

            # 如果已有相同左右质心组合的线，则去除重复的线
            if key not in line_centroid_map:
                line_centroid_map[key] = line
                deduplicated.append(line)

        return deduplicated

    vertical_lines = deduplicate_lines(vertical_lines, centroids_no_noise, axis=0)
    horizontal_lines = deduplicate_lines(horizontal_lines, centroids_no_noise, axis=1)

    def threshold_lines(lines, threshold):
        threshold_line = [lines[0]]
        for line in lines[1:]:
            if line - threshold_line[-1] >= threshold:
                threshold_line.append(line)
        return threshold_line

    v_threshold = width // col // 2
    h_threshold = height // row // 2
    vertical_lines = threshold_lines(vertical_lines, v_threshold)
    horizontal_lines = threshold_lines(horizontal_lines, h_threshold)

    # 验证分割线
    def validate_lines(lines, centroids, axis):
        validated_lines = []
        for line in lines:
            has_left = any(c[axis] < line for c in centroids)
            has_right = any(c[axis] >= line for c in centroids)
            if has_left and has_right:
                validated_lines.append(line)
        return validated_lines

    vertical_lines = validate_lines(vertical_lines, centroids_no_noise, axis=0)
    horizontal_lines = validate_lines(horizontal_lines, centroids_no_noise, axis=1)

    return vertical_lines, horizontal_lines


def create_line(detection_result, detection_mask):
    vertical_lines, horizontal_lines = detect_division_lines(detection_mask)
    height, width = detection_result.shape[:2]
    # 绘制分割线
    for x in vertical_lines:
        cv2.line(detection_result, (x, 0), (x, height), (255, 0, 0), 5)

    for y in horizontal_lines:
        cv2.line(detection_result, (0, y), (width, y), (0, 0, 255), 5)

    detection_result = cv2.cvtColor(detection_result, cv2.COLOR_BGR2RGB)
    return detection_result, vertical_lines, horizontal_lines
