---
name: git-commit
description: Git commit messages and workflow. Use when writing commit messages, creating branches, or discussing PR/rebase/squash workflow.
metadata:
  tags: git, commit, conventional commits, pr
---

# Git 提交与工作流 技能

## 何时使用

- 需要撰写或规范 commit message
- 讨论分支策略、PR、rebase、squash
- 解释或生成 conventional commit 格式

## Conventional Commits 格式

```
<type>(<scope>): <subject>

<body>
<footer>
```

- **type**：`feat`（新功能）、`fix`（修复）、`docs`、`style`、`refactor`、`test`、`chore`
- **scope**：可选，如 `intro-video`、`theme`
- **subject**：简短祈使句，首字母小写，句末无点
- **body/footer**：可选，说明动机、破坏性变更、关联 issue

## 示例

- `feat(intro): apply Gemini Canvas gradient and IntroOverlays`
- `fix(remotion): resolve tailwindcss resolve error by using inline styles`
- `docs(readme): add GeminiCanvas composition section`

## 注意

- 不执行 `git commit`/`git push` 等写操作，除非用户明确要求；可生成建议的 message 供用户复制使用
