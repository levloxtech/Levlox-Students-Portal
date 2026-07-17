import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
mongo_uri = os.getenv("MONGO_URI")
print(f"Connecting to: {mongo_uri}")
try:
    # Try with tlsAllowInvalidCertificates
    client = MongoClient(mongo_uri, tlsAllowInvalidCertificates=True)
    client.admin.command('ping')
    print("Connection with tlsAllowInvalidCertificates=True successful!")
    print("Databases:", client.list_database_names())
except Exception as e:
    import traceback
    print("Failed with tlsAllowInvalidCertificates=True:")
    traceback.print_exc()

try:
    # Try direct connection string modification or different options
    client = MongoClient(mongo_uri, ssl=True, tlsAllowInvalidCertificates=True)
    client.admin.command('ping')
    print("Connection with ssl=True & tlsAllowInvalidCertificates=True successful!")
    print("Databases:", client.list_database_names())
except Exception as e:
    import traceback
    print("Failed with ssl=True:")
    traceback.print_exc()
