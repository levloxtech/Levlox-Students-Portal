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

    # Fetch recorded classes — enriched with access + progress
    raw_recorded = list(db.recorded_classes.find({"batch_id": batch_id}).sort("sort_order", 1))

    # Get lesson_progress for this student
    student_oid = ObjectId(student['id'])
    progress_docs = list(db.lesson_progress.find({"student_id": student_oid}))
    progress_map = {}
    for p in progress_docs:
        lid = str(p.get('lesson_id', ''))
        progress_map[lid] = p.get('progress', 100 if p.get('completed') else 0)

    # Get trainer name from batch
    trainer_name = "Levlox Trainer"
    if batch_id:
        batch_doc = db.batches.find_one({"_id": ObjectId(batch_id)} if isinstance(batch_id, str) and len(batch_id) == 24 else {"_id": batch_id})
        if batch_doc:
            trainer_name = batch_doc.get('trainer', trainer_name)

    recorded_classes_list = []
    for item in raw_recorded:
        item['_id'] = str(item['_id'])
        if 'batch_id' in item and item['batch_id']:
            item['batch_id'] = str(item['batch_id'])

        visibility = item.get('visibility', 'everyone')
        # access = True if visibility is 'everyone' OR student has paid fees
        item['access'] = True if (visibility == 'everyone' or fees_are_paid) else False
        item['progress'] = progress_map.get(item['_id'], 0)
        item['trainer'] = trainer_name
        recorded_classes_list.append(item)

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
        
        batch_id = user.get('batch_id')
        batch_name = "Not Assigned"
        trainer = "Not Assigned"
        if batch_id:
            batch_doc = db.batches.find_one({"_id": ObjectId(batch_id)} if isinstance(batch_id, str) and len(batch_id) == 24 else {"_id": batch_id})
            if batch_doc:
                batch_name = batch_doc.get('name', 'Not Assigned')
                trainer = batch_doc.get('trainer_name', batch_doc.get('trainer', 'Not Assigned'))

        profile_data = {
            "name": user.get('name'),
            "email": user.get('email'),
            "phone": user.get('phone', ''),
            "college": user.get('college', 'Levlox Technical Institute'),
            "course": user.get('course', 'Fullstack Engineering'),
            "join_date": user.get('join_date', user.get('enrollmentDate', 'July 08, 2026')),
            "feesStatus": user.get('feesStatus', 'Pending'),
            "attendance": user.get('attendance', {}).get('percentage', 92),
            "profile_pic": user.get('profile_pic', ''),
            "current_location": user.get('current_location', ''),
            "permanent_address": user.get('permanent_address', ''),
            "company": user.get('company', ''),
            "rollNumber": user.get('rollNumber', 'LSP-2026-9999'),
            "batch_name": batch_name,
            "trainer": trainer
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
    email = data.get('email', '')
    profile_pic = data.get('profile_pic', '')
    current_location = data.get('current_location', '')
    permanent_address = data.get('permanent_address', '')

    if not name:
        return jsonify({'message': 'Name is required'}), 400

    try:
        if email:
            existing = db.users.find_one({"email": email.strip().lower(), "_id": {"$ne": ObjectId(g.user_id)}})
            if existing:
                return jsonify({'message': 'Email already in use by another account'}), 400

        update_data = {
            "name": name.strip(),
            "phone": phone.strip(),
            "profile_pic": profile_pic.strip(),
            "current_location": current_location.strip(),
            "permanent_address": permanent_address.strip()
        }
        if email:
            update_data["email"] = email.strip().lower()

        db.users.update_one(
            {"_id": ObjectId(g.user_id)},
            {"$set": update_data}
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


@student_bp.route('/learning-ranking', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_learning_ranking():
    try:
        student = g.current_user
        student_db = db.users.find_one({"_id": ObjectId(student['id'])})
        batch_id = student_db.get('batch_id') if student_db else None

        if not batch_id:
            return jsonify({
                "topPerformers": [],
                "currentStudent": {
                    "rank": "-",
                    "score": 0,
                    "name": student.get('name')
                }
            }), 200

        students = list(db.users.find({"role": "student", "batch_id": batch_id}))
        rankings = []
        
        # Calculate totals for completion pct
        rec_classes = list(db.recorded_classes.find({"batch_id": str(batch_id)}))
        tot_lessons = len(rec_classes)

        # Get total assignments for this batch/course if any
        # Let's count assignments
        total_assigns = db.assignments.count_documents({})
        if total_assigns == 0:
            total_assigns = 1

        for s in students:
            s_id_str = str(s['_id'])
            s_id_obj = s['_id']

            # 1. Attendance % (20%)
            attendance_pct = s.get('attendance', {}).get('percentage', 92)

            # 2. Course Completion % (20%)
            comp_lessons = db.lesson_progress.count_documents({"student_id": s_id_str})
            completion_pct = round((comp_lessons / max(1, tot_lessons)) * 100) if tot_lessons > 0 else 0
            if completion_pct > 100:
                completion_pct = 100

            # 3. Assignment Score (30%)
            subs = list(db.submissions.find({"student_id": s_id_obj}))
            graded_subs = [sub for sub in subs if sub.get('grade') is not None]
            if graded_subs:
                grades = []
                for sub in graded_subs:
                    try:
                        grades.append(float(sub.get('grade')))
                    except:
                        pass
                avg_grade = sum(grades) / len(grades) if grades else 80.0
            else:
                sub_rate = (len(subs) / max(1, total_assigns)) * 100
                avg_grade = min(100.0, sub_rate)

            # 4. Mock Interview Score (30%)
            interviews = list(db.mock_interviews.find({"student_id": s_id_obj}))
            if interviews:
                avg_mock = sum(i.get('score', 0) for i in interviews) / len(interviews)
            else:
                avg_mock = 75.0  # default fallback

            final_score = round(
                (avg_grade * 0.3) +
                (avg_mock * 0.3) +
                (attendance_pct * 0.2) +
                (completion_pct * 0.2),
                1
            )

            rankings.append({
                "student_id": s_id_str,
                "name": s.get('name', 'Student'),
                "score": final_score,
                "is_current": s_id_str == str(student['id'])
            })

        rankings.sort(key=lambda x: x['score'], reverse=True)

        for idx, r in enumerate(rankings):
            r['rank'] = idx + 1

        top_performers = rankings[:3]
        current_student = next((r for r in rankings if r['is_current']), {
            "rank": "-",
            "score": 0,
            "name": student.get('name')
        })

        return jsonify({
            "topPerformers": top_performers,
            "currentStudent": current_student,
            "rankings": rankings
        }), 200
    except Exception as e:
        return jsonify({'message': 'Error loading learning ranking', 'error': str(e)}), 400


@student_bp.route('/recorded-classes-lms', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_recorded_classes_lms():
    # Backward compatibility fallback redirecting to course overview
    return get_recorded_courses()

@student_bp.route('/recorded-courses', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_recorded_courses():
    try:
        student = g.current_user
        fees_are_paid = student.get('feesPaid', False)
        student_db = db.users.find_one({"_id": ObjectId(student['id'])})
        batch_id = student_db.get('batch_id') if student_db else None

        # Fetch batch trainer & name
        batch_name = "July 2026"
        trainer = "Sri"
        if batch_id:
            batch_doc = db.batches.find_one({"_id": ObjectId(batch_id)})
            if batch_doc:
                batch_name = batch_doc.get('name', 'July 2026')
                trainer = batch_doc.get('trainer_name', 'Sri')

        # Seeding starter classes if empty
        if db.recorded_classes.count_documents({"batch_id": str(batch_id) if batch_id else None}) == 0:
            db.recorded_classes.insert_many([
                {
                    "title": "Variables & Data Types",
                    "module": "Module 1 - Python Basics",
                    "video_url": "https://www.youtube.com/watch?v=35lXWvCuDKo",
                    "notes_url": "https://react.dev",
                    "assignment": "Variables & Operators Challenge",
                    "quiz": "Python Variables Quiz",
                    "visibility": "everyone",
                    "course_title": "Python Full Stack",
                    "batch_id": str(batch_id) if batch_id else None
                },
                {
                    "title": "Python Operators",
                    "module": "Module 1 - Python Basics",
                    "video_url": "https://www.youtube.com/watch?v=lawexDFUtGY",
                    "notes_url": "https://react.dev",
                    "assignment": "Operators Hands-on Lab",
                    "quiz": "Operators Practice Test",
                    "visibility": "paid",
                    "course_title": "Python Full Stack",
                    "batch_id": str(batch_id) if batch_id else None
                },
                {
                    "title": "Functions Part 1",
                    "module": "Module 2 - Functions & Recursion",
                    "video_url": "https://www.youtube.com/watch?v=35lXWvCuDKo",
                    "notes_url": "https://react.dev",
                    "assignment": "Recursion Practice Assignment",
                    "quiz": "Functions & Scope Quiz",
                    "visibility": "paid",
                    "course_title": "Python Full Stack",
                    "batch_id": str(batch_id) if batch_id else None
                }
            ])

        recorded_classes = list(db.recorded_classes.find({"batch_id": str(batch_id) if batch_id else None}))
        
        # Calculate modules count and lessons count
        modules_set = set()
        lessons_count = len(recorded_classes)
        for rc in recorded_classes:
            modules_set.add(rc.get('module', 'Module 1 - Python Basics'))
        
        modules_count = len(modules_set) if modules_set else 1

        # Calculate progress
        completed_lessons = db.lesson_progress.count_documents({"student_id": student['id']})
        progress_pct = round((completed_lessons / max(1, lessons_count)) * 100)
        if progress_pct > 100: progress_pct = 100

        # Course records
        courses_list = [
            {
                "id": "python-full-stack",
                "title": "Python Full Stack",
                "trainer": trainer,
                "batch": batch_name,
                "modules_count": modules_count,
                "videos_count": lessons_count,
                "progress": progress_pct,
                "thumbnail": "",
                "last_watched": "Variables & Data Types" if completed_lessons > 0 else "Not Started"
            }
        ]

        return jsonify({"courses": courses_list, "isPaid": fees_are_paid}), 200
    except Exception as e:
        return jsonify({'message': 'Error loading recorded courses', 'error': str(e)}), 400

@student_bp.route('/recorded-courses/<course_id>/player', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_course_player(course_id):
    try:
        student = g.current_user
        fees_are_paid = student.get('feesPaid', False)
        student_db = db.users.find_one({"_id": ObjectId(student['id'])})
        batch_id = student_db.get('batch_id') if student_db else None

        recorded_classes = list(db.recorded_classes.find({"batch_id": str(batch_id) if batch_id else None}))
        submissions = list(db.submissions.find({"student_id": ObjectId(student['id'])}))
        completed_list = list(db.lesson_progress.find({"student_id": student['id']}))
        completed_ids = set(str(lp.get('lesson_id')) for lp in completed_list)
        
        sub_map = {}
        for sub in submissions:
            sub_map[str(sub.get('assignment_id'))] = sub.get('status', 'Submitted').capitalize()

        # Group by module field
        modules_dict = {}
        video_number = 1
        for rc in recorded_classes:
            mod_title = rc.get('module', 'Module 1 - Python Basics')
            if mod_title not in modules_dict:
                modules_dict[mod_title] = {
                    "id": mod_title.lower().replace(" ", "-"),
                    "title": mod_title,
                    "lessons": []
                }
            
            visibility = rc.get('visibility', 'everyone')
            is_locked = True if (visibility == 'paid' and not fees_are_paid) else False
            rc_id = str(rc['_id'])

            modules_dict[mod_title]["lessons"].append({
                "id": rc_id,
                "video_number": video_number,
                "title": rc.get('title'),
                "description": rc.get('description', 'Learn the core programming constructs in this step-by-step lecture replay.'),
                "duration": "1h 15m",
                "completed": rc_id in completed_ids,
                "url": rc.get('video_url', ''),
                "notes_url": rc.get('notes_url') if not is_locked else None,
                "assignment": rc.get('assignment') if not is_locked else None,
                "quiz": rc.get('quiz') if not is_locked else None,
                "visibility": visibility,
                "locked": is_locked
            })
            video_number += 1

        modules_list = list(modules_dict.values())
        modules_list.sort(key=lambda x: x['title'])

        return jsonify({"modules": modules_list, "isPaid": fees_are_paid}), 200
    except Exception as e:
        return jsonify({'message': 'Error loading player curriculum', 'error': str(e)}), 400

@student_bp.route('/lessons/<lesson_id>/complete', methods=['POST'])
@token_required(allowed_roles=['student'])
def complete_lesson(lesson_id):
    try:
        student = g.current_user
        
        db.lesson_progress.update_one(
            {"student_id": student['id'], "lesson_id": lesson_id},
            {"$set": {
                "student_id": student['id'],
                "lesson_id": lesson_id,
                "completed_at": datetime.datetime.utcnow()
            }},
            upsert=True
        )
        return jsonify({'message': 'Lesson marked as completed successfully!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error completing lesson', 'error': str(e)}), 400


@student_bp.route('/latest-replays', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_latest_replays():
    """Return the 3 most recently uploaded lessons for the student's batch.
    Includes access control, progress, and deep-link course_id for the Course Player.
    """
    try:
        student = g.current_user
        fees_are_paid = student.get('feesPaid', False)
        student_db = db.users.find_one({"_id": ObjectId(student['id'])})
        batch_id = student_db.get('batch_id') if student_db else None

        # Fetch trainer name
        trainer_name = "Levlox Trainer"
        if batch_id:
            batch_doc = db.batches.find_one({"_id": ObjectId(batch_id)})
            if batch_doc:
                trainer_name = batch_doc.get('trainer_name', batch_doc.get('trainer', 'Levlox Trainer'))

        # Fetch lessons sorted by creation (newest first), limit 3
        query = {"batch_id": str(batch_id) if batch_id else None}
        raw = list(db.recorded_classes.find(query).sort("_id", -1).limit(3))

        # Get this student's lesson progress
        progress_docs = list(db.lesson_progress.find({"student_id": student['id']}))
        progress_map = {str(p.get('lesson_id', '')): 100 for p in progress_docs}

        result = []
        for idx, item in enumerate(raw):
            lesson_id = str(item['_id'])
            visibility = item.get('visibility', 'everyone')
            has_access = visibility == 'everyone' or fees_are_paid

            # Derive a stable course_id (used by Course Player route)
            # We use the course_title normalised as a slug for grouping
            course_raw = item.get('course_title', 'Python Full Stack')

            result.append({
                "id": lesson_id,
                "title": item.get('title', f'Lesson {idx + 1}'),
                "course": course_raw,
                "module": item.get('module', 'Module 1'),
                "trainer": trainer_name,
                "thumbnail": item.get('thumbnail', ''),
                "duration": item.get('duration', ''),
                "description": item.get('description', ''),
                "video_url": item.get('video_url', '') if has_access else '',
                "progress": progress_map.get(lesson_id, 0),
                "created_at": item.get('created_at', ''),
                "visibility": visibility,
                "access": has_access,
                # Course Player deep-link: batch_id is used as course_id by the player route
                "course_id": str(batch_id) if batch_id else None,
            })

        return jsonify({"replays": result, "isPaid": fees_are_paid}), 200
    except Exception as e:
        return jsonify({'message': 'Error fetching latest replays', 'error': str(e)}), 400




