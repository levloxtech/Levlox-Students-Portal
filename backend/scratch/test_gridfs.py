import os
import gridfs
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

def test_gridfs():
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("MONGO_URI not found!")
        return

    print("Connecting to MongoDB Atlas...")
    client = MongoClient(mongo_uri)
    db = client["levlox_student_portal"]
    fs = gridfs.GridFS(db)

    print("Testing GridFS write (put)...")
    test_data = b"Hello, this is a GridFS integration test document."
    file_id = fs.put(test_data, filename="test_gridfs.txt", content_type="text/plain")
    print(f"File uploaded successfully! ID: {file_id}")

    # Check collections
    print("Collections in database:")
    print(db.list_collection_names())

    print("Testing GridFS read (get)...")
    file_obj = fs.get(file_id)
    retrieved_data = file_obj.read()
    print(f"Retrieved content: {retrieved_data}")
    assert retrieved_data == test_data, "Data mismatch!"

    print("Testing GridFS delete...")
    fs.delete(file_id)
    print("File deleted from GridFS successfully.")

    if not fs.exists(file_id):
        print("GridFS Verification Successful!")
    else:
        print("Error: File still exists in GridFS!")

if __name__ == "__main__":
    test_gridfs()
