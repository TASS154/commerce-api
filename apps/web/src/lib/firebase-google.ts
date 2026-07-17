"use client";

function firebaseWebConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim();
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return { apiKey, authDomain, projectId, appId };
}

export function firebaseGoogleIsConfigured(): boolean {
  return firebaseWebConfig() !== null;
}

/**
 * Lazily loads the Firebase client SDK — only when NEXT_PUBLIC_FIREBASE_*
 * is set and someone actually clicks "Continue with Google". Keeps the
 * bundle lean for the (default) demo/local-auth path.
 */
export async function signInWithGoogle(): Promise<{ token: string; email: string }> {
  const config = firebaseWebConfig();
  if (!config) {
    throw new Error("Firebase is not configured (set NEXT_PUBLIC_FIREBASE_* env vars)");
  }

  const [{ initializeApp, getApps, getApp }, { getAuth, GoogleAuthProvider, signInWithPopup }] =
    await Promise.all([import("firebase/app"), import("firebase/auth")]);

  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const token = await result.user.getIdToken();
  return { token, email: result.user.email ?? "" };
}
