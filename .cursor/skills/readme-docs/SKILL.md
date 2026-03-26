---
name: readme-docs
description: README and project documentation structure. Use when writing or updating README.md, docs, or project overview.
metadata:
  tags: readme, documentation, markdown
---

# README 与项目文档 技能

## 何时使用

- 编写或更新 `README.md`、`docs/` 下的文档
- 需要统一项目说明结构（特性、安装、运行、配置）
- 为模块或脚本补充说明、示例

## README 建议结构

1. **标题与简介**：项目名 + 一两句说明
2. **特性/功能**：列表形式，突出核心点
3. **环境与安装**：依赖、版本、安装命令
4. **运行/使用**：如何启动、常用命令、关键配置
5. **项目结构**：主要目录/文件说明（可选）
6. **配置/扩展**：可调参数、扩展点（可选）
7. **许可证**（若有）

## 风格

- 使用 Markdown 标题层级（`##`、`###`）保持结构清晰
- 代码块标明语言：` ```bash `、` ```ts ` 等
- 链接使用 `[文本](url)`，避免裸 URL
- 不主动新增与代码无关的长篇文档，除非用户明确要求
