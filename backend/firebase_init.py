import os
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

firebase_initialized = False
service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT", "secrets/firebase-service-account.json")
service_account_path = os.path.abspath(service_account_path)

if os.path.exists(service_account_path):
    try:
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        firebase_initialized = True
        print("Firebase Admin SDK initialized successfully.")
    except Exception as e:
        print(f"Error initializing Firebase Admin SDK: {e}")
else:
    print(f"Firebase service account file not found at {service_account_path}.")
    print("In development fallback mode: Firebase authentication will accept simulated idTokens.")
