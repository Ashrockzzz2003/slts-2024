import { db } from "./initApp";
import { getDoc, doc, getDocs, query, collection, where } from "firebase/firestore";
import { auth } from "./initApp";

export const getUserData = async () => {
    if (!auth.currentUser) {
        return null;
    }

    const userDataDocRef = doc(db, "userData", auth.currentUser.uid);
    const docSnap = await getDoc(userDataDocRef);
    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        return null;
    }
}

export const getRegistrationData = async () => {
    if (!auth.currentUser) {
        return null;
    }

    const registrationDataCollectionRef = collection(db, "registrationData");
    const querySnapshot = await getDocs(registrationDataCollectionRef);
    const data = [];
    querySnapshot.forEach((doc) => {
        data.push(doc.data());
    });

    data.forEach((row) => {
        for (const key in row) {
            if (typeof row[key] === 'number' && isNaN(row[key])) {
                row[key] = null;
            }
        }
    });

    data.sort((a, b) => {
        if (a.district < b.district) {
            return -1;
        }
        if (a.district > b.district) {
            return 1;
        }
        return 0;
    });

    return data;
}

export const getDistrcitData = async (district) => {
    if (!auth.currentUser) {
        return null;
    }

    const registrationDataCollectionRef = query(collection(db, "registrationData"), where("district", "==", district));
    const querySnapshot = await getDocs(registrationDataCollectionRef);
    const data = [];
    querySnapshot.forEach((doc) => {
        data.push(doc.data());
    });

    data.forEach((row) => {
        for (const key in row) {
            if (typeof row[key] === 'number' && isNaN(row[key])) {
                row[key] = null;
            }
        }
    });

    data.sort((a, b) => {
        if (a.district < b.district) {
            return -1;
        }
        if (a.district > b.district) {
            return 1;
        }
        return 0;
    });

    return data;
}
