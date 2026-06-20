// ============================================================
// FIREBASE CONFIG — fill this in with YOUR project's values.
// See SETUP.md for step-by-step instructions on getting these.
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCjYiAu6bHeAraRpmbQH_7RgX1ymWEQ9Ck",
  authDomain: "doodle-dash-37b8a.firebaseapp.com",
  databaseURL: "https://doodle-dash-37b8a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "doodle-dash-37b8a",
  storageBucket: "doodle-dash-37b8a.firebasestorage.app",
  messagingSenderId: "281804365772",
  appId: "1:281804365772:web:bef8d9c8c5b324cbde8769"
};

// Don't edit below this line
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
