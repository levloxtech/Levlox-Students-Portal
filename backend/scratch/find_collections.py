import os
import re

collections = set()
pattern = re.compile(r'db\.([a-zA-Z0-9_]+)')

backend_dir = r"d:\Project-Files\Levlox-Students- Portal\backend"
for root, dirs, files in os.walk(backend_dir):
    for file in files:
        if file.endswith('.py'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    matches = pattern.findall(content)
                    for m in matches:
                        collections.add(m)
            except Exception as e:
                pass

print("Found collection access in code:", sorted(list(collections)))
