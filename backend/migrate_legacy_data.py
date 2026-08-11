"""
Legacy data migration — Levlox Student Portal.

The previous backend wrote to Firestore through a PyMongo-shaped wrapper, so
the data is already in Cloud Firestore but under the *old* shape:

  * collections used snake_case names (`recorded_classes`, `live_classes`,
    `activity_scores`) while the React app now reads camelCase
    (`recordedClasses`, `liveClasses`, `activityScores`);
  * student and admin documents were keyed by a random UUID rather than the
    Firebase Authentication uid the portal now uses as the identity;
  * documents carried `password_hash` / `password` fields. Credentials must
    live in Firebase Authentication only — this script strips them.

The script is idempotent, defaults to a dry run, and never deletes the source
collections. Review the printed plan, then re-run with --apply.

Usage:
    python migrate_legacy_data.py                 # dry run — prints the plan
    python migrate_legacy_data.py --apply         # perform the migration
    python migrate_legacy_data.py --apply --create-missing-auth-users
"""

import argparse
import sys

import firebase_init
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore

from phone_identity import mobile_to_auth_id, normalize_mobile

# Legacy collection name -> current collection name.
COLLECTION_RENAMES = {
    "recorded_classes": "recordedClasses",
    "live_classes": "liveClasses",
    "activity_scores": "activityScores",
    "activity_presets": "activityPresets",
    "study_materials": "studyMaterials",
    "attendance_sheets": "attendance",
    "course_titles": "courseTitles",
}

# Never copied into Firestore.
SECRET_FIELDS = {"password", "password_hash", "failed_login_attempts", "lockout_until"}

# Legacy field name -> current field name, applied to every document.
FIELD_RENAMES = {
    "student_id": "studentId",
    "batch_id": "batchId",
    "course_id": "courseId",
    "assignment_id": "assignmentId",
    "user_id": "userId",
    "must_change_password": "mustChangePassword",
    "activity_type": "activityType",
    "created_at": "createdAt",
    "updated_at": "updatedAt",
}


def clean(doc: dict) -> dict:
    """Strip credentials and normalise field names."""
    out = {}
    for key, value in doc.items():
        if key in SECRET_FIELDS or key == "_id":
            continue
        out[FIELD_RENAMES.get(key, key)] = value
    return out


def migrate_collection(db, source: str, target: str, apply: bool) -> int:
    docs = list(db.collection(source).stream())
    if not docs:
        return 0

    print(f"  {source} -> {target}: {len(docs)} document(s)")
    if not apply:
        return len(docs)

    # Batched writes, chunked to stay under Firestore's 500-op limit.
    written = 0
    for start in range(0, len(docs), 400):
        batch = db.batch()
        for doc in docs[start:start + 400]:
            batch.set(db.collection(target).document(doc.id), clean(doc.to_dict() or {}), merge=True)
            written += 1
        batch.commit()
    return written


def migrate_people(db, source: str, apply: bool, create_missing: bool) -> None:
    """
    Re-key students/admins onto their Firebase Auth uid.

    The portal signs in by mobile number, so the Auth account is looked up by
    the identifier derived from the record's phone field. Documents already
    keyed by a valid uid are left in place (and simply have any stored
    credentials stripped).
    """
    docs = list(db.collection(source).stream())
    print(f"\n{source}: {len(docs)} document(s)")

    for doc in docs:
        data = doc.to_dict() or {}
        had_secrets = bool(SECRET_FIELDS & set(data.keys()))

        national = normalize_mobile(data.get("phone"))
        if not national:
            print(f"  ! {doc.id}: no usable mobile number — cannot map to a sign-in "
                  f"identity. Add a valid `phone` and re-run. SKIPPED.")
            continue

        auth_id = mobile_to_auth_id(national)
        label = f"{national} ({data.get('name') or 'unnamed'})"

        try:
            uid = firebase_auth.get_user_by_email(auth_id).uid
        except firebase_auth.UserNotFoundError:
            if not create_missing:
                print(f"  ! {label}: no Firebase Auth account. Re-run with "
                      f"--create-missing-auth-users, or create it manually. SKIPPED.")
                continue
            if not apply:
                print(f"  + would create Auth account for {label}")
                continue
            # A temporary password; the holder is forced to change it at sign-in.
            uid = firebase_auth.create_user(
                email=auth_id,
                display_name=data.get("name") or "",
                password=f"Lvx-{national}-Temp1",
            ).uid
            print(f"  + created Auth account for {label} (uid={uid}) "
                  f"— temporary password: Lvx-{national}-Temp1")

        if uid == doc.id:
            note = " (stripping stored credentials)" if had_secrets else " (already current)"
            print(f"  = {label}: uid matches document id{note}")
            if apply and had_secrets:
                db.collection(source).document(doc.id).set(clean(data))
            continue

        print(f"  > {label}: {doc.id} -> {uid}"
              + (" (stripping stored credentials)" if had_secrets else ""))
        if apply:
            payload = clean(data)
            payload["phone"] = national
            payload["legacyId"] = doc.id
            if source == "students":
                payload["mustChangePassword"] = True
            db.collection(source).document(uid).set(payload, merge=True)
            # The old document is left untouched so nothing is lost; delete it
            # manually once the migration has been verified in the console.


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate legacy portal data to the current schema.")
    parser.add_argument("--apply", action="store_true", help="Actually write (default is a dry run)")
    parser.add_argument("--create-missing-auth-users", action="store_true",
                        help="Create Firebase Auth accounts for records that have none")
    args = parser.parse_args()

    if not firebase_init.firebase_initialized or firebase_init.db_firestore is None:
        sys.exit("Firebase Admin SDK is not initialized. Set FIREBASE_SERVICE_ACCOUNT and retry.")

    db = firestore.client()

    mode = "APPLYING CHANGES" if args.apply else "DRY RUN — no writes"
    print(f"=== Levlox legacy migration ({mode}) ===\n")

    print("Renamed collections:")
    total = 0
    for source, target in COLLECTION_RENAMES.items():
        total += migrate_collection(db, source, target, args.apply)
    if total == 0:
        print("  (no legacy collections found — nothing to rename)")

    migrate_people(db, "students", args.apply, args.create_missing_auth_users)
    migrate_people(db, "admins", args.apply, args.create_missing_auth_users)

    print("\nDone.")
    if not args.apply:
        print("This was a dry run. Re-run with --apply to write the changes.")
    else:
        print("Legacy documents were kept in place. Verify in the Firebase console, "
              "then remove the old copies manually.")


if __name__ == "__main__":
    main()
