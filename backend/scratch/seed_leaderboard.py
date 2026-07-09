import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from db import db
from bson import ObjectId

def seed():
    print("Seeding leaderboard databases...")
    
    # 1. Find the default student or create one if missing
    student = db.users.find_one({"role": "student"})
    if not student:
        print("No student found. Please log in first or run db.py")
        return
        
    student_id = student['_id']
    batch_id = student.get('batch_id')
    if not batch_id:
        batch_id = ObjectId()
        db.users.update_one({"_id": student_id}, {"$set": {"batch_id": batch_id}})
        print(f"Assigned batch_id {batch_id} to current student {student.get('name')}")
    else:
        print(f"Current student {student.get('name')} has batch_id {batch_id}")

    # Set score and streak for current student
    db.users.update_one(
        {"_id": student_id},
        {"$set": {
            "name": "Sri Aakash",
            "overall_score": 880,
            "streak": 12
        }}
    )

    # 2. Seed mock interviews for current student
    db.mock_interviews.delete_many({"student_id": student_id})
    db.mock_interviews.insert_many([
        {"student_id": student_id, "score": 85, "completed_interviews": 4, "total_interviews": 5},
        {"student_id": student_id, "score": 90, "completed_interviews": 4, "total_interviews": 5}
    ])

    # 3. Create Demo Students: Sri, Rahul, Kavya in same batch
    demo_students = [
        {
            "name": "Sri",
            "email": "sri@levlox.com",
            "role": "student",
            "status": "active",
            "batch_id": batch_id,
            "overall_score": 950,
            "streak": 18,
            "college": "Levlox Technical Institute",
            "course": "Fullstack Engineering",
            "phone": "9999922222"
        },
        {
            "name": "Rahul",
            "email": "rahul@levlox.com",
            "role": "student",
            "status": "active",
            "batch_id": batch_id,
            "overall_score": 910,
            "streak": 15,
            "college": "Levlox Technical Institute",
            "course": "Fullstack Engineering",
            "phone": "9999933333"
        },
        {
            "name": "Kavya",
            "email": "kavya@levlox.com",
            "role": "student",
            "status": "active",
            "batch_id": batch_id,
            "overall_score": 890,
            "streak": 9,
            "college": "Levlox Technical Institute",
            "course": "Fullstack Engineering",
            "phone": "9999944444"
        }
    ]

    for ds in demo_students:
        db.users.delete_many({"email": ds["email"]})
        res = db.users.insert_one(ds)
        ds_id = res.inserted_id
        
        # Seed mock interviews for them
        db.mock_interviews.delete_many({"student_id": ds_id})
        if ds["name"] == "Sri":
            db.mock_interviews.insert_many([
                {"student_id": ds_id, "score": 96, "completed_interviews": 6, "total_interviews": 6},
                {"student_id": ds_id, "score": 94, "completed_interviews": 6, "total_interviews": 6}
            ])
        elif ds["name"] == "Rahul":
            db.mock_interviews.insert_many([
                {"student_id": ds_id, "score": 92, "completed_interviews": 5, "total_interviews": 5},
                {"student_id": ds_id, "score": 90, "completed_interviews": 5, "total_interviews": 5}
            ])
        elif ds["name"] == "Kavya":
            db.mock_interviews.insert_many([
                {"student_id": ds_id, "score": 88, "completed_interviews": 4, "total_interviews": 5},
                {"student_id": ds_id, "score": 90, "completed_interviews": 4, "total_interviews": 5}
            ])

    # Link all starter classes, announcements, study materials, recorded classes to this batch
    db.live_classes.update_many({"batch_id": {"$exists": False}}, {"$set": {"batch_id": batch_id}})
    db.live_classes.update_many({"batch_id": None}, {"$set": {"batch_id": batch_id}})
    
    db.announcements.update_many({"batch_id": {"$exists": False}}, {"$set": {"batch_id": batch_id}})
    db.announcements.update_many({"batch_id": None}, {"$set": {"batch_id": batch_id}})
    
    db.study_materials.update_many({"batch_id": {"$exists": False}}, {"$set": {"batch_id": batch_id}})
    db.study_materials.update_many({"batch_id": None}, {"$set": {"batch_id": batch_id}})
    
    db.recorded_classes.update_many({"batch_id": {"$exists": False}}, {"$set": {"batch_id": batch_id}})
    db.recorded_classes.update_many({"batch_id": None}, {"$set": {"batch_id": batch_id}})

    print("Successfully seeded leaderboard demo records!")

if __name__ == '__main__':
    seed()
