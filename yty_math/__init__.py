import tkinter as tk
from tkinter import ttk, filedialog, messagebox, Scale, HORIZONTAL, Button
from PIL import Image, ImageTk, ImageGrab, ImageDraw
import cv2
import shutil
import subprocess
import os
from threading import Thread
import numpy as np
from concurrent.futures import ThreadPoolExecutor
import time
import matplotlib.pyplot as plt
from datetime import datetime
from scipy.interpolate import UnivariateSpline, CubicSpline

# 图像识别文件处理库
import picture_roi
import yolo_detection
import dbscan_line
import get_number
import file_operation

# 动画模块
from yty_manim import matrix_yty
import manim_animation
import manim_result

# tk界面
import app
import input_window
import calc_window
