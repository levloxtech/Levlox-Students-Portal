"""
One-off administrative tooling for the Levlox Student Portal.

This is NOT a web server and the portal does not call it at runtime — the React
app talks to Firebase Authentication and Cloud Firestore directly. It exists
only for operations that require the Firebase Admin SDK, such as bootstrapping
the first administrator account (a chicken-and-egg problem: you need an admin
to create an admin).

Run it from a trusted machine that has the service-account credentials.
Never ship the service-account JSON to the frontend or commit it to git.

Usage:
    python seed_admin.py --email admin@levlox.com --name "Super Admin" --phone 9876543210
"""

import argparse
import sys

import firebase_init
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore


def seed_admin(email: str, name: str, phone: str = "", password: str | None = None) -> None:
    if not firebase_init.firebase_initialized or firebase_init.db_firestore is None:
        sys.exit(
            "Firebase Admin SDK is not initialized. Set FIREBASE_SERVICE_ACCOUNT "
            "(path to the service-account JSON) or FIREBASE_CREDENTIALS_JSON and retry."
        )

    db = firestore.client()

    # 1. Find or create the Firebase Auth user. Passwords live in Firebase Auth
    #    only — never in Firestore.
    try:
        user = firebase_auth.get_user_by_email(email)
        print(f"Found existing Auth user for {email} (uid={user.uid}).")
        if password:
            firebase_auth.update_user(user.uid, password=password)
            print("Password updated.")
    except firebase_auth.UserNotFoundError:
        if not password:
            sys.exit("No existing account for that email — pass --password to create one.")
        user = firebase_auth.create_user(email=email, password=password, display_name=name)
        print(f"Created Auth user {email} (uid={user.uid}).")

    # 2. Create the admins/{uid} document the security rules check for.
    #    `merge=True` so re-running never clobbers fields set elsewhere.
    db.collection("admins").document(user.uid).set(
        {
            "name": name,
            "email": email,
            "phone": phone,
            "role": "admin",
            "status": "active",
            "createdBy": "seed_admin_script",
            "updatedAt": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )

    print(f"admins/{user.uid} written. This account can now sign in to /admin.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap a Levlox portal administrator.")
    parser.add_argument("--email", required=True, help="Admin sign-in email address")
    parser.add_argument("--name", default="Super Admin", help="Display name")
    parser.add_argument("--phone", default="", help="Contact number (optional)")
    parser.add_argument(
        "--password",
        default=None,
        help="Password to set. Required when the account does not exist yet.",
    )
    args = parser.parse_args()

    seed_admin(email=args.email, name=args.name, phone=args.phone, password=args.password)


if __name__ == "__main__":
    main()
