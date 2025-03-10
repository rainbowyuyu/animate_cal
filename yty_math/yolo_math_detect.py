import tkinter as tk
from tkinter import ttk
from tkinter import filedialog
from tkinter import messagebox
import os
import cv2
from PIL import Image, ImageTk
from ultralytics import YOLO
import supervision as sv
import picture_roi


# 初始化监督库的注解器
bounding_box_annotator = sv.BoundingBoxAnnotator()
label_annotator = sv.LabelAnnotator()

# 创建GUI窗口
root = tk.Tk()
root.title("YTY Math Detection")
root.geometry("1920x1080")  # Increase window width to fit both images

# 默认的模型路径，版本部分可以动态更改
base_model_path = r"E:/ipynb/python_design/models"
current_version = "v4.2"
model_path = os.path.join(base_model_path, current_version, "weights", "best.pt")
model = YOLO(model_path)  # 默认初始化YOLO模型

# 创建一个Frame来放置图像显示部分
image_frame = tk.Frame(root)
image_frame.grid(row=0, column=0, rowspan=2, columnspan=2, sticky="nsew")  # 四等分的左半部分
root.grid_rowconfigure(0, weight=1)
root.grid_columnconfigure(0, weight=1)

# 用于显示原始图像的Label
original_image_label = tk.Label(image_frame)
original_image_label.pack(side="top", padx=20, pady=20)

# 用于显示检测结果的Label
detected_image_label = tk.Label(image_frame)
detected_image_label.pack(side="bottom", padx=20, pady=20)

# 创建一个Toplevel窗口作为浮动面板
floating_panel = tk.Toplevel(root)
floating_panel.title("控制面板")
floating_panel.geometry("300x150")  # 浮动面板的大小
floating_panel.attributes("-topmost", True)  # 确保浮动面板始终在最前面
floating_panel.geometry("+1600+100")  # 设置浮动面板的位置 (你可以调整它以适合你的显示器)

# 用于存储最近选择的图片路径
last_image_path = None

# 定义函数：当用户切换版本时更新模型并重新检测
def switch_model_version(event):
    global model, current_version, model_path, last_image_path
    selected_version = version_selector.get()  # 获取选中的版本
    possible_model_path = os.path.join(base_model_path, selected_version, "weights", "best.pt")
    if not os.path.exists(possible_model_path):
        messagebox.showerror("错误", f"未找到模型文件：{possible_model_path}")
        return

    current_version = selected_version
    model_path = possible_model_path
    model = YOLO(model_path)  # 重新加载模型
    messagebox.showinfo("提示", f"已切换到模型版本：{current_version}")

    # 如果有最近选择的图片，重新检测并更新结果
    if last_image_path:
        detect_objects(last_image_path)

# 定义选择图片的函数
def select_image():
    global last_image_path
    file_path = filedialog.askopenfilename(title="选择图片", filetypes=[("Image files", "*.jpg;*.jpeg;*.png")])
    if file_path:
        last_image_path = file_path  # 更新最近选择的图片路径
        display_original_image(file_path)

# 定义显示原始图像的函数
def display_original_image(image_path):
    image = cv2.imread(image_path)

    # 获取GUI窗口的尺寸（frame的宽度和高度）
    window_width = image_frame.winfo_width() - 40  # 留出一些边距
    window_height = image_frame.winfo_height() - 40  # 留出一些边距

    # 获取图片的宽高比
    img_height, img_width = image.shape[:2]
    aspect_ratio = img_width / img_height

    # 计算新的宽度和高度，保持宽高比不变
    if img_width > img_height:
        # 图片更宽，限制宽度
        new_width = min(window_width // 2, img_width)
        new_height = int(new_width / aspect_ratio)
    else:
        # 图片更高，限制高度
        new_height = min(window_height // 2, img_height)
        new_width = int(new_height * aspect_ratio)

    # 调整图片大小
    image_resized = cv2.resize(image, (new_width, new_height))

    # 转换图像格式为Tkinter能显示的格式
    image_rgb = cv2.cvtColor(image_resized, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(image_rgb)
    tk_image = ImageTk.PhotoImage(pil_image)

    # 更新GUI上的原始图像
    original_image_label.config(image=tk_image)
    original_image_label.image = tk_image

# 定义YOLO检测和显示结果的函数
def detect_objects(image_path):
    global last_image_path
    last_image_path = image_path  # 更新最近选择的图片路径

    # 读取图片
    image = picture_roi.extract_roi(last_image_path)

    # 使用YOLO模型进行检测
    results = model(image)[0]
    detections = sv.Detections.from_ultralytics(results)

    # 打印检测框坐标
    if detections.xyxy.size > 0:
        for i, box in enumerate(detections.xyxy):
            print(f"Detection {i}: {box}")
    else:
        print("No detections found.")

    # 注解图像
    annotated_image = bounding_box_annotator.annotate(scene=image, detections=detections)
    annotated_image = label_annotator.annotate(scene=annotated_image, detections=detections)

    # 获取GUI窗口的尺寸（frame的宽度和高度）
    window_width = image_frame.winfo_width() - 40
    window_height = image_frame.winfo_height() - 40

    # 获取图片的宽高比
    img_height, img_width = annotated_image.shape[:2]
    aspect_ratio = img_width / img_height

    # 计算新的宽度和高度，保持宽高比不变
    if img_width > img_height:
        # 图片更宽，限制宽度
        new_width = min(window_width // 2, img_width)
        new_height = int(new_width / aspect_ratio)
    else:
        # 图片更高，限制高度
        new_height = min(window_height // 2, img_height)
        new_width = int(new_height * aspect_ratio)

    # 调整图片大小
    annotated_image_resized = cv2.resize(annotated_image, (new_width, new_height))

    # 转换图像格式为Tkinter能显示的格式
    annotated_image_rgb = cv2.cvtColor(annotated_image_resized, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(annotated_image_rgb)
    tk_image = ImageTk.PhotoImage(pil_image)

    # 更新GUI上的检测结果图像
    detected_image_label.config(image=tk_image)
    detected_image_label.image = tk_image

# 定义退出函数
def quit_app():
    root.quit()

# 创建版本选择的选项卡
tab_control = ttk.Notebook(floating_panel)
tab_control.pack(side="top", fill="x")

# 创建版本切换选项卡
version_tab = ttk.Frame(tab_control)
tab_control.add(version_tab, text="选择版本")

# 创建下拉菜单选择版本
version_selector = ttk.Combobox(version_tab, state="readonly")
version_selector.pack(padx=10, pady=10)
version_selector["values"] = ["v4.2", "v4.1", "v4x", "v4n", "v3.5", "v3", "v2", "v1.5", "v1", "v0", "yolo"]  # 模型版本列表
version_selector.current(0)  # 默认选择第一个版本
version_selector.bind("<<ComboboxSelected>>", switch_model_version)  # 绑定切换事件

# 创建选择图片的按钮
select_button = tk.Button(floating_panel, text="选择图片", command=select_image)
select_button.pack(side="left", padx=10)

# 创建检测按钮
detect_button = tk.Button(floating_panel, text="检测", command=lambda: detect_objects(last_image_path) if last_image_path else messagebox.showerror("错误", "请先选择图片"))
detect_button.pack(side="left", padx=10)

# 创建退出按钮
exit_button = tk.Button(floating_panel, text="退出", command=quit_app)
exit_button.pack(side="right", padx=10)

# 在图片右侧创建一个Frame用于放置输入框
entry_frame = tk.Frame(root)
entry_frame.grid(row=0, column=2, rowspan=2, sticky="nsew", padx=20, pady=20)  # 设置为右侧区域
root.grid_columnconfigure(2, weight=1)

# 创建三个输入框，初始值分别为1, 2, 3
entry1 = tk.Entry(entry_frame, width=10)
entry1.insert(0, "1")  # 设置初始值
entry1.pack(pady=10)

entry2 = tk.Entry(entry_frame, width=10)
entry2.insert(0, "2")  # 设置初始值
entry2.pack(pady=10)

entry3 = tk.Entry(entry_frame, width=10)
entry3.insert(0, "3")  # 设置初始值
entry3.pack(pady=10)

# 添加一个按钮用于获取输入框的值并打印到控制台
def print_entries():
    value1 = entry1.get()
    value2 = entry2.get()
    value3 = entry3.get()
    print(f"Entry 1: {value1}, Entry 2: {value2}, Entry 3: {value3}")

print_button = tk.Button(entry_frame, text="打印输入值", command=print_entries)
print_button.pack(pady=10)

if __name__ == "__main__":
    # 运行主循环
    root.mainloop()
