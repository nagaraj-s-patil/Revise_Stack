// Paste your Firebase web app config here (Firebase console → Project settings → Your apps → Web app).
// This is NOT a secret. Your data is protected by sign-in plus the rules in firestore.rules.
// While apiKey is empty, the app runs in local-only mode (browser storage), exactly as before.
export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: ''
};

export const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
export const cloudEnabled = () => !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.authDomain);
