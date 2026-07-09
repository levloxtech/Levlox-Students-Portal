from flask import Blueprint, jsonify, request
from db import db
from auth_middleware import token_required

settings_bp = Blueprint('settings', __name__)

def get_default_settings():
    settings = db.settings.find_one()
    if not settings:
        default_doc = {
            "portal_name": "Levlox Student Portal",
            "portal_logo": ""
        }
        result = db.settings.insert_one(default_doc)
        default_doc['_id'] = str(result.inserted_id)
        return default_doc
    settings['_id'] = str(settings['_id'])
    return settings

@settings_bp.route('/portal-settings', methods=['GET'])
def get_settings():
    try:
        settings = get_default_settings()
        return jsonify(settings), 200
    except Exception as e:
        return jsonify({'message': 'Error retrieving settings', 'error': str(e)}), 400

@settings_bp.route('/portal-settings', methods=['PUT'])
@token_required(allowed_roles=['admin'])
def update_settings():
    data = request.get_json() or {}
    portal_name = data.get('portal_name')
    portal_logo = data.get('portal_logo', '')

    if not portal_name:
        return jsonify({'message': 'Portal Name is required'}), 400

    try:
        db.settings.update_one(
            {},
            {"$set": {
                "portal_name": portal_name.strip(),
                "portal_logo": portal_logo.strip()
            }},
            upsert=True
        )
        return jsonify({'message': 'Portal settings updated successfully!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error updating settings', 'error': str(e)}), 400
