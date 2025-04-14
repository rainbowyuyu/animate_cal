# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    [
        'app.py',
        'calc_window.py',
        'dbscan_line.py',
        'file_operation.py',
        'get_number.py',
        'import_file.py',
        'input_window.py',
        'manim_animation.py',
        'manim_result.py',
        'picture_roi.py',
        'yolo_detection.py',
        'yolo_math_detect.py',
        'yty_canvas.py',
	    'squ_tex.py',
	    'matrix_yty.py',
    ],
    pathex=['E:/ipynb/python_design/yty_math'],
    binaries=[],
    datas=[],
    hiddenimports=['numpy', 'numpy.core._methods', 'numpy.lib.format', 'cv2'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='app',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='app',
)
