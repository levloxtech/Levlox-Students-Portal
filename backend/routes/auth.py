import jwt
import datetime
import bcrypt
import random
import re
import hashlib
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

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    phone = data.get('phone')
    password = data.get('password')
    name = data.get('name')
    email = data.get('email', '')
    role = data.get('role', 'student')

    if not phone or len(phone) != 10 or not phone.isdigit():
        return jsonify({'message': 'Mobile number must be exactly 10 digits.'}), 400

    if not password or len(password) < 8 or len(password) > 32:
        return jsonify({'message': 'Password must be between 8 and 32 characters.'}), 400

    if not name or not name.strip():
        return jsonify({'message': 'Name is required.'}), 400

    phone = phone.strip()
    role = role.strip().lower()

    if role not in ['admin', 'student']:
        return jsonify({'message': 'Invalid role specified'}), 400

    if db.users.find_one({"phone": phone}):
        return jsonify({'message': 'Mobile number already registered.'}), 409

    # Hash password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    user_doc = {
        "phone": phone,
        "email": email.strip().lower() if email else f"{phone}@lsp.com",
        "password": hashed_password,
        "name": name.strip(),
        "role": role,
        "status": "active",
        "failed_login_attempts": 0,
        "lockout_until": None,
        "created_at": datetime.datetime.utcnow()
    }

    if role == 'student':
        user_doc.update({
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
        })

    db.users.insert_one(user_doc)
    return jsonify({'message': 'User registered successfully!'}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    phone = data.get('phone')
    password = data.get('password')

    if not phone or not password:
        return jsonify({'message': 'Credentials and password are required.'}), 400

    phone = phone.strip()
    user = db.users.find_one({
        "$or": [
            {"phone": phone},
            {"rollNumber": phone},
            {"email": phone.lower()}
        ]
    })

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

    # Check credentials
    if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
        attempts = user.get('failed_login_attempts', 0) + 1
        if attempts >= 5:
            db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {
                    "failed_login_attempts": 0,
                    "lockout_until": now + datetime.timedelta(seconds=30)
                }}
            )
            return jsonify({'message': 'Too many failed login attempts. Please try again after 30 seconds.'}), 429
        else:
            db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"failed_login_attempts": attempts}}
            )
            return jsonify({'message': 'Invalid credentials or password!'}), 401

    if user.get('status') == 'inactive':
        return jsonify({'message': 'Your account is deactivated. Please contact administration.'}), 403

    # Reset failed attempts
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"failed_login_attempts": 0, "lockout_until": None}}
    )

    # Generate Token
    token_payload = {
        'user_id': str(user['_id']),
        'role': user['role'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    token = jwt.encode(token_payload, Config.JWT_SECRET_KEY, algorithm='HS256')

    return jsonify({
        'token': token,
        'user': {
            'id': str(user['_id']),
            'phone': user['phone'],
            'email': user.get('email', ''),
            'name': user['name'],
            'role': user['role'],
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

    if not phone or len(phone) != 10 or not phone.isdigit():
        return jsonify({'message': 'Please provide a valid 10-digit mobile number.'}), 400

    phone = phone.strip()
    user = db.users.find_one({"phone": phone})
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
    result = db.users.update_one({"phone": phone}, {"$set": {"password": hashed_pw}})

    if result.matched_count == 0:
        return jsonify({'message': 'User profile not found.'}), 404

    return jsonify({'message': 'Password changed successfully! Please login with your new password.'}), 200

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
        # Development mock fallback verification
        # Expecting idToken as a mock value like "mock-token-9876543210" or similar
        print(f"[SECURITY MOCK] Verifying mock token: {id_token}")
        if id_token.startswith("mock-token-"):
            phone_number = id_token.split("mock-token-")[-1]
            if not phone_number.startswith("+"):
                phone_number = "+91" + phone_number
            firebase_uid = f"mock-uid-{phone_number}"
        else:
            phone_number = "+919876543210"
            firebase_uid = "mock-uid-default"

    # Normalize phone: extract last 10 digits
    normalized_phone = phone_number
    if phone_number and len(phone_number) > 10:
        normalized_phone = phone_number[-10:]

    # Search for student by firebase_uid or normalized phone
    student = None
    if firebase_uid:
        student = db.users.find_one({"firebase_uid": firebase_uid, "role": "student"})
    
    if not student and normalized_phone:
        student = db.users.find_one({"phone": normalized_phone, "role": "student"})
        if student and firebase_uid:
            # Link Firebase UID to existing record
            db.users.update_one({"_id": student["_id"]}, {"$set": {"firebase_uid": firebase_uid}})

    if not student:
        # Create a new bare student document on first login
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
        # users VirtualCollection routes insert to students
        result = db.users.insert_one(new_doc)
        new_doc["_id"] = str(result.inserted_id)
        student = new_doc
    else:
        student["_id"] = str(student["_id"])

    if student.get('status') == 'inactive':
        return jsonify({'message': 'Your account is deactivated. Please contact administration.'}), 403

    # Reset lockout if there is any cached attempt
    db.users.update_one(
        {"_id": ObjectId(student["_id"])},
        {"$set": {"failed_login_attempts": 0, "lockout_until": None}}
    )

    # Generate JWT App token
    token_payload = {
        'user_id': student['_id'],
        'role': 'student',
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    app_token = jwt.encode(token_payload, Config.JWT_SECRET_KEY, algorithm='HS256')

    student.pop("password", None)
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

