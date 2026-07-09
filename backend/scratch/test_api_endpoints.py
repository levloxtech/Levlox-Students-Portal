import requests

def test_endpoints():
    print("Testing backend HTTP endpoints via requests...")
    
    # 1. Login
    login_url = "http://localhost:5000/api/auth/login"
    login_payload = {
        "phone": "9999988888",
        "password": "studentpass123"
    }
    
    try:
        res = requests.post(login_url, json=login_payload)
        print(f"Login Response Status: {res.status_code}")
        if res.status_code != 200:
            print(f"Login failed: {res.text}")
            return
            
        data = res.json()
        token = data.get('token')
        print("Login successful! Token acquired.")
    except Exception as e:
        print(f"Failed to connect to backend for login: {e}")
        return

    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Test /student/dashboard
    try:
        res = requests.get("http://localhost:5000/api/student/dashboard", headers=headers)
        print(f"GET /student/dashboard Status: {res.status_code}")
        if res.status_code != 200:
            print(res.text)
    except Exception as e:
        print(f"Error testing dashboard: {e}")

    # 3. Test /student/leaderboard/overall
    try:
        res = requests.get("http://localhost:5000/api/student/leaderboard/overall", headers=headers)
        print(f"GET /student/leaderboard/overall Status: {res.status_code}")
        if res.status_code != 200:
            print(res.text)
        else:
            print(f"Overall Leaderboard items: {len(res.json())}")
    except Exception as e:
        print(f"Error testing overall leaderboard: {e}")

    # 4. Test /student/leaderboard/mock
    try:
        res = requests.get("http://localhost:5000/api/student/leaderboard/mock", headers=headers)
        print(f"GET /student/leaderboard/mock Status: {res.status_code}")
        if res.status_code != 200:
            print(res.text)
        else:
            print(f"Mock Leaderboard items: {len(res.json())}")
    except Exception as e:
        print(f"Error testing mock leaderboard: {e}")

    # 5. Test /student/leaderboard/tasks
    try:
        res = requests.get("http://localhost:5000/api/student/leaderboard/tasks", headers=headers)
        print(f"GET /student/leaderboard/tasks Status: {res.status_code}")
        if res.status_code != 200:
            print(res.text)
        else:
            print(f"Task Leaderboard items: {len(res.json())}")
    except Exception as e:
        print(f"Error testing task leaderboard: {e}")

if __name__ == '__main__':
    test_endpoints()
