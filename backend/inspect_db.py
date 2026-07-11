import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
print("Using URI:", mongo_uri)

try:
    client = MongoClient(mongo_uri)
    client.admin.command('ping')
    db = client.get_default_database()
    print("Connected to Atlas!")
except Exception as e:
    print("Atlas connection failed, using local fallback:", e)
    client = MongoClient("mongodb://localhost:27017/")
    db = client["levlox_lms"]

users = list(db.users.find({}, {"name": 1, "email": 1, "phone": 1, "role": 1}))
print("Registered Users:")
for u in users:
    print(u)
