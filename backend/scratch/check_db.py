import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/levlox_lms")
print(f"MONGO_URI from .env: {mongo_uri}")

# Try to check local client
try:
    local_client = MongoClient("mongodb://localhost:27017/")
    print("Local databases:", local_client.list_database_names())
    for db_name in local_client.list_database_names():
        db = local_client[db_name]
        print(f"  Local db: {db_name}, collections: {db.list_collection_names()}")
        if "users" in db.list_collection_names():
            print(f"    Users in {db_name}:")
            for u in db.users.find():
                print(f"      - {u.get('name')} (role: {u.get('role')}, email: {u.get('email')}, phone: {u.get('phone')})")
except Exception as e:
    print(f"Could not connect to local Mongo: {e}")

# Try to check Atlas client
try:
    atlas_client = MongoClient(mongo_uri)
    print("Atlas databases:", atlas_client.list_database_names())
    for db_name in atlas_client.list_database_names():
        db = atlas_client[db_name]
        print(f"  Atlas db: {db_name}, collections: {db.list_collection_names()}")
        if "users" in db.list_collection_names():
            print(f"    Users in {db_name}:")
            for u in db.users.find():
                print(f"      - {u.get('name')} (role: {u.get('role')}, email: {u.get('email')}, phone: {u.get('phone')})")
except Exception as e:
    print(f"Could not connect to Atlas Mongo: {e}")
