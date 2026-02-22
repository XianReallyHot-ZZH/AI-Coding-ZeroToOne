import os
from pydantic_settings import BaseSettings, SettingsConfigDict

DATABASE_URL = "sqlite:///./ticket_manager.db"

class Settings(BaseSettings):
    DATABASE_URL: str = DATABASE_URL
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
