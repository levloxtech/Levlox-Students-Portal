import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from db import db
from bson import ObjectId

def get_batch_query_criteria(batch_id):
    if not batch_id:
        return {"$in": [None, ""]}
    criteria = [batch_id]
    if isinstance(batch_id, str):
        if len(batch_id) == 24:
            try:
                criteria.append(ObjectId(batch_id))
            except:
                pass
    elif isinstance(batch_id, ObjectId):
        criteria.append(str(batch_id))
    return {"$in": criteria}

print("Testing student live classes logic:")
for student in db.users.find({"role": "student"}):
    print(f"Student: {student.get('name')}, ID: {student.get('_id')}")
    try:
        fees_are_paid = student.get('feesPaid', False)
        student_db = db.users.find_one({"_id": ObjectId(student['_id'])})
        batch_id = student_db.get('batch_id') if student_db else None
        print(f"  batch_id: {batch_id} (type: {type(batch_id)})")
        
        classes = list(db.live_classes.find({"is_published": True, "batch_id": get_batch_query_criteria(batch_id)}))
        for c in classes:
            c['_id'] = str(c['_id'])
            if 'batch_id' in c and c['batch_id']:
                c['batch_id'] = str(c['batch_id'])
            if not fees_are_paid:
                c.pop('meet_link', None)
                c.pop('join_url', None)
        print(f"  Successfully found {len(classes)} classes")
    except Exception as e:
        print(f"  Error: {e}")
        import traceback
        traceback.print_exc()
