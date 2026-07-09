import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from db import db
from bson import ObjectId

class FakeG:
    def __init__(self, user):
        self.current_user = user
        self.user_id = user['id']

def test():
    # Find student
    student_db = db.users.find_one({"role": "student"})
    if not student_db:
        print("No student found in DB")
        return
        
    student = {
        "id": str(student_db['_id']),
        "name": student_db.get('name'),
        "email": student_db.get('email'),
        "feesPaid": student_db.get('feesPaid', False),
        "feesTotal": student_db.get('feesTotal', 1500),
        "feesPaidAmount": student_db.get('feesPaidAmount', 0),
        "feesRemainingAmount": student_db.get('feesRemainingAmount', 1500),
        "feesStatus": student_db.get('feesStatus', 'Pending'),
        "feesPaymentDate": student_db.get('feesPaymentDate', ''),
        "feesDueDate": student_db.get('feesDueDate', '2026-08-31'),
        "rollNumber": student_db.get('rollNumber', 'LSP-2026-9999'),
        "attendance": student_db.get('attendance', {"percentage": 92, "present": 46, "absent": 4})
    }
    
    print("Testing get_dashboard route logic...")
    try:
        # Mock get_dashboard logic
        batch_id = student_db.get('batch_id')
        print(f"batch_id: {batch_id} (type: {type(batch_id)})")
        
        live_classes_list = list(db.live_classes.find({"is_published": True, "batch_id": batch_id}))
        print(f"live_classes_list: {len(live_classes_list)}")
        
        fees_are_paid = student.get('feesPaid', False)
        for item in live_classes_list:
            item['_id'] = str(item['_id'])
            if not fees_are_paid:
                item.pop('meet_link', None)
                item.pop('join_url', None)
                
        today_live = [c for c in live_classes_list if c.get('is_today', False) or c.get('status') == 'Live']
        upcoming_live = [c for c in live_classes_list if not (c.get('is_today', False) or c.get('status') == 'Live')]
        
        announcements_list = list(db.announcements.find({"batch_id": batch_id}).sort([('is_pinned', -1), ('_id', -1)]).limit(10))
        print(f"announcements_list: {len(announcements_list)}")
        for item in announcements_list:
            item['_id'] = str(item['_id'])
            
        study_materials_list = list(db.study_materials.find({"batch_id": batch_id}))
        print(f"study_materials_list: {len(study_materials_list)}")
        for item in study_materials_list:
            item['_id'] = str(item['_id'])
            
        recorded_classes_list = list(db.recorded_classes.find({"batch_id": batch_id}))
        print(f"recorded_classes_list: {len(recorded_classes_list)}")
        for item in recorded_classes_list:
            item['_id'] = str(item['_id'])
            
        print("get_dashboard logic passed!")
    except Exception as e:
        print("Error in get_dashboard logic:")
        import traceback
        traceback.print_exc()

    print("\nTesting get_overall_leaderboard logic...")
    try:
        students = list(db.users.find({"role": "student", "batch_id": batch_id}))
        print(f"Students found: {len(students)}")
        leaderboard = []
        for s in students:
            leaderboard.append({
                "student_id": str(s['_id']),
                "name": s.get('name', 'Student'),
                "overall_score": s.get('overall_score', 750),
                "streak": s.get('streak', 3),
                "is_current": str(s['_id']) == str(student['id'])
            })
        leaderboard.sort(key=lambda x: x['overall_score'], reverse=True)
        for index, item in enumerate(leaderboard):
            item['rank'] = index + 1
        print("get_overall_leaderboard logic passed!")
    except Exception as e:
        print("Error in get_overall_leaderboard logic:")
        import traceback
        traceback.print_exc()

    print("\nTesting get_mock_leaderboard logic...")
    try:
        students = list(db.users.find({"role": "student", "batch_id": batch_id}))
        leaderboard = []
        for s in students:
            s_id = s['_id']
            interviews = list(db.mock_interviews.find({"student_id": s_id}))
            if interviews:
                avg_score = round(sum(i.get('score', 0) for i in interviews) / len(interviews))
                completed = sum(i.get('completed_interviews', 0) for i in interviews)
            else:
                avg_score = 0
                completed = 0
            leaderboard.append({
                "student_id": str(s_id),
                "name": s.get('name', 'Student'),
                "average_score": avg_score,
                "completed_interviews": completed,
                "is_current": str(s_id) == str(student['id'])
            })
        leaderboard.sort(key=lambda x: x['average_score'], reverse=True)
        for index, item in enumerate(leaderboard):
            item['rank'] = index + 1
        print("get_mock_leaderboard logic passed!")
    except Exception as e:
        print("Error in get_mock_leaderboard logic:")
        import traceback
        traceback.print_exc()

    print("\nTesting get_task_leaderboard logic...")
    try:
        students = list(db.users.find({"role": "student", "batch_id": batch_id}))
        total_assignments = db.assignments.count_documents({"batch_id": batch_id}) or 10
        leaderboard = []
        for s in students:
            s_id = s['_id']
            completed = db.submissions.count_documents({"student_id": s_id, "status": {"$in": ["Submitted", "graded", "pending"]}})
            sub_rate = round((completed / total_assignments) * 100)
            on_time = 95 if completed > 0 else 0
            leaderboard.append({
                "student_id": str(s_id),
                "name": s.get('name', 'Student'),
                "completed_assignments": completed,
                "submission_rate": sub_rate,
                "on_time_submission": on_time,
                "is_current": str(s_id) == str(student['id'])
            })
        leaderboard.sort(key=lambda x: x['completed_assignments'], reverse=True)
        for index, item in enumerate(leaderboard):
            item['rank'] = index + 1
        print("get_task_leaderboard logic passed!")
    except Exception as e:
        print("Error in get_task_leaderboard logic:")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test()
