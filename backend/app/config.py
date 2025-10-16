from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Paper Recommendation System"
    DEBUG: bool = True
    API_VERSION: str = "v1"
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/papers_db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # LLM APIs
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4-turbo-preview"  # or claude-3-sonnet-20240229
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    
    # Crawler Settings
    CRAWLER_USER_AGENT: str = "PaperRecommendationBot/1.0"
    CRAWLER_DELAY: int = 2  # seconds between requests
    CRAWLER_TIMEOUT: int = 30
    
    # Search Sources
    CNKI_API_KEY: str = ""
    WOS_API_KEY: str = ""
    SCHOLAR_API_KEY: str = ""  # SerpAPI key
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]
    
    # Vector Store
    VECTOR_DIMENSION: int = 1536
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()