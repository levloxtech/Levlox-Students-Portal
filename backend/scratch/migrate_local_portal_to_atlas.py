import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

def migrate_portal():
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("MONGO_URI not found in environment!")
        return

    print("Connecting to local MongoDB...")
    local_client = MongoClient("mongodb://localhost:27017/")
    local_db = local_client["levlox_student_portal"]

    print("Connecting to MongoDB Atlas...")
    atlas_client = MongoClient(mongo_uri)
    atlas_db = atlas_client["levlox_student_portal"]

    collections = local_db.list_collection_names()
    print(f"Collections found in local database: {collections}")

    for coll_name in collections:
        if coll_name.startswith("system."):
            continue
        print(f"Migrating collection '{coll_name}'...")
        # Get all documents
        docs = list(local_db[coll_name].find())
        if docs:
            # Clear target collection
            atlas_db[coll_name].delete_many({})
            # Insert documents
            atlas_db[coll_name].insert_many(docs)
            print(f"  Successfully copied {len(docs)} documents to Atlas '{coll_name}'.")
        else:
            print(f"  Collection '{coll_name}' is empty. Creating empty collection on Atlas.")
            # Create collection if it doesn't exist
            if coll_name not in atlas_db.list_collection_names():
                atlas_db.create_collection(coll_name)

    print("Migration finished successfully!")

if __name__ == "__main__":
    migrate_portal()
