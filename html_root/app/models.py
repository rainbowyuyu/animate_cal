# API 请求/响应数据模型
from typing import Optional
from pydantic import BaseModel


class AuthModel(BaseModel):
    username: str
    password: str
    captcha: str
    captcha_id: str


class CalcModel(BaseModel):
    matrixA: str
    matrixB: str
    operation: str


class FormulaModel(BaseModel):
    username: str
    latex: str
    note: str = ""


class FormulaUpdateModel(BaseModel):
    id: int
    username: str
    latex: str
    note: str


class AnimationScriptModel(BaseModel):
    username: str
    note: str = ""
    code: str


class AnimationScriptUpdateModel(BaseModel):
    id: int
    username: str
    note: str = ""
    code: str


class UserSettingsModel(BaseModel):
    settings: dict


class UserProfileModel(BaseModel):
    avatar_url: Optional[str] = None
    nickname: Optional[str] = None


class ChangeUsernameModel(BaseModel):
    new_username: str
    password: str


class ChangePasswordModel(BaseModel):
    current_password: str
    new_password: str


class ManimCodeModel(BaseModel):
    code: str


class AgentRequest(BaseModel):
    prompt: str
    image_base64: Optional[str] = None


class ExampleVideo(BaseModel):
    filename: str
    title: str
    description: str
    url: str
    poster: str = ""
