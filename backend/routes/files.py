import gridfs
from flask import Blueprint, jsonify, Response, g, request
from bson import ObjectId
from db import db
from auth_middleware import token_required

files_bp = Blueprint('files', __name__)
fs = gridfs.GridFS(getattr(db, "_db", db))

@files_bp.route('/<file_id>', methods=['GET'])
@files_bp.route('/uploads/<file_id>', methods=['GET'])
@files_bp.route('/uploads/<file_id>/<filename>', methods=['GET'])
@token_required()
def get_file(file_id, filename=None):
    try:
        file_oid = ObjectId(file_id)
        file_obj = fs.get(file_oid)
    except Exception:
        return jsonify({"message": "File not found or invalid ID"}), 404

    user = g.current_user
    user_id = str(user['id'])
    role = user.get('role', 'student')

    # Admins have access to everything
    if role != 'admin':
        # Fetch fresh student record
        student_db = db.users.find_one({"_id": ObjectId(user_id)})
        if not student_db:
            return jsonify({"message": "Student account not found"}), 403

        student_batch = student_db.get('batch_id')
        fees_paid = student_db.get('feesPaid', False) or student_db.get('feesStatus') == 'Paid'

        # Check if the file is a profile picture
        is_profile_pic = db.users.find_one({"profile_pic": {"$regex": file_id}})
        
        # Check if file is related to any recorded class
        file_id_str = str(file_id)
        recorded_class = db.recorded_classes.find_one({
            "$or": [
                {"video_url": {"$regex": file_id_str}},
                {"notes_url": {"$regex": file_id_str}},
                {"study_materials.url": {"$regex": file_id_str}}
            ]
        })

        if recorded_class and not is_profile_pic:
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
        if study_material and not is_profile_pic:
            material_batch = study_material.get('batch_id')
            if material_batch and str(material_batch) != str(student_batch):
                return jsonify({"message": "Access forbidden: This file belongs to another batch."}), 403
            
            # If there's an explicit fee limit on study materials (e.g. name or type containing premium/paid)
            visibility = study_material.get('visibility', 'everyone')
            if visibility == 'paid' and not fees_paid:
                return jsonify({"message": "Access forbidden: Course fees pending."}), 403

    # Handle range requests for streaming video
    range_header = request.headers.get('Range', None)
    if range_header and range_header.startswith('bytes='):
        try:
            range_val = range_header.strip().split('=')[-1]
            range_parts = range_val.split('-')
            
            byte_start = 0
            byte_end = file_obj.length - 1
            
            if range_parts[0]:
                byte_start = int(range_parts[0])
            if len(range_parts) > 1 and range_parts[1]:
                byte_end = int(range_parts[1])
                
            byte_end = min(byte_end, file_obj.length - 1)
            length = byte_end - byte_start + 1
            
            def generate():
                file_obj.seek(byte_start)
                bytes_left = length
                chunk_size = 128 * 1024  # 128KB chunks
                while bytes_left > 0:
                    to_read = min(chunk_size, bytes_left)
                    data = file_obj.read(to_read)
                    if not data:
                        break
                    yield data
                    bytes_left -= len(data)
            
            response = Response(generate(), status=206, mimetype=file_obj.content_type)
            response.headers['Content-Range'] = f'bytes {byte_start}-{byte_end}/{file_obj.length}'
            response.headers['Content-Length'] = str(length)
            response.headers['Accept-Ranges'] = 'bytes'
            response.headers['Content-Disposition'] = f'inline; filename="{file_obj.filename}"'
            return response
        except Exception as e:
            # Fall back to standard response on parsing error
            pass

    # Default full response
    response = Response(file_obj, mimetype=file_obj.content_type)
    response.headers['Content-Length'] = str(file_obj.length)
    response.headers['Accept-Ranges'] = 'bytes'
    response.headers['Content-Disposition'] = f'inline; filename="{file_obj.filename}"'
    return response

