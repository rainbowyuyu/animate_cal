# 手写数学算式可视化演示
## rainbow_yu 🐋✨

### 文件结构
models  
├── ultralytics  
│   ├── train.py  
│   └── generate_train_v3.ipynb  
└── model  
    ├── v4.2  
    │     ├── weights  
    │     ├── cufusion_matrix  
    │     └── F1_score  
    └──...(其他版本)  

yty_math  
├── __init__.py  
├── import_file.py  
├── picture_roi.py  
├── yolo_detection.py  
├── dbscan_line.py  
├── get_number.py  
├── CA.py  
├── import_window.py  
├── cacl_window.py  
└── yty_canvas.py  
  
yty_manim  
├── __init__.py  
├── squ_tex.py  
├── yty_matrix.py  
├── manim_animation.py  
└── manim_result  

### 使用方法

1. 配置latex环境
- 如果您有latex环境可跳过此步骤
- 详细下载请参考 https://tug.org/texlive/

2.配置ghostscript环境
- 如果您有ghostscript环境可跳过此步骤
- 详细下载请参考 https://www.ghostscript.com/

> ⚠ 注意配置第1和2步的环境变量

3. 配置基础环境
- windows
```bash
  cd animate_cal
  pip install -r requirements.txt 
```

- docker
```bash
  docker -pull fufuqaq/ytytest02
```

4. 运行项目
- 可视化界面
```bash
   python yty_math/app.py 
```

- 纯命令行操作
```bash
   python start.py --cal_func det
```
> 这里cal_func参数提供多个选择 det, add, mul 