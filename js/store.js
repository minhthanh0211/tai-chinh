// js/store.js
const firebaseConfig = {
  apiKey: "AIzaSyDKk9FzV0ndu1XugVfE2N2qSYGUIwdBgJw",
  authDomain: "taichinhminhthanh.firebaseapp.com",
  projectId: "taichinhminhthanh",
  storageBucket: "taichinhminhthanh.firebasestorage.app",
  messagingSenderId: "226019304294",
  appId: "1:226019304294:web:f3bb229aa1f8749abedea7",
  measurementId: "G-RL7NTYW3XC"
};

// Initialize Firebase using compat syntax
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Caches for synchronous rendering
let accountsData = [];
let transactionsData = [];
let debtsData = [];

// Utility formatting functions
const Utils = {
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    },
    formatDate: (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('vi-VN');
    },
    generateId: () => '_' + Math.random().toString(36).substr(2, 9),
    formatInputNumber: (input) => {
        let value = input.value.replace(/\D/g, '');
        if(value === '') { input.value = ''; return; }
        input.value = new Intl.NumberFormat('vi-VN').format(value);
    },
    parseInputNumber: (valueStr) => {
        if(!valueStr) return 0;
        return Number(valueStr.replace(/\D/g, ''));
    }
};

const Store = {
    history: [],
    snapshot: () => {}, // Disable snapshot for Firestore to prevent data conflicts
    undo: () => {
        alert("Tính năng Hoàn tác tạm thời vô hiệu hóa khi đang bật đồng bộ đám mây Firebase.");
    },

    // Listen to Firebase Realtime updates
    initStore: () => {
        db.collection("accounts").onSnapshot((snapshot) => {
            accountsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (typeof App !== 'undefined') App.switchTab(App.currentTab);
        });

        db.collection("transactions").onSnapshot((snapshot) => {
            transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (typeof App !== 'undefined') App.switchTab(App.currentTab);
        });

        db.collection("debts").onSnapshot((snapshot) => {
            debtsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (typeof App !== 'undefined') App.switchTab(App.currentTab);
        });
    },

    // ---- ACCOUNTS ----
    getAccounts: () => accountsData,
    addAccount: (account) => {
        const id = Utils.generateId();
        db.collection("accounts").doc(id).set({
            ...account,
            balance: Number(account.balance || 0)
        });
    },
    deleteAccount: (id) => {
        db.collection("accounts").doc(id).delete();
    },
    updateAccountBalance: (accountId, amountChange) => {
        const acc = accountsData.find(a => a.id === accountId);
        if (acc) {
            db.collection("accounts").doc(accountId).set({
                ...acc,
                balance: acc.balance + amountChange
            });
        }
    },

    // ---- TRANSACTIONS ----
    getTransactions: () => transactionsData.sort((a,b) => new Date(b.date) - new Date(a.date)),
    addTransaction: (transaction) => {
        const id = Utils.generateId();
        const numAmt = Number(transaction.amount);
        
        db.collection("transactions").doc(id).set({
            ...transaction,
            amount: numAmt
        });

        // Tự động cập nhật số dư
        const amountChange = transaction.type === 'income' ? numAmt : -numAmt;
        Store.updateAccountBalance(transaction.accountId, amountChange);
    },
    deleteTransaction: (id) => {
        const tx = transactionsData.find(t => t.id === id);
        if (tx) {
            const amountChange = tx.type === 'income' ? -tx.amount : tx.amount;
            Store.updateAccountBalance(tx.accountId, amountChange);
            db.collection("transactions").doc(id).delete();
        }
    },

    // ---- DEBTS ----
    getDebts: () => debtsData.sort((a,b) => new Date(a.date) - new Date(b.date)),
    addDebt: (debt) => {
        const id = Utils.generateId();
        db.collection("debts").doc(id).set({
            ...debt,
            amount: Number(debt.amount),
            status: 'pending'
        });
    },
    resolveDebt: (id) => {
        const debt = debtsData.find(d => d.id === id);
        if(debt) {
            db.collection("debts").doc(id).set({
                ...debt,
                status: 'paid'
            });
        }
    },
    deleteDebt: (id) => {
        db.collection("debts").doc(id).delete();
    },

    // ---- STATS ----
    getDashboardStats: () => {
        const totalBalance = accountsData.reduce((sum, acc) => sum + Number(acc.balance), 0);
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        let monthlyIncome = 0;
        let monthlyExpense = 0;

        transactionsData.forEach(tx => {
            const txDate = new Date(tx.date);
            if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
                if(tx.type === 'income') monthlyIncome += tx.amount;
                if(tx.type === 'expense') monthlyExpense += tx.amount;
            }
        });

        return { totalBalance, monthlyIncome, monthlyExpense };
    }
};

// Initialize listeners
Store.initStore();
