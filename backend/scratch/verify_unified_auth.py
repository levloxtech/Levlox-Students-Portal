import requests

BASE_URL = "http://localhost:5000/api"

def run_tests():
    print("=================== STARTING UNIFIED AUTH TESTS ===================")
    
    # 1. Test Admin Login (using seeded account)
    print("\n[TEST 1] Testing Admin Login (using seeded credentials)...")
    login_url = f"{BASE_URL}/auth/login"
    admin_payload = {
        "phone": "+919876543210",
        "password": "ChangeThisPassword123"
    }
    
    res = requests.post(login_url, json=admin_payload)
    print(f"Status: {res.status_code}")
    if res.status_code == 200:
        data = res.json()
        admin_token = data["token"]
        print("Success! Admin Role:", data["user"]["role"])
    else:
        print("Failed:", res.text)
        return

    # 2. Test Login with incorrect credentials
    print("\n[TEST 2] Testing login with invalid password...")
    bad_payload = {
        "phone": "+919876543210",
        "password": "WrongPassword123"
    }
    res = requests.post(login_url, json=bad_payload)
    print(f"Status: {res.status_code} (Expected: 401)")
    if res.status_code == 401:
        print("Success! Access denied as expected.")
    else:
        print("Failed: Expected 401, got", res.status_code)

    # 3. Test Student Self-Registration
    print("\n[TEST 3] Testing Student Self-Registration...")
    reg_url = f"{BASE_URL}/auth/register"
    student_phone = "+919988776655"
    reg_payload = {
        "name": "Test Student",
        "phone": student_phone,
        "email": "student@levlox.com",
        "password": "TestPassword123"
    }
    
    # Clean register target phone to allow re-runs
    # (Just in case, we can proceed. The endpoint returns 409 if already exists)
    res = requests.post(reg_url, json=reg_payload)
    print(f"Status: {res.status_code}")
    if res.status_code in [201, 409]:
        print("Success! Student registered or already exists.")
    else:
        print("Failed:", res.text)
        return

    # 4. Test Student Login
    print("\n[TEST 4] Testing Student Login...")
    student_payload = {
        "phone": student_phone,
        "password": "TestPassword123"
    }
    res = requests.post(login_url, json=student_payload)
    print(f"Status: {res.status_code}")
    if res.status_code == 200:
        data = res.json()
        student_token = data["token"]
        print("Success! Student Role:", data["user"]["role"])
    else:
        print("Failed:", res.text)
        return

    # 5. Test Admin-Creates-Admin endpoint
    print("\n[TEST 5] Testing Admin-Creates-Admin...")
    create_admin_url = f"{BASE_URL}/admin/create-admin"
    headers = {"Authorization": f"Bearer {admin_token}"}
    new_admin_payload = {
        "name": "Secondary Admin",
        "phone": "+918887776666",
        "email": "secadmin@levlox.com",
        "password": "SecAdminPassword123"
    }
    res = requests.post(create_admin_url, json=new_admin_payload, headers=headers)
    print(f"Status: {res.status_code}")
    if res.status_code in [201, 409]:
        print("Success! Admin created or already exists.")
    else:
        print("Failed:", res.text)

    # 6. Test Forgot Password Reset (using mock firebase token)
    print("\n[TEST 6] Testing Forgot Password Reset Flow...")
    reset_url = f"{BASE_URL}/auth/reset-password"
    mock_token = f"mock-token-{student_phone}"
    reset_payload = {
        "idToken": mock_token,
        "newPassword": "NewStudentPassword123!"
    }
    res = requests.post(reset_url, json=reset_payload)
    print(f"Status: {res.status_code}")
    if res.status_code == 200:
        print("Success! Password reset successfully.")
    else:
        print("Failed:", res.text)
        return

    # 7. Test Login with new password
    print("\n[TEST 7] Testing login with new password...")
    new_student_payload = {
        "phone": student_phone,
        "password": "NewStudentPassword123!"
    }
    res = requests.post(login_url, json=new_student_payload)
    print(f"Status: {res.status_code}")
    if res.status_code == 200:
        print("Success! Logged in using the newly reset password.")
    else:
        print("Failed to login with new password:", res.text)
        
    print("\n=================== ALL TESTS COMPLETED ===================")

if __name__ == "__main__":
    run_tests()
