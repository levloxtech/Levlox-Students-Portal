import os
import sys

# Add backend directory to path if needed to import db
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db import db

def setup_indexes():
    print("Setting up MongoDB indexes...")
    
    # students (raw collection in DB is 'students')
    print("Indexing students...")
    db._db.students.create_index("email", unique=True)
    db._db.students.create_index("firebase_uid", unique=True, sparse=True)
    db._db.students.create_index("batch_id")
    db._db.students.create_index("phone")
    db._db.students.create_index("rollNumber", unique=True, sparse=True)

    # admins (raw collection in DB is 'admins')
    print("Indexing admins...")
    db._db.admins.create_index("email", unique=True)
    db._db.admins.create_index("firebase_uid", unique=True, sparse=True)
    db._db.admins.create_index("phone")

    # batches
    print("Indexing batches...")
    db._db.batches.create_index("created_by")

    # live_classes
    print("Indexing live_classes...")
    db._db.live_classes.create_index("batch_id")
    db._db.live_classes.create_index("scheduled_at")

    # attendance
    print("Indexing attendance...")
    db._db.attendance.create_index([("student_id", 1), ("date", -1)])
    db._db.attendance.create_index("batch_id")

    # recorded_classes
    print("Indexing recorded_classes...")
    db._db.recorded_classes.create_index("batch_id")
    db._db.recorded_classes.create_index("sort_order")

    # announcements
    print("Indexing announcements...")
    db._db.announcements.create_index("batch_id")
    db._db.announcements.create_index([("batch_id", 1), ("is_pinned", -1), ("_id", -1)])
    db._db.announcements.create_index("uploaded_at")

    # fees
    print("Indexing fees...")
    db._db.fees.create_index("student_id")

    # activity_scores
    print("Indexing activity_scores...")
    db._db.activity_scores.create_index("student_id")

    # assignments
    print("Indexing assignments...")
    db._db.assignments.create_index("batch_id")

    # submissions
    print("Indexing submissions...")
    db._db.submissions.create_index("student_id")
    db._db.submissions.create_index("assignment_id")

    # mock_interviews
    print("Indexing mock_interviews...")
    db._db.mock_interviews.create_index("student_id")

    # lesson_progress
    print("Indexing lesson_progress...")
    db._db.lesson_progress.create_index("student_id")
    db._db.lesson_progress.create_index("recorded_class_id")

    print("Indexes created successfully!")

if __name__ == "__main__":
    setup_indexes()
