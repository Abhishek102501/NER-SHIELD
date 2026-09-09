"""Central config, read once from environment / .env. No secrets live here —
this service has none yet."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ml_service_host: str = "0.0.0.0"
    ml_service_port: int = 8000

    model_dir: Path = Path("./models")
    data_dir: Path = Path("./data")

    log_level: str = "INFO"


settings = Settings()
