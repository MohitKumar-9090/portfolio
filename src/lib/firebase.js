import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyADGktFIj-Bb3Kk8pI3xwTXqCT1FO7GrL0',
  authDomain: 'portfolio-bf9fd.firebaseapp.com',
  projectId: 'portfolio-bf9fd',
  storageBucket: 'portfolio-bf9fd.firebasestorage.app',
  messagingSenderId: '913793770108',
  appId: '1:913793770108:web:5b81b82ec9fd6ca0fa9ff9',
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

export { firebase, db };
