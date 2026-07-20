import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from db import db

print("Courses in DB:")
try:
    for course in db.courses.find():
        print(course)
except Exception as e:
    print("Error querying courses:", e)
