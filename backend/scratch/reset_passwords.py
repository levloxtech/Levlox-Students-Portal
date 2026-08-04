import bcrypt
import datetime
from pymongo import MongoClient

# Local database connection
client = MongoClient("mongodb://localhost:27017/")
db = client["levlox_student_portal"]

# 1. Reset Admin Password
admin_pw = bcrypt.hashpw("Admin@123".encode('utf-8'), bcrypt.gensalt())
db.admins.update_one(
    {"phone": "9999911111"},
    {"$set": {"password": admin_pw, "password_hash": admin_pw}},
    upsert=True
)

# 2. Reset Student Password
student_pw = bcrypt.hashpw("Student@123".encode('utf-8'), bcrypt.gensalt())
db.students.update_one(
    {"phone": "9999988888"},
    {"$set": {"password": student_pw, "password_hash": student_pw}},
    upsert=True
)

print("Updated local database passwords successfully!")
