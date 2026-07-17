import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from db import db

print(f"Connected DB Name: {db.name}")
print("Collection names available:", db.list_collection_names())
print("Admins count:", db.admins.count_documents({}))
print("Students count:", db.students.count_documents({}))
print("Users virtual count:", db.users.count_documents({}))
print("Users virtual find_one admin:", db.users.find_one({"role": "admin"})["name"])
print("Users virtual find_one student:", db.users.find_one({"role": "student"})["name"])
