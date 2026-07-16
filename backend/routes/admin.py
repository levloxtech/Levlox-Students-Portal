import datetime
from flask import Blueprint, jsonify, request, g
from bson import ObjectId
from db import db
from auth_middleware import token_required

admin_bp = Blueprint('admin', __name__)

def create_notification(noti_type, title, message, student_id=None):
    doc = {
        "type": noti_type,
        "title": title.strip(),
        "message": message.strip(),
        "created_at": datetime.datetime.utcnow().strftime("%B %d, %Y %I:%M %p")
    }
    if student_id:
        doc["student_id"] = str(student_id)
    db.notifications.insert_one(doc)

@admin_bp.route('/stats', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_stats():
    import datetime
    today_iso = datetime.date.today().isoformat()
    today_pretty = datetime.date.today().strftime("%B %d, %Y")
    today_pretty_short = datetime.date.today().strftime("%b %d, %Y")

    # Gather database stats
    total_students = db.users.count_documents({"role": "student"})
    total_batches = db.batches.count_documents({})
    
    # Today's live classes query
    live_classes_today_count = db.live_classes.count_documents({
        "$or": [
            {"is_today": True},
            {"date": today_iso},
            {"date": today_pretty},
            {"date": today_pretty_short}
        ]
    })
    
    # Recorded courses (distinct course names)
    recorded_courses = len(db.recorded_classes.distinct("course_title"))
    
    # Fees stats
    students = list(db.users.find({"role": "student"}))
    total_collected = sum(float(s.get('feesPaidAmount', 0)) for s in students)
    total_expected = sum(float(s.get('feesTotal', 1500)) for s in students)
    pending_amount = sum(float(s.get('feesRemainingAmount', 0)) for s in students)
    pending_payments_count = db.users.count_documents({"role": "student", "feesStatus": {"$ne": "Paid"}})
    paid_students_count = db.users.count_documents({"role": "student", "feesStatus": "Paid"})
    
    # Overall attendance
    avg_attendance = 0
    if students:
        total_attendance = sum(s.get('attendance', {}).get('percentage', 0) for s in students)
        avg_attendance = round(total_attendance / len(students), 1)

    # Today's attendance sheet lookup
    today_attendance_pct = 95.0
    present_today_count = 0
    absent_today_count = 0
    today_sheets = list(db.attendance_sheets.find({
        "$or": [
            {"date": today_iso},
            {"date": today_pretty},
            {"date": today_pretty_short}
        ]
    }))
    
    if today_sheets:
        total_rec = 0
        pres_rec = 0
        for sheet in today_sheets:
            for r in sheet.get('records', []):
                total_rec += 1
                if r.get('status') == 'Present':
                    pres_rec += 1
                    present_today_count += 1
                else:
                    absent_today_count += 1
        if total_rec > 0:
            today_attendance_pct = round((pres_rec / total_rec) * 100, 1)
    else:
        # fallback/estimation
        present_today_count = round(total_students * (avg_attendance / 100.0))
        absent_today_count = max(0, total_students - present_today_count)
        today_attendance_pct = avg_attendance

    # Recent Registrations (latest 5 students)
    recent_students_cursor = db.users.find({"role": "student"}).sort("_id", -1).limit(5)
    recent_students = []
    for s in recent_students_cursor:
        batch_id = s.get('batch_id')
        batch_name = 'Not Assigned'
        if batch_id:
            try:
                batch_doc = db.batches.find_one({"_id": ObjectId(batch_id)} if isinstance(batch_id, str) and len(batch_id) == 24 else {"_id": batch_id})
                if batch_doc:
                    batch_name = batch_doc.get('name', 'Not Assigned')
            except Exception:
                pass
        recent_students.append({
            "id": str(s['_id']),
            "name": s.get('name'),
            "profile_pic": s.get('profile_pic', ''),
            "course": s.get('course', 'Fullstack Engineering'),
            "batch_name": batch_name,
            "join_date": s.get('join_date', '')
        })

    # Today's live classes details
    today_classes_cursor = db.live_classes.find({
        "$or": [
            {"is_today": True},
            {"date": today_iso},
            {"date": today_pretty},
            {"date": today_pretty_short}
        ]
    })
    today_classes = []
    for c in today_classes_cursor:
        batch_id = c.get('batch_id')
        batch_name = 'Common'
        course_name = 'General'
        if batch_id:
            try:
                batch_doc = db.batches.find_one({"_id": ObjectId(batch_id)} if isinstance(batch_id, str) and len(batch_id) == 24 else {"_id": batch_id})
                if batch_doc:
                    batch_name = batch_doc.get('name', 'Common')
                    course_name = batch_doc.get('course_name', 'General')
            except Exception:
                pass
        today_classes.append({
            "id": str(c['_id']),
            "title": c.get('title'),
            "instructor": c.get('instructor'),
            "time": c.get('time'),
            "meet_link": c.get('meet_link', ''),
            "course_name": course_name,
            "batch_name": batch_name,
            "status": c.get('status', 'Upcoming')
        })

    # Recent announcements
    recent_ann_cursor = db.announcements.find().sort("uploaded_at", -1).limit(5)
    recent_announcements = []
    for ann in recent_ann_cursor:
        recent_announcements.append({
            "id": str(ann['_id']),
            "title": ann.get('title'),
            "content": ann.get('content'),
            "priority": ann.get('priority', 'Medium'),
            "is_pinned": ann.get('is_pinned', False),
            "date": ann.get('date', '')
        })

    # Dynamic Activity Timeline
    timeline_activities = []
    
    # 1. Student registrations
    stu_reg = db.users.find({"role": "student"}).sort("_id", -1).limit(5)
    for s in stu_reg:
        timeline_activities.append({
            "type": "student",
            "message": f"Student registered: {s.get('name')} ({s.get('rollNumber', 'N/A')})",
            "date": s.get('join_date', 'Recently'),
            "timestamp": s.get('created_at') or s['_id'].generation_time
        })
        # 2. Fee received
        if s.get('feesStatus') == 'Paid' and s.get('feesPaymentDate'):
            timeline_activities.append({
                "type": "fee",
                "message": f"Fee received: {s.get('name')} completed payment of ${s.get('feesPaidAmount', 1500)}",
                "date": s.get('feesPaymentDate'),
                "timestamp": s['_id'].generation_time
            })
            
    # 3. Live classes scheduled
    lc_sched = db.live_classes.find().sort("_id", -1).limit(5)
    for c in lc_sched:
        timeline_activities.append({
            "type": "class",
            "message": f"Live class scheduled: {c.get('title')} by {c.get('instructor')}",
            "date": c.get('date'),
            "timestamp": c['_id'].generation_time
        })
        
    # 4. Recordings uploaded
    rec_uploaded = db.recorded_classes.find().sort("_id", -1).limit(5)
    for r in rec_uploaded:
        timeline_activities.append({
            "type": "recording",
            "message": f"Recording uploaded: {r.get('title')} in {r.get('module')}",
            "date": r.get('created_at') or 'Recently',
            "timestamp": r['_id'].generation_time
        })
        
    # 5. Notes uploaded
    notes_uploaded = db.study_materials.find().sort("_id", -1).limit(5)
    for n in notes_uploaded:
        timeline_activities.append({
            "type": "notes",
            "message": f"Notes uploaded: {n.get('title')} ({n.get('type')})",
            "date": n.get('uploaded_at') or 'Recently',
            "timestamp": n['_id'].generation_time
        })
        
    # 6. Attendance updated
    att_updated = db.attendance_sheets.find().sort("_id", -1).limit(5)
    for a in att_updated:
        timeline_activities.append({
            "type": "attendance",
            "message": f"Attendance updated for: {a.get('class_title')} ({a.get('date')})",
            "date": a.get('date'),
            "timestamp": a.get('saved_at') or a['_id'].generation_time
        })
        
    # 7. Announcements published
    ann_published = db.announcements.find().sort("uploaded_at", -1).limit(5)
    for p in ann_published:
        timeline_activities.append({
            "type": "announcement",
            "message": f"Announcement published: {p.get('title')}",
            "date": p.get('date'),
            "timestamp": p.get('uploaded_at') or p['_id'].generation_time
        })

    # Sort timeline by timestamp descending
    def get_time(item):
        ts = item.get('timestamp')
        if not ts:
            return datetime.datetime.min
        if isinstance(ts, str):
            try:
                dt = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00"))
                return dt.replace(tzinfo=None)
            except:
                return datetime.datetime.min
        if isinstance(ts, datetime.datetime):
            return ts.replace(tzinfo=None)
        try:
            return ts.replace(tzinfo=None)
        except:
            return datetime.datetime.min
        
    timeline_activities.sort(key=get_time, reverse=True)
    timeline_activities = timeline_activities[:10]
    for act in timeline_activities:
        if isinstance(act.get('timestamp'), datetime.datetime):
            act['timestamp'] = act['timestamp'].isoformat()
        else:
            act['timestamp'] = str(act.get('timestamp'))

    stats = {
        "totalStudents": total_students,
        "totalBatches": total_batches,
        "liveClassesToday": live_classes_today_count,
        "recordedCourses": recorded_courses,
        "feesCollected": total_collected,
        "pendingPaymentsCount": pending_payments_count,
        "pendingAmount": pending_amount,
        
        "recentStudents": recent_students,
        "todayLiveClasses": today_classes,
        "recentAnnouncements": recent_announcements,
        
        "attendanceOverview": {
            "percentage": avg_attendance,
            "todayPercentage": today_attendance_pct,
            "presentCount": present_today_count,
            "absentCount": absent_today_count
        },
        
        "feeOverview": {
            "totalCollected": total_collected,
            "pendingAmount": pending_amount,
            "paidStudents": paid_students_count,
            "pendingStudentsCount": pending_payments_count
        },
        
        "recentActivity": timeline_activities
    }
    return jsonify(stats), 200

@admin_bp.route('/students', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_students():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    search = request.args.get('search', '').strip()
    status = request.args.get('status', '').strip()
    fees_paid = request.args.get('feesPaid', '').strip()
    course = request.args.get('course', '').strip()
    batch = request.args.get('batch', '').strip()

    query = {"role": "student"}

    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"rollNumber": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]

    if status in ['active', 'inactive']:
        query["status"] = status
    elif status == 'Suspended':
        query["status"] = 'inactive'
    elif status == 'Active Only':
        query["status"] = 'active'

    if fees_paid == 'paid':
        query["feesStatus"] = "Paid"
    elif fees_paid == 'unpaid' or fees_paid == 'Pending':
        query["feesStatus"] = {"$ne": "Paid"}

    if course:
        query["course"] = course

    if batch:
        query["batch_id"] = batch

    start_date_str = request.args.get('startDate', '').strip()
    end_date_str = request.args.get('endDate', '').strip()

    if start_date_str or end_date_str:
        date_query = {}
        if start_date_str:
            try:
                dt = datetime.datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                date_query["$gte"] = dt
            except ValueError:
                pass
        if end_date_str:
            try:
                dt = datetime.datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                date_query["$lte"] = dt
            except ValueError:
                pass
        if date_query:
            query["created_at"] = date_query

    total_count = db.users.count_documents(query)
    skip = (page - 1) * limit
    
    students = list(db.users.find(query).skip(skip).limit(limit))
    
    for s in students:
        s['id'] = str(s['_id'])
        s.pop('_id', None)
        s.pop('password', None)
        if 'created_at' in s and s['created_at']:
            s['created_at'] = str(s['created_at'])
        if 'batch_id' in s and s['batch_id']:
            s['batch_id'] = str(s['batch_id'])
        if 'status' not in s:
            s['status'] = 'active'
        if 'attendance_history' not in s:
            s['attendance_history'] = [
                {"date": "2026-07-07", "status": "Present"},
                {"date": "2026-07-06", "status": "Present"},
                {"date": "2026-07-05", "status": "Present"},
                {"date": "2026-07-04", "status": "Absent"},
                {"date": "2026-07-03", "status": "Present"}
            ]
        # Look up batch name
        batch_id = s.get('batch_id')
        s['batch_name'] = 'Not Assigned'
        if batch_id:
            try:
                batch_doc = db.batches.find_one({"_id": ObjectId(batch_id)} if isinstance(batch_id, str) and len(batch_id) == 24 else {"_id": batch_id})
                if batch_doc:
                    s['batch_name'] = batch_doc.get('name', 'Not Assigned')
            except Exception:
                pass

    import math
    total_pages = math.ceil(total_count / limit)

    return jsonify({
        "students": students,
        "total": total_count,
        "page": page,
        "pages": total_pages,
        "limit": limit
    }), 200

@admin_bp.route('/students', methods=['POST'])
@token_required(allowed_roles=['admin'])
def create_student():
    import random
    import bcrypt
    import re
    data = request.get_json() or {}
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    course = data.get('course')
    batch_id = data.get('batch_id')
    feesStatus = 'Pending'
    status = 'active'
    join_date = datetime.datetime.utcnow().strftime("%B %d, %Y")
    profile_pic = ''
    college = "Levlox Technical Institute"
    permanent_address = ''
    current_location = ''
    company = ''

    if not name or not email or not phone:
        return jsonify({'message': 'Missing name, email, or mobile number'}), 400

    # Clean inputs
    name = name.strip()
    email = email.strip().lower()
    phone = phone.strip()

    # Check if user already exists
    if db.users.find_one({"phone": phone}):
        return jsonify({'message': 'Mobile number already registered'}), 400
    if db.users.find_one({"email": email}):
        return jsonify({'message': 'Email already registered'}), 400

    # Auto generate sequence-based rollNumber (LSP-2026-XXXX)
    max_seq = 0
    pattern = re.compile(r"^LSP-2026-(\d{4})$")
    for u in db.users.find({"role": "student", "rollNumber": {"$regex": "^LSP-2026-"}}):
        match = pattern.match(u.get('rollNumber', ''))
        if match:
            try:
                seq = int(match.group(1))
                if seq > max_seq:
                    max_seq = seq
            except ValueError:
                pass
    rollNumber = f"LSP-2026-{max_seq + 1:04d}"

    # Use password passed from frontend, otherwise auto generate an 8-character password
    temp_pass = data.get('password') or data.get('temporary_password')
    if not temp_pass:
        chars = "ABCDEFGHJKLMNOPQRSTUVWXYZ23456789"
        temp_pass = "".join(random.choice(chars) for _ in range(8))

    hashed_password = bcrypt.hashpw(temp_pass.encode('utf-8'), bcrypt.gensalt())

    # Build User doc
    user_doc = {
        "name": name,
        "email": email,
        "phone": phone,
        "role": "student",
        "status": status,
        "password": hashed_password,
        "must_change_password": True,
        "rollNumber": rollNumber,
        "course": course or "Fullstack Engineering",
        "batch_id": batch_id or None,
        "join_date": join_date,
        "college": college,
        "profile_pic": profile_pic,
        "current_location": current_location,
        "permanent_address": permanent_address,
        "company": company,
        "feesPaid": False,
        "feesTotal": 1500,
        "feesPaidAmount": 0,
        "feesRemainingAmount": 1500,
        "feesStatus": feesStatus,
        "feesPaymentDate": "",
        "feesDueDate": "2026-08-31",
        "attendance": {
            "percentage": 0,
            "present": 0,
            "absent": 0
        },
        "attendance_history": [],
        "created_at": datetime.datetime.utcnow()
    }

    # Save to database
    result = db.users.insert_one(user_doc)
    user_id = result.inserted_id

    # Sync with batch if assigned
    if batch_id:
        try:
            db.batches.update_one(
                {"_id": ObjectId(batch_id)},
                {"$addToSet": {"student_ids": str(user_id)}}
            )
        except Exception:
            pass

    return jsonify({
        "message": "Student created successfully!",
        "student": {
            "id": str(user_id),
            "name": name,
            "rollNumber": rollNumber,
            "phone": phone,
            "email": email,
            "temporary_password": temp_pass
        }
    }), 201

@admin_bp.route('/students/<student_id>', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_student_details(student_id):
    try:
        student = db.users.find_one({"_id": ObjectId(student_id), "role": "student"})
        if not student:
            return jsonify({'message': 'Student not found'}), 404

        # Calculate Rank
        rank = 0
        try:
            # Re-compute leaderboard rankings to find the rank
            all_students = list(db.users.find({"role": "student"}))
            leaderboard = []
            for s in all_students:
                s_id_str = str(s['_id'])
                s_id_obj = s['_id']
                hist = s.get('attendance_history', [])
                if hist:
                    present = sum(1 for h in hist if h.get('status') == 'Present')
                    attendance_pct = round((present / len(hist)) * 100)
                else:
                    attendance_pct = s.get('attendance', {}).get('percentage', 92)
                s_batch = s.get('batch_id')
                total_assigns = db.assignments.count_documents({"batch_id": s_batch} if s_batch else {}) or 10
                subs_cnt = db.submissions.count_documents({"student_id": s_id_obj})
                submission_rate = round((subs_cnt / max(1, total_assigns)) * 100)
                interviews = list(db.mock_interviews.find({"student_id": s_id_obj}))
                avg_mock = sum(i.get('score', 0) for i in interviews) / len(interviews) if interviews else 75.0
                activity_points = s.get('activity_points', 0)
                overall_score = round((attendance_pct * 2) + (submission_rate * 3) + (avg_mock * 3) + min(200, activity_points))
                leaderboard.append({"student_id": s_id_str, "overall_score": overall_score})
            leaderboard.sort(key=lambda x: x['overall_score'], reverse=True)
            for idx, item in enumerate(leaderboard):
                if item['student_id'] == str(student_id):
                    rank = idx + 1
                    break
        except Exception as e:
            print("Error calculating rank:", e)

        # Get Batch Name
        batch_id = student.get('batch_id')
        batch_name = "Not Assigned"
        if batch_id:
            try:
                batch_doc = db.batches.find_one({"_id": ObjectId(batch_id)} if isinstance(batch_id, str) and len(batch_id) == 24 else {"_id": batch_id})
                if batch_doc:
                    batch_name = batch_doc.get('name', 'Not Assigned')
            except Exception:
                pass

        # Progress
        completed_lessons = 0
        total_lessons = 1
        try:
            progress_docs = list(db.lesson_progress.find({"student_id": ObjectId(student_id)}))
            completed_lessons = sum(1 for p in progress_docs if p.get('completed'))
            total_lessons = db.recorded_classes.count_documents({"batch_id": batch_id} if batch_id else {}) or 1
        except Exception:
            pass

        # Recent activities
        recent_activities = []
        try:
            # Submissions
            submissions = list(db.submissions.find({"student_id": ObjectId(student_id)}).sort("_id", -1).limit(5))
            for sub in submissions:
                assign = db.assignments.find_one({"_id": ObjectId(sub['assignment_id'])} if isinstance(sub['assignment_id'], str) else {"_id": sub['assignment_id']})
                title = assign.get('title', 'Assignment') if assign else 'Assignment'
                recent_activities.append({
                    "type": "Assignment Submission",
                    "title": f"Submitted assignment: {title}",
                    "date": sub.get('submitted_at', datetime.datetime.utcnow().strftime("%B %d, %Y"))
                })
            
            # Mock Interviews
            interviews = list(db.mock_interviews.find({"student_id": ObjectId(student_id)}).sort("_id", -1).limit(5))
            for iv in interviews:
                recent_activities.append({
                    "type": "Mock Interview",
                    "title": f"Completed mock interview with score: {iv.get('score')}%",
                    "date": iv.get('date', iv.get('scheduled_date', ''))
                })
            
            # Live Class Activities
            activities = list(db.live_class_activity.find({"student_id": ObjectId(student_id)}).sort("created_at", -1).limit(5))
            for act in activities:
                recent_activities.append({
                    "type": "Live Class Activity",
                    "title": f"Awarded {act.get('points')} pts for: {act.get('activity_type')}",
                    "date": act.get('date', '')
                })
            
            recent_activities = recent_activities[:5]
        except Exception as e:
            print("Error retrieving activities:", e)

        # Build response
        details = {
            "id": str(student['_id']),
            "name": student.get('name'),
            "email": student.get('email'),
            "phone": student.get('phone', ''),
            "rollNumber": student.get('rollNumber', ''),
            "college": student.get('college', ''),
            "course": student.get('course', ''),
            "join_date": student.get('join_date', ''),
            "feesStatus": student.get('feesStatus', 'Pending'),
            "profile_pic": student.get('profile_pic', ''),
            "current_location": student.get('current_location', ''),
            "permanent_address": student.get('permanent_address', ''),
            "company": student.get('company', ''),
            "batch_name": batch_name,
            "attendance": student.get('attendance', {}).get('percentage', 0),
            "rank": rank,
            "progress": {
                "completed": completed_lessons,
                "total": total_lessons,
                "percentage": round((completed_lessons / max(1, total_lessons)) * 100)
            },
            "recent_activities": recent_activities,
            "status": student.get('status', 'active')
        }
        return jsonify(details), 200
    except Exception as e:
        return jsonify({'message': 'Error retrieving student details', 'error': str(e)}), 400

@admin_bp.route('/students/<student_id>/reset-password', methods=['POST'])
@token_required(allowed_roles=['admin'])
def reset_student_password(student_id):
    import random
    import bcrypt
    try:
        student = db.users.find_one({"_id": ObjectId(student_id), "role": "student"})
        if not student:
            return jsonify({'message': 'Student not found'}), 404

        # Auto generate new temporary password
        temp_pass = f"Levlox@{random.randint(1000, 9999)}"
        hashed_password = bcrypt.hashpw(temp_pass.encode('utf-8'), bcrypt.gensalt())

        db.users.update_one(
            {"_id": ObjectId(student_id)},
            {"$set": {
                "password": hashed_password,
                "must_change_password": True
            }}
        )
        return jsonify({
            'message': 'Password reset successfully!',
            'temporary_password': temp_pass
        }), 200
    except Exception as e:
        return jsonify({'message': 'Error resetting password', 'error': str(e)}), 400

@admin_bp.route('/students/<student_id>', methods=['PUT'])
@token_required(allowed_roles=['admin'])
def update_student(student_id):
    data = request.get_json() or {}
    name = data.get('name')
    email = data.get('email')
    rollNumber = data.get('rollNumber')
    phone = data.get('phone')
    course = data.get('course')
    batch_id = data.get('batch_id')
    feesStatus = data.get('feesStatus')
    college = data.get('college')
    profile_pic = data.get('profile_pic')
    current_location = data.get('current_location')
    permanent_address = data.get('permanent_address')
    company = data.get('company')
    status = data.get('status')

    if not name or not email or not rollNumber or not phone:
        return jsonify({'message': 'Missing required fields: name, email, rollNumber, or phone'}), 400

    try:
        # Check uniqueness
        existing_email = db.users.find_one({"email": email.strip().lower(), "_id": {"$ne": ObjectId(student_id)}})
        if existing_email:
            return jsonify({'message': 'Email already registered to another account'}), 400
        
        existing_phone = db.users.find_one({"phone": phone.strip(), "_id": {"$ne": ObjectId(student_id)}})
        if existing_phone:
            return jsonify({'message': 'Mobile number already registered to another account'}), 400

        existing_roll = db.users.find_one({"rollNumber": rollNumber.strip(), "_id": {"$ne": ObjectId(student_id)}})
        if existing_roll:
            return jsonify({'message': 'Student ID / Roll Number already registered to another account'}), 400

        student = db.users.find_one({"_id": ObjectId(student_id)})
        if not student:
            return jsonify({'message': 'Student not found'}), 404

        # Sync Batches if changed
        old_batch_id = student.get('batch_id')
        if batch_id != old_batch_id:
            if old_batch_id:
                try:
                    db.batches.update_one(
                        {"_id": ObjectId(old_batch_id)} if isinstance(old_batch_id, str) and len(old_batch_id) == 24 else {"_id": old_batch_id},
                        {"$pull": {"student_ids": str(student_id)}}
                    )
                except Exception:
                    pass
            if batch_id:
                try:
                    db.batches.update_one(
                        {"_id": ObjectId(batch_id)},
                        {"$addToSet": {"student_ids": str(student_id)}}
                    )
                except Exception:
                    pass

        # Prepare update doc
        update_doc = {
            "name": name.strip(),
            "email": email.strip().lower(),
            "rollNumber": rollNumber.strip(),
            "phone": phone.strip(),
            "course": course or student.get('course', 'Fullstack Engineering'),
            "batch_id": batch_id or None,
            "college": college or student.get('college', 'Levlox Technical Institute'),
            "profile_pic": profile_pic if profile_pic is not None else student.get('profile_pic', ''),
            "current_location": current_location if current_location is not None else student.get('current_location', ''),
            "permanent_address": permanent_address if permanent_address is not None else student.get('permanent_address', ''),
            "company": company if company is not None else student.get('company', '')
        }

        if status:
            update_doc["status"] = status.strip().lower()

        if feesStatus:
            update_doc["feesStatus"] = feesStatus
            update_doc["feesPaid"] = feesStatus == 'Paid'
            update_doc["feesPaidAmount"] = 1500 if feesStatus == 'Paid' else 0
            update_doc["feesRemainingAmount"] = 0 if feesStatus == 'Paid' else 1500
            if feesStatus == 'Paid':
                update_doc["feesPaymentDate"] = datetime.datetime.utcnow().strftime("%Y-%m-%d")

        db.users.update_one(
            {"_id": ObjectId(student_id)},
            {"$set": update_doc}
        )
        return jsonify({'message': 'Student profile updated successfully!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error updating student', 'error': str(e)}), 400

@admin_bp.route('/students/<student_id>', methods=['DELETE'])
@token_required(allowed_roles=['admin'])
def delete_student(student_id):
    try:
        db.batches.update_many({}, {"$pull": {"student_ids": str(student_id)}})
        result = db.users.delete_one({"_id": ObjectId(student_id), "role": "student"})
        if result.deleted_count == 0:
            return jsonify({'message': 'Student not found'}), 404
        return jsonify({'message': 'Student deleted successfully'}), 200
    except Exception as e:
        return jsonify({'message': 'Error deleting student', 'error': str(e)}), 400

@admin_bp.route('/students/<student_id>/toggle-status', methods=['POST'])
@token_required(allowed_roles=['admin'])
def toggle_student_status(student_id):
    try:
        student = db.users.find_one({"_id": ObjectId(student_id), "role": "student"})
        if not student:
            return jsonify({'message': 'Student not found'}), 404
        
        current_status = student.get('status', 'active')
        new_status = 'inactive' if current_status == 'active' else 'active'
        
        db.users.update_one(
            {"_id": ObjectId(student_id)},
            {"$set": {"status": new_status}}
        )
        return jsonify({'message': f'Account status changed to {new_status}!', 'status': new_status}), 200
    except Exception as e:
        return jsonify({'message': 'Error toggling account status', 'error': str(e)}), 400

@admin_bp.route('/students/<student_id>/attendance-history', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_attendance_history(student_id):
    try:
        student = db.users.find_one({"_id": ObjectId(student_id), "role": "student"})
        if not student:
            return jsonify({'message': 'Student not found'}), 404
        
        history = student.get('attendance_history', [
            {"date": "2026-07-07", "status": "Present"},
            {"date": "2026-07-06", "status": "Present"},
            {"date": "2026-07-05", "status": "Present"},
            {"date": "2026-07-04", "status": "Absent"},
            {"date": "2026-07-03", "status": "Present"}
        ])
        return jsonify({"attendanceHistory": history}), 200
    except Exception as e:
        return jsonify({'message': 'Error fetching attendance logs', 'error': str(e)}), 400

@admin_bp.route('/students/<student_id>/toggle-fees', methods=['POST'])
@token_required(allowed_roles=['admin'])
def toggle_student_fees(student_id):
    try:
        student = db.users.find_one({"_id": ObjectId(student_id), "role": "student"})
        if not student:
            return jsonify({'message': 'Student not found'}), 404
        
        current_status = student.get('feesStatus', 'Pending')
        new_status = 'Paid' if current_status != 'Paid' else 'Pending'
        total = student.get('feesTotal', 1500)
        
        if new_status == 'Paid':
            db.users.update_one(
                {"_id": ObjectId(student_id)},
                {"$set": {
                    "feesPaid": True,
                    "feesPaidAmount": total,
                    "feesRemainingAmount": 0,
                    "feesStatus": "Paid",
                    "feesPaymentDate": datetime.date.today().isoformat()
                }}
            )
        else:
            db.users.update_one(
                {"_id": ObjectId(student_id)},
                {"$set": {
                    "feesPaid": False,
                    "feesPaidAmount": 0,
                    "feesRemainingAmount": total,
                    "feesStatus": "Pending",
                    "feesPaymentDate": ""
                }}
            )
        return jsonify({'message': 'Student fees status updated successfully!', 'feesStatus': new_status}), 200
    except Exception as e:
        return jsonify({'message': 'Error toggling fees status', 'error': str(e)}), 400

@admin_bp.route('/students/<student_id>/update-fees', methods=['POST'])
@token_required(allowed_roles=['admin'])
def update_student_fees(student_id):
    data = request.get_json() or {}
    try:
        total = int(data.get('feesTotal', 1500))
        paid = int(data.get('feesPaidAmount', 0))
        status = data.get('feesStatus', 'Pending')
        pay_date = data.get('feesPaymentDate', '')

        remaining = total - paid
        if remaining <= 0:
            remaining = 0
            status = 'Paid'

        db.users.update_one(
            {"_id": ObjectId(student_id), "role": "student"},
            {"$set": {
                "feesTotal": total,
                "feesPaidAmount": paid,
                "feesRemainingAmount": remaining,
                "feesStatus": status,
                "feesPaymentDate": pay_date if status == 'Paid' else ""
            }}
        )

        if status == 'Pending':
            create_notification(
                'fees_reminder',
                'Fees Reminder: Outstanding Balance',
                f"You have a remaining balance of ${remaining} pending. Please complete your fees to access premium features.",
                student_id=student_id
            )

        return jsonify({'message': 'Payment details updated successfully!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error updating payment details', 'error': str(e)}), 400

# Live Classes CRUD
@admin_bp.route('/live-classes', methods=['POST'])
@token_required(allowed_roles=['admin'])
def create_live_class():
    data = request.get_json() or {}
    title = data.get('title')
    instructor = data.get('instructor')
    meet_link = data.get('meet_link')
    date = data.get('date')
    time = data.get('time')
    description = data.get('description', '')
    status = data.get('status', 'Upcoming') # Upcoming / Live / Completed
    is_today = data.get('is_today', False)
    is_published = data.get('is_published', True)
    batch_id = data.get('batch_id')

    if not title or not instructor or not meet_link or not date or not time:
        return jsonify({'message': 'Missing required fields'}), 400

    doc = {
        "title": title.strip(),
        "instructor": instructor.strip(),
        "meet_link": meet_link.strip(),
        "date": date.strip(),
        "time": time.strip(),
        "description": description.strip(),
        "status": status.strip(),
        "is_today": bool(is_today),
        "is_published": bool(is_published),
        "batch_id": batch_id
    }

    result = db.live_classes.insert_one(doc)
    doc['_id'] = str(result.inserted_id)

    # Trigger global notification
    create_notification('live_class', f"New Live Class: {title}", f"Scheduled by instructor for {date} at {time}.")

    return jsonify(doc), 201

@admin_bp.route('/live-classes/<class_id>', methods=['PUT'])
@token_required(allowed_roles=['admin'])
def update_live_class(class_id):
    data = request.get_json() or {}
    title = data.get('title')
    instructor = data.get('instructor')
    meet_link = data.get('meet_link')
    date = data.get('date')
    time = data.get('time')
    description = data.get('description', '')
    status = data.get('status', 'Upcoming')
    is_today = data.get('is_today', False)
    is_published = data.get('is_published', True)
    batch_id = data.get('batch_id')

    if not title or not instructor or not meet_link or not date or not time:
        return jsonify({'message': 'Missing required fields'}), 400

    try:
        db.live_classes.update_one(
            {"_id": ObjectId(class_id)},
            {"$set": {
                "title": title.strip(),
                "instructor": instructor.strip(),
                "meet_link": meet_link.strip(),
                "date": date.strip(),
                "time": time.strip(),
                "description": description.strip(),
                "status": status.strip(),
                "is_today": bool(is_today),
                "is_published": bool(is_published),
                "batch_id": batch_id
            }}
        )
        return jsonify({'message': 'Live class updated successfully!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error updating live class', 'error': str(e)}), 400

@admin_bp.route('/live-classes/<class_id>', methods=['DELETE'])
@token_required(allowed_roles=['admin'])
def delete_live_class(class_id):
    try:
        result = db.live_classes.delete_one({"_id": ObjectId(class_id)})
        if result.deleted_count == 0:
            return jsonify({'message': 'Live class not found'}), 404
        return jsonify({'message': 'Live class deleted successfully'}), 200
    except Exception as e:
        return jsonify({'message': 'Error deleting live class', 'error': str(e)}), 400

# Recorded Classes CRUD
@admin_bp.route('/recorded-classes', methods=['GET'])
@token_required(allowed_roles=['admin'])
def list_recorded_classes():
    try:
        classes = list(db.recorded_classes.find().sort("sort_order", 1))
        for c in classes:
            c['_id'] = str(c['_id'])
            if 'created_by' in c and c['created_by']:
                c['created_by'] = str(c['created_by'])
            if 'batch_id' in c and c['batch_id']:
                c['batch_id'] = str(c['batch_id'])
        return jsonify({"recorded_classes": classes}), 200
    except Exception as e:
        return jsonify({'message': 'Error fetching classes', 'error': str(e)}), 400

@admin_bp.route('/upload', methods=['POST'])
@token_required(allowed_roles=['admin'])
def upload_file_api():
    import os
    import time
    import werkzeug.utils
    from flask import current_app
    try:
        if 'file' not in request.files:
            return jsonify({'message': 'No file part in the request'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'message': 'No selected file'}), 400
        if file:
            filename = werkzeug.utils.secure_filename(file.filename)
            name, ext = os.path.splitext(filename)
            filename = f"{name}_{int(time.time())}{ext}"
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            file_url = f"http://localhost:5000/uploads/{filename}"
            return jsonify({'url': file_url, 'filename': filename}), 200
    except Exception as e:
        return jsonify({'message': 'Upload failed', 'error': str(e)}), 500

@admin_bp.route('/recorded-classes', methods=['POST'])
@token_required(allowed_roles=['admin'])
def create_recorded_class():
    data = request.get_json() or {}
    title = data.get('title')
    module = data.get('module', 'Module 1 - Python Basics')
    video_url = data.get('video_url', '')
    thumbnail = data.get('thumbnail', '')
    description = data.get('description', '')
    notes_url = data.get('notes_url', '')
    assignment = data.get('assignment', '')
    visibility = data.get('visibility', 'everyone')
    course_title = data.get('course_title', 'Fullstack Engineering')
    batch_id = data.get('batch_id')
    sort_order = data.get('sort_order', 999)
    duration = data.get('duration', '1h 15m')
    video_source_type = data.get('video_source_type', 'link')
    study_materials = data.get('study_materials', [])

    if not title:
        return jsonify({'message': 'Missing title'}), 400

    doc = {
        "title": title.strip(),
        "module": module.strip(),
        "video_url": video_url.strip(),
        "thumbnail": thumbnail.strip(),
        "description": description.strip(),
        "notes_url": notes_url.strip(),
        "assignment": assignment.strip() if isinstance(assignment, str) else assignment,
        "visibility": visibility.strip(),
        "course_title": course_title.strip(),
        "sort_order": int(sort_order),
        "created_by": ObjectId(g.current_user['id'] if 'id' in g.current_user else g.current_user['_id']),
        "created_at": datetime.datetime.utcnow().strftime("%B %d, %Y"),
        "batch_id": batch_id,
        "duration": duration.strip(),
        "video_source_type": video_source_type.strip(),
        "study_materials": study_materials
    }

    result = db.recorded_classes.insert_one(doc)
    doc['_id'] = str(result.inserted_id)
    doc['created_by'] = str(doc['created_by'])

    # Trigger global notification
    create_notification('recorded_class', f"New Lesson: {title}", f"Uploaded in {module}. Access: {visibility}.")

    return jsonify(doc), 201

@admin_bp.route('/recorded-classes/<class_id>', methods=['PUT'])
@token_required(allowed_roles=['admin'])
def update_recorded_class(class_id):
    data = request.get_json() or {}
    title = data.get('title')
    module = data.get('module')
    video_url = data.get('video_url')
    notes_url = data.get('notes_url')
    assignment = data.get('assignment')
    visibility = data.get('visibility')
    course_title = data.get('course_title')
    batch_id = data.get('batch_id')
    thumbnail = data.get('thumbnail')
    description = data.get('description')
    sort_order = data.get('sort_order')
    duration = data.get('duration')
    video_source_type = data.get('video_source_type')
    study_materials = data.get('study_materials')

    try:
        update_fields = {}
        if title is not None: update_fields["title"] = title.strip()
        if module is not None: update_fields["module"] = module.strip()
        if video_url is not None: update_fields["video_url"] = video_url.strip()
        if notes_url is not None: update_fields["notes_url"] = notes_url.strip()
        if assignment is not None: update_fields["assignment"] = assignment.strip()
        if visibility is not None: update_fields["visibility"] = visibility.strip()
        if course_title is not None: update_fields["course_title"] = course_title.strip()
        if batch_id is not None: update_fields["batch_id"] = batch_id
        if thumbnail is not None: update_fields["thumbnail"] = thumbnail.strip()
        if description is not None: update_fields["description"] = description.strip()
        if sort_order is not None: update_fields["sort_order"] = int(sort_order)
        if duration is not None: update_fields["duration"] = duration.strip()
        if video_source_type is not None: update_fields["video_source_type"] = video_source_type.strip()
        if study_materials is not None: update_fields["study_materials"] = study_materials

        # Quiz is intentionally unset / removed by not saving it.
        # We explicitly perform an unset to clear it from the record if it exists
        db.recorded_classes.update_one(
            {"_id": ObjectId(class_id)},
            {"$set": update_fields, "$unset": {"quiz": ""}}
        )
        return jsonify({'message': 'Recorded class updated successfully!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error updating recorded class', 'error': str(e)}), 400

@admin_bp.route('/recorded-classes/<class_id>', methods=['DELETE'])
@token_required(allowed_roles=['admin'])
def delete_recorded_class(class_id):
    try:
        result = db.recorded_classes.delete_one({"_id": ObjectId(class_id)})
        if result.deleted_count == 0:
            return jsonify({'message': 'Recorded class not found'}), 404
        return jsonify({'message': 'Recorded class deleted successfully'}), 200
    except Exception as e:
        return jsonify({'message': 'Error deleting recorded class', 'error': str(e)}), 400

# Announcements CRUD
@admin_bp.route('/announcements', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_announcements():
    try:
        ann = list(db.announcements.find({}))
        for a in ann:
            a['id'] = str(a['_id'])
            a.pop('_id', None)
            if 'batch_id' in a and a['batch_id']:
                a['batch_id'] = str(a['batch_id'])
            if 'uploaded_at' in a and isinstance(a['uploaded_at'], datetime.datetime):
                a['uploaded_at'] = a['uploaded_at'].isoformat()
        return jsonify({"announcements": ann}), 200
    except Exception as e:
        return jsonify({'message': 'Error retrieving announcements', 'error': str(e)}), 400

@admin_bp.route('/announcements', methods=['POST'])
@token_required(allowed_roles=['admin'])
def create_announcement():
    data = request.get_json() or {}
    title = data.get('title')
    content = data.get('content')
    priority = data.get('priority', 'Medium')
    is_pinned = data.get('is_pinned', False)
    batch_id = data.get('batch_id')

    if not title or not content:
        return jsonify({'message': 'Missing title or content'}), 400

    doc = {
        "title": title.strip(),
        "content": content.strip(),
        "priority": priority.strip(),
        "is_pinned": bool(is_pinned),
        "date": datetime.datetime.utcnow().strftime("%B %d, %Y"),
        "uploaded_at": datetime.datetime.utcnow(),
        "batch_id": batch_id
    }

    result = db.announcements.insert_one(doc)
    doc['_id'] = str(result.inserted_id)
    doc['uploaded_at'] = doc['uploaded_at'].isoformat()

    # Trigger global notification
    create_notification('announcement', f"Notice: {title}", f"Priority: {priority}. Content: {content}")

    return jsonify(doc), 201

@admin_bp.route('/announcements/<ann_id>', methods=['PUT'])
@token_required(allowed_roles=['admin'])
def update_announcement(ann_id):
    data = request.get_json() or {}
    title = data.get('title')
    content = data.get('content')
    priority = data.get('priority', 'Medium')
    is_pinned = data.get('is_pinned', False)

    if not title or not content:
        return jsonify({'message': 'Missing title or content'}), 400

    try:
        db.announcements.update_one(
            {"_id": ObjectId(ann_id)},
            {"$set": {
                "title": title.strip(),
                "content": content.strip(),
                "priority": priority.strip(),
                "is_pinned": bool(is_pinned)
            }}
        )
        return jsonify({'message': 'Announcement updated successfully!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error updating announcement', 'error': str(e)}), 400

@admin_bp.route('/announcements/<ann_id>', methods=['DELETE'])
@token_required(allowed_roles=['admin'])
def delete_announcement(ann_id):
    try:
        result = db.announcements.delete_one({"_id": ObjectId(ann_id)})
        if result.deleted_count == 0:
            return jsonify({'message': 'Announcement not found'}), 404
        return jsonify({'message': 'Announcement deleted successfully'}), 200
    except Exception as e:
        return jsonify({'message': 'Error deleting announcement', 'error': str(e)}), 400

# Attendance Sheet Handlers
# Attendance Sheet Handlers
@admin_bp.route('/attendance/class/<class_id>', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_class_attendance(class_id):
    try:
        sheet = db.attendance_sheets.find_one({"live_class_id": ObjectId(class_id)})
        if sheet:
            sheet['_id'] = str(sheet['_id'])
            sheet['live_class_id'] = str(sheet['live_class_id'])
            for r in sheet.get('records', []):
                r['student_id'] = str(r['student_id'])
            return jsonify(sheet), 200
        
        students = list(db.users.find({"role": "student"}))
        records = []
        for s in students:
            records.append({
                "student_id": str(s['_id']),
                "student_name": s.get('name'),
                "rollNumber": s.get('rollNumber'),
                "status": "Present"
            })
        
        return jsonify({
            "live_class_id": class_id,
            "date": datetime.date.today().isoformat(),
            "records": records
        }), 200
    except Exception as e:
        return jsonify({'message': 'Error loading attendance details', 'error': str(e)}), 400

@admin_bp.route('/attendance/sheet', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_batch_attendance():
    batch_id = request.args.get('batch_id')
    date = request.args.get('date', datetime.date.today().isoformat())
    if not batch_id:
        return jsonify({'message': 'Missing batch_id'}), 400
    try:
        sheet = db.attendance_sheets.find_one({"batch_id": batch_id, "date": date})
        if sheet:
            sheet['_id'] = str(sheet['_id'])
            for r in sheet.get('records', []):
                r['student_id'] = str(r['student_id'])
            return jsonify(sheet), 200
        
        batch = db.batches.find_one({"_id": ObjectId(batch_id)})
        if not batch:
            return jsonify({'message': 'Batch not found'}), 404
        
        student_ids = [ObjectId(sid) for sid in batch.get('student_ids', [])]
        students = list(db.users.find({"_id": {"$in": student_ids}}))
        records = []
        for s in students:
            records.append({
                "student_id": str(s['_id']),
                "student_name": s.get('name'),
                "rollNumber": s.get('rollNumber'),
                "phone": s.get('phone', ''),
                "course": s.get('course', ''),
                "batch_name": batch.get('name', ''),
                "status": "Present"
            })
        
        return jsonify({
            "batch_id": batch_id,
            "date": date,
            "records": records
        }), 200
    except Exception as e:
        return jsonify({'message': 'Error loading attendance details', 'error': str(e)}), 400

@admin_bp.route('/attendance/history', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_attendance_sheets_history():
    try:
        sheets = list(db.attendance_sheets.find({}))
        for s in sheets:
            s['id'] = str(s['_id'])
            s.pop('_id', None)
            if 'live_class_id' in s and s['live_class_id']:
                s['live_class_id'] = str(s['live_class_id'])
            if 'batch_id' in s and s['batch_id']:
                s['batch_id'] = str(s['batch_id'])
            if 'saved_at' in s and isinstance(s['saved_at'], datetime.datetime):
                s['saved_at'] = s['saved_at'].isoformat()
            if 'records' in s:
                for r in s['records']:
                    if 'student_id' in r and r['student_id']:
                        r['student_id'] = str(r['student_id'])
        return jsonify(sheets), 200
    except Exception as e:
        return jsonify({'message': 'Error loading attendance history', 'error': str(e)}), 400

@admin_bp.route('/attendance/save', methods=['POST'])
@token_required(allowed_roles=['admin'])
def save_class_attendance():
    data = request.get_json() or {}
    class_id = data.get('live_class_id')
    batch_id = data.get('batch_id')
    date = data.get('date', datetime.date.today().isoformat())
    records = data.get('records', [])

    if not records:
        return jsonify({'message': 'Missing records'}), 400

    try:
        if batch_id:
            batch = db.batches.find_one({"_id": ObjectId(batch_id)})
            if not batch:
                return jsonify({'message': 'Batch not found'}), 404
            
            batch_name = batch.get('name', 'Batch')
            course_name = batch.get('course_name', 'Course')

            sheet_records = []
            present_count = 0
            absent_count = 0
            for r in records:
                status = r.get('status', 'Present')
                if status == 'Present':
                    present_count += 1
                else:
                    absent_count += 1
                sheet_records.append({
                    "student_id": ObjectId(r['student_id']),
                    "student_name": r.get('student_name'),
                    "rollNumber": r.get('rollNumber'),
                    "phone": r.get('phone', ''),
                    "course": r.get('course', course_name),
                    "batch_name": r.get('batch_name', batch_name),
                    "status": status
                })

            total = len(records)
            pct = round((present_count / total) * 100) if total > 0 else 100

            db.attendance_sheets.update_one(
                {"batch_id": batch_id, "date": date},
                {
                    "$set": {
                        "batch_id": batch_id,
                        "batch_name": batch_name,
                        "course_name": course_name,
                        "date": date,
                        "records": sheet_records,
                        "present_count": present_count,
                        "absent_count": absent_count,
                        "attendance_percentage": pct,
                        "saved_at": datetime.datetime.utcnow()
                    }
                },
                upsert=True
            )

            for r in records:
                student_id = r['student_id']
                status = r.get('status', 'Present')

                student = db.users.find_one({"_id": ObjectId(student_id)})
                if not student:
                    continue

                history = student.get('attendance_history', [])
                found = False
                for h in history:
                    if h.get('batch_id') == batch_id and h.get('date') == date:
                        h['status'] = status
                        h['batch_name'] = batch_name
                        found = True
                        break
                
                if not found:
                    history.append({
                        "batch_id": batch_id,
                        "batch_name": batch_name,
                        "date": date,
                        "status": status
                    })

                s_present = sum(1 for h in history if h.get('status') == 'Present')
                s_absent = sum(1 for h in history if h.get('status') == 'Absent')
                s_total = len(history)

                s_percentage = 100
                if s_total > 0:
                    s_percentage = round((s_present / s_total) * 100)

                db.users.update_one(
                    {"_id": ObjectId(student_id)},
                    {"$set": {
                        "attendance_history": history,
                        "attendance": {
                            "percentage": s_percentage,
                            "present": s_present,
                            "absent": s_absent
                        }
                    }}
                )

        else:
            # Fallback for old live class attendance flow
            live_class = db.live_classes.find_one({"_id": ObjectId(class_id)})
            class_title = live_class.get('title', 'Live Session') if live_class else 'Live Session'

            sheet_records = []
            for r in records:
                sheet_records.append({
                    "student_id": ObjectId(r['student_id']),
                    "student_name": r.get('student_name'),
                    "rollNumber": r.get('rollNumber'),
                    "status": r.get('status', 'Present')
                })

            db.attendance_sheets.update_one(
                {"live_class_id": ObjectId(class_id)},
                {
                    "$set": {
                        "live_class_id": ObjectId(class_id),
                        "class_title": class_title,
                        "date": date,
                        "records": sheet_records,
                        "saved_at": datetime.datetime.utcnow()
                    }
                },
                upsert=True
            )

            for r in records:
                student_id = r['student_id']
                status = r.get('status', 'Present')

                student = db.users.find_one({"_id": ObjectId(student_id)})
                if not student:
                    continue

                history = student.get('attendance_history', [])
                found = False
                for h in history:
                    if h.get('class_id') == class_id:
                        h['status'] = status
                        h['date'] = date
                        h['class_title'] = class_title
                        found = True
                        break
                
                if not found:
                    history.append({
                        "class_id": class_id,
                        "class_title": class_title,
                        "date": date,
                        "status": status
                    })

                present_count = sum(1 for h in history if h.get('status') == 'Present')
                absent_count = sum(1 for h in history if h.get('status') == 'Absent')
                total_logged = len(history)

                percentage = 100
                if total_logged > 0:
                    percentage = round((present_count / total_logged) * 100)

                db.users.update_one(
                    {"_id": ObjectId(student_id)},
                    {"$set": {
                        "attendance_history": history,
                        "attendance": {
                            "percentage": percentage,
                            "present": present_count,
                            "absent": absent_count
                        }
                    }}
                )

        return jsonify({'message': 'Attendance saved successfully!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error saving attendance', 'error': str(e)}), 400

@admin_bp.route('/course-titles', methods=['GET'])
@token_required()
def list_course_titles():
    try:
        # Fetch from course_titles
        titles = [doc['title'] for doc in db.course_titles.find({}, {"title": 1, "_id": 0})]
        
        # Also, check existing batches just in case some batches were created before this update
        batch_titles = db.batches.distinct("course_name")
        
        # Merge them and remove duplicates
        all_titles = sorted(list(set(titles + batch_titles)))
        
        # Seed the course_titles collection with the batch titles so it's fully populated
        for title in all_titles:
            db.course_titles.update_one(
                {"title": title},
                {"$setOnInsert": {"title": title, "created_at": datetime.datetime.utcnow()}},
                upsert=True
            )
            
        return jsonify({"courses": all_titles}), 200
    except Exception as e:
        return jsonify({'message': 'Error retrieving course titles', 'error': str(e)}), 400

# ══════════════════════════════════════════════════════
# BATCH MANAGEMENT CRUD & ASSIGNMENT
# ══════════════════════════════════════════════════════
@admin_bp.route('/batches', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_batches():
    try:
        batches = list(db.batches.find({}))
        for b in batches:
            b['id'] = str(b['_id'])
            b.pop('_id', None)
            # Fetch count of students in this batch
            b['students_count'] = len(b.get('student_ids', []))
        return jsonify(batches), 200
    except Exception as e:
        return jsonify({'message': 'Error retrieving batches', 'error': str(e)}), 400

@admin_bp.route('/batches', methods=['POST'])
@token_required(allowed_roles=['admin'])
def create_batch():
    import random
    data = request.get_json() or {}
    name = data.get('name')
    course_name = data.get('course_name')
    trainer_name = data.get('trainer_name')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    status = data.get('status', 'Active') # Active / Completed
    max_students = int(data.get('max_students', 30))

    if not name or not course_name or not trainer_name or not start_date or not end_date:
        return jsonify({'message': 'Missing required fields for batch'}), 400

    # Auto generate batch code e.g. BAT-3942
    batch_code = f"BAT-{random.randint(1000, 9999)}"

    doc = {
        "name": name.strip(),
        "course_name": course_name.strip(),
        "trainer_name": trainer_name.strip(),
        "code": batch_code,
        "start_date": start_date,
        "end_date": end_date,
        "status": status,
        "max_students": max_students,
        "student_ids": [],
        "created_at": datetime.datetime.utcnow()
    }

    result = db.batches.insert_one(doc)
    doc['id'] = str(result.inserted_id)
    doc.pop('_id', None)
    doc['created_at'] = doc['created_at'].isoformat()

    # Automatically save course title if it doesn't exist
    course_title_norm = course_name.strip()
    if course_title_norm:
        db.course_titles.update_one(
            {"title": course_title_norm},
            {"$setOnInsert": {"title": course_title_norm, "created_at": datetime.datetime.utcnow()}},
            upsert=True
        )

    return jsonify(doc), 201

@admin_bp.route('/batches/<batch_id>', methods=['PUT'])
@token_required(allowed_roles=['admin'])
def update_batch(batch_id):
    data = request.get_json() or {}
    name = data.get('name')
    course_name = data.get('course_name')
    trainer_name = data.get('trainer_name')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    status = data.get('status')
    max_students = data.get('max_students')

    update_fields = {}
    if name: update_fields["name"] = name.strip()
    if course_name: update_fields["course_name"] = course_name.strip()
    if trainer_name: update_fields["trainer_name"] = trainer_name.strip()
    if start_date: update_fields["start_date"] = start_date
    if end_date: update_fields["end_date"] = end_date
    if status: update_fields["status"] = status
    if max_students is not None: update_fields["max_students"] = int(max_students)

    try:
        db.batches.update_one({"_id": ObjectId(batch_id)}, {"$set": update_fields})

        # Automatically save course title if updating and it doesn't exist
        if course_name:
            course_title_norm = course_name.strip()
            if course_title_norm:
                db.course_titles.update_one(
                    {"title": course_title_norm},
                    {"$setOnInsert": {"title": course_title_norm, "created_at": datetime.datetime.utcnow()}},
                    upsert=True
                )

        return jsonify({'message': 'Batch details updated successfully!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error updating batch', 'error': str(e)}), 400

@admin_bp.route('/batches/<batch_id>', methods=['DELETE'])
@token_required(allowed_roles=['admin'])
def delete_batch(batch_id):
    try:
        # Clear batch association from students assigned to it
        db.users.update_many({"batch_id": batch_id}, {"$unset": {"batch_id": 1}})
        db.batches.delete_one({"_id": ObjectId(batch_id)})
        return jsonify({'message': 'Batch deleted successfully'}), 200
    except Exception as e:
        return jsonify({'message': 'Error deleting batch', 'error': str(e)}), 400

@admin_bp.route('/batches/<batch_id>/assign-students', methods=['POST'])
@token_required(allowed_roles=['admin'])
def assign_students(batch_id):
    data = request.get_json() or {}
    student_ids = data.get('student_ids', []) # List of student user IDs (strings)

    try:
        batch = db.batches.find_one({"_id": ObjectId(batch_id)})
        if not batch:
            return jsonify({'message': 'Batch not found'}), 404

        course_name = batch.get('course_name', 'Fullstack Engineering')

        # Convert student ids to strings for consistent storage
        str_student_ids = [str(sid) for sid in student_ids]

        # Update batch document
        db.batches.update_one(
            {"_id": ObjectId(batch_id)},
            {"$set": {"student_ids": str_student_ids}}
        )

        # Clear batch association from students previously in this batch but now removed
        db.users.update_many(
            {"batch_id": batch_id, "_id": {"$nin": [ObjectId(sid) for sid in str_student_ids]}},
            {"$unset": {"batch_id": 1}}
        )

        # Update newly assigned students
        if str_student_ids:
            db.users.update_many(
                {"_id": {"$in": [ObjectId(sid) for sid in str_student_ids]}},
                {"$set": {
                    "batch_id": batch_id,
                    "course": course_name
                }}
            )

        return jsonify({'message': 'Students assigned to batch successfully!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error assigning students', 'error': str(e)}), 400


@admin_bp.route('/students-by-batch/<batch_id>', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_students_by_batch(batch_id):
    try:
        batch = db.batches.find_one({"_id": ObjectId(batch_id)})
        if not batch:
            return jsonify({'message': 'Batch not found'}), 404
        
        student_ids = [ObjectId(sid) for sid in batch.get('student_ids', [])]
        students = list(db.users.find({"_id": {"$in": student_ids}}))
        for s in students:
            s['id'] = str(s['_id'])
            s.pop('_id', None)
            s.pop('password', None)
        return jsonify(students), 200
    except Exception as e:
        return jsonify({'message': 'Error retrieving students', 'error': str(e)}), 400


@admin_bp.route('/live-class-activity', methods=['POST'])
@token_required(allowed_roles=['admin'])
def award_live_class_activity():
    data = request.get_json() or {}
    student_id = data.get('student_id')
    batch_id = data.get('batch_id')
    date = data.get('date')
    meeting = data.get('meeting')
    activity_type = data.get('activity_type')
    points = data.get('points', 0)
    remarks = data.get('remarks', '')

    if not student_id or not batch_id or not date or not meeting or not activity_type:
        return jsonify({'message': 'Missing required fields'}), 400

    try:
        points = int(points)
    except:
        return jsonify({'message': 'Points must be an integer'}), 400

    try:
        doc = {
            "student_id": ObjectId(student_id),
            "batch_id": batch_id,
            "date": date,
            "meeting": meeting,
            "activity_type": activity_type,
            "points": points,
            "remarks": remarks,
            "created_at": datetime.datetime.utcnow()
        }
        db.live_class_activity.insert_one(doc)

        # Update cached student overall activity points
        db.users.update_one(
            {"_id": ObjectId(student_id)},
            {"$inc": {"activity_points": points}}
        )

        return jsonify({'message': 'Activity score awarded successfully!'}), 201
    except Exception as e:
        return jsonify({'message': 'Error saving activity log', 'error': str(e)}), 400


@admin_bp.route('/live-class-activity', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_live_class_activity_logs():
    try:
        logs = list(db.live_class_activity.find().sort('created_at', -1).limit(100))
        for l in logs:
            l['_id'] = str(l['_id'])
            l['student_id'] = str(l['student_id'])
            # fetch student name
            student = db.users.find_one({"_id": ObjectId(l['student_id'])})
            l['student_name'] = student.get('name', 'Student') if student else 'Unknown'
            # fetch batch name
            batch = db.batches.find_one({"_id": ObjectId(l['batch_id'])} if len(l['batch_id']) == 24 else {"code": l['batch_id']})
            l['batch_name'] = batch.get('name', 'Batch') if batch else 'Unknown'
            
        return jsonify(logs), 200
    except Exception as e:
        return jsonify({'message': 'Error retrieving activity logs', 'error': str(e)}), 400


