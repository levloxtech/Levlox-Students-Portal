import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from db import db

print("Live classes in DB:")
try:
    for lc in db.live_classes.find():
        print(lc)
except Exception as e:
    print("Error querying live classes:", e)
