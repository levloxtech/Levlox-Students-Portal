import gridfs
from flask import Blueprint, jsonify, Response, g
from bson import ObjectId
from db import db
from auth_middleware import token_required

files_bp = Blueprint('files', __name__)
fs = gridfs.GridFS(getattr(db, "_db", db))

@files_bp.route('/<file_id>', methods=['GET'])
@token_required()
def get_file(file_id):
    try:
        file_oid = ObjectId(file_id)
        file_obj = fs.get(file_oid)
    except Exception:
        return jsonify({"message": "File not found or invalid ID"}), 404

    user = g.current_user
    user_id = str(user['id'])
    role = user.get('role', 'student')

    # Admins have access to everything
    if role == 'admin':
        response = Response(file_obj, mimetype=file_obj.content_type)
        response.headers['Content-Disposition'] = f'inline; filename="{file_obj.filename}"'
        return response

    # Fetch fresh student record
    student_db = db.users.find_one({"_id": ObjectId(user_id)})
    if not student_db:
        return jsonify({"message": "Student account not found"}), 403

    student_batch = student_db.get('batch_id')
    fees_paid = student_db.get('feesPaid', False) or student_db.get('feesStatus') == 'Paid'

    # Check if the file is a profile picture
    is_profile_pic = db.users.find_one({"profile_pic": {"$regex": file_id}})
    if is_profile_pic:
        response = Response(file_obj, mimetype=file_obj.content_type)
        response.headers['Content-Disposition'] = f'inline; filename="{file_obj.filename}"'
        return response

    # Check if file is related to any recorded class
    file_id_str = str(file_id)
    recorded_class = db.recorded_classes.find_one({
        "$or": [
            {"video_url": {"$regex": file_id_str}},
            {"notes_url": {"$regex": file_id_str}},
            {"study_materials.url": {"$regex": file_id_str}}
        ]
    })

    if recorded_class:
        class_batch = recorded_class.get('batch_id')
        # Check batch compatibility
        if class_batch and str(class_batch) != str(student_batch):
            return jsonify({"message": "Access forbidden: This file belongs to another batch."}), 403
        
        # Check visibility / fee status
        visibility = recorded_class.get('visibility', 'everyone')
        if visibility == 'paid' and not fees_paid:
            return jsonify({"message": "Access forbidden: Course fees pending."}), 403

    # Check if file is related to any study material
    study_material = db.study_materials.find_one({"url": {"$regex": file_id_str}})
    if study_material:
        material_batch = study_material.get('batch_id')
        if material_batch and str(material_batch) != str(student_batch):
            return jsonify({"message": "Access forbidden: This file belongs to another batch."}), 403
        
        # If there's an explicit fee limit on study materials (e.g. name or type containing premium/paid)
        visibility = study_material.get('visibility', 'everyone')
        if visibility == 'paid' and not fees_paid:
            return jsonify({"message": "Access forbidden: Course fees pending."}), 403

    # Default: Allow authenticated users to view/stream
    response = Response(file_obj, mimetype=file_obj.content_type)
    response.headers['Content-Disposition'] = f'inline; filename="{file_obj.filename}"'
    return response
