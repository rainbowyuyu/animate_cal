CREATE DATABASE IF NOT EXISTS visdom_db;
USE visdom_db;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 算式表 (用于后续功能)
CREATE TABLE IF NOT EXISTS formulas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- 存用户名
    latex TEXT NOT NULL,
    note VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(username) ON DELETE CASCADE
);


-- localStorage，不落库；仅 id/user_id/note/code/created_at 存于此表。
CREATE TABLE IF NOT EXISTS animation_scripts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    note VARCHAR(255) DEFAULT '',
    code MEDIUMTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(username) ON DELETE CASCADE
);

-- 用户设置表：用于登录后保存/加载主题、智能体、快捷键等
CREATE TABLE IF NOT EXISTS user_settings (
    user_id VARCHAR(64) PRIMARY KEY,
    settings_json TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 用户资料表：头像、昵称等（与 users 通过 user_id=username 关联）
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id VARCHAR(255) PRIMARY KEY,
    avatar_url VARCHAR(512) DEFAULT NULL,
    nickname VARCHAR(128) DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(username) ON DELETE CASCADE
);

-- 课件包表（教师创建课包，教学案例「加入课件包」时若无可选课包会先创建默认课包）
CREATE TABLE IF NOT EXISTS course_packs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 课件包-视频关联表（pack_id 关联 course_packs.id，video_id 为教学案例视频标识，sort_order 用于排序）
CREATE TABLE IF NOT EXISTS course_pack_videos (
    pack_id INT NOT NULL,
    video_id VARCHAR(128) NOT NULL,
    sort_order INT DEFAULT 0,
    PRIMARY KEY (pack_id, video_id)
);

-- 教学案例视频点赞表（video_id 为示例视频标识，如文件名不含扩展名）
CREATE TABLE IF NOT EXISTS example_video_likes (
    video_id VARCHAR(128) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (video_id, user_id)
);

-- 教学案例视频评论表
CREATE TABLE IF NOT EXISTS example_video_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    video_id VARCHAR(128) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 教学案例视频弹幕表（time 为视频时间点秒，color 十进制颜色，mode 1=滚动 4=底部 5=顶部）
CREATE TABLE IF NOT EXISTS example_video_danmaku (
    id INT AUTO_INCREMENT PRIMARY KEY,
    video_id VARCHAR(128) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    text VARCHAR(80) NOT NULL,
    time DOUBLE NOT NULL,
    color INT DEFAULT 16777215,
    mode SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 教学案例播放进度/心跳表（用于续播与 30 秒心跳上报）
CREATE TABLE IF NOT EXISTS example_play_history (
    user_id VARCHAR(64) NOT NULL,
    video_id VARCHAR(128) NOT NULL,
    progress DOUBLE NOT NULL DEFAULT 0,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, video_id)
);

-- 用户收藏（教学案例视频）
CREATE TABLE IF NOT EXISTS user_favorites (
    user_id VARCHAR(64) NOT NULL,
    video_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, video_id)
);

-- 稍后看（教学案例视频）
CREATE TABLE IF NOT EXISTS watch_later (
    user_id VARCHAR(64) NOT NULL,
    video_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, video_id)
);

-- 教学案例视频时间戳笔记（user_id, video_id, time_sec 定位到某一秒的笔记）
CREATE TABLE IF NOT EXISTS example_video_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    video_id VARCHAR(128) NOT NULL,
    time_sec DOUBLE NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
