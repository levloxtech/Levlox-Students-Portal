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
    # Gather database stats
    total_students = db.users.count_documents({"role": "student"})
    paid_students = db.users.count_documents({"role": "student", "feesStatus": "Paid"})
    pending_students = db.users.count_documents({"role": "student", "feesStatus": {"$ne": "Paid"}})
    total_live_classes = db.live_classes.count_documents({})
    total_recorded_classes = db.recorded_classes.count_documents({})
    total_notes = db.study_materials.count_documents({})

    # Average attendance percentage
    students = list(db.users.find({"role": "student"}))
    avg_attendance = 0
    if students:
        total_attendance = sum(s.get('attendance', {}).get('percentage', 0) for s in students)
        avg_attendance = round(total_attendance / len(students), 1)

    stats = {
        "totalStudents": total_students,
        "paidStudents": paid_students,
        "pendingStudents": pending_students,
        "totalLiveClasses": total_live_classes,
        "totalRecordedClasses": total_recorded_classes,
        "totalNotes": total_notes,
        "attendancePercentage": avg_attendance
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

    query = {"role": "student"}

    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"rollNumber": {"$regex": search, "$options": "i"}}
        ]

    if status in ['active', 'inactive']:
        query["status"] = status

    if fees_paid == 'paid':
        query["feesStatus"] = "Paid"
    elif fees_paid == 'unpaid':
        query["feesStatus"] = {"$ne": "Paid"}

    total_count = db.users.count_documents(query)
    skip = (page - 1) * limit
    
    students = list(db.users.find(query).skip(skip).limit(limit))
    
    for s in students:
        s['id'] = str(s['_id'])
        s.pop('_id', None)
        s.pop('password', None)
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

    import math
    total_pages = math.ceil(total_count / limit)

    return jsonify({
        "students": students,
        "total": total_count,
        "page": page,
        "pages": total_pages,
        "limit": limit
    }), 200

@admin_bp.route('/students/<student_id>', methods=['PUT'])
@token_required(allowed_roles=['admin'])
def update_student(student_id):
    data = request.get_json() or {}
    name = data.get('name')
    email = data.get('email')
    rollNumber = data.get('rollNumber')

    if not name or not email or not rollNumber:
        return jsonify({'message': 'Missing name, email, or rollNumber'}), 400

    try:
        # Check if email is already taken by another user
        existing = db.users.find_one({"email": email.strip().lower(), "_id": {"$ne": ObjectId(student_id)}})
        if existing:
            return jsonify({'message': 'Email already in use by another account'}), 400

        db.users.update_one(
            {"_id": ObjectId(student_id)},
            {"$set": {
                "name": name.strip(),
                "email": email.strip().lower(),
                "rollNumber": rollNumber.strip()
            }}
        )
        return jsonify({'message': 'Student profile updated successfully!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error updating student', 'error': str(e)}), 400

@admin_bp.route('/students/<student_id>', methods=['DELETE'])
@token_required(allowed_roles=['admin'])
def delete_student(student_id):
    try:
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
@admin_bp.route('/recorded-classes', methods=['POST'])
@token_required(allowed_roles=['admin'])
def create_recorded_class():
    data = request.get_json() or {}
    title = data.get('title')
    description = data.get('description', '')
    thumbnail_url = data.get('thumbnail_url', '')
    youtube_link = data.get('youtube_link', '')
    drive_link = data.get('drive_link', '')
    course_id = data.get('course_id', '')
    course_title = data.get('course_title', '')
    duration = data.get('duration', '1h 30m')
    batch_id = data.get('batch_id')

    if not title:
        return jsonify({'message': 'Missing title'}), 400

    doc = {
        "title": title.strip(),
        "description": description.strip(),
        "thumbnail_url": thumbnail_url.strip(),
        "youtube_link": youtube_link.strip(),
        "drive_link": drive_link.strip(),
        "course_id": course_id,
        "course_title": course_title.strip(),
        "duration": duration.strip(),
        "uploaded_at": datetime.datetime.utcnow().strftime("%B %d, %Y"),
        "batch_id": batch_id
    }

    result = db.recorded_classes.insert_one(doc)
    doc['_id'] = str(result.inserted_id)

    # Trigger global notification
    create_notification('recorded_class', f"New Lecture Replay: {title}", f"Watch the recorded class. Course category: {course_title}.")

    return jsonify(doc), 201

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

# Notes (Study Materials) CRUD
@admin_bp.route('/notes', methods=['POST'])
@token_required(allowed_roles=['admin'])
def create_note():
    data = request.get_json() or {}
    title = data.get('title')
    description = data.get('description', '')
    subject = data.get('subject', 'General')
    file_type = data.get('type')
    url = data.get('url')
    batch_id = data.get('batch_id')

    if not title or not file_type or not url:
        return jsonify({'message': 'Missing required fields'}), 400

    doc = {
        "title": title.strip(),
        "description": description.strip(),
        "subject": subject.strip(),
        "type": file_type.strip(),
        "url": url.strip(),
        "uploaded_at": datetime.datetime.utcnow().strftime("%B %d, %Y"),
        "batch_id": batch_id
    }

    result = db.study_materials.insert_one(doc)
    doc['_id'] = str(result.inserted_id)

    # Trigger global notification
    create_notification('note', f"New Study Material: {title}", f"Format: {file_type}. Subject: {subject}.")

    return jsonify(doc), 201

@admin_bp.route('/notes/<note_id>', methods=['DELETE'])
@token_required(allowed_roles=['admin'])
def delete_note(note_id):
    try:
        result = db.study_materials.delete_one({"_id": ObjectId(note_id)})
        if result.deleted_count == 0:
            return jsonify({'message': 'Note not found'}), 404
        return jsonify({'message': 'Note deleted successfully'}), 200
    except Exception as e:
        return jsonify({'message': 'Error deleting note', 'error': str(e)}), 400

# Announcements CRUD
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

@admin_bp.route('/attendance/save', methods=['POST'])
@token_required(allowed_roles=['admin'])
def save_class_attendance():
    data = request.get_json() or {}
    class_id = data.get('live_class_id')
    date = data.get('date', datetime.date.today().isoformat())
    records = data.get('records', [])

    if not class_id or not records:
        return jsonify({'message': 'Missing live_class_id or records'}), 400

    try:
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

        return jsonify({'message': 'Attendance saved and logs recalculated successfully!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error saving attendance sheet', 'error': str(e)}), 400

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

