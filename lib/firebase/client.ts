import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getMessaging, Messaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_* environment variables");
  }

  return getApps()[0] ?? initializeApp(firebaseConfig);
}

/** Browser-only: registers for FCM push notifications, returns the device token. */
export async function getFcmMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined" || !(await isSupported())) {
    return null;
  }

  return getMessaging(getFirebaseApp());
}
