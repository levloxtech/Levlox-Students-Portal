import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

# Add parent directory to path so we can import config/db
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

load_dotenv()

def migrate():
    mongo_uri = os.getenv("MONGO_URI")
    print("Starting migration process...")
    print(f"Target Atlas Connection URI: {mongo_uri}")
    
    # 1. Connect to source local database (levlox_lms)
    try:
        source_client = MongoClient("mongodb://localhost:27017/")
        source_db = source_client["levlox_lms"]
        print("Connected to source database: levlox_lms")
    except Exception as e:
        print(f"Error connecting to local source database: {e}")
        return

    # 2. Connect to target Atlas database (levlox_student_portal)
    atlas_connected = False
    try:
        target_client = MongoClient(mongo_uri)
        target_client.admin.command('ping')
        target_db = target_client["levlox_student_portal"]
        print(f"Connected to MongoDB Atlas target database: {target_db.name}")
        atlas_connected = True
    except Exception as e:
        print(f"Warning: Connection to MongoDB Atlas failed: {e}")
        print("Falling back to local MongoDB target database: levlox_student_portal")
        try:
            target_client = MongoClient("mongodb://localhost:27017/")
            target_db = target_client["levlox_student_portal"]
            print(f"Connected to local target database: {target_db.name}")
        except Exception as err:
            print(f"Critical Error: Could not connect to local target either: {err}")
            return

    # 3. Collection mapping list
    # Source collections to copy
    collections_to_migrate = [
        "batches", "courses", "live_classes", "recorded_classes",
        "announcements", "otps", "study_materials", "submissions",
        "mock_interviews", "lesson_progress"
    ]

    # Map collections
    # Users will be split into admins and students
    print("\n--- Migrating Users to admins and students collections ---")
    source_users = list(source_db["users"].find())
    print(f"Found {len(source_users)} users in source database.")

    admin_count = 0
    student_count = 0

    # Clear target collections first to avoid duplicates
    target_db["admins"].delete_many({})
    target_db["students"].delete_many({})

    for user in source_users:
        role = user.get("role")
        if role == "admin":
            target_db["admins"].insert_one(user)
            admin_count += 1
        else:
            target_db["students"].insert_one(user)
            student_count += 1

    print(f"Migrated {admin_count} admins into target 'admins' collection.")
    print(f"Migrated {student_count} students into target 'students' collection.")

    # Migrate other collections
    for col_name in collections_to_migrate:
        # Special routing mapping
        target_col_name = col_name
        if col_name == "attendance_sheets":
            target_col_name = "attendance"
        elif col_name == "live_class_activity":
            target_col_name = "activity_scores"

        print(f"\n--- Migrating {col_name} -> {target_col_name} ---")
        docs = list(source_db[col_name].find())
        target_db[target_col_name].delete_many({})
        if docs:
            target_db[target_col_name].insert_many(docs)
            print(f"Successfully migrated {len(docs)} documents to '{target_col_name}' collection.")
        else:
            print(f"No documents found in '{col_name}' collection to migrate.")

    # Also handle attendance and activity_scores specifically if they exist in source as different names
    special_collections = {
        "attendance_sheets": "attendance",
        "live_class_activity": "activity_scores"
    }
    for src_col, tgt_col in special_collections.items():
        if src_col in source_db.list_collection_names():
            print(f"\n--- Migrating special collection {src_col} -> {tgt_col} ---")
            docs = list(source_db[src_col].find())
            target_db[tgt_col].delete_many({})
            if docs:
                target_db[tgt_col].insert_many(docs)
                print(f"Successfully migrated {len(docs)} documents to '{tgt_col}' collection.")

    # 4. Create/Use Fees collection dynamically if payments exist or insert dummy logs
    print("\n--- Verifying/Creating 'fees' collection ---")
    target_db["fees"].delete_many({})
    # If any student is paid, log a fee payment entry
    students_list = list(target_db["students"].find())
    fee_records_inserted = 0
    for s in students_list:
        if s.get("feesStatus") == "Paid" or s.get("feesPaid", False):
            fee_doc = {
                "student_id": s["_id"],
                "student_name": s.get("name"),
                "amount": s.get("feesPaidAmount", 20000),
                "status": "Paid",
                "payment_date": s.get("feesPaymentDate") or "2026-07-08",
                "created_at": s.get("created_at")
            }
            target_db["fees"].insert_one(fee_doc)
            fee_records_inserted += 1
    print(f"Created/populated {fee_records_inserted} fee payment log documents in 'fees' collection.")

    # 5. Log final database verification report
    print("\n================ MIGRATION COMPLETE SUMMARY ================")
    print(f"Connected Target MongoDB Database: {target_db.name}")
    if atlas_connected:
        print("Database Hosting: MongoDB Atlas Cluster")
    else:
        print("Database Hosting: Local MongoDB (Fallback Mode)")
        
    print("\nInserted document counts for each collection:")
    all_target_colls = [
        "admins",
        "students",
        "courses",
        "batches",
        "live_classes",
        "attendance",
        "recorded_classes",
        "announcements",
        "fees",
        "activity_scores"
    ]
    for c_name in all_target_colls:
        count = target_db[c_name].count_documents({})
        print(f"  - Collection '{c_name}': {count} documents")
    print("============================================================")

if __name__ == '__main__':
    migrate()
