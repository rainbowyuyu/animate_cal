---
name: python-venv
description: Python virtual environments and dependencies. Use when creating venv, installing packages, running scripts, or fixing path/activation issues.
metadata:
  tags: python, venv, pip, dependencies
---

# Python 虚拟环境 技能

## 何时使用

- 创建、激活或使用 Python 虚拟环境（venv）
- 安装/升级依赖（pip、requirements.txt）
- 在 Windows 下运行脚本时 PATH 或激活失败
- 混合使用 Python 与 Node（如本仓库 .venv 内用 nodeenv 安装 Node）

## 常用命令

- 创建：`python -m venv .venv`
- 激活（Windows PowerShell）：`.\.venv\Scripts\Activate.ps1` 或 `& .\.venv\Scripts\Activate.ps1`
- 激活（Windows CMD）：`.\.venv\Scripts\activate.bat`
- 安装依赖：`pip install -r requirements.txt` 或 `pip install <pkg>`
- 冻结：`pip freeze > requirements.txt`

## 本项目注意

- 仓库根目录使用 `.venv`，且通过 nodeenv 在同一 .venv 中安装 Node，故 `node`/`npm` 位于 `.venv\Scripts\`
- 在子项目（如 intro-video）运行 `npm` 时，若遇 “node 找不到”，先确保 PATH 含项目 `.venv\Scripts`：  
  `$env:PATH = "项目根\.venv\Scripts;" + $env:PATH`
