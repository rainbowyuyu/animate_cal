def class_name_and_center(detections, image):
    """
    将每个 detection 的中心点 (x, y) 坐标归一化后，与对应的类别名称配对。

    参数:
        detections: list，每个元素包含检测结果，格式如
                    (array([x_min, y_min, x_max, y_max], dtype=float32), ..., {'class_name': '...'})
        image: 图像数据，用于获取宽度和高度信息 (image.shape)

    返回:
        list: 包含 (class_name, x_center, y_center) 的元组列表
    """
    # 提取图像高度和宽度
    height, width, _ = image.shape

    # 提取 class_name 和对应的中心点
    class_centers = [
        (
            detection[-1]['class_name'],  # 类别名称
            (detection[0][0] + detection[0][2]) / 2,  # x_center 归一化
            (detection[0][1] + detection[0][3]) / 2  # y_center 归一化
        )
        for detection in detections
    ]
    return class_centers


def organize_detections(class_centers, row_lines, col_lines):
    """
    将检测结果根据中心点在分割线的位置划分到行列矩阵中。

    参数:
        class_centers: list，每个元素为 (class_name, x_center, y_center) 的元组
        row_lines: list，表示行分割线的 y 坐标，从小到大排列
        col_lines: list，表示列分割线的 x 坐标，从小到大排列

    返回:
        matrix: list，row+1 行，col+1 列的二维列表，每个元素包含该单元格内的 class_name
    """
    # 检查输入的分割线是否有序
    if row_lines != sorted(row_lines):
        raise ValueError("Row lines must be sorted in ascending order.")
    if col_lines != sorted(col_lines):
        raise ValueError("Column lines must be sorted in ascending order.")

    # 对 class_centers 按 x_center 排序
    class_centers_sorted = sorted(class_centers, key=lambda x: x[1])  # 根据 x_center 排序

    # 初始化矩阵
    num_rows = len(row_lines) + 1
    num_cols = len(col_lines) + 1
    matrix = [['' for _ in range(num_cols)] for _ in range(num_rows)]  # 改为存储字符串

    # 确定中心点所在行号
    def get_row_idx(y_center):
        return next((i for i, y in enumerate(row_lines) if y_center < y), len(row_lines))

    # 确定中心点所在列号
    def get_col_idx(x_center):
        return next((i for i, x in enumerate(col_lines) if x_center < x), len(col_lines))

    # 遍历排序后的检测结果，填充矩阵
    for class_name, x_center, y_center in class_centers_sorted:
        row_idx = get_row_idx(y_center)
        col_idx = get_col_idx(x_center)
        if class_name == "[" or class_name == "]":
            continue
        if class_name == "-" and matrix[row_idx][col_idx]:  # 如果该格已经有值
            continue
        # 如果当前格子有元素且是'-'，将当前元素合并到已有的元素
        if matrix[row_idx][col_idx]:
            matrix[row_idx][col_idx] += class_name
        else:
            matrix[row_idx][col_idx] = class_name

    for row in range(len(matrix)):
        for col in range(len(matrix[row])):
            if matrix[row][col] != '':
                matrix[row][col] = int(matrix[row][col])

    return matrix