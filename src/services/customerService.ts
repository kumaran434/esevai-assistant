import { Customer } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, query, where, onSnapshot, doc, addDoc, deleteDoc, updateDoc } from "firebase/firestore";

const COLLECTION_NAME = "customers";

// Helper to interact with LocalStorage as a fallback cache
const getLocalData = (): Customer[] => {
  try {
    const data = localStorage.getItem(COLLECTION_NAME);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalData = (data: Customer[]) => {
  localStorage.setItem(COLLECTION_NAME, JSON.stringify(data));
};

export const customerService = {
  async addCustomer(customer: Omit<Customer, 'id'>) {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const customerData = {
          ...customer,
          userId: currentUser.uid,
          createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, COLLECTION_NAME), customerData);
        console.log("Cloud Mode: Customer profile saved with id:", docRef.id);
        return docRef.id;
      } catch (err) {
        console.error("Firestore Write Failed, falling back to local storage:", err);
      }
    }

    // Local-only Fallback
    const customers = getLocalData();
    const newCustomer = {
      ...customer,
      id: "local-" + Date.now(),
      createdAt: new Date().toISOString()
    };
    customers.unshift(newCustomer as any);
    saveLocalData(customers);
    console.log("Local Mode: Customer saved to browser storage");
    return newCustomer.id;
  },

  async updateCustomer(id: string, updatedFields: Partial<Omit<Customer, 'id'>>) {
    const currentUser = auth.currentUser;
    if (currentUser && !id.startsWith("local-")) {
      try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
          ...updatedFields,
          updatedAt: new Date().toISOString()
        });
        console.log("Cloud Mode: Customer profile updated successfully:", id);
        return;
      } catch (err) {
        console.error("Firestore Update Failed:", err);
      }
    }

    // Local-only Fallback
    const customers = getLocalData();
    const index = customers.findIndex(c => c.id === id);
    if (index !== -1) {
      customers[index] = {
        ...customers[index],
        ...updatedFields,
        updatedAt: new Date().toISOString()
      };
      saveLocalData(customers);
      console.log("Local Mode: Customer profile updated in browser storage");
    }
  },

  async deleteCustomer(id: string) {
    const currentUser = auth.currentUser;
    let deletedFromCloud = false;

    if (currentUser && !id.startsWith("local-")) {
      try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
        console.log("Cloud Mode: Customer profile deleted from Firestore:", id);
        deletedFromCloud = true;
      } catch (err) {
        console.error("Firestore Delete Failed:", err);
      }
    }

    // Always clear from Local Storage cache as well to keep them synchronized
    let customers = getLocalData();
    customers = customers.filter(c => c.id !== id);
    saveLocalData(customers);
    console.log("Local Cache cleaned for customer:", id);

    // If deleted customer is currently active, clear active customer memory globally
    try {
      const activeId = localStorage.getItem("ACTIVE_CUSTOMER_ID");
      if (activeId === id) {
        localStorage.removeItem("ACTIVE_CUSTOMER_ID");
        window.dispatchEvent(new CustomEvent("ACTIVE_CUSTOMER_ID_CHANGED"));
      }
    } catch (e) {
      console.error("Error clearing active customer ID:", e);
    }
  },

  subscribeToCustomers(callback: (customers: Customer[]) => void) {
    let unsubscribeFirestore: (() => void) | null = null;
    let localInterval: any = null;

    const setupSubscription = () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        if (localInterval) {
          clearInterval(localInterval);
          localInterval = null;
        }

        const q = query(
          collection(db, COLLECTION_NAME),
          where("userId", "==", currentUser.uid)
        );

        unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          const list: Customer[] = [];
          snapshot.forEach((doc) => {
            list.push({
              ...(doc.data() as Customer),
              id: doc.id
            });
          });
          callback(list);
        }, (error) => {
          console.error("Firestore subscription error, switching back to local polling:", error);
          callback(getLocalData());
        });
      } else {
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = null;
        }

        // Keep local polling active
        callback(getLocalData());
        if (!localInterval) {
          localInterval = setInterval(() => {
            callback(getLocalData());
          }, 1500);
        }
      }
    };

    // Initialize subscription
    setupSubscription();

    // Listen to Auth transitions dynamically to swap the subscription
    const unsubscribeAuth = auth.onAuthStateChanged(() => {
      setupSubscription();
    });

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (localInterval) clearInterval(localInterval);
      unsubscribeAuth();
    };
  }
};
