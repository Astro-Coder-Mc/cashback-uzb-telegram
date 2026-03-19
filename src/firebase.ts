import { initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  browserPopupRedirectResolver, 
  browserLocalPersistence, 
  signOut, 
  onAuthStateChanged, 
  User,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocs, updateDoc, onSnapshot, serverTimestamp, collection, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// Use initializeAuth for more control over persistence and resolvers in iframes
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export { 
  signOut, 
  onAuthStateChanged, 
  signInAnonymously,
  signInWithPopup,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  deleteDoc
};
export type { User };
