# .cursor 配置说明

本目录包含 Cursor 使用的项目级配置与技能（Skills）。

## Skills 目录结构

Agent 会根据对话内容自动匹配以下技能（见各目录下 `SKILL.md` 的 `description`）：

| 技能目录 | 用途 |
|----------|------|
| `skills/remotion` | Remotion 视频与动画：composition、timing、3D、字幕、音视频等 |
| `skills/typescript-react` | TypeScript / React 写法、组件与 Hooks 约定 |
| `skills/git-commit` | Git 提交信息格式（Conventional Commits）与工作流 |
| `skills/python-venv` | Python 虚拟环境、pip、以及本仓库 .venv+Node 使用方式 |
| `skills/readme-docs` | README 与项目文档结构、风格 |
| `skills/security-env` | 环境变量与敏感信息、.env、.gitignore |

## 正确被 Cursor 使用的前提

- 每个技能为**独立目录**，且内含 **`SKILL.md`**。
- `SKILL.md` 开头为 **YAML frontmatter**，必须包含：
  - `name`：与目录名一致（小写、连字符）。
  - `description`：简短说明「做什么、何时用」，便于 Cursor 做技能匹配。
- 技能内容用 Markdown 编写，可包含步骤、示例、注意事项。

新增或修改技能时，保持上述格式即可被 Cursor 正确识别与调用。
