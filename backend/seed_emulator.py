"""
Seed demo accounts into the Firebase Emulator Suite for local development.

This script REFUSES to run unless the emulator environment variables are set,
so it can never create data in the live project. It is a development fixture,
not production tooling.

Start the emulators first:

    npx firebase-tools emulators:start --only auth,firestore --project levlox-student-portal

Then:

    FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
    FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
    python backend/seed_emulator.py
"""

import os
import sys

# The guard must run before firebase_admin is configured.
AUTH_EMULATOR = os.getenv("FIREBASE_AUTH_EMULATOR_HOST")
FIRESTORE_EMULATOR = os.getenv("FIRESTORE_EMULATOR_HOST")

if not AUTH_EMULATOR or not FIRESTORE_EMULATOR:
    sys.exit(
        "Refusing to run: FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST "
        "must both be set. This script only ever writes to local emulators."
    )

import firebase_admin  # noqa: E402
from firebase_admin import auth as firebase_auth  # noqa: E402
from google.auth.credentials import AnonymousCredentials  # noqa: E402
from google.cloud import firestore  # noqa: E402

from phone_identity import mobile_to_auth_id, normalize_mobile  # noqa: E402

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "levlox-student-portal")

DEMO_STUDENT = {
    "mobile": "9876543210",
    "password": "StudentPass1",
    "name": "Demo Student",
    "course": "Fullstack Engineering",
    "rollNumber": "LVX000001",
}

DEMO_ADMIN = {
    "mobile": "9000000001",
    "password": "AdminPass1",
    "name": "Demo Admin",
}

# A second student, used to verify that one student cannot read another's data.
OTHER_STUDENT = {
    "mobile": "9555500001",
    "password": "OtherPass1",
    "name": "Other Student",
    "course": "Data Engineering",
    "rollNumber": "LVX000002",
}


def upsert_account(mobile: str, password: str, name: str) -> str:
    """Create (or update) the emulator Auth account for a mobile number."""
    auth_id = mobile_to_auth_id(mobile)
    try:
        user = firebase_auth.get_user_by_email(auth_id)
        firebase_auth.update_user(user.uid, password=password, display_name=name)
    except firebase_auth.UserNotFoundError:
        user = firebase_auth.create_user(email=auth_id, password=password, display_name=name)
    return user.uid


def main() -> None:
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={"projectId": PROJECT_ID})

    # The emulator authenticates nothing, so anonymous credentials are correct
    # here — and they make it impossible for this client to reach production.
    db = firestore.Client(project=PROJECT_ID, credentials=AnonymousCredentials())

    print(f"Seeding emulators (auth={AUTH_EMULATOR}, firestore={FIRESTORE_EMULATOR})\n")

    # ── Student ────────────────────────────────────────────────────────────
    s = DEMO_STUDENT
    student_uid = upsert_account(s["mobile"], s["password"], s["name"])
    db.collection("students").document(student_uid).set(
        {
            "name": s["name"],
            "phone": normalize_mobile(s["mobile"]),
            "email": "",
            "role": "student",
            "status": "active",
            "course": s["course"],
            "rollNumber": s["rollNumber"],
            "batch_id": "",
            "batch_name": "Demo Batch",
            "college": "Levlox Technical Institute",
            "feesStatus": "Paid",
            "feesTotal": 20000,
            "feesPaidAmount": 20000,
            "feesRemainingAmount": 0,
            # Left false so the demo account can browse the whole portal.
            "mustChangePassword": False,
            "attendance": {"percentage": 92, "present": 46, "absent": 4},
        },
        merge=True,
    )
    print(f"  student  {s['mobile']} / {s['password']}  -> students/{student_uid}")

    # ── Admin ──────────────────────────────────────────────────────────────
    a = DEMO_ADMIN
    admin_uid = upsert_account(a["mobile"], a["password"], a["name"])
    db.collection("admins").document(admin_uid).set(
        {
            "name": a["name"],
            "phone": normalize_mobile(a["mobile"]),
            "email": "",
            "role": "admin",
            "status": "active",
        },
        merge=True,
    )
    print(f"  admin    {a['mobile']} / {a['password']}  -> admins/{admin_uid}")

    # ── A little content so the dashboard is not empty ─────────────────────
    db.collection("courses").document("demo-course").set(
        {
            "title": "Fullstack Web Development",
            "instructor": "Levlox Trainer",
            "batch": "Demo Batch",
            "createdAt": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    db.collection("announcements").document("demo-announcement").set(
        {
            "title": "Welcome to the Levlox Student Portal",
            "content": "Your dashboard is ready. Check the schedule for upcoming live classes.",
            "priority": "Normal",
            "is_pinned": True,
            "createdAt": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    db.collection("enrollments").document(f"{student_uid}_demo-course").set(
        {"studentId": student_uid, "courseId": "demo-course"}, merge=True
    )
    db.collection("leaderboard").document(student_uid).set(
        {"name": s["name"], "score": 480, "badge": "Top Performer"}, merge=True
    )

    # ── Second student — used to prove cross-student isolation ─────────────
    o = OTHER_STUDENT
    other_uid = upsert_account(o["mobile"], o["password"], o["name"])
    db.collection("students").document(other_uid).set(
        {
            "name": o["name"],
            "phone": normalize_mobile(o["mobile"]),
            "role": "student",
            "status": "active",
            "course": o["course"],
            "rollNumber": o["rollNumber"],
            "feesStatus": "Pending",
            "mustChangePassword": False,
            # A private value the first student must never be able to read.
            "permanent_address": "PRIVATE-ADDRESS-OF-OTHER-STUDENT",
        },
        merge=True,
    )
    db.collection("leaderboard").document(other_uid).set(
        {"name": o["name"], "score": 310, "badge": "Rising Star"}, merge=True
    )
    print(f"  student2 {o['mobile']} / {o['password']}  -> students/{other_uid}")

    # ── Per-student records, for the dashboard tabs ────────────────────────
    db.collection("liveClasses").document("demo-live").set(
        {
            "title": "React Fundamentals — Live Session",
            "instructor": "Levlox Trainer",
            "date": "2026-08-20",
            "time": "18:00",
            "status": "scheduled",
            "meet_link": "https://meet.example.com/levlox-demo",
            "description": "Components, props and state.",
        },
        merge=True,
    )
    db.collection("recordedClasses").document("demo-recording").set(
        {
            "title": "Introduction to JavaScript",
            "trainer": "Levlox Trainer",
            "batch": "Demo Batch",
            "subject": "JavaScript",
            "course_id": "demo-course",
            "createdAt": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    for i, (date, status) in enumerate(
        [("2026-08-10", "Present"), ("2026-08-09", "Present"), ("2026-08-08", "Absent")]
    ):
        db.collection("attendance").document(f"{student_uid}_{i}").set(
            {"studentId": student_uid, "date": date, "status": status}, merge=True
        )
    db.collection("notifications").document(f"{student_uid}_n1").set(
        {
            "userId": student_uid,
            "title": "Fees receipt available",
            "read": False,
            "createdAt": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    db.collection("assignments").document("demo-assignment").set(
        {
            "title": "Build a To-Do App",
            "courseId": "demo-course",
            "dueDate": "2026-08-25",
        },
        merge=True,
    )
    db.collection("submissions").document(f"{student_uid}_demo-assignment").set(
        {
            "studentId": student_uid,
            "assignmentId": "demo-assignment",
            "submissionText": "https://github.com/demo/todo",
            "submittedAt": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    db.collection("payments").document(f"{student_uid}_p1").set(
        {
            "studentId": student_uid,
            "amount": 20000,
            "method": "UPI",
            "createdAt": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )
    db.collection("batches").document("demo-batch").set(
        {
            "name": "Demo Batch",
            "course_name": "Fullstack Engineering",
            "trainer_name": "Levlox Trainer",
            "status": "Active",
            "student_ids": [student_uid],
        },
        merge=True,
    )
    print("  content  courses / announcements / enrollments / leaderboard /")
    print("           liveClasses / recordedClasses / attendance / notifications /")
    print("           assignments / submissions / payments / batches")

    print("\nDone. Sign in at http://localhost:5173/login")


if __name__ == "__main__":
    main()
