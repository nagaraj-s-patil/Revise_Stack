// Paste your Firebase web app config here (Firebase console → Project settings → Your apps → Web app).
// This is NOT a secret. Your data is protected by sign-in plus the rules in firestore.rules.
// If apiKey is empty, the app runs in local-only mode (browser storage).
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBPliow35mqQ3IoX6nY19Agqj-k6uPD1kE',
  authDomain: 'revise-stack.firebaseapp.com',
  projectId: 'revise-stack',
  appId: '1:450871820612:web:dff3e7894d9d6f1f60d711'
};

// Name of the Firestore database. Shown in the console as "(default)" for the standard one.
// Yours was created with the ID "default" (no brackets), so that is the name used here.
export const FIREBASE_DATABASE = 'default';

export const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
export const cloudEnabled = () => !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.authDomain);
