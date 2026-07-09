import datetime
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from db import db
from auth_middleware import token_required

courses_bp = Blueprint('courses', __name__)

@courses_bp.route('', methods=['POST'])
@token_required(allowed_roles=['admin'])
def create_course():
    data = request.get_json() or {}
    title = data.get('title')
    description = data.get('description')
    instructor = data.get('instructor')

    if not title or not description or not instructor:
        return jsonify({'message': 'Missing title, description or instructor'}), 400

    course_doc = {
        "title": title.strip(),
        "description": description.strip(),
        "instructor": instructor.strip(),
        "created_by": ObjectId(g.current_user['id'] if 'id' in g.current_user else g.current_user['_id']),
        "created_at": datetime.datetime.utcnow(),
        "students": []  # List of enrolled student user_ids
    }

    result = db.courses.insert_one(course_doc)
    course_doc['_id'] = str(result.inserted_id)
    course_doc['created_by'] = str(course_doc['created_by'])

    return jsonify({'message': 'Course created successfully!', 'course': course_doc}), 201

@courses_bp.route('', methods=['GET'])
@token_required()
def list_courses():
    courses = list(db.courses.find())
    for course in courses:
        course['_id'] = str(course['_id'])
        course['created_by'] = str(course['created_by'])
        course['students'] = [str(sid) for sid in course.get('students', [])]
    return jsonify({'courses': courses}), 200

@courses_bp.route('/<course_id>/enroll', methods=['POST'])
@token_required(allowed_roles=['student'])
def enroll_course(course_id):
    student_id = g.current_user['_id']
    
    try:
        course = db.courses.find_one({"_id": ObjectId(course_id)})
        if not course:
            return jsonify({'message': 'Course not found'}), 404
        
        # Check if already enrolled
        if ObjectId(student_id) in course.get('students', []):
            return jsonify({'message': 'Already enrolled in this course'}), 400

        db.courses.update_one(
            {"_id": ObjectId(course_id)},
            {"$addToSet": {"students": ObjectId(student_id)}}
        )
        return jsonify({'message': 'Successfully enrolled in course!'}), 200
    except Exception as e:
        return jsonify({'message': 'Invalid course ID', 'error': str(e)}), 400

@courses_bp.route('/enrolled', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_enrolled_courses():
    student_id = g.current_user['_id']
    courses = list(db.courses.find({"students": ObjectId(student_id)}))
    for course in courses:
        course['_id'] = str(course['_id'])
        course['created_by'] = str(course['created_by'])
        course['students'] = [str(sid) for sid in course.get('students', [])]
    return jsonify({'courses': courses}), 200
