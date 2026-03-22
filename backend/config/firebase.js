// Firebase Admin — NOT USED. Kept as empty stub so old imports don't break.
// Auth is handled by pure JWT in middleware/auth.js
export function initFirebase() {}
export async function verifyFirebaseToken() {
  throw new Error('Firebase is not configured. Use JWT auth.');
}
