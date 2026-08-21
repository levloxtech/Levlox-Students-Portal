"""
Bootstrap an email-based administrator account for Levlox Student Portal.

Usage:
    python create_email_admin.py --email asriaakash@gmail.com --name "Super Admin" --password "<password>"
"""
import argparse
import sys

import firebase_init
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore

def seed_email_admin(email: str, name: str, password: str) -> None:
    if not firebase_init.firebase_initialized or firebase_init.db_firestore is None:
        sys.exit(
            "Firebase Admin SDK is not initialized. Set FIREBASE_SERVICE_ACCOUNT "
            "(path to service-account JSON) or FIREBASE_CREDENTIALS_JSON environment variable."
        )

    db = firestore.client()

    try:
        user = firebase_auth.get_user_by_email(email)
        print(f"Found existing Auth account for {email} (uid={user.uid}).")
        if password:
            firebase_auth.update_user(user.uid, password=password)
            print("Password updated.")
    except firebase_auth.UserNotFoundError:
        user = firebase_auth.create_user(
            email=email,
            password=password,
            display_name=name,
        )
        print(f"Created Auth account for {email} (uid={user.uid}).")

    db.collection("admins").document(user.uid).set(
        {
            "name": name,
            "email": email,
            "role": "admin",
            "status": "active",
            "createdBy": "create_email_admin_script",
            "updatedAt": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )

    print(f"Firestore document admins/{user.uid} successfully created!")
    print(f"Account {email} can now sign in to the portal as Admin.")

def main() -> None:
    parser = argparse.ArgumentParser(description="Create an email administrator account.")
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument("--name", default="Super Admin", help="Display name")
    parser.add_argument("--password", required=True, help="Password for the account")
    args = parser.parse_args()

    seed_email_admin(email=args.email, name=args.name, password=args.password)

if __name__ == "__main__":
    main()
