import requests
import sys

API_BASE = "http://127.0.0.1:5000/api"

def run_tests():
    print("=================== STARTING DEVICE SESSION TESTS ===================")
    
    # 1. Login as Admin to get token
    print("\n[TEST 1] Logging in as Admin...")
    admin_payload = {
        "phone": "+919876543210",
        "password": "ChangeThisPassword123",
        "device_id": "admin-pc-id",
        "device_type": "desktop",
        "device_label": "Admin Windows PC"
    }
    r = requests.post(f"{API_BASE}/auth/login", json=admin_payload)
    if r.status_code != 200:
        print(f"FAILED Admin login: {r.status_code} {r.text}")
        sys.exit(1)
    admin_token = r.json()["token"]
    print("SUCCESS: Admin logged in.")

    # 2. Register Student
    print("\n[TEST 2] Registering Student...")
    register_payload = {
        "name": "Device Tester Student",
        "phone": "+918765432109",
        "password": "StudentPassword123!"
    }
    r = requests.post(f"{API_BASE}/auth/register", json=register_payload)
    # 201 created or 409 already exists is fine
    if r.status_code not in (201, 409):
        print(f"FAILED Student Registration: {r.status_code} {r.text}")
        sys.exit(1)
    print("SUCCESS: Student registered or already exists.")

    # 3. Student Login on Device A (Mobile)
    print("\n[TEST 3] Student Login on Device A (Mobile)...")
    student_a_payload = {
        "phone": "+918765432109",
        "password": "StudentPassword123!",
        "device_id": "student-mobile-1",
        "device_type": "mobile",
        "device_label": "iPhone 15 Pro"
    }
    r = requests.post(f"{API_BASE}/auth/login", json=student_a_payload)
    if r.status_code != 200:
        print(f"FAILED Student Mobile Login: {r.status_code} {r.text}")
        sys.exit(1)
    student_a_data = r.json()
    student_id = student_a_data["user"]["id"]
    student_a_token = student_a_data["token"]
    print(f"SUCCESS: Student logged in on Mobile. Student ID: {student_id}")

    # 4. Student Login on Device B (Desktop)
    print("\n[TEST 4] Student Login on Device B (Desktop)...")
    student_b_payload = {
        "phone": "+918765432109",
        "password": "StudentPassword123!",
        "device_id": "student-desktop-1",
        "device_type": "desktop",
        "device_label": "MacBook Air"
    }
    r = requests.post(f"{API_BASE}/auth/login", json=student_b_payload)
    if r.status_code != 200:
        print(f"FAILED Student Desktop Login: {r.status_code} {r.text}")
        sys.exit(1)
    student_b_token = r.json()["token"]
    print("SUCCESS: Student logged in on Desktop.")

    # 5. Try Login Student on Device C (Another Mobile - Should be blocked)
    print("\n[TEST 5] Student Login on Device C (Another Mobile - Expecting 409 block)...")
    student_c_payload = {
        "phone": "+918765432109",
        "password": "StudentPassword123!",
        "device_id": "student-mobile-2",
        "device_type": "mobile",
        "device_label": "Samsung S24"
    }
    r = requests.post(f"{API_BASE}/auth/login", json=student_c_payload)
    print(f"Status received: {r.status_code}")
    print(f"Body: {r.text}")
    if r.status_code != 409:
        print("FAILED: Expected 409 conflict but got different status code.")
        sys.exit(1)
    print("SUCCESS: Device C login blocked due to device limit as expected.")

    # 6. Re-login on Device A (Same device should succeed without limit check)
    print("\n[TEST 6] Re-login on Device A (Same Mobile)...")
    r = requests.post(f"{API_BASE}/auth/login", json=student_a_payload)
    if r.status_code != 200:
        print(f"FAILED Re-login on Device A: {r.status_code} {r.text}")
        sys.exit(1)
    print("SUCCESS: Re-login on existing device succeeded.")

    # 7. Admin lists student sessions
    print("\n[TEST 7] Admin listing student sessions...")
    headers = {"Authorization": f"Bearer {admin_token}"}
    r = requests.get(f"{API_BASE}/admin/students/{student_id}/sessions", headers=headers)
    if r.status_code != 200:
        print(f"FAILED to fetch sessions: {r.status_code} {r.text}")
        sys.exit(1)
    sessions = r.json()
    print(f"SUCCESS: Found {len(sessions)} active session(s):")
    mobile_session_id = None
    desktop_session_id = None
    for s in sessions:
        print(f" - {s['device_label']} ({s['device_type']}) - ID: {s['_id']}")
        if s["device_type"] == "mobile":
            mobile_session_id = s["_id"]
        elif s["device_type"] == "desktop":
            desktop_session_id = s["_id"]

    # 8. Admin revokes Mobile session
    print(f"\n[TEST 8] Admin revoking Mobile session ({mobile_session_id})...")
    r = requests.delete(f"{API_BASE}/admin/sessions/{mobile_session_id}", headers=headers)
    if r.status_code != 200:
        print(f"FAILED to revoke session: {r.status_code} {r.text}")
        sys.exit(1)
    print("SUCCESS: Mobile session revoked.")

    # 9. Verify Device A request fails now (session_revoked)
    print("\n[TEST 9] Calling endpoint with revoked Device A token...")
    student_headers = {"Authorization": f"Bearer {student_a_token}"}
    r = requests.get(f"{API_BASE}/auth/my-sessions", headers=student_headers)
    print(f"Status received: {r.status_code}")
    print(f"Body: {r.text}")
    if r.status_code != 401:
        print("FAILED: Expected 401 Unauthorized for revoked session token.")
        sys.exit(1)
    print("SUCCESS: Revoked token was correctly rejected with 401.")

    # 10. Student lists their own sessions using active Desktop token (Device B)
    print("\n[TEST 10] Student listing own sessions with active Desktop token...")
    student_b_headers = {"Authorization": f"Bearer {student_b_token}"}
    r = requests.get(f"{API_BASE}/auth/my-sessions", headers=student_b_headers)
    if r.status_code != 200:
        print(f"FAILED to list own sessions: {r.status_code} {r.text}")
        sys.exit(1)
    my_sessions = r.json()
    print(f"SUCCESS: Student found {len(my_sessions)} session(s):")
    for s in my_sessions:
        print(f" - {s['device_label']} ({s['device_type']}) - ID: {s['_id']}")

    # 11. Student revokes their own Desktop session
    print(f"\n[TEST 11] Student revoking own Desktop session ({desktop_session_id})...")
    r = requests.delete(f"{API_BASE}/auth/my-sessions/{desktop_session_id}", headers=student_b_headers)
    if r.status_code != 200:
        print(f"FAILED to revoke own session: {r.status_code} {r.text}")
        sys.exit(1)
    print("SUCCESS: Own desktop session revoked.")

    # 12. Verify all sessions are empty
    print("\n[TEST 12] Admin checking sessions again...")
    r = requests.get(f"{API_BASE}/admin/students/{student_id}/sessions", headers=headers)
    if r.status_code != 200:
        print(f"FAILED: {r.status_code} {r.text}")
        sys.exit(1)
    remaining = r.json()
    print(f"SUCCESS: Sessions remaining: {len(remaining)}")
    if len(remaining) != 0:
        print("FAILED: Expected 0 remaining sessions.")
        sys.exit(1)

    print("\n=================== ALL TESTS COMPLETED SUCCESSFULLY! ===================")

if __name__ == "__main__":
    run_tests()
