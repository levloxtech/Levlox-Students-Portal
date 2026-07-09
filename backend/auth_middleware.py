import jwt
from flask import request, jsonify, g
from functools import wraps
from config import Config
from db import db
from bson import ObjectId

def token_required(allowed_roles=None):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            token = None
            if 'Authorization' in request.headers:
                auth_header = request.headers['Authorization']
                # Expecting format: Bearer <token>
                if auth_header.startswith('Bearer '):
                    token = auth_header.split(" ")[1]
            
            if not token:
                return jsonify({'message': 'Token is missing!'}), 401
            
            try:
                data = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
                user_id = data.get('user_id')
                if not user_id:
                    return jsonify({'message': 'Invalid token payload!'}), 401
                
                # Fetch user details from database
                user = db.users.find_one({"_id": ObjectId(user_id)})
                if not user:
                    return jsonify({'message': 'User not found!'}), 401
                
                # Remove password hash for safety
                user.pop('password', None)
                user['id'] = str(user['_id'])
                user['_id'] = str(user['_id'])
                
                # Check user roles if specified
                if allowed_roles and user.get('role') not in allowed_roles:
                    return jsonify({'message': 'Access forbidden: Insufficient permissions!'}), 403
                
                # Store user object in Flask globals
                g.current_user = user
                g.user_id = user_id
                
            except jwt.ExpiredSignatureError:
                return jsonify({'message': 'Token has expired!'}), 401
            except Exception as e:
                return jsonify({'message': 'Token is invalid!', 'error': str(e)}), 401
            
            return f(*args, **kwargs)
        return decorated
    return decorator
