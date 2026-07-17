import os
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv(override=True)

class Config:
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/levlox_lms")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "levlox_super_secret_key_12345")
    PORT = int(os.getenv("PORT", 5000))
    DEBUG = os.getenv("FLASK_ENV") == "development"
