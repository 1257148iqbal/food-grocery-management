const express = require('express');
const {
    collection,
    addDoc,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
} = require('firebase/firestore');
const db = require('../config/firebase');
const {
    successResponse,
    validationError,
    errorHandler,
    errorResponse,
} = require('../helpers/apiResponse');

// Added

exports.addPerson = async (req, res) => {
    try {
        const { name, gender, email, password, number } = req.body;

        const docRef = await addDoc(
            collection(db, 'users'),
            await {
                name: name,
                gender: gender,
                email: email,
                password: password,
                number: number,
            }
        );

        // console.log('Document written with ID: ', docRef.id);
        successResponse(res, {
            message: 'Successfully added',
            dataId: docRef.id,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

// GEt data from firestore

exports.getData = async (req, res) => {
    try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const data = await querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        successResponse(res, {
            message: 'successfully find data',
            data: data,
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

//Update data
exports.updateData = async (req, res) => {
    try {
        const { id, name, gender, email, password, number } = req.body;

        const myDocRef = doc(db, 'users', id);

        const data = await setDoc(myDocRef, { name: name }, { merge: false });

        successResponse(res, {
            message: 'data updated',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};

// Delete firebase data

exports.deleteData = async (req, res) => {
    try {
        const { id } = req.body;

        const myDocRef = doc(db, 'users', id);
        const data = await deleteDoc(myDocRef);

        successResponse(res, {
            message: 'succefully deleted',
        });
    } catch (error) {
        errorResponse(res, error.message);
    }
};
