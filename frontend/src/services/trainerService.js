import { 
  db, 
  storage, 
  auth 
} from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp, 
  writeBatch,
  increment,
  runTransaction
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  saveBatchAttendance, 
  getDocuments, 
  getDocument,
  awardActivityScore 
} from './firebaseService';
import { changeOwnPassword } from './authService';

/**
 * Fetch all batches assigned to a trainer.
 * Combines query by trainer_uid and assigned_batch_ids array.
 */
export const getTrainerBatches = async (trainerUid, assignedBatchIds = []) => {
  if (!trainerUid) return [];

  try {
    const batchesMap = new Map();

    // 1. Query batches where trainer_uid matches
    const q1 = query(collection(db, "batches"), where("trainer_uid", "==", trainerUid));
    const snap1 = await getDocs(q1);
    snap1.forEach(d => batchesMap.set(d.id, { id: d.id, ...d.data() }));

    // 2. Query by assignedBatchIds if array is not empty
    if (assignedBatchIds && assignedBatchIds.length > 0) {
      // Chunk into 10s for Firestore 'in' limitation
      const chunks = [];
      for (let i = 0; i < assignedBatchIds.length; i += 10) {
        chunks.push(assignedBatchIds.slice(i, i + 10));
      }
      for (const chunk of chunks) {
        const q2 = query(collection(db, "batches"), where("__name__", "in", chunk));
        const snap2 = await getDocs(q2);
        snap2.forEach(d => batchesMap.set(d.id, { id: d.id, ...d.data() }));
      }
    }

    const batchList = Array.from(batchesMap.values());

    // Enrich with accurate student counts
    const allStudents = await getDocuments("students", [limit(1000)]).catch(() => []);
    return batchList.map(b => {
      const studentIdsSet = new Set(b.student_ids || []);
      const matchingStudents = allStudents.filter(s => s.batch_id === b.id || s.batchId === b.id || studentIdsSet.has(s.id));
      const realCount = Math.max(matchingStudents.length, (b.student_ids || []).length, Number(b.students_count) || 0);
      return {
        ...b,
        students_count: realCount
      };
    });
  } catch (err) {
    console.error("[trainerService] getTrainerBatches error:", err);
    return [];
  }
};

/**
 * Fetch all students belonging to the trainer's assigned batches.
 */
export const getTrainerStudents = async (assignedBatchIds = []) => {
  if (!assignedBatchIds || assignedBatchIds.length === 0) return [];

  try {
    const studentMap = new Map();
    const chunks = [];
    for (let i = 0; i < assignedBatchIds.length; i += 10) {
      chunks.push(assignedBatchIds.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      const q1 = query(collection(db, "students"), where("batch_id", "in", chunk));
      const snap1 = await getDocs(q1);
      snap1.forEach(d => studentMap.set(d.id, { id: d.id, ...d.data() }));

      const q2 = query(collection(db, "students"), where("batchId", "in", chunk));
      const snap2 = await getDocs(q2);
      snap2.forEach(d => studentMap.set(d.id, { id: d.id, ...d.data() }));
    }

    return Array.from(studentMap.values());
  } catch (err) {
    console.error("[trainerService] getTrainerStudents error:", err);
    return [];
  }
};

/**
 * Fetch attendance sheets / history for trainer's assigned batches.
 */
export const getTrainerAttendanceSheets = async (assignedBatchIds = []) => {
  if (!assignedBatchIds || assignedBatchIds.length === 0) return [];

  try {
    const sheetMap = new Map();
    const chunks = [];
    for (let i = 0; i < assignedBatchIds.length; i += 10) {
      chunks.push(assignedBatchIds.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      const q1 = query(collection(db, "attendanceSheets"), where("batchId", "in", chunk));
      const snap1 = await getDocs(q1);
      snap1.forEach(d => sheetMap.set(d.id, { id: d.id, ...d.data() }));

      const q2 = query(collection(db, "attendanceSheets"), where("batch_id", "in", chunk));
      const snap2 = await getDocs(q2);
      snap2.forEach(d => sheetMap.set(d.id, { id: d.id, ...d.data() }));
    }

    const list = Array.from(sheetMap.values());
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return list;
  } catch (err) {
    console.error("[trainerService] getTrainerAttendanceSheets error:", err);
    return [];
  }
};

/**
 * Fetch live classes scheduled for trainer's assigned batches or created by trainer.
 */
export const getTrainerLiveClasses = async (trainerUid, assignedBatchIds = []) => {
  try {
    const classMap = new Map();

    if (trainerUid) {
      const q1 = query(collection(db, "liveClasses"), where("trainer_uid", "==", trainerUid));
      const snap1 = await getDocs(q1).catch(() => ({ forEach: () => {} }));
      snap1.forEach(d => classMap.set(d.id, { id: d.id, ...d.data() }));
    }

    if (assignedBatchIds && assignedBatchIds.length > 0) {
      const chunks = [];
      for (let i = 0; i < assignedBatchIds.length; i += 10) {
        chunks.push(assignedBatchIds.slice(i, i + 10));
      }
      for (const chunk of chunks) {
        const q2 = query(collection(db, "liveClasses"), where("batchId", "in", chunk));
        const snap2 = await getDocs(q2).catch(() => ({ forEach: () => {} }));
        snap2.forEach(d => classMap.set(d.id, { id: d.id, ...d.data() }));

        const q3 = query(collection(db, "liveClasses"), where("batch_id", "in", chunk));
        const snap3 = await getDocs(q3).catch(() => ({ forEach: () => {} }));
        snap3.forEach(d => classMap.set(d.id, { id: d.id, ...d.data() }));
      }
    }

    const list = Array.from(classMap.values());
    list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return list;
  } catch (err) {
    console.error("[trainerService] getTrainerLiveClasses error:", err);
    return [];
  }
};

/**
 * Schedule a new live class.
 */
export const createTrainerLiveClass = async (trainerUid, trainerName, data) => {
  const docRef = doc(collection(db, "liveClasses"));
  const payload = {
    ...data,
    trainer_uid: trainerUid,
    trainer_name: trainerName,
    status: data.status || "Upcoming",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await writeBatch(db).set(docRef, payload).commit();
  return { id: docRef.id, ...payload };
};

/**
 * Fetch recorded classes for assigned courses/batches.
 */
export const getTrainerRecordedClasses = async (assignedBatchIds = [], assignedCourseIds = []) => {
  try {
    const list = await getDocuments("recordedClasses");
    if (!assignedBatchIds.length && !assignedCourseIds.length) return list;

    return list.filter(item => {
      const bMatch = item.batchId ? assignedBatchIds.includes(item.batchId) : true;
      const cMatch = item.courseId ? assignedCourseIds.includes(item.courseId) : true;
      return bMatch || cMatch;
    });
  } catch (err) {
    console.error("[trainerService] getTrainerRecordedClasses error:", err);
    return [];
  }
};

/**
 * Add a recorded class / video lesson.
 */
export const createTrainerRecordedClass = async (data) => {
  const docRef = doc(collection(db, "recordedClasses"));
  const payload = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await writeBatch(db).set(docRef, payload).commit();
  return { id: docRef.id, ...payload };
};

/**
 * Fetch announcements for trainer's assigned batches.
 */
export const getTrainerAnnouncements = async (assignedBatchIds = []) => {
  try {
    const list = await getDocuments("announcements", [orderBy("createdAt", "desc"), limit(100)]);
    if (!assignedBatchIds || assignedBatchIds.length === 0) return list;

    return list.filter(item => {
      if (!item.batchId && !item.batch_id) return true; // global
      return assignedBatchIds.includes(item.batchId) || assignedBatchIds.includes(item.batch_id);
    });
  } catch (err) {
    console.error("[trainerService] getTrainerAnnouncements error:", err);
    return [];
  }
};

/**
 * Create announcement for assigned batch.
 */
export const createTrainerAnnouncement = async (trainerName, data) => {
  const docRef = doc(collection(db, "announcements"));
  const payload = {
    ...data,
    author: trainerName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await writeBatch(db).set(docRef, payload).commit();
  return { id: docRef.id, ...payload };
};

/**
 * Upload trainer profile photo to Firebase Storage and update trainers/{uid}.
 */
export const uploadTrainerProfilePic = async (uid, file) => {
  if (!file) throw new Error("No image file selected.");
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!allowed.includes(file.type?.toLowerCase())) {
    throw new Error("Invalid image format. Supported formats: JPG, PNG, WEBP.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File size must be less than 5 MB.");
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `trainerProfiles/${uid}/profile_${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  
  await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadUrl = await getDownloadURL(storageRef);

  const trainerRef = doc(db, "trainers", uid);
  await writeBatch(db).set(trainerRef, {
    profilePic: downloadUrl,
    profile_pic: downloadUrl,
    updatedAt: serverTimestamp(),
  }, { merge: true }).commit();

  return downloadUrl;
};
