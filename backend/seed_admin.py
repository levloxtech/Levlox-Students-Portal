"""
One-off administrative tooling for the Levlox Student Portal.

This is NOT a web server and the portal does not call it at runtime — the React
app talks to Firebase Authentication and Cloud Firestore directly. It exists
only for operations that require the Firebase Admin SDK, such as bootstrapping
the first administrator account (a chicken-and-egg problem: you need an admin
to create an admin).

Administrators sign in with a mobile number and password, exactly like students.
See phone_identity.py for how the mobile number maps to a Firebase Auth
identifier. The password is set through Firebase Authentication and is never
written to Firestore in any form.

Run it from a trusted machine that has the service-account credentials.
Never ship the service-account JSON to the frontend or commit it to git.

Usage:
    python seed_admin.py --mobile 9876543210 --name "Super Admin" --password "<strong-password>"
"""

import argparse
import sys

import firebase_init
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore

from phone_identity import mobile_to_auth_id, normalize_mobile


def seed_admin(mobile: str, name: str, email: str = "", password: str | None = None) -> None:
    if not firebase_init.firebase_initialized or firebase_init.db_firestore is None:
        sys.exit(
            "Firebase Admin SDK is not initialized. Set FIREBASE_SERVICE_ACCOUNT "
            "(path to the service-account JSON) or FIREBASE_CREDENTIALS_JSON and retry."
        )

    national = normalize_mobile(mobile)
    if not national:
        sys.exit(f"'{mobile}' is not a valid 10-digit mobile number.")

    auth_id = mobile_to_auth_id(national)
    db = firestore.client()

    # 1. Find or create the Firebase Auth user. The password lives in Firebase
    #    Authentication only.
    try:
        user = firebase_auth.get_user_by_email(auth_id)
        print(f"Found existing account for {national} (uid={user.uid}).")
        if password:
            firebase_auth.update_user(user.uid, password=password)
            print("Password updated.")
    except firebase_auth.UserNotFoundError:
        if not password:
            sys.exit("No existing account for that mobile number — pass --password to create one.")
        user = firebase_auth.create_user(
            email=auth_id,
            password=password,
            display_name=name,
        )
        print(f"Created account for {national} (uid={user.uid}).")

    # 2. Create the admins/{uid} document the security rules check for.
    #    `merge=True` so re-running never clobbers fields set elsewhere.
    db.collection("admins").document(user.uid).set(
        {
            "name": name,
            "phone": national,
            "email": email,
            "role": "admin",
            "status": "active",
            "createdBy": "seed_admin_script",
            "updatedAt": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )

    print(f"admins/{user.uid} written.")
    print(f"This account can now sign in at /login with mobile {national}.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap a Levlox portal administrator.")
    parser.add_argument("--mobile", required=True, help="Admin sign-in mobile number (10 digits)")
    parser.add_argument("--name", default="Super Admin", help="Display name")
    parser.add_argument("--email", default="", help="Contact email (optional, not used to sign in)")
    parser.add_argument(
        "--password",
        default=None,
        help="Password to set. Required when the account does not exist yet.",
    )
    args = parser.parse_args()

    seed_admin(mobile=args.mobile, name=args.name, email=args.email, password=args.password)


if __name__ == "__main__":
    main()
