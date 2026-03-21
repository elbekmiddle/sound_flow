import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let firebaseApp;

export function initFirebase() {
  if (firebaseApp) return firebaseApp;

  let credential;

  // Option 1: Service account JSON file
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountPath) {
    try {
      const serviceAccount = JSON.parse(
        readFileSync(path.resolve(__dirname, '..', serviceAccountPath), 'utf-8')
      );
      credential = admin.credential.cert(serviceAccount);
    } catch (e) {
      console.warn('⚠️  Firebase service account file not found, using env vars');
    }
  }

  // Option 2: Individual env vars
  if (!credential) {
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    });
  }

  firebaseApp = admin.initializeApp({ credential });
  console.log('✅ Firebase Admin initialized');
  return firebaseApp;
}

export async function verifyFirebaseToken(idToken) {
  initFirebase();
  return admin.auth().verifyIdToken(idToken);
}
