import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    DATABASE_URL: str = Field(default="postgresql+asyncpg://postgres:postgres@localhost:5432/placementgpt")
    DB_HOST: str = Field(default="localhost")
    DB_PORT: int = Field(default=5432)
    DB_USER: str = Field(default="postgres")
    DB_PASSWORD: str = Field(default="postgres")
    DB_NAME: str = Field(default="placementgpt")

    JWT_SECRET_KEY: str = Field(default="supersecretjwtkeyforplacementgptdevelopment123!")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=120)

    GEMINI_API_KEY: str = Field(default="")

    FIRST_ADMIN_EMAIL: str = Field(default="admin@placementgpt.com")
    FIRST_ADMIN_PASSWORD: str = Field(default="AdminSecurePass123!")

    ENV: str = Field(default="development")
    PORT: int = Field(default=8000)

settings = Settings()
