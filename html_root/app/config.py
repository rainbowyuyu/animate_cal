# 全局配置：数据库连接池、OpenAI 客户端、目录等
import os
import logging
from dotenv import load_dotenv
import mysql.connector
from openai import OpenAI

# 项目根目录（html_root，与 main.py 同级）
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()
logger = logging.getLogger(__name__)

# MySQL
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "password")
MYSQL_DB = os.getenv("MYSQL_DB", "visdom_db")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))

try:
    db_pool = mysql.connector.pooling.MySQLConnectionPool(
        pool_name="mypool",
        pool_size=5,
        host=MYSQL_HOST,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        port=MYSQL_PORT,
    )
    logger.info("MySQL connection pool created successfully")
except Exception as e:
    logger.error(f"Error creating MySQL pool: {e}")
    db_pool = None


def get_db_connection():
    if not db_pool:
        raise Exception("Database connection not initialized")
    return db_pool.get_connection()


# 大模型
api_key = os.getenv("ALIYUN_KEY")
client = OpenAI(
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key=api_key or "sk-mock-key",
)

# 头像与视频目录（相对项目根）
AVATAR_DIR = os.path.join(ROOT_DIR, "static", "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)
ALLOWED_AVATAR_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
VIDEOS_DIR = os.path.join(ROOT_DIR, "static", "videos")
os.makedirs(VIDEOS_DIR, exist_ok=True)
