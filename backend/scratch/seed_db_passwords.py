import sys
import os
import bcrypt
import datetime
from pymongo import MongoClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config import Config

print("Connecting to MongoDB Database...")

# Connect to Atlas Database
client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=5000)
db = client["levlox_student_portal"]

admin_pass = "Admin@123"
student_pass = "Student@123"

admin_hash = bcrypt.hashpw(admin_pass.encode('utf-8'), bcrypt.gensalt())
student_hash = bcrypt.hashpw(student_pass.encode('utf-8'), bcrypt.gensalt())

# Update ALL Admins in database with new password
db.admins.update_many({}, {"$set": {"password": admin_hash, "password_hash": admin_hash}})

# Update ALL Students in database with new password
db.students.update_many({}, {"$set": {"password": student_hash, "password_hash": student_hash}})

print("\n==========================================")
print("SUCCESS: Passwords Encrypted & Saved in Database!")
print("==========================================")
print(f"ALL ADMINS:   Password set to -> {admin_pass}")
print(f"ALL STUDENTS: Password set to -> {student_pass}")
print("==========================================\n")
