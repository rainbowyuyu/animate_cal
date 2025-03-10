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

# 自己的库
import picture_roi
import yolo_detection
import dbscan_line
import get_number
import file_operation

