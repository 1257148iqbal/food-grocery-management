const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: 'AIzaSyAjxt_sglCBPSjuW09rP4UH2AYzMEFm0m4',
    authDomain: 'test-drop-72b9f.firebaseapp.com',
    projectId: 'test-drop-72b9f',
    storageBucket: 'test-drop-72b9f.appspot.com',
    messagingSenderId: '779300212744',
    appId: '1:779300212744:web:afc1f5f2a3b1cae89ac1bd',
};

const app = initializeApp(firebaseConfig);

let db = getFirestore(app);
// const Users = database.collection('user')

module.exports = db;
