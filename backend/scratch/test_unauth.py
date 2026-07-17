import os
import sys
import jwt
import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

load_dotenv()
from db import db
from config import Config

# Find the admin user in the db
admin = db.admins.find_one({"email": "admin@levlox.com"})
if not admin:
    print("Admin user not found in db.admins!")
else:
    print(f"Admin found: {admin}")
    # Generate token like auth.py does
    token_payload = {
        'user_id': str(admin['_id']),
        'role': admin['role'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    token = jwt.encode(token_payload, Config.JWT_SECRET_KEY, algorithm='HS256')
    print("Generated Token:", token)
    
    # Try decoding token using jwt
    try:
        decoded = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        print("Decoded token payload:", decoded)
        
        # Test middleware lookup logic
        user_id = decoded.get('user_id')
        user = db.users.find_one({"_id": decoded.get('user_id')})
        print("db.users.find_one search by string id:", user)
        
        from bson import ObjectId
        user = db.users.find_one({"_id": ObjectId(user_id)})
        print("db.users.find_one search by ObjectId:", user)
    except Exception as e:
        print("Decoding/Lookup failed:", e)
