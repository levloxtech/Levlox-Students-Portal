import jwt
import datetime
import bcrypt
import random
import re
import os
import firebase_init
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from db import db
from config import Config
from auth_middleware import token_required

auth_bp = Blueprint('auth', __name__)

def validate_password_strength(password):
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"[0-9]", password):
        return False
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_+\-\[\]\\]", password):
        return False
    return True

def find_user_by_phone(phone):
    phone_clean = phone.strip()
    if phone_clean.startswith("+"):
        last_10 = phone_clean[-10:]
    else:
        last_10 = phone_clean
        
    possible_phones = list(set([phone_clean, last_10, f"+91{last_10}", f"+{last_10}"]))
    query = {"phone": {"$in": possible_phones}}
    
    admin = db._db.admins.find_one(query)
    if admin:
        return admin, "admin"
        
    student = db._db.students.find_one(query)
    if student:
        return student, "student"
        
    return None, None


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    phone = data.get('phone')
    password = data.get('password')
    name = data.get('name')
    email = data.get('email', '')

    if not phone or len(phone) < 9 or not phone.replace("+", "").replace("-", "").isdigit():
        return jsonify({'message': 'Please enter a valid phone number.'}), 400

    if not password or len(password) < 8 or len(password) > 32:
        return jsonify({'message': 'Password must be between 8 and 32 characters.'}), 400

    if not name or not name.strip():
        return jsonify({'message': 'Name is required.'}), 400

    phone = phone.strip()

    # Enforce phone number uniqueness across both collections
    user_exists, _ = find_user_by_phone(phone)
    if user_exists:
        return jsonify({'message': 'Mobile number already registered.'}), 409

    if email:
        email_clean = email.strip().lower()
        if db._db.admins.find_one({"email": email_clean}) or db._db.students.find_one({"email": email_clean}):
            return jsonify({'message': 'Email already registered.'}), 409

    # Hash password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    user_doc = {
        "phone": phone,
        "email": email.strip().lower() if email else f"{phone}@lsp.com",
        "password_hash": hashed_password,
        "name": name.strip(),
        "role": "student",
        "status": "active",
        "failed_login_attempts": 0,
        "lockout_until": None,
        "created_at": datetime.datetime.utcnow(),
        "feesPaid": False,
        "feesTotal": 20000,
        "feesPaidAmount": 0,
        "feesRemainingAmount": 20000,
        "feesStatus": "Pending",
        "feesPaymentDate": "",
        "feesDueDate": "2026-08-31",
        "rollNumber": f"LSP-2026-{random.randint(1000, 9999)}",
        "college": "Levlox Technical Institute",
        "course": "Fullstack Engineering",
        "profile_pic": "",
        "join_date": datetime.datetime.utcnow().strftime("%B %d, %Y"),
        "attendance": {
            "percentage": 92,
            "present": 46,
            "absent": 4
        },
        "attendance_history": [
            {"date": "2026-07-07", "status": "Present"},
            {"date": "2026-07-06", "status": "Present"},
            {"date": "2026-07-05", "status": "Present"},
            {"date": "2026-07-04", "status": "Absent"},
            {"date": "2026-07-03", "status": "Present"}
        ]
    }

    db._db.students.insert_one(user_doc)
    return jsonify({'message': 'User registered successfully!'}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    phone = data.get('phone')
    password = data.get('password')
    device_id = data.get('device_id')
    device_type = data.get('device_type')
    device_label = data.get('device_label', device_type or 'Unknown Device')

    if not phone or not password:
        return jsonify({'message': 'Phone and password are required.'}), 400

    user, role = find_user_by_phone(phone)
    if not user:
        return jsonify({'message': 'Invalid credentials or password!'}), 401

    # Check lockout
    now = datetime.datetime.utcnow()
    lockout_until = user.get('lockout_until')
    if lockout_until:
        if isinstance(lockout_until, str):
            lockout_until = datetime.datetime.fromisoformat(lockout_until)
        if now < lockout_until:
            return jsonify({'message': 'Too many failed login attempts. Please try again after 30 seconds.'}), 429

    # Check password (backward compatibility lookup fallback)
    hashed_pw = user.get('password_hash') or user.get('password')
    if not hashed_pw or not bcrypt.checkpw(password.encode('utf-8'), hashed_pw):
        attempts = user.get('failed_login_attempts', 0) + 1
        coll = db._db.admins if role == "admin" else db._db.students
        if attempts >= 5:
            coll.update_one(
                {"_id": user["_id"]},
                {"$set": {
                    "failed_login_attempts": 0,
                    "lockout_until": now + datetime.timedelta(seconds=30)
                }}
            )
            return jsonify({'message': 'Too many failed login attempts. Please try again after 30 seconds.'}), 429
        else:
            coll.update_one(
                {"_id": user["_id"]},
                {"$set": {"failed_login_attempts": attempts}}
            )
            return jsonify({'message': 'Invalid credentials or password!'}), 401

    if role == 'student' and user.get('status') != 'active':
        return jsonify({'message': 'Your account is deactivated. Please contact administration.'}), 403

    user_id = str(user["_id"])

    # Device limit checks for students
    if role == 'student':
        if not device_id or not device_type:
            return jsonify({
                "error": "missing_device_info",
                "message": "Missing device ID or device type."
            }), 400

        # Is this exact device already a known session?
        existing_same_device = db._db.sessions.find_one({"user_id": user_id, "device_id": device_id})

        if not existing_same_device:
            # Count different active devices of the same type
            existing_same_type = db._db.sessions.find_one({
                "user_id": user_id, "device_type": device_type, "device_id": {"$ne": device_id}
            })
            if existing_same_type:
                return jsonify({
                    "error": "device_limit_reached",
                    "message": f"Already logged in on another {device_type}. Ask admin to remove that device, or log out there first.",
                    "existing_device": existing_same_type.get("device_label")
                }), 409

            # Also enforce total max 2 devices (1 mobile + 1 desktop)
            total_devices = db._db.sessions.count_documents({"user_id": user_id})
            if total_devices >= 2:
                return jsonify({
                    "error": "device_limit_reached",
                    "message": "Maximum device limit (1 desktop + 1 mobile) reached. Please log out from an existing device or ask an admin to clear a session."
                }), 409

    # Reset failed attempts
    coll = db._db.admins if role == "admin" else db._db.students
    coll.update_one(
        {"_id": user["_id"]},
        {"$set": {"failed_login_attempts": 0, "lockout_until": None}}
    )

    # Generate Token (includes device_id)
    token_payload = {
        'user_id': user_id,
        'role': role,
        'device_id': device_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
    }
    token = jwt.encode(token_payload, Config.JWT_SECRET_KEY, algorithm='HS256')

    # Update or insert session document in database
    if device_id and device_type:
        db._db.sessions.update_one(
            {"user_id": user_id, "device_id": device_id},
            {"$set": {
                "user_id": user_id,
                "role": role,
                "device_type": device_type,
                "device_id": device_id,
                "device_label": device_label,
                "token": token,
                "last_active": datetime.datetime.utcnow()
            }, "$setOnInsert": {"created_at": datetime.datetime.utcnow()}},
            upsert=True
        )

    return jsonify({
        'token': token,
        'user': {
            'id': user_id,
            'phone': user.get('phone', ''),
            'email': user.get('email', ''),
            'name': user.get('name', ''),
            'role': role,
            'feesStatus': user.get('feesStatus', 'Pending'),
            'must_change_password': user.get('must_change_password', False)
        }
    }), 200

@auth_bp.route('/me', methods=['GET'])
@token_required()
def get_me():
    return jsonify({'user': g.current_user}), 200

@auth_bp.route('/forgot-password/request', methods=['POST'])
def forgot_password_request():
    data = request.get_json() or {}
    phone = data.get('phone')

    if not phone or len(phone) < 9 or not phone.replace("+", "").replace("-", "").isdigit():
        return jsonify({'message': 'Please provide a valid mobile number.'}), 400

    phone = phone.strip()
    user, _ = find_user_by_phone(phone)
    if not user:
        return jsonify({'message': 'No registered account found with this mobile number.'}), 404

    # Generate secure 6-digit OTP
    otp = "".join([str(random.randint(0, 9)) for _ in range(6)])
    print(f"[SECURITY MOCK] SMS to {phone}: Your OTP code is {otp}")

    # Invalidate existing active OTPs
    db.otps.update_many({"phone": phone, "status": "active"}, {"$set": {"status": "invalidated"}})

    # Hash the OTP
    otp_hash = bcrypt.hashpw(otp.encode('utf-8'), bcrypt.gensalt())
    now = datetime.datetime.utcnow()
    expires_at = now + datetime.timedelta(minutes=5)

    db.otps.insert_one({
        "phone": phone,
        "otp_hash": otp_hash,
        "created_at": now,
        "expires_at": expires_at,
        "attempts": 0,
        "status": "active"
    })

    return jsonify({'message': 'A secure OTP has been sent to your registered mobile number.'}), 200

@auth_bp.route('/forgot-password/verify', methods=['POST'])
def forgot_password_verify():
    data = request.get_json() or {}
    phone = data.get('phone')
    otp = data.get('otp')

    if not phone or not otp or len(otp) != 6:
        return jsonify({'message': 'Mobile number and 6-digit OTP are required.'}), 400

    phone = phone.strip()
    otp = otp.strip()

    otp_doc = db.otps.find_one({"phone": phone, "status": "active"})
    if not otp_doc:
        return jsonify({'message': 'No active OTP found or it has already been used/invalidated.'}), 400

    now = datetime.datetime.utcnow()
    expires_at = otp_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.datetime.fromisoformat(expires_at)

    if now > expires_at:
        db.otps.update_one({"_id": otp_doc["_id"]}, {"$set": {"status": "expired"}})
        return jsonify({'message': 'OTP has expired.'}), 400

    attempts = otp_doc.get('attempts', 0) + 1
    db.otps.update_one({"_id": otp_doc["_id"]}, {"$set": {"attempts": attempts}})

    if attempts > 5:
        db.otps.update_one({"_id": otp_doc["_id"]}, {"$set": {"status": "invalidated"}})
        return jsonify({'message': 'Maximum verification attempts exceeded. Please request a new OTP.'}), 400

    if not bcrypt.checkpw(otp.encode('utf-8'), otp_doc["otp_hash"]):
        if attempts >= 5:
            db.otps.update_one({"_id": otp_doc["_id"]}, {"$set": {"status": "invalidated"}})
            return jsonify({'message': 'Incorrect OTP. Maximum verification attempts reached. This OTP is now invalid.'}), 400
        return jsonify({'message': f'Incorrect OTP. Remaining attempts: {5 - attempts}.'}), 400

    # OTP is correct and verified
    db.otps.update_one({"_id": otp_doc["_id"]}, {"$set": {"status": "used"}})

    # Generate one-time reset token
    reset_payload = {
        'phone': phone,
        'purpose': 'password_reset',
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    }
    reset_token = jwt.encode(reset_payload, Config.JWT_SECRET_KEY, algorithm='HS256')

    return jsonify({
        'message': 'OTP verified successfully.',
        'reset_token': reset_token
    }), 200

@auth_bp.route('/forgot-password/reset', methods=['POST'])
def forgot_password_reset():
    data = request.get_json() or {}
    reset_token = data.get('reset_token')
    new_password = data.get('new_password')

    if not reset_token or not new_password:
        return jsonify({'message': 'Missing reset token or new password.'}), 400

    try:
        payload = jwt.decode(reset_token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        if payload.get('purpose') != 'password_reset':
            return jsonify({'message': 'Invalid token purpose.'}), 400
        phone = payload.get('phone')
    except jwt.ExpiredSignatureError:
        return jsonify({'message': 'Reset session has expired. Please request a new OTP.'}), 401
    except Exception:
        return jsonify({'message': 'Invalid reset token.'}), 401

    if not validate_password_strength(new_password):
        return jsonify({'message': 'Password does not meet safety rules.'}), 400

    hashed_pw = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
    
    # Try updating admins first, then students
    result = db._db.admins.update_one({"phone": phone}, {"$set": {"password_hash": hashed_pw}})
    if result.matched_count == 0:
        # Try finding by 10-digit normalized suffix
        if phone.startswith("+") and len(phone) > 10:
            suffix = phone[-10:]
            result = db._db.admins.update_one({"phone": suffix}, {"$set": {"password_hash": hashed_pw}})
            
    if result.matched_count == 0:
        result = db._db.students.update_one({"phone": phone}, {"$set": {"password_hash": hashed_pw}})
        if result.matched_count == 0 and phone.startswith("+") and len(phone) > 10:
            suffix = phone[-10:]
            result = db._db.students.update_one({"phone": suffix}, {"$set": {"password_hash": hashed_pw}})

    if result.matched_count == 0:
        return jsonify({'message': 'User profile not found.'}), 404

    return jsonify({'message': 'Password changed successfully! Please login with your new password.'}), 200

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json(force=True) or {}
    id_token = data.get("idToken")
    new_password = data.get("newPassword")

    if not id_token or not new_password:
        return jsonify({"error": "Missing token or password"}), 400

    phone = None
    if firebase_init.firebase_initialized:
        try:
            from firebase_admin import auth as firebase_auth
            decoded = firebase_auth.verify_id_token(id_token)
            phone = decoded.get("phone_number")
        except Exception as e:
            return jsonify({"error": "Invalid or expired OTP session", "detail": str(e)}), 401
    else:
        print(f"[SECURITY MOCK] Verifying reset OTP mock token: {id_token}")
        if id_token.startswith("mock-token-"):
            phone = id_token.split("mock-token-")[-1]
            if not phone.startswith("+"):
                phone = "+91" + phone
        else:
            phone = "+919876543210"

    if not phone:
        return jsonify({"error": "Failed to verify phone number from token"}), 401

    if not validate_password_strength(new_password):
        return jsonify({"error": "Password does not meet safety rules"}), 400

    password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())

    user, role = find_user_by_phone(phone)
    if not user:
        return jsonify({"error": "No account found for this phone number"}), 404

    coll = db._db.admins if role == "admin" else db._db.students
    coll.update_one({"_id": user["_id"]}, {"$set": {"password_hash": password_hash, "must_change_password": False}})

    return jsonify({"message": "Password reset successful"}), 200

@auth_bp.route('/verify', methods=['POST'])
def verify_firebase_login():
    data = request.get_json(force=True) or {}
    id_token = data.get("idToken")
    if not id_token:
        return jsonify({"error": "Missing idToken"}), 400

    firebase_uid = None
    phone_number = None

    if firebase_init.firebase_initialized:
        try:
            from firebase_admin import auth as firebase_auth
            decoded = firebase_auth.verify_id_token(id_token)
            firebase_uid = decoded["uid"]
            phone_number = decoded.get("phone_number")
        except Exception as e:
            return jsonify({"error": "Invalid Firebase token", "detail": str(e)}), 401
    else:
        print(f"[SECURITY MOCK] Verifying mock token: {id_token}")
        if id_token.startswith("mock-token-"):
            phone_number = id_token.split("mock-token-")[-1]
            if not phone_number.startswith("+"):
                phone_number = "+91" + phone_number
            firebase_uid = f"mock-uid-{phone_number}"
        else:
            phone_number = "+919876543210"
            firebase_uid = "mock-uid-default"

    normalized_phone = phone_number
    if phone_number and len(phone_number) > 10:
        normalized_phone = phone_number[-10:]

    student = None
    if firebase_uid:
        student = db._db.students.find_one({"firebase_uid": firebase_uid})
    
    if not student and normalized_phone:
        student = db._db.students.find_one({"phone": normalized_phone})
        if not student:
            # Check with full phone matching
            student = db._db.students.find_one({"phone": phone_number})
            
        if student and firebase_uid:
            db._db.students.update_one({"_id": student["_id"]}, {"$set": {"firebase_uid": firebase_uid}})

    if not student:
        new_doc = {
            "phone": normalized_phone if normalized_phone else "",
            "email": f"{normalized_phone}@lsp.com" if normalized_phone else "",
            "name": "",
            "role": "student",
            "status": "pending",
            "firebase_uid": firebase_uid,
            "created_at": datetime.datetime.utcnow(),
            "feesPaid": False,
            "feesTotal": 20000,
            "feesPaidAmount": 0,
            "feesRemainingAmount": 20000,
            "feesStatus": "Pending",
            "feesPaymentDate": "",
            "feesDueDate": "2026-08-31",
            "rollNumber": f"LSP-2026-{random.randint(1000, 9999)}",
            "college": "Levlox Technical Institute",
            "course": "Fullstack Engineering",
            "profile_pic": "",
            "join_date": datetime.datetime.utcnow().strftime("%B %d, %Y"),
            "attendance": {
                "percentage": 92,
                "present": 46,
                "absent": 4
            },
            "attendance_history": [
                {"date": "2026-07-07", "status": "Present"},
                {"date": "2026-07-06", "status": "Present"},
                {"date": "2026-07-05", "status": "Present"},
                {"date": "2026-07-04", "status": "Absent"},
                {"date": "2026-07-03", "status": "Present"}
            ]
        }
        result = db._db.students.insert_one(new_doc)
        new_doc["_id"] = str(result.inserted_id)
        student = new_doc
    else:
        student["_id"] = str(student["_id"])

    if student.get('status') == 'inactive':
        return jsonify({'message': 'Your account is deactivated. Please contact administration.'}), 403

    db._db.students.update_one(
        {"_id": ObjectId(student["_id"])},
        {"$set": {"failed_login_attempts": 0, "lockout_until": None}}
    )

    token_payload = {
        'user_id': student['_id'],
        'role': 'student',
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    app_token = jwt.encode(token_payload, Config.JWT_SECRET_KEY, algorithm='HS256')

    student.pop("password", None)
    student.pop("password_hash", None)
    return jsonify({
        "token": app_token,
        "user": {
            "id": student["_id"],
            "phone": student.get("phone", ""),
            "email": student.get("email", ""),
            "name": student.get("name", ""),
            "role": "student",
            "feesStatus": student.get("feesStatus", "Pending")
        }
    }), 200

@auth_bp.route("/my-sessions", methods=["GET"])
@token_required(allowed_roles=["student"])
def my_sessions():
    sessions = list(db._db.sessions.find({"user_id": g.user_id}))
    for s in sessions:
        s["_id"] = str(s["_id"])
        s.pop("token", None)
    return jsonify(sessions), 200

@auth_bp.route("/my-sessions/<session_id>", methods=["DELETE"])
@token_required(allowed_roles=["student"])
def remove_my_session(session_id):
    result = db._db.sessions.delete_one({"_id": ObjectId(session_id), "user_id": g.user_id})
    if result.deleted_count == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"message": "Logged out successfully"}), 200
