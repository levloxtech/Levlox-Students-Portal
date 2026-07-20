import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import db

print("Admins in database:")
for admin in db._db.admins.find():
    admin_copy = dict(admin)
    admin_copy.pop('password', None)
    admin_copy.pop('password_hash', None)
    print(admin_copy)
