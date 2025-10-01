import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FB_API_KEY,
  authDomain: process.env.REACT_APP_FB_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FB_PROJECT_ID,
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export async function incrementListenCount(trackId) {
  const ref = doc(db, "listenCounts", trackId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { count: 1 });
  } else {
    await updateDoc(ref, { count: increment(1) });
  }
}

export async function getListenCount(trackId) {
  const ref = doc(db, "listenCounts", trackId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().count : 0;
}
