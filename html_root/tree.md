# 项目文件结构（html_root 为运行根目录）

```
html_root/
├── main.py                 # 应用入口，挂载 app 内路由与静态资源
├── visdom_db.sql           # SQLite 数据库文件（若使用）
│
├── app/                    # 后端功能包（配置、存储、模型、路由）
│   ├── __init__.py
│   ├── config.py           # 数据库连接池、OpenAI client、ROOT_DIR、AVATAR_DIR、VIDEOS_DIR
│   ├── store.py            # CAPTCHA_STORE、SESSION_STORE
│   ├── models.py           # Pydantic 模型（Auth、Calc、Formula、User、Agent 等）
│   └── routers/
│       ├── __init__.py
│       ├── auth.py         # 验证码、注册、登录、登出、user/me、check-username
│       ├── user.py         # 设置、资料、改用户名/密码、头像上传
│       ├── formulas.py     # 算式 CRUD
│       ├── animation_scripts.py  # 动画脚本 CRUD
│       ├── examples.py     # 教学案例列表
│       ├── detect.py       # 智能识别、animate、animate/stream
│       ├── devtools.py     # run_manim、run_manim_stream
│       └── agent.py        # 智能体：理解意图，返回跳转与动作
│
├── logic/                  # 业务逻辑（供 app.routers 通过 from logic.xxx 调用）
│   ├── captcha.py          # 验证码生成
│   ├── manim_generator.py  # Manim 动画生成
│   └── prompt.py           # 提示词等
│
└── static/                 # 前端静态资源
    ├── css/
    │   ├── base.css        # 基础变量、重置样式、字体
    │   ├── layout.css      # 布局（导航栏、容器、Footer、Hero）
    │   ├── components.css  # 卡片、按钮、输入框、Modal 等通用组件
    │   ├── pages/
    │   │   ├── home.css    # 首页 (Hero, Features)
    │   │   ├── workspace.css   # 工作区 (识别, 画板)
    │   │   ├── calculate.css   # 计算页
    │   │   ├── examples.css   # 案例页
    │   │   ├── devtools.css   # 开发者工具页
    │   │   └── help.css       # 帮助页
    │   └── main.css        # 入口文件
    ├── js/                 # 前端脚本（main、auth、settings、formulas、devtools、tutorial 等）
    ├── docs/               # 文档（privacy、terms、update 等）
    └── ...                 # assets、videos 等
```

**运行方式**：在 `html_root` 目录下执行 `uvicorn main:app`，保证 `app` 与 `logic` 在 Python 路径中。
