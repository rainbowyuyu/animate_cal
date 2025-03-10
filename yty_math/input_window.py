import os.path

from import_file import *
import calc_window
import yty_canvas

# 全局变量存储上次选择的文件路径
last_path = None
selected_model_version = "v4.2"  # 初始化默认的模型版本
panel = None
matrix = None
entries = None


# 辅助函数：创建一个带样式的框架
def create_frame(parent, title):
    frame = ttk.LabelFrame(parent, text=title, labelanchor="n", style="Custom.TLabelframe")
    frame.pack_propagate(False)
    return frame
5

# 选择图片并显示
def select_and_display_image(label, frame):
    global last_path
    last_path = filedialog.askopenfilename(filetypes=[("Image Files", "*.jpg;*.png;*.jpeg")])
    if last_path:
        # 加载并调整图片大小，保持纵横比
        img = Image.open(last_path)
        frame_width = frame.winfo_width()
        frame_height = frame.winfo_height()
        scale = min(frame_width / img.width, frame_height / img.height)
        new_size = (int(img.width * scale), int(img.height * scale))
        img = img.resize(new_size, Image.LANCZOS)

        # 显示图片
        img_tk = ImageTk.PhotoImage(img)
        label.image = img_tk
        label.configure(image=img_tk)

        # 图片居中显示
        label.place(relx=0.5, rely=0.5, anchor="center")


def display_new_image(label, frame, path):
    img = Image.open(path)
    frame_width = frame.winfo_width()
    frame_height = frame.winfo_height()
    scale = min(frame_width / img.width, frame_height / img.height)
    new_size = (int(img.width * scale), int(img.height * scale))
    img = img.resize(new_size, Image.LANCZOS)

    # 显示图片
    img_tk = ImageTk.PhotoImage(img)
    label.image = img_tk
    label.configure(image=img_tk)

    # 图片居中显示
    label.place(relx=0.5, rely=0.5, anchor="center")


def update_entry_widgets(frame, col, row, matrix):
    global entries
    # 清空旧的输入框
    for widget in frame.winfo_children():
        widget.destroy()

    # 定义较大的字体
    font_style = ("Arial", 14)  # 字体为 Arial，大小为 14

    # 根据 col 和 row 生成新的输入框
    entries = []  # 存储所有输入框
    for i in range(len(row) + 1):
        entry_row = []  # 存储一行的输入框
        for j in range(len(col) + 1):
            entry = ttk.Entry(frame, width=0, font=font_style, justify="center")  # 设置字体和居中对齐
            entry.grid(row=i, column=j, padx=2, pady=2, sticky="nsew")  # 保证网格对齐
            entry_row.append(entry)
        entries.append(entry_row)

    # 给输入框赋初值
    for i in range(len(row) + 1):
        for j in range(len(col) + 1):
            value = matrix[i][j]  # 从 matrix 获取值
            entries[i][j].insert(0, str(value))  # 插入值到对应的输入框

    # 使 frame3 的列和行能够扩展以填满空间
    for i in range(len(row) + 1):
        frame.grid_rowconfigure(i, weight=1)  # 动态调整行高度
    for j in range(len(col) + 1):
        frame.grid_columnconfigure(j, weight=1)  # 动态调整列宽度


# 处理并显示图片
def process_and_display_image(img_label3, frame3, frame4):
    global last_path, selected_model_version, matrix
    if last_path:
        # 使用 OpenCV 加载图片
        img = cv2.imread(last_path)

        # 使用 picture_roi 和 yolo_detection 处理图片
        img = picture_roi.extract_roi(picture=img, output_mode="cv2")
        img, msk, detections = yolo_detection.detect_objects(img, yolo_detection.load_model(selected_model_version))
        img, col, row = dbscan_line.create_line(img, msk)
        matrix = get_number.organize_detections(get_number.class_name_and_center(detections, img), row, col)

        # 更新frame4中的输入框
        update_entry_widgets(frame4, col, row, matrix)

        # 将 OpenCV 图像转换为 PIL 格式
        img = picture_roi.opencv_to_pillow(img)

        # 调整图像大小以适应框架
        frame_width = frame3.winfo_width()
        frame_height = frame3.winfo_height()
        scale = min(frame_width / img.width, frame_height / img.height)
        new_size = (int(img.width * scale), int(img.height * scale))
        img = img.resize(new_size, Image.LANCZOS)

        # 显示处理后的图片
        img_tk = ImageTk.PhotoImage(img)
        img_label3.image = img_tk
        img_label3.configure(image=img_tk)

        # 图片居中显示
        img_label3.place(relx=0.5, rely=0.5, anchor="center")
    else:
        messagebox.showwarning("警告", "未选择图片，请先选择一张图片。")


# 新建矩阵并获取用户输入名称
def create_matrix():
    global panel, matrix, entries
    # 检测是否有矩阵可以命名
    if not last_path:
        messagebox.showwarning("警告", "未检测图片，请先检测图片。")
        return

    # 从 entry 小部件中获取矩阵数据
    def fetch_matrix_from_entries():
        rows = len(matrix)  # 原矩阵的行数
        cols = len(matrix[0]) if rows > 0 else 0  # 原矩阵的列数
        updated_matrix = []

        for i in range(rows):
            row_values = []
            for j in range(cols):
                entry_widget = entries[i][j]
                try:
                    # 尝试将输入的值转换为数字
                    value = int(entry_widget.get())
                except ValueError:
                    # 如果转换失败，设置默认值为 0
                    value = 0
                row_values.append(value)
            updated_matrix.append(row_values)
        return updated_matrix

    updated_matrix = fetch_matrix_from_entries()
    file_operation.write_matrix_to_file(file_operation.default_file_path, updated_matrix, "cache")
    # manim模块
    subprocess.run([
        "manim",
        r"E:\ipynb\python_design\yty_math\manim_animation.py",
        "MatrixCreation",
        "-qh",
        "--transparent",
    ], check=True)

    # 弹出输入框窗口
    input_window = tk.Toplevel(panel)
    input_window.title("创建矩阵")
    input_window.geometry("250x150")
    input_window.resizable(False, False)
    input_window.attributes("-topmost", True)

    # 标签和输入框
    label = ttk.Label(input_window, text="请输入矩阵名称:", font=("Arial", 12))
    label.pack(pady=10)
    matrix_name_entry = ttk.Entry(input_window, font=("Arial", 12))
    matrix_name_entry.pack(pady=5)

    # 确认按钮
    def confirm_name():
        matrix_name = matrix_name_entry.get().strip()
        if matrix_name:
            # 获取更新后的矩阵
            updated_matrix = fetch_matrix_from_entries()
            messagebox.showinfo("成功", f"矩阵 '{matrix_name}' 已创建！")

            # 将矩阵写入文件
            file_operation.write_matrix_to_file(file_operation.default_file_path, updated_matrix, matrix_name)

            # 定义目标文件的路径和新名称
            new_name = f'\\{matrix_name}.png'
            destination_path = file_operation.default_file_path + new_name

            # 打开渲染的图像文件
            img = Image.open(file_operation.default_manim_path)
            # 保存为.png文件
            img.save(destination_path)

            input_window.destroy()
        else:
            messagebox.showwarning("警告", "矩阵名称不能为空！")

    confirm_button = ttk.Button(input_window, text="确认", command=confirm_name)
    confirm_button.pack(pady=10)


# 主界面
def call_input_window():
    global last_path, selected_model_version
    # 主窗口
    input_window = tk.Tk()
    input_window.title("矩阵输入")
    input_window.geometry("1400x900")
    input_window.resizable(True, True)

    # 样式
    style = ttk.Style()
    style.configure("Custom.TLabelframe", borderwidth=2, relief="solid", font=("Arial", 12, "bold"))
    style.configure("Toolbutton.TButton", font=("Arial", 10, "bold"))
    style.configure("Custom.TFrame", background="#f0f0f0")

    # 内容框架
    content_frame = ttk.Frame(input_window)
    content_frame.pack(expand=True, fill=tk.BOTH)

    frame1 = create_frame(content_frame, "原图")
    frame2 = create_frame(content_frame, "检测图像")
    frame3 = create_frame(content_frame, "可编辑矩阵")
    frame4 = create_frame(content_frame, "创建矩阵")

    frame1.grid(row=0, column=0, sticky="nsew", padx=5, pady=5)
    frame2.grid(row=0, column=1, sticky="nsew", padx=5, pady=5)
    frame3.grid(row=1, column=0, sticky="nsew", padx=5, pady=5)
    frame4.grid(row=1, column=1, sticky="nsew", padx=5, pady=5)

    content_frame.columnconfigure((0, 1), weight=1)
    content_frame.rowconfigure((0, 1), weight=1)

    # 图片标签
    img_label1 = ttk.Label(frame1)
    img_label1.pack(expand=True, fill=tk.BOTH)

    img_label3 = ttk.Label(frame3)
    img_label3.pack(expand=True, fill=tk.BOTH)

    img_label2 = ttk.Label(frame2)
    img_label2.pack(expand=True, fill=tk.BOTH)

    img_label4 = ttk.Label(frame4)
    img_label4.pack(expand=True, fill=tk.BOTH)

    # 控制面板开关
    panel = None
    control_panel_open = False

    # 按钮引用，方便动态修改状态
    select_button = None
    canvas_button = None
    detect_button = None
    create_matrix_button = None

    # 更新按钮状态
    def update_buttons():
        if last_path:  # 如果已经选择图片
            detect_button.state(["!disabled"])  # 启用检测按钮
            create_matrix_button.state(["!disabled"])  # 启用创建矩阵按钮
        else:
            detect_button.state(["disabled"])  # 禁用检测按钮
            create_matrix_button.state(["disabled"])  # 禁用创建矩阵按钮

    def select_image_and_update():
        select_and_display_image(img_label1, frame1)
        update_buttons()

    def select_image_from_canvas(event=None):
        global last_path
        canvas_button.state(["disabled"])  # 启用从画板中绘制按钮
        canvas = yty_canvas.CanvasWindow()
        canvas.focus_force()
        canvas.mainloop()
        eps = Image.open(os.path.join(file_operation.default_file_path, "canvas_cache.ps"))
        eps.save(os.path.join(file_operation.default_file_path, "canvas_cache.png"))
        last_path = os.path.join(file_operation.default_file_path, "canvas_cache.png")
        display_new_image(img_label1, frame1, last_path)
        update_buttons()
        canvas_button.state(["!disabled"])

    def manim_show():
        create_matrix()
        display_new_image(img_label4, frame4, file_operation.default_manim_path)
        update_buttons()

    # 修改控制面板函数
    def toggle_control_panel():
        nonlocal control_panel_open, panel, select_button, detect_button, create_matrix_button, canvas_button
        if not control_panel_open:
            panel = tk.Toplevel(input_window)
            panel.title("矩阵输入")
            panel.geometry("300x300")
            panel.resizable(False, False)

            select_button = ttk.Button(panel, text="选择图片", command=select_image_and_update)
            select_button.pack(pady=5)

            canvas_button = ttk.Button(panel, text="从画板中绘制", command=select_image_from_canvas)
            canvas_button.pack(pady=5)
            panel.bind("<Control-w>", select_image_from_canvas)

            detect_button = ttk.Button(panel, text="检测图像",
                                       command=lambda: process_and_display_image(img_label2, frame2, frame3))
            detect_button.pack(pady=5)
            detect_button.state(["disabled"])  # 初始时禁用

            # 添加“创建矩阵”按钮
            create_matrix_button = ttk.Button(panel, text="创建矩阵", command=manim_show)
            create_matrix_button.pack(pady=5)
            create_matrix_button.state(["disabled"])  # 初始时禁用

            # 模型选择下拉框
            model_label = ttk.Label(panel, text="选择模型版本:", font=("Arial", 10))
            model_label.pack(pady=5)
            model_versions = ["v4.2", "v5xp", "v5x", "v4x", "v4n", "v3.5", "v3", "v2", "v1.5", "v1", "v0", "yolo"]
            model_dropdown = ttk.Combobox(panel, values=model_versions, state="readonly", font=("Arial", 10))
            model_dropdown.set(selected_model_version)  # 设置默认值
            model_dropdown.pack(pady=5)

            def update_model_version():
                global selected_model_version
                selected_model_version = model_dropdown.get()
                if last_path:
                    process_and_display_image(img_label2, frame2, frame3)  # 自动处理并显示图像

            model_dropdown.bind("<<ComboboxSelected>>", lambda event: update_model_version())

            panel.attributes("-topmost", True)
            control_panel_open = True
        else:
            if panel:
                panel.destroy()
            control_panel_open = False

    # 创建矩阵计算窗口
    def switch_calc_window():
        if panel:
            panel.destroy()
        input_window.destroy()

        calc_window.call_calc_window()

    # def switch_canvas_window():
    #     if panel:
    #         panel.destroy()
    #     input_window.destroy()
    #
    #     canvas_window.call_canvas_window()

    # 工具栏
    toolbar = ttk.Frame(input_window, padding=5, style="Custom.TFrame")
    toolbar.pack(side=tk.TOP, fill=tk.X)

    # canvas_button = ttk.Button(toolbar, text="打开画板", command=switch_canvas_window, style="Toolbutton.TButton")
    # canvas_button.pack(side=tk.LEFT, padx=5)

    input_button = ttk.Button(toolbar, text="矩阵输入", command=toggle_control_panel, style="Toolbutton.TButton")
    input_button.pack(side=tk.LEFT, padx=5)

    calc_button = ttk.Button(toolbar, text="矩阵计算", command=switch_calc_window, style="Toolbutton.TButton")
    calc_button.pack(side=tk.LEFT, padx=5)

    toggle_control_panel()
    input_window.mainloop()