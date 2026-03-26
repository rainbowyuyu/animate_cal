---
name: security-env
description: Environment variables and secrets. Use when handling API keys, .env, .gitignore, or avoiding hardcoded secrets.
metadata:
  tags: security, env, secrets, gitignore
---

# 环境变量与敏感信息 技能

## 何时使用

- 涉及 API Key、密码、token 等敏感配置
- 添加或修改 `.env`、`.env.example`
- 确认 `.gitignore` 已忽略敏感文件
- 避免在代码中硬编码密钥

## 约定

- **不要**在代码或 README 中写入真实密钥、密码
- 使用环境变量（`process.env.VITE_*`、`import.meta.env.*`、`os.environ` 等）或本地配置文件
- 提供 `.env.example` 列出所需变量名与说明，不含真实值
- `.gitignore` 应包含：`.env`、`.env.local`、`*.pem`、含密钥的配置文件

## 示例

- 前端：`VITE_API_URL`、`VITE_PUBLIC_KEY`（仅可暴露的）
- Node：`process.env.API_KEY`，从 `.env` 加载（如 dotenv）
- Python：`os.environ.get("SECRET_KEY")` 或 `python-dotenv`

## 注意

- 若用户误贴了密钥，提醒移除并轮换；不重复引用或写入仓库
