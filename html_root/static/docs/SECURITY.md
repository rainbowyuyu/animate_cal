# 安全说明 (Security)

## RCE（远程代码执行）风险

本项目 **开发者工具** 允许用户在服务端执行 Manim Python 代码（`/api/devtools/run_manim`、`run_manim_stream`）。这是**极高危功能**，需严格防护。

### 当前措施

- **关键字拦截**：禁止 `import os`、`import sys`、`import subprocess`、`rm -rf`、`shutil` 等敏感操作
- **超时限制**：渲染超时约 60 秒（同步）/ 300 秒（流式）
- **临时文件隔离**：脚本写入临时目录，渲染后删除

### 推荐加固措施

1. **沙箱隔离**：使用 Docker 容器或 Firecracker MicroVM 运行 Manim，与宿主机完全隔离
2. **网络限制**：容器内禁止外网访问，防止挖矿、内网探测等
3. **资源限制**：限制 CPU、内存、磁盘，防止 DoS
4. **运行时长**：严格限制子进程超时（如 120 秒内必须结束）
5. **用户输入清洗**：后端对代码做更严格的静态检查（如 AST 分析禁止危险调用）

### XSS（跨站脚本）防护

- **Markdown 解析**：所有 `marked.parse()` 输出经 `sanitizeMarkdownHtml()` 清洗后再插入 DOM
- 移除 `<script>`、`iframe`、`object`、`embed` 及 `on*` 事件、`javascript:` URL

---

*如发现安全问题，请通过项目 Issue 或邮件联系维护者。*
