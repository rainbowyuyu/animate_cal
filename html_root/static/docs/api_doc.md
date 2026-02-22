# WisComPer API Reference

Base URL: `http://<your-domain>/api`

## 1. 认证 (Auth)

### 注册
`POST /register`
*   **Body**: `{ "username": "...", "password": "...", "captcha": "...", "captcha_id": "..." }`
*   **Response**: `{ "status": "success", "message": "注册成功" }`

### 登录
`POST /login`
*   **Body**: `{ "username": "...", "password": "...", "captcha": "...", "captcha_id": "..." }`
*   **Response**: `{ "status": "success", "username": "..." }`

### 获取验证码
`GET /captcha`
*   **Response**: PNG Image Stream
*   **Headers**: `X-Captcha-ID: <uuid>`

---

## 2. 核心功能 (Core)

### 图像识别 (OCR)
`POST /detect`
*   **Content-Type**: `multipart/form-data`
*   **File**: `file` (image/jpeg, image/png)
*   **Response**: `{ "status": "success", "latex": "E = mc^2" }`

### 动画生成流 (SSE)
`POST /animate/stream`
*   **Content-Type**: `application/json`
*   **Body**: 
    ```json
    {
      "matrixA": "...",
      "matrixB": "...",
      "operation": "add | mul | det | other"
    }
    ```
*   **Response**: Server-Sent Events (text/event-stream)
    *   `step: "generating_code"`
    *   `step: "code_generated", code: "..."`
    *   `step: "rendering"`
    *   `step: "complete", video_url: "..."`

---

## 3. 算式库 (Formulas)

### 保存算式
`POST /formulas/save`
*   **Body**: `{ "username": "...", "latex": "...", "note": "..." }`

### 获取列表
`GET /formulas/list?username=...`

### 更新算式
`PUT /formulas/update`
*   **Body**: `{ "id": 1, "username": "...", "latex": "...", "note": "..." }`

### 删除算式
`DELETE /formulas/delete?id=...&username=...`

---

## 4. 智能体 (Agent)

### 执行意图解析（跳转 + 预填 + 触发生成）
`POST /agent/execute`
*   **Body**: `{ "prompt": "用户自然语言描述", "image_base64": "可选，data:image/...;base64,..." }`
*   **Response**: `{ "status": "success", "steps": [ { "section", "formula", "operation", "trigger", "reply", ... } ], "message": "..." }`
*   说明：智能体会解析题目/算式（含选择题、无穷小量等），输出 steps；前端根据 steps 跳转页面、填入公式并可选触发生成动画（调用本站 LaTeX→Manim 能力）。支持演示模式含通用、公式推演、可视化、完整解题演示（solution）；完整解题演示会分阶段生成多段视频，选项数与图数一致。

### 获取可调用工具列表
`GET /agent/tools`
*   **Response**: `{ "tools": [ { "name", "description", "method", "path", "body" 或 "query" }, ... ] }`
*   说明：供外部 Agent 或文档使用，工具包括 `detect`（图片→LaTeX）、`animate_stream`（LaTeX→Manim 流式）、`run_manim`、`formulas_list`、`formulas_save` 等。

---

## 5. 用户设置 (User Settings)

### 获取/同步设置
*   登录用户可通过 `GET /api/user/settings` 拉取、`PUT /api/user/settings` 保存与账号绑定的设置（如主题、默认演示模式、数学表达式字号、快捷键等）。计算页演示模式下拉与设置页默认演示模式双向同步，选择任一处会更新另一处及本地存储。