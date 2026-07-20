import re

file_path = r"D:\Project-Files\Levlox-Students- Portal\frontend\src\pages\AdminDashboard.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Occurrences:")
for i, line in enumerate(lines):
    if "selectedStudentDetails" in line or "showDetailsModal" in line:
        print(f"Line {i+1}: {line.strip()}")
