import datetime
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from db import db
from auth_middleware import token_required

assignments_bp = Blueprint('assignments', __name__)

@assignments_bp.route('', methods=['POST'])
@token_required(allowed_roles=['admin'])
def create_assignment():
    data = request.get_json() or {}
    course_id = data.get('course_id')
    title = data.get('title')
    description = data.get('description')
    due_date = data.get('due_date') # ISO format string

    if not course_id or not title or not description:
        return jsonify({'message': 'Missing course_id, title, or description'}), 400

    try:
        assignment_doc = {
            "course_id": ObjectId(course_id),
            "title": title.strip(),
            "description": description.strip(),
            "due_date": due_date if due_date else (datetime.datetime.utcnow() + datetime.timedelta(days=7)).isoformat(),
            "created_by": ObjectId(g.current_user['id'] if 'id' in g.current_user else g.current_user['_id']),
            "created_at": datetime.datetime.utcnow()
        }
        result = db.assignments.insert_one(assignment_doc)
        assignment_doc['_id'] = str(result.inserted_id)
        assignment_doc['course_id'] = str(assignment_doc['course_id'])
        assignment_doc['created_by'] = str(assignment_doc['created_by'])
        return jsonify({'message': 'Assignment created successfully!', 'assignment': assignment_doc}), 201
    except Exception as e:
        return jsonify({'message': 'Error creating assignment', 'error': str(e)}), 400

@assignments_bp.route('/course/<course_id>', methods=['GET'])
@token_required()
def get_assignments_by_course(course_id):
    try:
        assignments = list(db.assignments.find({"course_id": ObjectId(course_id)}))
        for assign in assignments:
            assign['_id'] = str(assign['_id'])
            assign['course_id'] = str(assign['course_id'])
            assign['created_by'] = str(assign['created_by'])
        return jsonify({'assignments': assignments}), 200
    except Exception as e:
        return jsonify({'message': 'Invalid course ID', 'error': str(e)}), 400

@assignments_bp.route('/<assignment_id>/submit', methods=['POST'])
@token_required(allowed_roles=['student'])
def submit_assignment(assignment_id):
    data = request.get_json() or {}
    submission_text = data.get('submission_text')

    if not submission_text:
        return jsonify({'message': 'Submission content is empty'}), 400

    try:
        # Check if assignment exists
        assignment = db.assignments.find_one({"_id": ObjectId(assignment_id)})
        if not assignment:
            return jsonify({'message': 'Assignment not found'}), 404

        student_id = ObjectId(g.current_user['_id'])

        # Check if already submitted
        existing = db.submissions.find_one({"assignment_id": ObjectId(assignment_id), "student_id": student_id})
        if existing:
            return jsonify({'message': 'You have already submitted this assignment!'}), 400

        submission_doc = {
            "assignment_id": ObjectId(assignment_id),
            "student_id": student_id,
            "student_name": g.current_user['name'],
            "submission_text": submission_text.strip(),
            "grade": None,
            "graded_by": None,
            "status": "pending",
            "submitted_at": datetime.datetime.utcnow()
        }

        result = db.submissions.insert_one(submission_doc)
        submission_doc['_id'] = str(result.inserted_id)
        submission_doc['assignment_id'] = str(submission_doc['assignment_id'])
        submission_doc['student_id'] = str(submission_doc['student_id'])
        
        return jsonify({'message': 'Assignment submitted successfully!', 'submission': submission_doc}), 201
    except Exception as e:
        return jsonify({'message': 'Error submitting assignment', 'error': str(e)}), 400

@assignments_bp.route('/<assignment_id>/submissions', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_submissions_for_assignment(assignment_id):
    try:
        submissions = list(db.submissions.find({"assignment_id": ObjectId(assignment_id)}))
        for sub in submissions:
            sub['_id'] = str(sub['_id'])
            sub['assignment_id'] = str(sub['assignment_id'])
            sub['student_id'] = str(sub['student_id'])
            if sub.get('graded_by'):
                sub['graded_by'] = str(sub['graded_by'])
        return jsonify({'submissions': submissions}), 200
    except Exception as e:
        return jsonify({'message': 'Invalid assignment ID', 'error': str(e)}), 400

@assignments_bp.route('/submission/<submission_id>/grade', methods=['POST'])
@token_required(allowed_roles=['admin'])
def grade_submission(submission_id):
    data = request.get_json() or {}
    grade = data.get('grade')

    if grade is None:
        return jsonify({'message': 'Grade value is required'}), 400

    try:
        admin_id = ObjectId(g.current_user['_id'])
        
        result = db.submissions.update_one(
            {"_id": ObjectId(submission_id)},
            {
                "$set": {
                    "grade": grade,
                    "status": "graded",
                    "graded_by": admin_id,
                    "graded_at": datetime.datetime.utcnow()
                }
            }
        )

        if result.matched_count == 0:
            return jsonify({'message': 'Submission not found'}), 404

        return jsonify({'message': 'Submission graded successfully!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error grading submission', 'error': str(e)}), 400

@assignments_bp.route('/student/submissions', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_my_submissions():
    try:
        student_id = ObjectId(g.current_user['_id'])
        submissions = list(db.submissions.find({"student_id": student_id}))
        for sub in submissions:
            sub['_id'] = str(sub['_id'])
            sub['assignment_id'] = str(sub['assignment_id'])
            sub['student_id'] = str(sub['student_id'])
            if sub.get('graded_by'):
                sub['graded_by'] = str(sub['graded_by'])
        return jsonify({'submissions': submissions}), 200
    except Exception as e:
        return jsonify({'message': 'Error fetching submissions', 'error': str(e)}), 400
