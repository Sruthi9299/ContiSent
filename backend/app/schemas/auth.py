from pydantic import BaseModel, EmailStr, Field, ConfigDict

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

    model_config = ConfigDict(from_attributes=True)
