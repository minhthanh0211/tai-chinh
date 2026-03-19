// define keys
const STORAGE_KEYS = {
    ACCOUNTS: 'finance_accounts',
    TRANSACTIONS: 'finance_transactions',
    DEBTS: 'finance_debts'
};

// Intialize empty states if not already present
function initStore() {
    if (!localStorage.getItem(STORAGE_KEYS.ACCOUNTS)) {
        const defaultAccounts = [
            { id: 'acc_1', name: 'Tiền mặt', type: 'cash', balance: 0 },
            { id: 'acc_2', name: 'Ngân hàng', type: 'bank', balance: 0 }
        ];
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(defaultAccounts));
    }

    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.DEBTS)) {
        localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify([]));
    }
}

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

// Main store abstraction
const Store = {
    history: [],
    snapshot: () => {
        Store.history.push({
            accounts: localStorage.getItem(STORAGE_KEYS.ACCOUNTS),
            transactions: localStorage.getItem(STORAGE_KEYS.TRANSACTIONS),
            debts: localStorage.getItem(STORAGE_KEYS.DEBTS)
        });
        if(Store.history.length > 20) Store.history.shift(); // Max 20 steps
        // Update UI if App is loaded
        if(typeof App !== 'undefined' && App.updateUndoButton) App.updateUndoButton();
    },
    undo: () => {
        if(Store.history.length === 0) return;
        const lastState = Store.history.pop();
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, lastState.accounts);
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, lastState.transactions);
        localStorage.setItem(STORAGE_KEYS.DEBTS, lastState.debts);
        if(typeof App !== 'undefined' && App.updateUndoButton) App.updateUndoButton();
    },

    // ---- ACCOUNTS ----
    getAccounts: () => JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCOUNTS)),
    saveAccounts: (data) => localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(data)),
    
    addAccount: (account) => {
        Store.snapshot();
        const accounts = Store.getAccounts();
        const newAcc = { id: Utils.generateId(), ...account, balance: Number(account.balance || 0) };
        accounts.push(newAcc);
        Store.saveAccounts(accounts);
        return newAcc;
    },

    deleteAccount: (id) => {
        Store.snapshot();
        const accounts = Store.getAccounts();
        Store.saveAccounts(accounts.filter(a => a.id !== id));
    },

    updateAccountBalance: (accountId, amountChange) => {
        const accounts = Store.getAccounts();
        const acc = accounts.find(a => a.id === accountId);
        if (acc) {
            acc.balance += amountChange;
            Store.saveAccounts(accounts);
        }
    },

    // ---- TRANSACTIONS ----
    getTransactions: () => {
        const txs = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS));
        return txs.sort((a,b) => new Date(b.date) - new Date(a.date));
    },
    saveTransactions: (data) => localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data)),
    
    addTransaction: (transaction) => {
        Store.snapshot();
        const transactions = Store.getTransactions();
        const newTx = { id: Utils.generateId(), ...transaction, amount: Number(transaction.amount) };
        transactions.push(newTx);
        Store.saveTransactions(transactions);

        // Update corresponding account balance
        const amountChange = transaction.type === 'income' ? newTx.amount : -newTx.amount;
        Store.updateAccountBalance(transaction.accountId, amountChange);
        
        return newTx;
    },

    deleteTransaction: (id) => {
        Store.snapshot();
        const transactions = Store.getTransactions();
        const tx = transactions.find(t => t.id === id);
        if(tx) {
            // Revert balance
            const amountChange = tx.type === 'income' ? -tx.amount : tx.amount;
            Store.updateAccountBalance(tx.accountId, amountChange);
            
            const newTxs = transactions.filter(t => t.id !== id);
            Store.saveTransactions(newTxs);
        }
    },

    // ---- DEBTS ----
    getDebts: () => JSON.parse(localStorage.getItem(STORAGE_KEYS.DEBTS)).sort((a,b) => new Date(a.date) - new Date(b.date)),
    saveDebts: (data) => localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(data)),
    
    addDebt: (debt) => {
        Store.snapshot();
        const debts = Store.getDebts();
        const newDebt = { 
            id: Utils.generateId(), 
            ...debt, 
            amount: Number(debt.amount),
            status: 'pending' // pending or paid
        };
        debts.push(newDebt);
        Store.saveDebts(debts);
        return newDebt;
    },
    
    resolveDebt: (id) => {
        Store.snapshot();
        const debts = Store.getDebts();
        const debt = debts.find(d => d.id === id);
        if(debt) {
            debt.status = 'paid';
            Store.saveDebts(debts);
        }
    },

    deleteDebt: (id) => {
        Store.snapshot();
        const debts = Store.getDebts();
        Store.saveDebts(debts.filter(d => d.id !== id));
    },

    // ---- STATS ----
    getDashboardStats: () => {
        const accounts = Store.getAccounts();
        const transactions = Store.getTransactions();
        
        const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
        
        // This month stats
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        let monthlyIncome = 0;
        let monthlyExpense = 0;

        transactions.forEach(tx => {
            const txDate = new Date(tx.date);
            if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
                if(tx.type === 'income') monthlyIncome += tx.amount;
                if(tx.type === 'expense') monthlyExpense += tx.amount;
            }
        });

        return { totalBalance, monthlyIncome, monthlyExpense };
    }
};

// Boot up
initStore();
