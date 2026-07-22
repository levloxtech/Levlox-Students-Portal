import datetime
import gridfs
from pymongo import MongoClient
from config import Config

class CombinedCursor:
    def __init__(self, colls, filter, *args, **kwargs):
        self.results = []
        for c in colls:
            self.results.extend(list(c.find(filter, *args, **kwargs)))
        self.index = 0

    def __iter__(self):
        return iter(self.results)

    def skip(self, num):
        self.results = self.results[num:]
        return self

    def limit(self, num):
        self.results = self.results[:num]
        return self

    def sort(self, *args, **kwargs):
        if args:
            key = args[0]
            direction = args[1] if len(args) > 1 else 1
            if isinstance(key, list):
                for k, d in reversed(key):
                    self.results.sort(key=lambda x: x.get(k) if x.get(k) is not None else "", reverse=(d == -1))
            else:
                self.results.sort(key=lambda x: x.get(key) if x.get(key) is not None else "", reverse=(direction == -1))
        return self

class VirtualCollection:
    def __init__(self, db_obj, admins_coll, students_coll):
        self.db = db_obj
        self.admins = admins_coll
        self.students = students_coll

    def _get_target_colls(self, query):
        if not query:
            return [self.students, self.admins]
        role = query.get("role")
        if role == "admin":
            return [self.admins]
        elif role == "student":
            return [self.students]
        if any(k in query for k in ["rollNumber", "feesStatus", "feesPaid", "batch_id", "attendance", "attendance_history", "student_ids"]):
            return [self.students]
        return [self.students, self.admins]

    def find_one(self, filter=None, *args, **kwargs):
        if filter is None:
            filter = {}
        colls = self._get_target_colls(filter)
        for c in colls:
            res = c.find_one(filter, *args, **kwargs)
            if res:
                return res
        return None

    def find(self, filter=None, *args, **kwargs):
        if filter is None:
            filter = {}
        colls = self._get_target_colls(filter)
        if len(colls) == 1:
            return colls[0].find(filter, *args, **kwargs)
        return CombinedCursor(colls, filter, *args, **kwargs)

    def insert_one(self, document, *args, **kwargs):
        role = document.get("role")
        if role == "admin":
            return self.admins.insert_one(document, *args, **kwargs)
        else:
            return self.students.insert_one(document, *args, **kwargs)

    def update_one(self, filter, update, *args, **kwargs):
        colls = self._get_target_colls(filter)
        for c in colls:
            res = c.update_one(filter, update, *args, **kwargs)
            if res.matched_count > 0:
                return res
        return colls[0].update_one(filter, update, *args, **kwargs)

    def update_many(self, filter, update, *args, **kwargs):
        colls = self._get_target_colls(filter)
        matched = 0
        modified = 0
        for c in colls:
            res = c.update_many(filter, update, *args, **kwargs)
            matched += res.matched_count
            modified += res.modified_count
        
        class DummyResult:
            def __init__(self, mt, md):
                self.matched_count = mt
                self.modified_count = md
        return DummyResult(matched, modified)

    def delete_one(self, filter, *args, **kwargs):
        colls = self._get_target_colls(filter)
        for c in colls:
            res = c.delete_one(filter, *args, **kwargs)
            if res.deleted_count > 0:
                return res
        return colls[0].delete_one(filter, *args, **kwargs)

    def count_documents(self, filter, *args, **kwargs):
        colls = self._get_target_colls(filter)
        count = 0
        for c in colls:
            count += c.count_documents(filter, *args, **kwargs)
        return count

class DatabaseWrapper:
    def __init__(self, pymongo_db):
        self._db = pymongo_db

    def __getattr__(self, name):
        if name == "attendance_sheets":
            return self._db["attendance"]
        elif name == "live_class_activity":
            return self._db["activity_scores"]
        elif name == "users":
            return VirtualCollection(self._db, self._db["admins"], self._db["students"])
        return getattr(self._db, name)

    def __getitem__(self, name):
        return self.__getattr__(name)

    def get_default_database(self):
        return self

    def command(self, *args, **kwargs):
        return self._db.command(*args, **kwargs)

    def list_collection_names(self, *args, **kwargs):
        names = self._db.list_collection_names(*args, **kwargs)
        mapped_names = set()
        for n in names:
            if n == "attendance":
                mapped_names.add("attendance_sheets")
            elif n == "activity_scores":
                mapped_names.add("live_class_activity")
            elif n in ["admins", "students"]:
                mapped_names.add("users")
            else:
                mapped_names.add(n)
        return list(mapped_names)

try:
    client = MongoClient(
        Config.MONGO_URI,
        maxPoolSize=50,
        minPoolSize=5,
        maxIdleTimeMS=45000,
        connectTimeoutMS=5000,
        socketTimeoutMS=10000,
        serverSelectionTimeoutMS=5000,
        retryWrites=True
    )
    client.admin.command('ping')
    # Explicitly select levlox_student_portal database
    raw_db = client["levlox_student_portal"]
    db = DatabaseWrapper(raw_db)
    print(f"Successfully connected to MongoDB Atlas! Database: {raw_db.name}")
except Exception as e:
    print(f"Error connecting to MongoDB Atlas: {e}. Falling back to local MongoDB.")
    client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
    raw_db = client["levlox_student_portal"]
    db = DatabaseWrapper(raw_db)
    print(f"Successfully connected to Local MongoDB! Database: {raw_db.name}")


