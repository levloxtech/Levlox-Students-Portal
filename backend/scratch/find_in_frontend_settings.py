file_path = r"D:\Project-Files\Levlox-Students- Portal\frontend\src\pages\StudentSettings.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("StudentSettings Occurrences:")
for i, line in enumerate(lines):
    if "tab" in line.lower() or "active" in line.lower() or "settings" in line.lower() or "devices" in line.lower():
        if len(line.strip()) < 100: # print short lines only
            print(f"Line {i+1}: {line.strip()}")
