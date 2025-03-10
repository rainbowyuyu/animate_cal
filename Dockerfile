# 使用官方 Python 3.10 镜像作为基础镜像
FROM python:3.10

# 维护者信息
LABEL maintainer="rainbow_yu"

# 设置工作目录
WORKDIR /app

# 复制项目文件到容器内
COPY . /app

RUN apt update
RUN apt install -y ffmpeg
RUN apt-get install texlive-full


# 更新 pip
RUN pip3 install --upgrade pip

# 安装依赖
RUN pip3 install --no-cache-dir -r requirements.txt

# 设置环境变量，确保 Python 可以找到 /app 目录下的模块
ENV PYTHONPATH="/app:$PYTHONPATH"

# 确保 start.py 拥有执行权限（如果需要）
RUN chmod +x yty_math/app.py

RUN export MPLBACKEND=Agg

# 运行应用
CMD ["python", "yty_math/app.py"]
