import os
import sys
import bcrypt
import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

load_dotenv()

def seed_target(db):
    print(f"\nSeeding target database: {db.name}")

    # Generate passwords
    admin_pw = bcrypt.hashpw("adminpass123".encode('utf-8'), bcrypt.gensalt())
    student_pw = bcrypt.hashpw("studentpass123".encode('utf-8'), bcrypt.gensalt())

    # 1. Admin record
    admin_doc = {
        "name": "Admin User",
        "email": "admin@levlox.com",
        "phone": "9999911111",
        "password": admin_pw,
        "role": "admin",
        "status": "active",
        "created_at": datetime.datetime.utcnow()
    }
    
    # 2. Student records
    students = [
        {
            "name": "Sri Aakash",
            "email": "aakash@levlox.com",
            "phone": "9999988888",
            "password": student_pw,
            "role": "student",
            "status": "active",
            "rollNumber": "LSP-2026-0001",
            "college": "Levlox Technical Institute",
            "course": "Fullstack Engineering",
            "feesPaid": False,
            "feesTotal": 20000,
            "feesPaidAmount": 0,
            "feesRemainingAmount": 20000,
            "feesStatus": "Pending",
            "created_at": datetime.datetime.utcnow()
        },
        {
            "name": "Sri",
            "email": "sri@levlox.com",
            "phone": "9999922222",
            "password": student_pw,
            "role": "student",
            "status": "active",
            "rollNumber": "LSP-2026-0002",
            "college": "Levlox Technical Institute",
            "course": "Fullstack Engineering",
            "feesPaid": True,
            "feesTotal": 20000,
            "feesPaidAmount": 20000,
            "feesRemainingAmount": 0,
            "feesStatus": "Paid",
            "created_at": datetime.datetime.utcnow()
        },
        {
            "name": "Rahul",
            "email": "rahul@levlox.com",
            "phone": "9999933333",
            "password": student_pw,
            "role": "student",
            "status": "active",
            "rollNumber": "LSP-2026-0003",
            "college": "Levlox Technical Institute",
            "course": "Fullstack Engineering",
            "feesPaid": False,
            "feesTotal": 20000,
            "feesPaidAmount": 0,
            "feesRemainingAmount": 20000,
            "feesStatus": "Pending",
            "created_at": datetime.datetime.utcnow()
        },
        {
            "name": "Kavya",
            "email": "kavya@levlox.com",
            "phone": "9999944444",
            "password": student_pw,
            "role": "student",
            "status": "active",
            "rollNumber": "LSP-2026-0004",
            "college": "Levlox Technical Institute",
            "course": "Fullstack Engineering",
            "feesPaid": False,
            "feesTotal": 20000,
            "feesPaidAmount": 0,
            "feesRemainingAmount": 20000,
            "feesStatus": "Pending",
            "created_at": datetime.datetime.utcnow()
        }
    ]

    # Seed admins
    db["admins"].delete_many({"email": admin_doc["email"]})
    db["admins"].insert_one(admin_doc)
    print("Seed Admin added.")

    # Seed students
    for s in students:
        db["students"].delete_many({"email": s["email"]})
        db["students"].insert_one(s)
    print(f"Seed {len(students)} Students added.")

    # Populate course, batch, live_class, recorded_class, announcements, activity_scores, attendance, etc.
    # to avoid empty database
    batch_id = db["batches"].find_one()
    if not batch_id:
        from bson import ObjectId
        batch_id = ObjectId()
        db["batches"].insert_one({
            "_id": batch_id,
            "name": "July 2026 Batch",
            "course_name": "Fullstack Engineering",
            "trainer": "Levlox Instructor",
            "student_ids": []
        })
    else:
        batch_id = batch_id["_id"]

    # Assign all students to batch
    for s in db["students"].find():
        db["students"].update_one({"_id": s["_id"]}, {"$set": {"batch_id": batch_id}})
        db["batches"].update_one({"_id": batch_id}, {"$addToSet": {"student_ids": str(s["_id"])}})

    print("Batch assigned to students.")

    # Ensure other collections have at least one document
    if db["courses"].count_documents({}) == 0:
        db["courses"].insert_one({"title": "Fullstack Engineering", "duration": "6 Months"})
    if db["live_classes"].count_documents({}) == 0:
        db["live_classes"].insert_one({
            "title": "Introduction to React",
            "instructor": "Levlox Instructor",
            "time": "10:00 AM",
            "date": datetime.date.today().isoformat(),
            "is_today": True,
            "status": "Upcoming",
            "is_published": True,
            "batch_id": batch_id,
            "meet_link": "https://meet.google.com/abc-defg-hij"
        })
    if db["recorded_classes"].count_documents({}) == 0:
        db["recorded_classes"].insert_one({
            "title": "HTML & CSS Basics",
            "module": "Frontend Dev",
            "video_url": "https://www.youtube.com/watch?v=mock",
            "notes_url": "",
            "batch_id": batch_id,
            "sort_order": 1
        })
    if db["announcements"].count_documents({}) == 0:
        db["announcements"].insert_one({
            "title": "Welcome to Levlox Student Portal",
            "content": "We hope you have a great learning experience!",
            "priority": "High",
            "is_pinned": True,
            "date": datetime.date.today().strftime("%B %d, %Y"),
            "batch_id": batch_id
        })
    if db["attendance"].count_documents({}) == 0:
        db["attendance"].insert_one({
            "class_title": "Introduction to React",
            "date": datetime.date.today().isoformat(),
            "batch_id": batch_id,
            "records": []
        })
    if db["activity_scores"].count_documents({}) == 0:
        db["activity_scores"].insert_one({
            "activity_type": "Quiz",
            "points": 50,
            "date": datetime.date.today().isoformat()
        })
    if db["fees"].count_documents({}) == 0:
        student = db["students"].find_one({"feesStatus": "Paid"})
        if student:
            db["fees"].insert_one({
                "student_id": student["_id"],
                "student_name": student["name"],
                "amount": 20000,
                "status": "Paid",
                "payment_date": datetime.date.today().isoformat()
            })

    # Log document counts
    print(f"\nDocument counts for database {db.name}:")
    colls = ["admins", "students", "courses", "batches", "live_classes", "attendance", "recorded_classes", "announcements", "fees", "activity_scores"]
    for c in colls:
        print(f"  - {c}: {db[c].count_documents({})} documents")

def main():
    mongo_uri = os.getenv("MONGO_URI")
    # Try Atlas target
    try:
        client = MongoClient(mongo_uri)
        client.admin.command('ping')
        seed_target(client["levlox_student_portal"])
        print("Successfully seeded MongoDB Atlas database!")
    except Exception as e:
        print(f"Failed connecting/seeding Atlas: {e}")
        
    # Seed Local target fallback
    try:
        client = MongoClient("mongodb://localhost:27017/")
        seed_target(client["levlox_student_portal"])
        print("Successfully seeded Local MongoDB database!")
    except Exception as e:
        print(f"Failed seeding Local target: {e}")

if __name__ == '__main__':
    main()
