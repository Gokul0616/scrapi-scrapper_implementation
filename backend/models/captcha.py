from pydantic import BaseModel
from typing import Optional

class CaptchaVerifyRequest(BaseModel):
    captcha_id: str
    answer: str
    email: Optional[str] = None
