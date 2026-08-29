"""
CPA Platform — Application Configuration
Reads from environment variables / .env file
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "CPA Inventory Intelligence & CRM"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = True
    allowed_origins: str = "http://localhost:3000"

    # Existing DB (READ ONLY)
    existing_db_host: str = "localhost"
    existing_db_port: int = 5433
    existing_db_name: str = "cpa_existing"
    existing_db_user: str = "postgres"
    existing_db_password: str = "postgres123"

    # Analytics DB (READ + WRITE)
    analytics_db_host: str = "localhost"
    analytics_db_port: int = 5434
    analytics_db_name: str = "cpa_analytics"
    analytics_db_user: str = "cpa_admin"
    analytics_db_password: str = "cpa_secure_2024"

    # Redis
    redis_url: str = "redis://:redis_cpa_2024@localhost:6379/0"

    # JWT
    secret_key: str = "changeme_at_least_32_characters_long_secret"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    # Sync intervals (seconds)
    sync_inventory_interval: int = 15
    sync_sales_interval: int = 30
    sync_customers_interval: int = 300
    sync_distributions_interval: int = 60
    compute_analytics_interval: int = 3600
    check_alerts_interval: int = 300

    # Alert defaults
    alert_low_stock_enabled: bool = True
    alert_overstock_enabled: bool = True
    alert_expiry_days_threshold: int = 30

    @property
    def existing_db_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.existing_db_user}:{self.existing_db_password}"
            f"@{self.existing_db_host}:{self.existing_db_port}/{self.existing_db_name}"
        )

    @property
    def analytics_db_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.analytics_db_user}:{self.analytics_db_password}"
            f"@{self.analytics_db_host}:{self.analytics_db_port}/{self.analytics_db_name}"
        )

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
