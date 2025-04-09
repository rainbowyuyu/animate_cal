from import_file import *
import input_window
import manim

# 全局变量初始化
control_panel_open = None
panel = None
progress_bar = None
image_listbox = None
operation = None
matrix_name = ["", ""]
matrix1 = None
matrix2 = None


def is_matrix_valid():
    global matrix_name, matrix1, matrix2
    matrix1 = np.array(file_operation.read_matrix_from_file(matrix_name[0]))
    matrix2 = np.array(file_operation.read_matrix_from_file(matrix_name[1]))

    if operation == 'add' and len(matrix1.shape) > 1 and matrix1.shape == matrix2.shape:
        return True
    elif operation == 'mul' and len(matrix1.shape) > 1 and len(matrix2.shape) > 1 and matrix1.shape[0] == matrix2.shape[
        1] and matrix1.shape[1] == matrix2.shape[0]:
        return True
    elif operation == 'det' and len(matrix1.shape) > 1 and matrix1.shape[0] == matrix1.shape[1]:
        return True
    else:
        return False


def add_buttons_to_frame(frame):
    global image_listbox, operation, matrix_name
    # 创建按钮框架
    button_frame = ttk.Frame(frame, padding=5)
    button_frame.pack(side=tk.TOP, fill=tk.X)

    # 创建“行列式”、“矩阵加法”、“矩阵乘法”按钮
    def create_buttons():
        for widget in button_frame.winfo_children():
            widget.destroy()  # 清除所有现有的按钮和内容

        # 创建行列式按钮
        det_button = ttk.Button(button_frame, text="行列式", command=lambda: handle_button_click('det'),
                                style="LargeSquare.TButton")
        det_button.pack(side=tk.LEFT, padx=10)

        # 创建矩阵加法按钮
        add_button = ttk.Button(button_frame, text="矩阵加法", command=lambda: handle_button_click('add'),
                                style="LargeSquare.TButton")
        add_button.pack(side=tk.LEFT, padx=10)

        # 创建矩阵乘法按钮
        mul_button = ttk.Button(button_frame, text="矩阵乘法", command=lambda: handle_button_click('mul'),
                                style="LargeSquare.TButton")
        mul_button.pack(side=tk.LEFT, padx=10)

    def handle_button_click(opera):
        global operation, matrix_name
        operation = opera
        matrix_name = ["", ""]
        # 清空之前的内容
        for widget in frame.winfo_children():
            if isinstance(widget, ttk.Frame) and widget != button_frame:
                widget.destroy()  # 删除先前生成的内容

        # 生成两个锁定矩阵按钮
        lock_frame = ttk.Frame(frame)
        lock_frame.pack(side=tk.LEFT, fill=tk.BOTH, pady=20, padx=20, anchor=tk.CENTER)

        # Define a larger font for buttons and labels
        large_font = ('Arial', 16)
        if operation == 'det':
            lock_button = ttk.Button(lock_frame, text="选择为矩阵", command=lambda: lock_matrix(lock_button, 0),
                                     style="LargeSquare.TButton")
            lock_button.pack(side=tk.LEFT, padx=10)
        else:
            lock_button1 = ttk.Button(lock_frame, text="选择为矩阵1", command=lambda: lock_matrix(lock_button1, 0),
                                      style="LargeSquare.TButton")
            lock_button1.pack(side=tk.LEFT, padx=10)

            operator_label = ttk.Label(lock_frame, text="", font=large_font)  # Increase font size here
            operator_label.pack(side=tk.LEFT, padx=10)

            lock_button2 = ttk.Button(lock_frame, text="选择为矩阵2", command=lambda: lock_matrix(lock_button2, 1),
                                      style="LargeSquare.TButton")
            lock_button2.pack(side=tk.LEFT, padx=10)

        # 更新操作符
        if operation == 'add':
            operator_label.config(text=" + ")
        elif operation == 'mul':
            operator_label.config(text=" × ")

    # 锁定矩阵的操作
    def lock_matrix(button, number):
        # 获取frame1中的选中矩阵的图片
        selected_image_name = image_listbox.get(image_listbox.curselection()) if image_listbox.curselection() else None
        folder = file_operation.default_save_path
        selected_image_path = os.path.join(folder, f"{selected_image_name}.png") if selected_image_name else None
        if not selected_image_path or not os.path.exists(selected_image_path):
            return  # 如果没有选择矩阵或矩阵不存在，退出

        img = Image.open(selected_image_path)
        img.thumbnail((250, 250))  # 适应按钮大小

        img_tk = ImageTk.PhotoImage(img)
        button.config(image=img_tk)
        button.image = img_tk  # 保持引用避免被垃圾回收

        matrix_name[number] = os.path.join(folder, f"{selected_image_name}.txt")
        shutil.copy(matrix_name[number], os.path.join(file_operation.default_file_path, f"matrix{number}_cache.txt"))

    create_buttons()  # 初始化按钮


# 添加图片选择功能
def add_image_tab(frame):
    global image_listbox
    # 创建选项卡
    notebook = ttk.Notebook(frame)
    notebook.pack(expand=True, fill=tk.BOTH)

    # 创建“选择矩阵”选项卡
    image_tab = ttk.Frame(notebook)
    notebook.add(image_tab, text="选择矩阵")

    # 图片列表框架
    list_frame = ttk.Frame(image_tab, padding=5)
    list_frame.pack(side=tk.LEFT, fill=tk.Y)

    # 预览框架
    preview_frame = ttk.Frame(image_tab, padding=5)
    preview_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

    # 滚动条
    scroll = ttk.Scrollbar(list_frame, orient=tk.VERTICAL)
    scroll.pack(side=tk.RIGHT, fill=tk.Y)

    # 列表框
    image_listbox = tk.Listbox(list_frame, yscrollcommand=scroll.set, width=30)
    image_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
    scroll.config(command=image_listbox.yview)

    # 预览标签
    preview_label = ttk.Label(preview_frame)
    preview_label.pack(expand=True)

    # 加载图片函数
    def load_images():
        folder = file_operation.default_save_path
        if not folder:
            return

        image_listbox.delete(0, tk.END)  # 清空列表框

        # 遍历文件夹中的图片
        for file in os.listdir(folder):
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif')):
                # 提取文件名（去掉扩展名）
                file_name = os.path.splitext(os.path.basename(file))[0]
                image_listbox.insert(tk.END, file_name)

    # 显示预览
    def preview_image(event):
        if not image_listbox.curselection():
            return
        # 使用文件夹路径和选中的文件名拼接路径
        selected_image_name = image_listbox.get(image_listbox.curselection())
        folder = file_operation.default_save_path
        selected_image_path = os.path.join(folder, f"{selected_image_name}.png")  # 假设扩展名为 .png
        if not os.path.exists(selected_image_path):  # 检查是否存在其他扩展名
            for ext in ['.jpg', '.jpeg', '.bmp', '.gif']:
                test_path = os.path.join(folder, f"{selected_image_name}{ext}")
                if os.path.exists(test_path):
                    selected_image_path = test_path
                    break

        img = Image.open(selected_image_path)
        img.thumbnail((400, 400))  # 调整图片大小以适应预览框
        img_tk = ImageTk.PhotoImage(img)
        preview_label.config(image=img_tk)
        preview_label.image = img_tk  # 保存引用以避免被垃圾回收

    # 绑定列表框事件
    image_listbox.bind("<<ListboxSelect>>", preview_image)

    # 工具栏按钮
    toolbar = ttk.Frame(frame, padding=5)
    toolbar.pack(side=tk.TOP, fill=tk.X)

    load_images()


# 计算单元主程序
def call_calc_window():
    global image_listbox, progress_bar

    # 控制面板开关
    panel = None
    control_panel_open = False

    calc_window = tk.Tk()
    calc_window.title("矩阵计算")
    calc_window.geometry("1400x900")
    calc_window.resizable(True, True)

    # 样式
    style = ttk.Style()
    style.configure("Custom.TLabelframe", borderwidth=2, relief="solid", font=("Arial", 12, "bold"))
    style.configure("Toolbutton.TButton", font=("Arial", 10, "bold"))
    style.configure("Custom.TFrame", background="#f0f0f0")

    # 内容框架
    content_frame = ttk.Frame(calc_window)
    content_frame.pack(expand=True, fill=tk.BOTH)

    frame1 = input_window.create_frame(content_frame, "选择矩阵")
    frame2 = input_window.create_frame(content_frame, "选择算式")
    frame3 = input_window.create_frame(content_frame, "可视化呈现")
    frame4 = input_window.create_frame(content_frame, "latex结果")

    frame1.grid(row=0, column=0, sticky="nsew", padx=5, pady=5)
    frame2.grid(row=0, column=1, sticky="nsew", padx=5, pady=5)
    frame3.grid(row=1, column=0, sticky="nsew", padx=5, pady=5)
    frame4.grid(row=1, column=1, sticky="nsew", padx=5, pady=5)

    content_frame.columnconfigure((0, 1), weight=1)
    content_frame.rowconfigure((0, 1), weight=1)

    # 在 frame1 中添加图片选项卡
    add_image_tab(frame1)

    # 工具栏
    toolbar = ttk.Frame(calc_window, padding=5, style="Custom.TFrame")
    toolbar.pack(side=tk.TOP, fill=tk.X)

    add_buttons_to_frame(frame2)

    def display_new_image(path):
        picture_container = ttk.Frame(frame4)
        picture_container.pack(expand=True, fill=tk.BOTH)
        label = ttk.Label(picture_container)
        img = Image.open(path)
        frame_width = frame4.winfo_width()
        frame_height = frame4.winfo_height()
        scale = min(frame_width / img.width, frame_height / img.height)
        new_size = (int(img.width * scale), int(img.height * scale))
        img = img.resize(new_size, Image.LANCZOS)

        # 显示图片
        img_tk = ImageTk.PhotoImage(img)
        label.image = img_tk
        label.configure(image=img_tk)

        # 图片居中显示
        label.place(relx=0.5, rely=0.5, anchor="center")

    # 创建矩阵计算窗口
    def manim_animation():
        global operation, progress_bar

        for widget in frame3.winfo_children():
            widget.destroy()
        for widget in frame4.winfo_children():
            widget.destroy()

        label3 = ttk.Label(frame3, text="", font=("Arial", 16))
        label3.place(relx=0.5, rely=0.5, anchor="center")  # 居中
        label4 = ttk.Label(frame4, text="", font=("Arial", 16))
        label4.place(relx=0.5, rely=0.5, anchor="center")  # 居中
        if is_matrix_valid():
            if operation == 'det':
                subprocess.run([
                    "manim",
                    file_operation.default_manim_result_code,
                    "DetResult",
                    "-qh",
                    "--transparent",
                ], check=True)

                display_new_image(os.path.join(file_operation.default_result_path, f"DetResult_ManimCE_v{manim.__version__}.png"))

                subprocess.run([
                    "manim",
                    file_operation.default_manim_source_code,
                    "MatrixDetShow",
                    "-qh",
                ], check=True)
                add_video_playback(os.path.join(file_operation.default_video_path, "MatrixDetShow.mp4"))
            elif operation == 'add':
                subprocess.run([
                    "manim",
                    file_operation.default_manim_result_code,
                    "AddResult",
                    "-qh",
                    "--transparent",
                ], check=True)

                display_new_image(os.path.join(file_operation.default_result_path, f"AddResult_ManimCE_v{manim.__version__}.png"))

                subprocess.run([
                    "manim",
                    file_operation.default_manim_source_code,
                    "MatrixAdditionShow",
                    "-qh",
                ], check=True)
                add_video_playback(os.path.join(file_operation.default_video_path, "MatrixAdditionShow.mp4"))
            elif operation == 'mul':
                subprocess.run([
                    "manim",
                    file_operation.default_manim_result_code,
                    "MulResult",
                    "-qh",
                    "--transparent",
                ], check=True)

                display_new_image(os.path.join(file_operation.default_result_path, f"MulResult_ManimCE_v{manim.__version__}.png"))

                subprocess.run([
                    "manim",
                    file_operation.default_manim_source_code,
                    "MatrixMulShow",
                    "-qh",
                ], check=True)
                add_video_playback(os.path.join(file_operation.default_video_path, "MatrixMulShow.mp4"))
        else:
            if operation == 'add':
                txt = "加法运算时，两矩阵行列数必须相等"
            elif operation == 'mul':
                txt = "乘法运算时，两矩阵行列数必须相反"
            elif operation == 'det':
                txt = "行列式运算式，矩阵必须为方阵"
            else:
                txt = "请先锁定矩阵"

            label3.config(text=txt)
            label4.config(text=txt)

    def add_video_playback(video_path):
        # 创建视频和进度条的容器框架
        for widget in frame3.winfo_children():
            widget.destroy()
        video_container = ttk.Frame(frame3)
        video_container.pack(expand=True, fill=tk.BOTH)

        # 创建标签来显示视频，设置固定高度
        video_label = ttk.Label(video_container)
        video_label.pack(side=tk.TOP, expand=True, fill=tk.BOTH, pady=(0, 5), anchor="center")

        # 创建进度条框架，确保始终可见
        progress_frame = ttk.Frame(video_container)
        progress_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=5)

        progress_label = ttk.Label(progress_frame, text="00:00")
        progress_label.pack(side=tk.LEFT, padx=5)

        progress_bar = ttk.Scale(progress_frame, from_=0, to=1, orient=tk.HORIZONTAL)
        progress_bar.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)

        total_time_label = ttk.Label(progress_frame, text="00:00")
        total_time_label.pack(side=tk.RIGHT, padx=5)

        # 播放视频的函数
        def play_video(video_path):
            cap = cv2.VideoCapture(video_path)
            video_length = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = int(cap.get(cv2.CAP_PROP_FPS))
            duration = video_length / fps

            # 格式化时间
            def format_time(seconds):
                minutes = int(seconds // 60)
                seconds = int(seconds % 60)
                return f"{minutes:02}:{seconds:02}"

            total_time_label.config(text=format_time(duration))
            progress_bar.config(to=video_length)

            # 标志变量：判断是否暂停
            is_paused = False

            # 更新视频帧的函数
            def update_frame():
                nonlocal cap, is_paused
                if is_paused:
                    return  # 如果暂停，不更新帧

                ret, frame = cap.read()
                if ret:
                    # 获取视频标签的当前大小（即窗口的大小）
                    label_width = video_label.winfo_width()
                    label_height = video_label.winfo_height()

                    # 将帧从BGR（OpenCV 默认）转换为RGB
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                    # 缩放视频帧为适应标签大小
                    frame_resized = cv2.resize(frame_rgb, (label_width, label_height),
                                               interpolation=cv2.INTER_LINEAR)

                    # 将帧转换为PhotoImage对象，便于在Tkinter中显示
                    frame_image = ImageTk.PhotoImage(Image.fromarray(frame_resized))

                    # 更新标签
                    video_label.config(image=frame_image)
                    video_label.image = frame_image

                    # 更新进度条
                    current_frame = cap.get(cv2.CAP_PROP_POS_FRAMES)
                    progress_bar.set(current_frame)
                    progress_label.config(text=format_time(current_frame / fps))

                    # 再次调用update_frame函数，延时10ms，实现平滑播放
                    video_label.after(2, update_frame)
                else:
                    # 循环播放
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    update_frame()

            # 绑定进度条事件
            def on_progress_change(event):
                nonlocal cap
                frame_no = int(progress_bar.get())
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
                update_frame()

            progress_bar.bind("<ButtonRelease-1>", on_progress_change)

            # 点击画面时切换播放和暂停
            def toggle_play_pause(event):
                nonlocal is_paused
                is_paused = not is_paused  # 切换播放状态
                if not is_paused:
                    update_frame()  # 如果是播放状态，开始播放

            video_label.bind("<Button-1>", toggle_play_pause)  # 绑定点击事件
            update_frame()

        # 选择视频文件的函数
        def select_video_file(video_path):
            if video_path:
                play_video(video_path)

        select_video_file(video_path)

    # 修改控制面板函数
    def toggle_control_panel():
        nonlocal control_panel_open, panel
        global progress_bar
        if not control_panel_open:
            panel = tk.Toplevel(calc_window)
            panel.title("矩阵计算")
            panel.geometry("300x200")
            panel.resizable(False, False)

            output_button = ttk.Button(panel, text="生成视频", command=manim_animation)
            output_button.pack(pady=20)

            progress_bar = ttk.Progressbar(panel, mode='indeterminate', length=200)
            progress_bar.pack(pady=20)
            progress_bar.start(20)

            panel.attributes("-topmost", True)
            control_panel_open = True
        else:
            if panel:
                panel.destroy()
            control_panel_open = False

    def switch_input_window():
        calc_window.destroy()
        input_window.call_input_window()

    # def switch_canvas_window():
    #     calc_window.destroy()
    #     canvas_window.call_canvas_window()

    # canvas_button = ttk.Button(toolbar, text="打开画板", command=switch_canvas_window, style="Toolbutton.TButton")
    # canvas_button.pack(side=tk.LEFT, padx=5)

    input_button = ttk.Button(toolbar, text="矩阵输入", command=switch_input_window, style="Toolbutton.TButton")
    input_button.pack(side=tk.LEFT, padx=5)

    calc_button = ttk.Button(toolbar, text="矩阵计算", command=toggle_control_panel, style="Toolbutton.TButton")
    calc_button.pack(side=tk.LEFT, padx=5)

    toggle_control_panel()
    calc_window.mainloop()
