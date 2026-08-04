import { 
  collection, 
  doc, 
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
  onSnapshot,
  serverTimestamp 
} from "firebase/firestore";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";
import { db } from "../config/firebase";
const storage = null;

/**
 * Generic Firestore Helper Functions
 */

// Fetch a single document by collection and ID
export const getDocument = async (collectionName, id) => {
  if (!db) return null;
  try {
    const docRef = doc(db, collectionName, id);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error(`Error fetching document ${id} from ${collectionName}:`, error);
    throw error;
  }
};

// Fetch documents matching query conditions
export const getDocuments = async (collectionName, constraints = []) => {
  if (!db) return [];
  try {
    const colRef = collection(db, collectionName);
    const q = query(colRef, ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (error) {
    console.error(`Error fetching documents from ${collectionName}:`, error);
    throw error;
  }
};

// Set or create a document with specific ID
export const setDocument = async (collectionName, id, data, merge = true) => {
  if (!db) return null;
  try {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge });
    return { id, ...data };
  } catch (error) {
    console.error(`Error setting document in ${collectionName}:`, error);
    throw error;
  }
};

// Add a document with auto-generated ID
export const addDocument = async (collectionName, data) => {
  if (!db) return null;
  try {
    const colRef = collection(db, collectionName);
    const docRef = await addDoc(colRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
};

// Update existing document fields
export const updateDocumentFields = async (collectionName, id, data) => {
  if (!db) return null;
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
    return { id, ...data };
  } catch (error) {
    console.error(`Error updating document ${id} in ${collectionName}:`, error);
    throw error;
  }
};

// Delete a document
export const deleteDocument = async (collectionName, id) => {
  if (!db) return false;
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`Error deleting document ${id} from ${collectionName}:`, error);
    throw error;
  }
};

// Realtime Listener Helper
export const subscribeToCollection = (collectionName, constraints = [], callback) => {
  if (!db) return () => {};
  const colRef = collection(db, collectionName);
  const q = query(colRef, ...constraints);
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    callback(data);
  }, (error) => {
    console.error(`Realtime error in collection ${collectionName}:`, error);
  });
};

/**
 * Firebase Storage Helper Functions
 */

// Upload a file and get secure download URL
export const uploadFile = async (path, file) => {
  if (!storage) return null;
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error(`Error uploading file to ${path}:`, error);
    throw error;
  }
};

// Delete file from Storage
export const deleteFile = async (path) => {
  if (!storage) return false;
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error(`Error deleting file at ${path}:`, error);
    throw error;
  }
};
