import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth

firebase_initialized = False
db_firestore = None

# Check for Service Account file or environment variables
service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT", "secrets/firebase-service-account.json")
service_account_path = os.path.abspath(service_account_path)

firebase_json_env = os.getenv("FIREBASE_CREDENTIALS_JSON")
firebase_private_key = os.getenv("FIREBASE_PRIVATE_KEY")
firebase_client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
firebase_project_id = os.getenv("FIREBASE_PROJECT_ID", "levlox-student-portal")

if not firebase_admin._apps:
    try:
        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred, {"projectId": firebase_project_id})
            firebase_initialized = True
            print(f"Firebase Admin SDK initialized with service account file: {service_account_path}")
        elif firebase_json_env:
            cred_dict = json.loads(firebase_json_env)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred, {"projectId": firebase_project_id})
            firebase_initialized = True
            print("Firebase Admin SDK initialized with FIREBASE_CREDENTIALS_JSON env.")
        elif firebase_private_key and firebase_client_email:
            formatted_private_key = firebase_private_key.replace("\\n", "\n")
            cred_dict = {
                "type": "service_account",
                "project_id": firebase_project_id,
                "private_key": formatted_private_key,
                "client_email": firebase_client_email,
            }
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred, {"projectId": firebase_project_id})
            firebase_initialized = True
            print("Firebase Admin SDK initialized with FIREBASE_PRIVATE_KEY env.")
        else:
            # Fallback to default application credentials or unauthenticated project reference
            firebase_admin.initialize_app(options={"projectId": firebase_project_id})
            firebase_initialized = True
            print(f"Firebase Admin SDK initialized with default project ID: {firebase_project_id}")
    except Exception as e:
        print(f"Warning / Error initializing Firebase Admin SDK: {e}")

try:
    db_firestore = firestore.client()
    print("Firestore client attached successfully.")
except Exception as e:
    print(f"Firestore client initialization error: {e}")

