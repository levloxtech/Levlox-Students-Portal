import datetime
from flask import Blueprint, jsonify, g, request
from bson import ObjectId
from db import db
from auth_middleware import token_required

student_bp = Blueprint('student', __name__)

def seed_starter_data():
    # Seed live classes if empty
    if db.live_classes.count_documents({}) == 0:
        db.live_classes.insert_many([
            {
                "title": "Advanced React Design Patterns & Performance",
                "instructor": "Dr. Sarah Jenkins",
                "time": "Today, 02:00 PM",
                "join_url": "https://zoom.us/j/1234567890",
                "is_today": True
            },
            {
                "title": "Python Flask RESTful API Development",
                "instructor": "Prof. Charles Babbage",
                "time": "Tomorrow, 10:00 AM",
                "join_url": "https://zoom.us/j/0987654321",
                "is_today": False
            },
            {
                "title": "Introduction to MongoDB Atlas & Aggregations",
                "instructor": "Dr. Alan Turing",
                "time": "July 12, 11:30 AM",
                "join_url": "https://zoom.us/j/1122334455",
                "is_today": False
            }
        ])

    # Seed announcements if empty
    if db.announcements.count_documents({}) == 0:
        db.announcements.insert_many([
            {
                "title": "Mid-Term Project Guidelines Released",
                "content": "Please check the course syllabus for full project parameters. Submission deadline is July 20th.",
                "date": "July 8, 2026"
            },
            {
                "title": "Scheduled Server Maintenance",
                "content": "The student portal will undergo maintenance on Sunday, July 12th from 2:00 AM to 4:00 AM.",
                "date": "July 7, 2026"
            }
        ])

    # Seed study materials if empty
    if db.study_materials.count_documents({}) == 0:
        db.study_materials.insert_many([
            {
                "title": "React Hooks Cheat Sheet (PDF)",
                "type": "pdf",
                "url": "https://react.dev",
                "uploaded_at": "July 5, 2026"
            },
            {
                "title": "Flask API Design Handbook",
                "type": "epub",
                "url": "https://flask.palletsprojects.com",
                "uploaded_at": "July 6, 2026"
            },
            {
                "title": "LMS System Schema Diagram",
                "type": "zip",
                "url": "https://mongodb.com",
                "uploaded_at": "July 7, 2026"
            }
        ])

    # Seed recorded classes if empty
    if db.recorded_classes.count_documents({}) == 0:
        db.recorded_classes.insert_many([
            {
                "title": "Lecture 4: State Management with Context & Redux",
                "duration": "1h 15m",
                "url": "https://www.youtube.com/watch?v=35lXWvCuDKo",
                "uploaded_at": "July 6, 2026"
            },
            {
                "title": "Lecture 3: React Router DOM Navigation Setup",
                "duration": "58m",
                "url": "https://www.youtube.com/watch?v=lawexDFUtGY",
                "uploaded_at": "July 4, 2026"
            }
        ])

@student_bp.route('/dashboard', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_dashboard():
    # Make sure default starter data is loaded
    seed_starter_data()

    student = g.current_user
    
    # Check if student document has default fields in case of legacy records
    updated = False
    if 'feesPaid' not in student:
        student['feesPaid'] = False
        updated = True
    if 'feesTotal' not in student:
        student['feesTotal'] = 1500
        updated = True
    if 'feesPaidAmount' not in student:
        student['feesPaidAmount'] = 0
        updated = True
    if 'feesRemainingAmount' not in student:
        student['feesRemainingAmount'] = student.get('feesTotal', 1500) - student.get('feesPaidAmount', 0)
        updated = True
    if 'feesStatus' not in student:
        student['feesStatus'] = 'Pending'
        updated = True
    if 'feesPaymentDate' not in student:
        student['feesPaymentDate'] = ""
        updated = True
    if 'feesDueDate' not in student:
        student['feesDueDate'] = "2026-08-31"
        updated = True
    if 'rollNumber' not in student:
        student['rollNumber'] = "LSP-2026-9999"
        updated = True
    if 'attendance' not in student:
        student['attendance'] = {
            "percentage": 92,
            "present": 46,
            "absent": 4
        }
        updated = True

    if updated:
        db.users.update_one(
            {"_id": ObjectId(student['id'])},
            {"$set": {
                "feesPaid": student['feesPaid'],
                "feesTotal": student['feesTotal'],
                "feesPaidAmount": student['feesPaidAmount'],
                "feesRemainingAmount": student['feesRemainingAmount'],
                "feesStatus": student['feesStatus'],
                "feesPaymentDate": student['feesPaymentDate'],
                "feesDueDate": student['feesDueDate'],
                "rollNumber": student['rollNumber'],
                "attendance": student['attendance']
            }}
        )

    # Fetch the user from DB to get the most updated batch_id
    student_db = db.users.find_one({"_id": ObjectId(student['id'])})
    batch_id = student_db.get('batch_id') if student_db else None

    # Fetch live classes (only published ones and assigned to their batch)
    live_classes_list = list(db.live_classes.find({"is_published": True, "batch_id": batch_id}))
    
    # Securely check if student's fees are paid
    fees_are_paid = student.get('feesPaid', False)

    for item in live_classes_list:
        item['_id'] = str(item['_id'])
        if 'batch_id' in item and item['batch_id']:
            item['batch_id'] = str(item['batch_id'])
        # If fees are not paid, strip out Google Meet link for security
        if not fees_are_paid:
            item.pop('meet_link', None)
            item.pop('join_url', None)
    
    # Separate today's live class vs upcoming
    today_live = [c for c in live_classes_list if c.get('is_today', False) or c.get('status') == 'Live']
    upcoming_live = [c for c in live_classes_list if not (c.get('is_today', False) or c.get('status') == 'Live')]

    # Fetch announcements (pinned notices float to the top)
    announcements_list = list(db.announcements.find({"batch_id": batch_id}).sort([('is_pinned', -1), ('_id', -1)]).limit(10))
    for item in announcements_list:
        item['_id'] = str(item['_id'])
        if 'batch_id' in item and item['batch_id']:
            item['batch_id'] = str(item['batch_id'])

    # Fetch study materials
    study_materials_list = list(db.study_materials.find({"batch_id": batch_id}))
    for item in study_materials_list:
        item['_id'] = str(item['_id'])
        if 'batch_id' in item and item['batch_id']:
            item['batch_id'] = str(item['batch_id'])

    # Fetch recorded classes
    recorded_classes_list = list(db.recorded_classes.find({"batch_id": batch_id}))
    for item in recorded_classes_list:
        item['_id'] = str(item['_id'])
        if 'batch_id' in item and item['batch_id']:
            item['batch_id'] = str(item['batch_id'])

    # Aggregate response payload
    dashboard_data = {
        "student": {
            "name": student.get('name'),
            "email": student.get('email'),
            "feesPaid": fees_are_paid,
            "feesTotal": student.get('feesTotal'),
            "feesPaidAmount": student.get('feesPaidAmount'),
            "feesRemainingAmount": student.get('feesRemainingAmount'),
            "feesStatus": student.get('feesStatus'),
            "feesPaymentDate": student.get('feesPaymentDate'),
            "feesDueDate": student.get('feesDueDate'),
            "rollNumber": student.get('rollNumber'),
            "attendance": student.get('attendance'),
            "attendanceHistory": student.get('attendance_history', []),
            "batch_id": str(batch_id) if batch_id else None
        },
        "todayLiveClass": today_live[0] if today_live else None,
        "upcomingLiveClasses": upcoming_live,
        "announcements": announcements_list,
        "studyMaterials": study_materials_list,
        "recordedClasses": recorded_classes_list
    }

    return jsonify(dashboard_data), 200

@student_bp.route('/pay-fees', methods=['POST'])
@token_required(allowed_roles=['student'])
def pay_fees():
    student_id = g.current_user['id']
    student = db.users.find_one({"_id": ObjectId(student_id)})
    
    total = student.get('feesTotal', 1500)
    today = datetime.date.today().isoformat()

    db.users.update_one(
        {"_id": ObjectId(student_id)},
        {"$set": {
            "feesPaid": True,
            "feesPaidAmount": total,
            "feesRemainingAmount": 0,
            "feesStatus": "Paid",
            "feesPaymentDate": today
        }}
    )

    return jsonify({
        "message": "Fees payment completed successfully!",
        "feesPaid": True,
        "feesStatus": "Paid",
        "feesPaymentDate": today
    }), 200

# Profile & Password Actions
@student_bp.route('/profile', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_profile():
    try:
        user = db.users.find_one({"_id": ObjectId(g.user_id)})
        if not user:
            return jsonify({'message': 'Student not found'}), 404
        
        profile_data = {
            "name": user.get('name'),
            "email": user.get('email'),
            "phone": user.get('phone', ''),
            "college": user.get('college', 'Levlox Technical Institute'),
            "course": user.get('course', 'Fullstack Engineering'),
            "join_date": user.get('join_date', 'July 08, 2026'),
            "feesStatus": user.get('feesStatus', 'Pending'),
            "attendance": user.get('attendance', {}).get('percentage', 92),
            "profile_pic": user.get('profile_pic', '')
        }
        return jsonify(profile_data), 200
    except Exception as e:
        return jsonify({'message': 'Error retrieving profile', 'error': str(e)}), 400

@student_bp.route('/profile', methods=['PUT'])
@token_required(allowed_roles=['student'])
def update_profile():
    data = request.get_json() or {}
    name = data.get('name')
    phone = data.get('phone', '')
    college = data.get('college', '')
    course = data.get('course', '')
    profile_pic = data.get('profile_pic', '')

    if not name:
        return jsonify({'message': 'Name is required'}), 400

    try:
        db.users.update_one(
            {"_id": ObjectId(g.user_id)},
            {"$set": {
                "name": name.strip(),
                "phone": phone.strip(),
                "college": college.strip(),
                "course": course.strip(),
                "profile_pic": profile_pic.strip()
            }}
        )
        return jsonify({'message': 'Profile updated successfully!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error updating profile', 'error': str(e)}), 400

@student_bp.route('/change-password', methods=['PUT'])
@token_required(allowed_roles=['student'])
def change_password():
    import bcrypt
    data = request.get_json() or {}
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if not current_password or not new_password:
        return jsonify({'message': 'Missing password inputs'}), 400

    try:
        user = db.users.find_one({"_id": ObjectId(g.user_id)})
        if not user:
            return jsonify({'message': 'Student not found'}), 404

        # Validate current password
        if not bcrypt.checkpw(current_password.encode('utf-8'), user['password']):
            return jsonify({'message': 'Invalid current password!'}), 400

        # Hash and update new password
        hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        db.users.update_one(
            {"_id": ObjectId(g.user_id)},
            {"$set": {"password": hashed}}
        )
        return jsonify({'message': 'Password changed successfully!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error changing password', 'error': str(e)}), 400

@student_bp.route('/notifications', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_notifications():
    try:
        query = {
            "$or": [
                {"student_id": {"$exists": False}},
                {"student_id": None},
                {"student_id": str(g.user_id)}
            ]
        }
        notifications = list(db.notifications.find(query).sort('_id', -1).limit(20))
        for noti in notifications:
            noti['_id'] = str(noti['_id'])
        return jsonify(notifications), 200
    except Exception as e:
        return jsonify({'message': 'Error retrieving notifications', 'error': str(e)}), 400

@student_bp.route('/live-classes', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_live_classes():
    try:
        student = g.current_user
        fees_are_paid = student.get('feesPaid', False)

        # Retrieve user record for batch_id
        student_db = db.users.find_one({"_id": ObjectId(student['id'])})
        batch_id = student_db.get('batch_id') if student_db else None

        classes = list(db.live_classes.find({"is_published": True, "batch_id": batch_id}))
        for c in classes:
            c['_id'] = str(c['_id'])
            # Strip links for security from the list view if unpaid
            if not fees_are_paid:
                c.pop('meet_link', None)
                c.pop('join_url', None)

        return jsonify({"liveClasses": classes, "feesPaid": fees_are_paid}), 200
    except Exception as e:
        return jsonify({'message': 'Error loading live classes', 'error': str(e)}), 400

@student_bp.route('/live-classes/<class_id>', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_live_class_link(class_id):
    try:
        student = g.current_user
        fees_are_paid = student.get('feesPaid', False)
        
        if not fees_are_paid:
            return jsonify({'message': 'Access denied. Course fees are pending.'}), 403

        live_class = db.live_classes.find_one({"_id": ObjectId(class_id)})
        if not live_class:
            return jsonify({'message': 'Live class not found.'}), 404

        return jsonify({
            'meet_link': live_class.get('meet_link') or live_class.get('join_url')
        }), 200
    except Exception as e:
        return jsonify({'message': 'Error fetching meet link', 'error': str(e)}), 400

@student_bp.route('/attendance', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_student_attendance():
    try:
        user = db.users.find_one({"_id": ObjectId(g.user_id)})
        if not user:
            return jsonify({'message': 'Student not found'}), 404
        
        attendance_info = user.get('attendance', {
            "percentage": 92,
            "present": 46,
            "absent": 4
        })
        
        attendance_history = user.get('attendance_history', [])
        
        return jsonify({
            "percentage": attendance_info.get('percentage', 92),
            "present": attendance_info.get('present', 46),
            "absent": attendance_info.get('absent', 4),
            "attendanceHistory": attendance_history
        }), 200
    except Exception as e:
        return jsonify({'message': 'Error retrieving attendance', 'error': str(e)}), 400

@student_bp.route('/analytics', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_analytics():
    try:
        user_id = g.user_id
        student = db.users.find_one({"_id": ObjectId(user_id)})
        if not student:
            return jsonify({'message': 'Student not found'}), 404
        
        batch_id = student.get('batch_id')
        if not batch_id:
            return jsonify({
                "has_data": False,
                "message": "Your learning analytics will appear here once you start your course."
            }), 200
            
        completed_assignments_cnt = db.submissions.count_documents({"student_id": str(user_id), "status": "Submitted"})
        total_assignments_cnt = db.assignments.count_documents({"batch_id": batch_id})
        pending_assignments_cnt = max(0, total_assignments_cnt - completed_assignments_cnt)
        submission_rate = round((completed_assignments_cnt / max(1, total_assignments_cnt)) * 100)

        attendance_info = student.get('attendance', {"percentage": 92, "present": 46, "absent": 4})
        
        analytics_data = {
            "has_data": True,
            "overall_progress": {
                "percentage": 78,
                "completed_modules": 11,
                "remaining_modules": 3
            },
            "weekly_learning": [3.5, 4.2, 2.0, 5.5, 6.0, 1.5, 4.0],
            "mock_interviews": {
                "total": 6,
                "completed": 4,
                "pending": 2,
                "average_score": 82,
                "best_score": 95,
                "latest_date": "July 06, 2026",
                "scores": [70, 78, 85, 95]
            },
            "coding_practice": {
                "solved": 142,
                "streak": 12,
                "hours": 58
            },
            "assignments": {
                "completed": completed_assignments_cnt or 8,
                "pending": pending_assignments_cnt or 2,
                "submission_rate": submission_rate or 80
            },
            "attendance": {
                "percentage": attendance_info.get("percentage", 92),
                "present": attendance_info.get("present", 46),
                "absent": attendance_info.get("absent", 4)
            },
            "milestones": {
                "beginner": "Completed",
                "intermediate": "In Progress",
                "advanced": "Pending"
            }
        }
        return jsonify(analytics_data), 200
    except Exception as e:
        return jsonify({'message': 'Error retrieving analytics', 'error': str(e)}), 400

# Leaderboard APIs
@student_bp.route('/leaderboard/overall', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_overall_leaderboard():
    try:
        student = g.current_user
        student_db = db.users.find_one({"_id": ObjectId(student['id'])})
        batch_id = student_db.get('batch_id') if student_db else None

        if not batch_id:
            return jsonify([]), 200

        students = list(db.users.find({"role": "student", "batch_id": batch_id}))
        
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
            
        return jsonify(leaderboard), 200
    except Exception as e:
        return jsonify({'message': 'Error loading overall leaderboard', 'error': str(e)}), 400

@student_bp.route('/leaderboard/mock', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_mock_leaderboard():
    try:
        student = g.current_user
        student_db = db.users.find_one({"_id": ObjectId(student['id'])})
        batch_id = student_db.get('batch_id') if student_db else None

        if not batch_id:
            return jsonify([]), 200

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
            
        return jsonify(leaderboard), 200
    except Exception as e:
        return jsonify({'message': 'Error loading mock leaderboard', 'error': str(e)}), 400

@student_bp.route('/leaderboard/tasks', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_task_leaderboard():
    try:
        student = g.current_user
        student_db = db.users.find_one({"_id": ObjectId(student['id'])})
        batch_id = student_db.get('batch_id') if student_db else None

        if not batch_id:
            return jsonify([]), 200

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
            
        return jsonify(leaderboard), 200
    except Exception as e:
        return jsonify({'message': 'Error loading task leaderboard', 'error': str(e)}), 400


