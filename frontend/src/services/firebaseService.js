/**
 * Firebase Service Layer — Levlox Student Portal
 *
 * All Firestore and Firebase Storage operations are centralized here.
 * Collections: students, admins, courses, liveClasses, recordedClasses,
 *   announcements, attendance, assignments, submissions, leaderboard,
 *   notifications, analytics, settings, payments, enrollments
 */

import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  getCountFromServer,
  writeBatch,
  increment,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../firebase";

/**
 * Safety cap for list reads. Every collection query gets a bound so a growing
 * database can never turn one page load into thousands of document reads.
 * Screens that need more use the paginated helpers below.
 */
export const DEFAULT_LIST_LIMIT = 200;

/** Firestore allows at most 30 values in an `in` / `documentId() in` filter. */
const IN_QUERY_CHUNK_SIZE = 30;

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// ─────────────────────────────────────────────────────────────────────────────
// Error Classification
// ─────────────────────────────────────────────────────────────────────────────

export const classifyFirestoreError = (error) => {
  const code = error?.code || "";
  if (code === "permission-denied") return { type: "permission", message: "You do not have permission to perform this action." };
  if (code === "not-found") return { type: "not-found", message: "The requested record was not found." };
  if (code === "unavailable" || code === "failed-precondition") return { type: "offline", message: "You appear to be offline. Please check your connection." };
  if (code === "resource-exhausted") return { type: "quota", message: "Request quota exceeded. Please try again later." };
  return { type: "unknown", message: error?.message || "An unexpected error occurred." };
};

// ─────────────────────────────────────────────────────────────────────────────
// Generic Firestore Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch a single document by collection name and document ID */
export const getDocument = async (collectionName, id) => {
  try {
    const snap = await getDoc(doc(db, collectionName, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error(`[Firestore] getDocument(${collectionName}/${id}):`, error);
    throw error;
  }
};

/** Fetch documents matching query constraints */
export const getDocuments = async (collectionName, constraints = []) => {
  try {
    const q = query(collection(db, collectionName), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error(`[Firestore] getDocuments(${collectionName}):`, error);
    throw error;
  }
};

/** Set (create/overwrite) a document with a specific ID */
export const setDocument = async (collectionName, id, data, merge = true) => {
  try {
    await setDoc(doc(db, collectionName, id), { ...data, updatedAt: serverTimestamp() }, { merge });
    return { id, ...data };
  } catch (error) {
    console.error(`[Firestore] setDocument(${collectionName}/${id}):`, error);
    throw error;
  }
};

/** Add a document with an auto-generated ID */
export const addDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error(`[Firestore] addDocument(${collectionName}):`, error);
    throw error;
  }
};

/** Update specific fields of an existing document */
export const updateDocumentFields = async (collectionName, id, data) => {
  try {
    await updateDoc(doc(db, collectionName, id), { ...data, updatedAt: serverTimestamp() });
    return { id, ...data };
  } catch (error) {
    console.error(`[Firestore] updateDocumentFields(${collectionName}/${id}):`, error);
    throw error;
  }
};

/** Delete a document */
export const deleteDocument = async (collectionName, id) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
    return true;
  } catch (error) {
    console.error(`[Firestore] deleteDocument(${collectionName}/${id}):`, error);
    throw error;
  }
};

/** Subscribe to a collection with real-time updates */
export const subscribeToCollection = (collectionName, constraints = [], callback, onError) => {
  const q = query(collection(db, collectionName), ...constraints);
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => {
      console.error(`[Firestore] snapshot error in ${collectionName}:`, error);
      if (onError) onError(classifyFirestoreError(error));
    }
  );
};

/** Subscribe to a single document with real-time updates */
export const subscribeToDocument = (collectionName, id, callback, onError) => {
  return onSnapshot(
    doc(db, collectionName, id),
    (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (error) => {
      console.error(`[Firestore] snapshot doc error ${collectionName}/${id}:`, error);
      if (onError) onError(classifyFirestoreError(error));
    }
  );
};

/** Parallel batch fetch — accepts array of {collection, id} objects */
export const batchGet = async (requests) => {
  const results = await Promise.all(
    requests.map(({ collectionName, id }) => getDocument(collectionName, id))
  );
  return results;
};

/** Parallel batch query — accepts array of {collection, constraints} objects */
export const batchQuery = async (queries) => {
  const results = await Promise.all(
    queries.map(({ collectionName, constraints }) => getDocuments(collectionName, constraints || []))
  );
  return results;
};

/** Get paginated documents with cursor */
export const getPaginatedDocuments = async (collectionName, constraints = [], pageSize = 20, lastDoc = null) => {
  try {
    const paginationConstraints = lastDoc
      ? [...constraints, startAfter(lastDoc), limit(pageSize)]
      : [...constraints, limit(pageSize)];
    const q = query(collection(db, collectionName), ...paginationConstraints);
    const snap = await getDocs(q);
    return {
      docs: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      lastDoc: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === pageSize,
    };
  } catch (error) {
    console.error(`[Firestore] getPaginatedDocuments(${collectionName}):`, error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS
// ─────────────────────────────────────────────────────────────────────────────

export const getStudent = (uid) => getDocument("students", uid);

export const updateStudent = (uid, data) => updateDocumentFields("students", uid, data);

export const createStudent = (uid, data) =>
  setDocument("students", uid, { ...data, role: "student", status: "active", createdAt: serverTimestamp() }, false);

export const listStudents = (constraints = []) =>
  getDocuments("students", [...constraints, limit(DEFAULT_LIST_LIMIT)]);

/** Server-side count — one read instead of downloading the collection. */
export const getStudentCount = async () => {
  const snap = await getCountFromServer(collection(db, "students"));
  return snap.data().count;
};

/**
 * Fetch specific students by document ID. Splits into chunks because Firestore
 * caps `in` filters at 30 values, and runs the chunks in parallel.
 */
export const getStudentsByIds = async (ids = []) => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const groups = await Promise.all(
    chunk(unique, IN_QUERY_CHUNK_SIZE).map((group) =>
      getDocuments("students", [where(documentId(), "in", group)])
    )
  );
  return groups.flat();
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMINS
// ─────────────────────────────────────────────────────────────────────────────

export const getAdmin = (uid) => getDocument("admins", uid);

export const createAdmin = (uid, data) =>
  setDocument("admins", uid, { ...data, role: "admin" }, false);

export const listAdmins = () => getDocuments("admins");

// ─────────────────────────────────────────────────────────────────────────────
// COURSES
// ─────────────────────────────────────────────────────────────────────────────

export const getCourses = () =>
  getDocuments("courses", [orderBy("createdAt", "desc"), limit(DEFAULT_LIST_LIMIT)]);

export const getCourse = (id) => getDocument("courses", id);

export const addCourse = (data) => addDocument("courses", data);

export const updateCourse = (id, data) => updateDocumentFields("courses", id, data);

export const deleteCourse = (id) => deleteDocument("courses", id);

// ─────────────────────────────────────────────────────────────────────────────
// LIVE CLASSES
// ─────────────────────────────────────────────────────────────────────────────

export const getLiveClasses = (constraints = []) =>
  getDocuments("liveClasses", [orderBy("date", "asc"), ...constraints, limit(DEFAULT_LIST_LIMIT)]);

/** Students only need the next few sessions, not the entire schedule history. */
export const getUpcomingLiveClasses = async (max = 20) => {
  try {
    return await getDocuments("liveClasses", [
      where("status", "in", ["scheduled", "live", "Live", "Upcoming"]),
      limit(max),
    ]);
  } catch (error) {
    console.warn("[Firestore] getUpcomingLiveClasses fallback:", error);
    try {
      const all = await getDocuments("liveClasses");
      return (all || [])
        .filter(c => ["scheduled", "live", "Live", "Upcoming"].includes(c?.status))
        .slice(0, max);
    } catch {
      return [];
    }
  }
};

export const addLiveClass = (data) => addDocument("liveClasses", data);

export const updateLiveClass = (id, data) => updateDocumentFields("liveClasses", id, data);

export const deleteLiveClass = (id) => deleteDocument("liveClasses", id);

// ─────────────────────────────────────────────────────────────────────────────
// RECORDED CLASSES
// ─────────────────────────────────────────────────────────────────────────────

export const getRecordedClasses = (constraints = []) =>
  getDocuments("recordedClasses", [orderBy("createdAt", "desc"), ...constraints, limit(DEFAULT_LIST_LIMIT)]);

export const addRecordedClass = (data) => addDocument("recordedClasses", data);

export const updateRecordedClass = (id, data) => updateDocumentFields("recordedClasses", id, data);

export const deleteRecordedClass = (id) => deleteDocument("recordedClasses", id);

// ─────────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const getAnnouncements = (constraints = []) =>
  getDocuments("announcements", [orderBy("createdAt", "desc"), ...constraints, limit(DEFAULT_LIST_LIMIT)]);

export const addAnnouncement = (data) => addDocument("announcements", data);

export const updateAnnouncement = (id, data) => updateDocumentFields("announcements", id, data);

export const deleteAnnouncement = (id) => deleteDocument("announcements", id);

export const subscribeAnnouncements = (callback, onError) =>
  subscribeToCollection("announcements", [orderBy("createdAt", "desc"), limit(50)], callback, onError);

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────

export const getAttendanceForStudent = async (studentId, constraints = []) => {
  if (!studentId) return [];
  try {
    // 1. Primary query: studentId field
    return await getDocuments("attendance", [
      where("studentId", "==", studentId),
      orderBy("date", "desc"),
      ...constraints,
      limit(DEFAULT_LIST_LIMIT),
    ]);
  } catch (error) {
    console.warn('[firebaseService] Primary getAttendanceForStudent query failed, trying fallback query:', error);
    try {
      // 2. Fallback query: check both studentId & student_id without orderBy (prevents index errors)
      const [byStudentId, byStudent_id] = await Promise.all([
        getDocuments("attendance", [where("studentId", "==", studentId), limit(DEFAULT_LIST_LIMIT)]).catch(() => []),
        getDocuments("attendance", [where("student_id", "==", studentId), limit(DEFAULT_LIST_LIMIT)]).catch(() => []),
      ]);
      const merged = [...byStudentId, ...byStudent_id];
      const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
      unique.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return unique;
    } catch (fallbackError) {
      console.error('[firebaseService] getAttendanceForStudent fallback failed:', fallbackError);
      throw error;
    }
  }
};

export const getAttendanceSheet = (constraints = []) =>
  getDocuments("attendance", [orderBy("date", "desc"), ...constraints, limit(DEFAULT_LIST_LIMIT)]);

export const markAttendance = (data) => addDocument("attendance", data);

export const updateAttendance = (id, data) => updateDocumentFields("attendance", id, data);

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const getAssignments = (constraints = []) =>
  getDocuments("assignments", [orderBy("dueDate", "asc"), ...constraints]);

export const getAssignmentsForCourse = (courseId) =>
  getDocuments("assignments", [where("courseId", "==", courseId), orderBy("dueDate", "asc")]);

export const addAssignment = (data) => addDocument("assignments", data);

export const updateAssignment = (id, data) => updateDocumentFields("assignments", id, data);

export const deleteAssignment = (id) => deleteDocument("assignments", id);

// ─────────────────────────────────────────────────────────────────────────────
// SUBMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getSubmissionsForStudent = (studentId) =>
  getDocuments("submissions", [where("studentId", "==", studentId)]);

export const getSubmissionsForAssignment = (assignmentId) =>
  getDocuments("submissions", [where("assignmentId", "==", assignmentId)]);

export const submitAssignment = (data) => addDocument("submissions", { ...data, submittedAt: serverTimestamp() });

export const updateSubmission = (id, data) => updateDocumentFields("submissions", id, data);

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────────────────────────────────────

export const getLeaderboard = (max = 100, constraints = []) =>
  getDocuments("leaderboard", [orderBy("score", "desc"), ...constraints, limit(max)]);

export const updateLeaderboardEntry = (id, data) => updateDocumentFields("leaderboard", id, data);

export const setLeaderboardEntry = (uid, data) => setDocument("leaderboard", uid, data);

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getNotificationsForUser = (userId, constraints = []) =>
  getDocuments("notifications", [where("userId", "==", userId), orderBy("createdAt", "desc"), ...constraints]);

export const markNotificationRead = (id) => updateDocumentFields("notifications", id, { read: true });

export const addNotification = (data) => addDocument("notifications", data);

export const subscribeNotifications = (userId, callback, onError) =>
  subscribeToCollection(
    "notifications",
    [where("userId", "==", userId), orderBy("createdAt", "desc"), limit(30)],
    callback,
    onError
  );

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

export const getStudentAnalytics = (studentId) => getDocument("analytics", studentId);

export const updateAnalytics = (studentId, data) => updateDocumentFields("analytics", studentId, data);

export const setAnalytics = (studentId, data) => setDocument("analytics", studentId, data);

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

export const getSettings = (userId) => getDocument("settings", userId);

export const updateSettings = (userId, data) => setDocument("settings", userId, data);

export const getGlobalSettings = () => getDocument("settings", "global");

export const updateGlobalSettings = (data) => setDocument("settings", "global", data);

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS / FEES
// ─────────────────────────────────────────────────────────────────────────────

export const getPaymentsForStudent = (studentId) =>
  getDocuments("payments", [where("studentId", "==", studentId), orderBy("createdAt", "desc")]);

export const getAllPayments = (constraints = []) =>
  getDocuments("payments", [orderBy("createdAt", "desc"), ...constraints, limit(DEFAULT_LIST_LIMIT)]);

export const recordPayment = (data) => addDocument("payments", data);

export const updatePayment = (id, data) => updateDocumentFields("payments", id, data);

// ─────────────────────────────────────────────────────────────────────────────
// ENROLLMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const getEnrollmentsForStudent = (studentId) =>
  getDocuments("enrollments", [where("studentId", "==", studentId)]);

export const getEnrollmentsForCourse = (courseId) =>
  getDocuments("enrollments", [where("courseId", "==", courseId)]);

export const enrollStudent = (studentId, courseId, data = {}) =>
  addDocument("enrollments", { studentId, courseId, enrolledAt: serverTimestamp(), ...data });

export const unenrollStudent = (enrollmentId) => deleteDocument("enrollments", enrollmentId);

// ─────────────────────────────────────────────────────────────────────────────
// BATCHES
// ─────────────────────────────────────────────────────────────────────────────

export const getBatches = () => getDocuments("batches", [limit(DEFAULT_LIST_LIMIT)]);

export const addBatch = (data) =>
  addDocument("batches", {
    ...data,
    code: data.code || `BAT-${Math.floor(1000 + Math.random() * 9000)}`,
    student_ids: data.student_ids || [],
  });

export const updateBatch = (id, data) => updateDocumentFields("batches", id, data);

export const deleteBatch = (id) => deleteDocument("batches", id);

/** Students assigned to a batch, resolved from student documents AND batch student_ids array. */
export const getStudentsByBatch = async (batchId) => {
  if (!batchId) return [];
  const batch = await getDocument("batches", batchId);
  const [byBatchField, byStudentIds] = await Promise.all([
    getDocuments("students", [where("batch_id", "==", batchId)]).catch(() => []),
    batch?.student_ids && batch.student_ids.length > 0
      ? getStudentsByIds(batch.student_ids).catch(() => [])
      : Promise.resolve([])
  ]);
  const merged = [...byBatchField, ...byStudentIds];
  const uniqueMap = new Map();
  merged.forEach(s => uniqueMap.set(s.id, s));
  return Array.from(uniqueMap.values());
};


/**
 * Replace a batch's student roster and keep each student's `batch_id` in sync.
 * Runs as an atomic batched write so the two sides can never diverge.
 */
export const assignStudentsToBatch = async (batchId, studentIds = []) => {
  const existing = await getDocument("batches", batchId);
  if (!existing) {
    throw new Error("Batch document not found.");
  }

  // Find all students currently linked to this batch in Firestore
  const allCurrentInBatch = await getDocuments("students", [where("batch_id", "==", batchId)]).catch(() => []);
  const allPreviousIds = Array.from(new Set([
    ...(existing?.student_ids || []),
    ...allCurrentInBatch.map(s => s.id)
  ]));

  const removedIds = allPreviousIds.filter((id) => !studentIds.includes(id));

  const batch = writeBatch(db);
  batch.set(doc(db, "batches", batchId), {
    student_ids: studentIds,
    students_count: studentIds.length,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  studentIds.forEach((sid) => {
    batch.set(doc(db, "students", sid), {
      batch_id: batchId,
      batch_name: existing?.name || "",
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  removedIds.forEach((sid) => {
    batch.set(doc(db, "students", sid), {
      batch_id: "",
      batch_name: "",
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  await batch.commit();
  return { batchId, studentIds };
};

/** Unassign a single student from a batch */
export const unassignStudentFromBatch = async (batchId, studentId) => {
  const existing = await getDocument("batches", batchId);
  if (!existing) {
    throw new Error("Batch document not found.");
  }
  const currentIds = existing.student_ids || [];
  const updatedIds = currentIds.filter(id => id !== studentId);

  const batch = writeBatch(db);
  batch.set(doc(db, "batches", batchId), {
    student_ids: updatedIds,
    students_count: updatedIds.length,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  batch.set(doc(db, "students", studentId), {
    batch_id: "",
    batch_name: "",
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await batch.commit();
  return { batchId, studentId };
};

// ─────────────────────────────────────────────────────────────────────────────
// TRAINERS / INSTRUCTORS (MASTER DATA)
// ─────────────────────────────────────────────────────────────────────────────

export const getTrainers = () =>
  getDocuments("trainers", [orderBy("createdAt", "desc"), limit(DEFAULT_LIST_LIMIT)]);

export const getTrainer = (id) => getDocument("trainers", id);

export const addTrainer = (data) => addDocument("trainers", data);

export const updateTrainer = (id, data) => updateDocumentFields("trainers", id, data);

export const deleteTrainer = (id) => deleteDocument("trainers", id);

// ─────────────────────────────────────────────────────────────────────────────
// MASTER DATA SUMMARY HELPER
// ─────────────────────────────────────────────────────────────────────────────

export const getMasterData = async () => {
  const [courses, trainers] = await Promise.all([
    getCourses().catch(() => []),
    getTrainers().catch(() => []),
  ]);
  return {
    courses,
    trainers,
    feeStatuses: ["Paid", "Pending Payment", "Partial", "Overdue"],
    accountStatuses: ["active", "disabled", "pending"],
  };
};


// ─────────────────────────────────────────────────────────────────────────────
// LIVE CLASS ACTIVITY SCORES
// ─────────────────────────────────────────────────────────────────────────────

export const getActivityLogs = (max = 100) =>
  getDocuments("activityScores", [orderBy("createdAt", "desc"), limit(max)]);

/**
 * Record an activity award and bump the student's cached points in one atomic
 * write, so the log and the running total cannot drift apart.
 */
export const awardActivityScore = async ({
  studentId,
  studentName,
  batchId,
  batchName,
  date,
  meeting,
  activityType,
  points,
  remarks = "",
  awardedBy,
}) => {
  const numericPoints = Number.parseInt(points, 10);
  if (Number.isNaN(numericPoints)) throw new Error("Points must be a whole number.");

  const batch = writeBatch(db);
  const logRef = doc(collection(db, "activityScores"));

  batch.set(logRef, {
    studentId,
    studentName: studentName || "",
    batchId,
    batchName: batchName || "",
    date,
    meeting,
    activityType,
    points: numericPoints,
    remarks,
    awardedBy: awardedBy || null,
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, "students", studentId), {
    activityPoints: increment(numericPoints),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return { id: logRef.id, points: numericPoints };
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY PRESETS
// ─────────────────────────────────────────────────────────────────────────────

export const getActivityPresets = () =>
  getDocuments("activityPresets", [orderBy("points", "desc"), limit(50)]);

export const addActivityPreset = (label, points) =>
  addDocument("activityPresets", { label: String(label).trim(), points: Number.parseInt(points, 10) });

export const deleteActivityPreset = (id) => deleteDocument("activityPresets", id);

// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE STORAGE
// ─────────────────────────────────────────────────────────────────────────────

/** Upload a file to Firebase Storage and return its download URL */
export const uploadFile = async (path, file, metadata = {}) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error(`[Storage] uploadFile(${path}):`, error);
    throw error;
  }
};

/** Delete a file from Firebase Storage */
export const deleteFile = async (path) => {
  try {
    await deleteObject(ref(storage, path));
    return true;
  } catch (error) {
    console.error(`[Storage] deleteFile(${path}):`, error);
    throw error;
  }
};

/** Upload student profile image */
export const uploadProfileImage = async (uid, file) => {
  if (!file) throw new Error("No image file provided.");
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error("Only JPG, PNG, and WEBP image formats are supported.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image file size exceeds the 5 MB limit.");
  }
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const downloadUrl = await uploadFile(`studentProfiles/${uid}/profile.${ext}`, file, { contentType: file.type || 'image/jpeg' });
  return downloadUrl;
};

/** Upload assignment submission file */
export const uploadSubmissionFile = async (assignmentId, studentId, file) => {
  const ext = file.name.split(".").pop();
  return uploadFile(`assignments/${assignmentId}/submissions/${studentId}.${ext}`, file, { contentType: file.type });
};

/** Upload course thumbnail */
export const uploadCourseThumbnail = async (courseId, file) => {
  const ext = file.name.split(".").pop();
  return uploadFile(`courses/${courseId}/thumbnail.${ext}`, file, { contentType: file.type });
};

/** Upload study material / notes */
export const uploadStudyMaterial = async (docId, file) => {
  const ext = file.name.split(".").pop();
  return uploadFile(`notes/${docId}.${ext}`, file, { contentType: file.type });
};

/** Upload student certificate */
export const uploadCertificate = async (uid, certId, file) => {
  const ext = file.name.split(".").pop();
  return uploadFile(`certificates/${uid}/${certId}.${ext}`, file, { contentType: file.type });
};
