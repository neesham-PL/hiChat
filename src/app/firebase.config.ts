import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyAg5EiokyZCdNdJR2y64RfvosNf6g5jmX0",
    authDomain: "hichat-8594c.firebaseapp.com",
    databaseURL: "https://hichat-8594c-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hichat-8594c",
    storageBucket: "hichat-8594c.appspot.com",
    messagingSenderId: "304662311428",
    appId: "1:304662311428:web:12d85562851e0c55c07b51",
    measurementId: "G-W29N6P8TDV"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

// App Check initialization removed for now