from import_file import *


class CanvasWindow(tk.Tk):
    def __init__(self):
        super().__init__()

        self.title("画布")
        self.geometry("1400x900")
        self.background_color = "white"

        # 当前模式（pen或eraser）
        self.mode = "pen"
        self.pen_size = 2  # 默认画笔大小
        self.eraser_size = 40  # 默认橡皮擦大小

        # 创建一个frame来放置按钮
        button_frame = tk.Frame(self)
        button_frame.pack(side=tk.TOP, pady=0)  # 将按钮框架放在窗口顶部

        # 创建按钮以保存为PNG图像
        self.save_button = Button(button_frame, text="保存图片", command=self.save_as_image)
        self.save_button.pack(side=tk.LEFT, padx=10)

        # 创建按钮以读取保存的图像
        self.load_button = Button(button_frame, text="导入图片", command=self.load_image)
        self.load_button.pack(side=tk.LEFT, padx=10)

        # 创建按钮清空画布
        self.clear_button = Button(button_frame, text="清空画布", command=self.clear_canvas)
        self.clear_button.pack(side=tk.LEFT, padx=10)

        # 导出给矩阵
        self.export_button = Button(button_frame, text="导出给矩阵输入", command=self.export_image)
        self.export_button.pack(side=tk.LEFT, padx=10)

        # 创建Canvas
        self.canvas = tk.Canvas(self, width=1300, height=720, bg=self.background_color)
        self.canvas.pack(pady=20)

        # 设置画笔功能
        self.drawing = False  # 是否正在绘制
        self.prev_x = 0
        self.prev_y = 0
        self.lines = []  # 存储完整的绘制线条
        self.redo_lines = []  # 存储撤销的线条
        self.shapes = []  # 存储其他绘制的图形（矩形、圆形、文本等）
        self.loaded_image = None  # 用于存储加载的图像

        # 设置画笔功能
        self.canvas.bind("<Button-1>", self.start_drawing)
        self.canvas.bind("<B1-Motion>", self.draw)
        self.canvas.bind("<ButtonRelease-1>", self.stop_drawing)

        # 绑定快捷键
        self.bind("<Control-z>", self.undo)
        self.bind("<Control-Shift-Key-Z>", self.redo)
        self.bind("<Control-l>", self.load_image)
        self.bind("<Control-s>", self.save_as_image)
        self.bind("<Control-n>", self.clear_canvas)
        self.bind("<Control-w>", self.export_image)
        self.bind("<b>", self.set_pen_mode)  # 按b键设置画笔模式
        self.bind("<e>", self.set_eraser_mode)  # 按e键设置橡皮擦模式
        self.bind("<Alt-Button-3>", self.start_resize)  # 按下 Alt + 鼠标右键启动大小调整
        self.bind("<B3-Motion>", self.resize_tool)  # 按住右键移动调整大小

        # 创建画笔和橡皮擦控制面板
        tool_frame = tk.Frame(self)
        tool_frame.pack(side=tk.BOTTOM, pady=10)

        # 创建Pen按钮
        self.pen_button = Button(tool_frame, text="画笔", command=self.set_pen_mode)
        self.pen_button.pack(side=tk.LEFT, padx=10)

        # 创建Eraser按钮
        self.eraser_button = Button(tool_frame, text="橡皮擦", command=self.set_eraser_mode)
        self.eraser_button.pack(side=tk.LEFT, padx=10)

        # 创建Pen大小Slider
        self.pen_size_slider = Scale(tool_frame, from_=2, to=20, orient=HORIZONTAL, label="画笔大小", command=self.update_pen_size)
        self.pen_size_slider.set(self.pen_size)
        self.pen_size_slider.pack(side=tk.LEFT, padx=10)

        # 创建Eraser大小Slider
        self.eraser_size_slider = Scale(tool_frame, from_=10, to=200, orient=HORIZONTAL, label="橡皮擦大小", command=self.update_eraser_size)
        self.eraser_size_slider.set(self.eraser_size)
        self.eraser_size_slider.pack(side=tk.LEFT, padx=10)

        # 撤回按钮
        self.undo_button = Button(tool_frame, text="撤回", command=self.undo)
        self.undo_button.pack(side=tk.LEFT, padx=10)

        # 撤回按钮
        self.undo_button = Button(tool_frame, text="重做", command=self.redo)
        self.undo_button.pack(side=tk.LEFT, padx=10)

        # 绑定鼠标移动事件来显示当前画笔或橡皮擦大小
        self.canvas.bind("<Motion>", self.display_cursor)

        # 是否调整大小的标志
        self.is_resizing = False

        # 高亮框的初始化
        self.update_highlight()

        if os.path.isfile(os.path.join(file_operation.default_file_path, "canvas_cache.txt")):
            self.load_canvas_cache()

    def write_canvas_cache(self):
        """将self.lines和self.redo_lines存储为txt文件"""
        # 设置文件路径
        cache_file = os.path.join(file_operation.default_file_path, "canvas_cache.txt")

        with open(cache_file, 'w') as file:
            # 写入self.lines中的数据
            file.write("Lines:\n")
            for line in self.lines:
                for segment in line:
                    # 将每个线段的坐标和画笔大小写入文件
                    file.write(f"{segment[0]},{segment[1]},{segment[2]},{segment[3]},{segment[4]},{segment[5]}\n")
                file.write("----\n")  # 每条线段后加上"----"标识结束

        print("Canvas cache written to", cache_file)

    def load_canvas_cache(self):
        """从txt文件中读取self.lines和self.redo_lines"""
        cache_file = os.path.join(file_operation.default_file_path, "canvas_cache.txt")

        try:
            with open(cache_file, 'r') as file:
                lines = []  # 临时存储线段
                self.lines = []  # 清空之前的线条

                # 逐行读取文件
                for line in file:
                    line = line.strip()

                    # 读取每个线段的数据
                    if line and line != "----":  # 如果行不为空且不是"----"
                        try:
                            segment_data = list(map(float, line.split(',')))
                            # 检查线段数据是否有效
                            if len(segment_data) == 6:  # 线段数据应该包含6个值（x1, y1, x2, y2, size）
                                lines.append(segment_data)
                        except ValueError:
                            print(f"Invalid data in line: {line}, skipping this line.")
                            continue
                    elif line == "----" and lines:  # 如果行是"----"且当前lines不为空
                        self.lines.append(lines)  # 添加到self.lines
                        lines = []  # 清空临时存储线段

            print("Canvas cache loaded from", cache_file)
            self.redraw_lines()  # 重新绘制所有线条
        except Exception as e:
            print(f"Error loading canvas cache: {e}")
        except FileNotFoundError:
            print(f"{cache_file} not found. No previous cache data to load.")

    def start_resize(self, event):
        """开始调整画笔或橡皮擦大小"""
        self.is_resizing = True
        self.prev_x = event.x
        self.prev_y = event.y

    def resize_tool(self, event):
        """调整画笔或橡皮擦大小"""
        if self.is_resizing:
            delta_x = event.x - self.prev_x  # 鼠标水平移动的距离

            # 设置更细的调整步长，以适应连续的左右滑动
            adjustment_factor_pen = 0.1  # 控制每次调整的增量，这个值可以根据需要进行微调
            adjustment_factor_eraser = 0.5

            if self.mode == "pen":
                self.pen_size += delta_x * adjustment_factor_pen  # 按照滑动距离的比例调整画笔大小
                self.pen_size = max(2, min(20, self.pen_size))  # 限制画笔大小范围
                self.pen_size_slider.set(self.pen_size)  # 更新滑块
            elif self.mode == "eraser":
                self.eraser_size += delta_x * adjustment_factor_eraser  # 按照滑动距离的比例调整橡皮擦大小
                self.eraser_size = max(10, min(200, self.eraser_size))  # 限制橡皮擦大小范围
                self.eraser_size_slider.set(self.eraser_size)  # 更新滑块

            self.prev_x = event.x
            self.prev_y = event.y

    def stop_resize(self, event):
        """停止调整大小"""
        self.is_resizing = False
        self.display_cursor(event)

    def set_pen_mode(self, event=None):
        """设置为画笔模式"""
        self.mode = "pen"
        self.update_highlight()
        print("Switched to Pen Mode.")

    def set_eraser_mode(self, event=None):
        """设置为橡皮擦模式"""
        self.mode = "eraser"
        self.update_highlight()
        print("Switched to Eraser Mode.")

    def update_highlight(self):
        """根据当前模式更新按钮的高亮框"""
        if self.mode == "pen":
            self.pen_button.config(bg="lightblue")  # 设置画笔按钮高亮
            self.eraser_button.config(bg="SystemButtonFace")  # 恢复橡皮擦按钮原始样式
        else:
            self.eraser_button.config(bg="lightblue")  # 设置橡皮擦按钮高亮
            self.pen_button.config(bg="SystemButtonFace")  # 恢复画笔按钮原始样式

    def update_pen_size(self, val):
        """更新画笔大小"""
        self.pen_size = int(val)

    def update_eraser_size(self, val):
        """更新橡皮擦大小"""
        self.eraser_size = int(val)

    def start_drawing(self, event):
        """开始绘制"""
        self.drawing = True
        self.prev_x = event.x
        self.prev_y = event.y
        self.current_line = []  # 记录当前线条的点

    def draw(self, event):
        """绘制线条或擦除内容"""
        if self.drawing:
            self.stop_resize(event)
            self.display_cursor(event)

            if self.mode == "pen":
                # 画线
                self.canvas.create_line(self.prev_x, self.prev_y, event.x, event.y, width=self.pen_size, fill="black", capstyle=tk.ROUND, smooth=tk.TRUE)
                self.current_line.append((1, self.prev_x, self.prev_y, event.x, event.y, self.pen_size))
            elif self.mode == "eraser":
                # 记录橡皮擦的操作：以白色矩形覆盖区域
                self.canvas.create_line(self.prev_x, self.prev_y, event.x, event.y, width=self.eraser_size, fill=self.background_color, capstyle=tk.ROUND, smooth=tk.TRUE)
                self.current_line.append((0, self.prev_x, self.prev_y, event.x, event.y, self.eraser_size))

            self.prev_x = event.x
            self.prev_y = event.y

    def stop_drawing(self, event):
        """停止绘制"""
        self.drawing = False
        if self.current_line:
            self.lines.append(self.current_line)
        self.current_line = []

    def display_cursor(self, event=None):
        """显示当前画笔或橡皮擦大小的圆圈"""
        self.canvas.delete("cursor")  # 删除之前绘制的圆圈

        # 判断是否正在调整大小
        if self.is_resizing:
            # 调整大小时显示红色实心圆圈
            color = "#FF9999"
            outline = ""  # 去除轮廓
        else:
            # 正常模式下，显示蓝色轮廓
            color = ""
            outline = "blue"

        size = self.pen_size if self.mode == "pen" else self.eraser_size
        self.canvas.create_oval(
            event.x - size / 1.8, event.y - size / 1.8,
            event.x + size / 1.8, event.y + size / 1.8,
            fill=color, outline=outline, width=2,
            tags="cursor"
        )

    def save_as_image(self, event=None, file_path=None):
        """将Canvas内容保存为PNG图像，使用截取画布的方式导出"""

        # 弹出文件保存对话框
        if not file_path:
            file_path = filedialog.asksaveasfilename(defaultextension=".png", filetypes=[("PNG files", "*.png")])
            # 临时保存为 .ps 文件
            ps_file = file_path.replace(".png", ".ps")  # 生成临时的 .ps 文件路径
            self.canvas.postscript(file=ps_file, colormode='color')

            # 使用 PIL 打开保存的 .ps 文件并转换为 .png
            try:
                # 读取 .ps 文件
                image = Image.open(ps_file)

                # 保存为 .png 格式
                image.save(file_path, "PNG")

            except Exception as e:
                print(f"Error while converting .ps to .png: {e}")
            if not file_path:
                return

        # 使用postscript方法截取Canvas内容
        ps_file = os.path.join(file_operation.default_file_path, "canvas_cache.ps") # 临时的PostScript文件
        self.canvas.postscript(file=ps_file, colormode='color')  # 保存Canvas内容为PostScript文件

    def load_image(self, event=None, file_path=None):
        """从文件夹中加载图像"""
        # 弹出选择文件的对话框
        if not file_path:
            file_path = filedialog.askopenfilename(
                title="选择图像文件",
                filetypes=[("Image Files", "*.png;*.jpg;*.jpeg;*.bmp")]
            )
        if file_path:
            try:
                self.clear_canvas()
                # 打开图像文件
                image = Image.open(file_path)
                image = image.resize((800, 400))  # 调整图像大小

                # 转换为 PhotoImage 类型用于 Tkinter 显示
                self.loaded_image = ImageTk.PhotoImage(image)

                # 在画布上显示图像
                self.canvas.create_image(0, 0, anchor=tk.NW, image=self.loaded_image)
                print(f"Loaded image from {file_path}")

            except Exception as e:
                print(f"Failed to load image: {e}")
        else:
            print("No image file selected.")

    def quit(self):
        """关闭窗口"""
        super().quit()
        self.destroy()

    def export_image(self, event=None):
        self.save_as_image(file_path=os.path.join(file_operation.default_file_path, "canvas_cache.png"))
        self.write_canvas_cache()
        self.quit()

    def clear_canvas(self, event=None):
        """清空画布"""
        self.canvas.delete("all")
        self.lines = []
        self.shapes = []
        self.loaded_image = None
        if os.path.exists(os.path.join(file_operation.default_file_path, "canvas_cache.txt")):
            os.remove(os.path.join(file_operation.default_file_path, "canvas_cache.txt"))
        print("Canvas cleared.")

    def undo(self, event=None):
        """撤销上一步的绘制操作"""
        if self.lines:
            # 将最后一条绘制操作存入重做栈
            self.redo_lines.append(self.lines.pop())  # 删除最后一条绘制，并保存到redo栈
            self.canvas.delete("all")  # 清空画布
            self.redraw_lines()  # 重新绘制所有的线

    def redo(self, event=None):
        """重做撤销的操作"""
        if self.redo_lines:
            # 恢复撤销的操作
            last_redo_line = self.redo_lines.pop()  # 从重做栈中取出一条撤销的操作
            self.lines.append(last_redo_line)  # 将该操作添加回到lines栈中
            self.redraw_lines()  # 重新绘制所有的线条


    def redraw_lines(self):
        """重新绘制所有的线条"""
        for line in self.lines:
            for segment in line:
                if segment[0] == 1:
                    self.canvas.create_line(segment[1], segment[2], segment[3], segment[4], width=segment[5], fill="black",
                                        capstyle=tk.ROUND, smooth=tk.TRUE)
                elif segment[0] == 0:
                    self.canvas.create_line(segment[1], segment[2], segment[3], segment[4], width=segment[5], fill=self.background_color,
                                        capstyle=tk.ROUND, smooth=tk.TRUE)


if __name__ == "__main__":
    window = CanvasWindow()
    window.mainloop()
