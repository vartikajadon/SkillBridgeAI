"""
Application Core Configuration Module
"""
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json


class Settings(BaseSettings):
    PROJECT_NAME: str = "SkillBridge AI API"
    VERSION: str = "0.2.0"
    API_V1_STR: str = "/api/v1"

    # CORS settings
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Supabase & Database Configuration (Phase 2)
    SUPABASE_URL: str = Field(
        default="https://placeholder-project.supabase.co",
        description="Supabase project URL",
    )
    SUPABASE_KEY: str = Field(
        default="placeholder-anon-key",
        description="Supabase Anon/Public Key",
    )
    SUPABASE_JWT_SECRET: str = Field(
        default="placeholder-jwt-secret-for-development-and-testing-min-32-chars-long",
        description="Supabase JWT secret for symmetric HMAC (HS256) signature verification",
    )
    SUPABASE_JWT_ALGORITHM: str = Field(
        default="HS256",
        description="Expected JWT algorithm: HS256 (symmetric) or RS256/ES256 (asymmetric JWKS)",
    )
    SUPABASE_JWT_AUDIENCE: str = Field(
        default="authenticated",
        description="Expected JWT audience (aud) claim from Supabase Auth",
    )
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://postgres:placeholder_password@db.placeholder-project.supabase.co:5432/postgres",
        description="PostgreSQL / pgvector connection URL placeholder",
    )

    # LLM Provider Placeholders
    OPENAI_API_KEY: str = Field(
        default="sk-placeholder-openai-key",
        description="OpenAI API Key placeholder",
    )
    GEMINI_API_KEY: str = Field(
        default="placeholder-gemini-key",
        description="Google Gemini API Key placeholder",
    )
    ANTHROPIC_API_KEY: str = Field(
        default="placeholder-anthropic-key",
        description="Anthropic API Key placeholder",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
