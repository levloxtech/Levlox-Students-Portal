import os
import sys
import bcrypt
import datetime

# Add directory to sys.path so we can import db
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db import db

def seed_admin():
    print("Seeding initial super admin account...")
    
    phone = "+919876543210"
    email = "admin@levlox.com"
    name = "Super Admin"
    password = "ChangeThisPassword123"
    
    # Clean existing conflicting records to allow clean seed
    db._db.admins.delete_many({"$or": [{"phone": phone}, {"email": email}]})
    db._db.students.delete_many({"$or": [{"phone": phone}, {"email": email}]})
    
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    admin_doc = {
        "name": name,
        "phone": phone,
        "email": email,
        "password_hash": password_hash,
        "role": "admin",
        "created_by": "system",
        "created_at": datetime.datetime.utcnow()
    }
    
    db.users.insert_one(admin_doc)
    print(f"Successfully seeded admin account!")
    print(f"Name: {name}")
    print(f"Phone: {phone}")
    print(f"Password: {password}")

if __name__ == "__main__":
    seed_admin()
