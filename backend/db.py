from pymongo import MongoClient
from config import Config

try:
    # Initialize MongoClient
    client = MongoClient(Config.MONGO_URI)
    # Ping the database to verify the connection
    client.admin.command('ping')
    db = client.get_default_database()
    print("Successfully connected to MongoDB Atlas!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    # Fallback client if local or URI defaults
    client = MongoClient("mongodb://localhost:27017/")
    db = client["levlox_lms"]

# Seed demo users on startup if empty
try:
    if db.users.count_documents({}) == 0:
        import bcrypt
        import datetime
        import random
        
        # Seed Admin
        admin_pw = bcrypt.hashpw("adminpass123".encode('utf-8'), bcrypt.gensalt())
        db.users.insert_one({
            "name": "Demo Admin",
            "email": "admin@levlox.com",
            "phone": "9999911111",
            "password": admin_pw,
            "role": "admin",
            "status": "active",
            "created_at": datetime.datetime.utcnow()
        })
        
        # Seed Student
        student_pw = bcrypt.hashpw("studentpass123".encode('utf-8'), bcrypt.gensalt())
        db.users.insert_one({
            "name": "Sri Aakash",
            "email": "student@levlox.com",
            "password": student_pw,
            "role": "student",
            "status": "active",
            "feesPaid": False,
            "feesTotal": 1500,
            "feesPaidAmount": 0,
            "feesRemainingAmount": 1500,
            "feesStatus": "Pending",
            "feesPaymentDate": "",
            "feesDueDate": "2026-08-31",
            "rollNumber": f"LSP-2026-{random.randint(1000, 9999)}",
            "phone": "9999988888",
            "college": "Levlox Technical Institute",
            "course": "Fullstack Engineering",
            "profile_pic": "",
            "join_date": datetime.datetime.utcnow().strftime("%B %d, %Y"),
            "attendance": {
                "percentage": 92,
                "present": 46,
                "absent": 4
            },
            "attendance_history": [
                {"date": "2026-07-07", "status": "Present"},
                {"date": "2026-07-06", "status": "Present"},
                {"date": "2026-07-05", "status": "Present"},
                {"date": "2026-07-04", "status": "Absent"},
                {"date": "2026-07-03", "status": "Present"}
            ],
            "created_at": datetime.datetime.utcnow()
        })
        print("Demo credentials seeded successfully!")
    else:
        # Enforce phone values on existing databases for ease of testing
        db.users.update_one({"email": "admin@levlox.com", "phone": {"$exists": False}}, {"$set": {"phone": "9999911111"}})
        db.users.update_one({"email": "student@levlox.com", "phone": {"$exists": False}}, {"$set": {"phone": "9999988888"}})
        db.users.update_one({"email": "admin@levlox.com"}, {"$set": {"phone": "9999911111"}})
        db.users.update_one({"email": "student@levlox.com"}, {"$set": {"phone": "9999988888"}})
except Exception as seed_err:
    print(f"Error seeding demo credentials: {seed_err}")
