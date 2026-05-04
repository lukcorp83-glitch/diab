import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  try {
    const user = await signInAnonymously(auth);
    console.log("TESTING -> User:", user.user.uid);
    await getDoc(doc(db, 'artifacts', 'diacontrolapp', 'tests', 'abcdefg'));
    console.log("Success read tests");
  } catch(e) {
    console.error("Error:", e.message);
  }
  process.exit(0);
}
run();
