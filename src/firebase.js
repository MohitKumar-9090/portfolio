// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB74NPM8V30dgUMkEHrBwJQ9FB5K_VzU-w",
  authDomain: "school-project-7f9cc.firebaseapp.com",
  databaseURL: "https://school-project-7f9cc-default-rtdb.firebaseio.com",
  projectId: "school-project-7f9cc",
  storageBucket: "school-project-7f9cc.firebasestorage.app",
  messagingSenderId: "986762578239",
  appId: "1:986762578239:web:b26abfe648617101e66b8a",
  measurementId: "G-TLHGB5WNSR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
