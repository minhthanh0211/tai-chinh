/* js/app.js - Main Application Logic */

const App = {
    currentTab: 'dashboard',
    
    init: () => {
        // Sidebar Navigation Event Listeners
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                // Remove active from all
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                // Add active to clicked
                item.classList.add('active');
                
                const tab = item.getAttribute('data-tab');
                App.switchTab(tab);
            });
        });

        // Initialize Accounts Dropdown in Modal
        App.updateAccountDropdown();

        // Bind Undo Button
        document.getElementById('btn-undo').addEventListener('click', () => {
            Store.undo();
            App.switchTab(App.currentTab);
        });
        App.updateUndoButton();

        // Initial render
        App.switchTab('dashboard');
    },

    switchTab: (tabId) => {
        App.currentTab = tabId;
        const contentArea = document.getElementById('content-area');
        const pageTitle = document.getElementById('current-page-title');
        
        // Hide all contents and re-render
        switch(tabId) {
            case 'dashboard':
                pageTitle.textContent = 'Tổng quan';
                App.renderDashboard(contentArea);
                break;
            case 'transactions':
                pageTitle.textContent = 'Giao dịch';
                App.renderTransactions(contentArea);
                break;
            case 'accounts':
                pageTitle.textContent = 'Tài khoản';
                App.renderAccounts(contentArea);
                break;
            case 'debts':
                pageTitle.textContent = 'Vay & Nợ';
                App.renderDebts(contentArea);
                break;
            case 'reports':
                pageTitle.textContent = 'Báo cáo chi tiêu';
                App.renderReports(contentArea);
                break;
        }
    },

    // --- VIEW RENDERERS ---

    renderDashboard: (container) => {
        const stats = Store.getDashboardStats();
        const recentTxs = Store.getTransactions().slice(0, 5); // show top 5
        const accounts = Store.getAccounts();

        let recentTxsHtml = '';
        if(recentTxs.length === 0) {
            recentTxsHtml = `
                <div class="empty-state">
                    <i class="ph ph-receipt"></i>
                    <h3>Chưa có giao dịch</h3>
                    <p>Hãy thêm giao dịch đầu tiên để theo dõi.</p>
                </div>
            `;
        } else {
            recentTxsHtml = `<div class="list-group">` + recentTxs.map(tx => {
                const isIncome = tx.type === 'income';
                return `
                <div class="list-item">
                    <div class="item-left">
                        <div class="item-icon ${isIncome ? 'income-icon' : 'expense-icon'}">
                            <i class="ph ${isIncome ? 'ph-trend-up' : 'ph-trend-down'}"></i>
                        </div>
                        <div class="item-details">
                            <h4>${tx.category}</h4>
                            <p>${Utils.formatDate(tx.date)} • ${accounts.find(a => a.id === tx.accountId)?.name || 'N/A'}</p>
                        </div>
                    </div>
                    <div class="item-amount ${isIncome ? 'text-positive' : 'text-negative'}">
                        ${isIncome ? '+' : '-'}${Utils.formatCurrency(tx.amount)}
                    </div>
                </div>
                `;
            }).join('') + `</div>`;
        }

        container.innerHTML = `
            <div class="grid-3">
                <div class="card stat-card" style="border-left: 4px solid var(--info)">
                    <div class="stat-header">
                        <span>Tổng tài sản</span>
                        <div class="stat-icon neutral"><i class="ph ph-wallet"></i></div>
                    </div>
                    <div class="stat-value">${Utils.formatCurrency(stats.totalBalance)}</div>
                </div>
                <div class="card stat-card" style="border-left: 4px solid var(--primary)">
                    <div class="stat-header">
                        <span>Thu (tháng này)</span>
                        <div class="stat-icon primary"><i class="ph ph-trend-up"></i></div>
                    </div>
                    <div class="stat-value text-positive">+${Utils.formatCurrency(stats.monthlyIncome)}</div>
                </div>
                <div class="card stat-card" style="border-left: 4px solid var(--danger)">
                    <div class="stat-header">
                        <span>Chi (tháng này)</span>
                        <div class="stat-icon danger"><i class="ph ph-trend-down"></i></div>
                    </div>
                    <div class="stat-value text-negative">-${Utils.formatCurrency(stats.monthlyExpense)}</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Giao dịch gần đây</h3>
                        <button class="btn btn-outline btn-sm" onclick="document.querySelector('[data-tab=transactions]').click()">Xem tất cả</button>
                    </div>
                    ${recentTxsHtml}
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Tài khoản</h3>
                    </div>
                    <div class="list-group">
                        ${accounts.map(acc => `
                            <div class="list-item" style="padding: 12px;">
                                <div class="item-left flex items-center">
                                    <div class="item-icon account-icon" style="width: 36px; height: 36px; font-size: 18px; margin-right: 12px;">
                                        <i class="ph ${acc.type === 'cash' ? 'ph-money' : 'ph-bank'}"></i>
                                    </div>
                                    <div class="item-details">
                                        <h4>${acc.name}</h4>
                                    </div>
                                </div>
                                <div class="item-amount" style="font-size: 14px;">
                                    ${Utils.formatCurrency(acc.balance)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    renderTransactions: (container) => {
        const txs = Store.getTransactions();
        const accounts = Store.getAccounts();

        let html = `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 class="card-title">Lịch sử giao dịch</h3>
                    <button class="btn btn-primary" onclick="App.openTransactionModal()"><i class="ph ph-plus"></i> Thêm giao dịch</button>
                </div>
        `;

        if(txs.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="ph ph-receipt"></i>
                    <h3>Chưa có giao dịch</h3>
                    <p>Bấm nút "Thêm giao dịch" để bắt đầu ghi chép.</p>
                </div>
            `;
        } else {
            html += `<div class="list-group">` + txs.map(tx => {
                const isIncome = tx.type === 'income';
                const accountName = accounts.find(a => a.id === tx.accountId)?.name || 'Tài khoản đã xóa';
                return `
                <div class="list-item">
                    <div class="item-left">
                        <div class="item-icon ${isIncome ? 'income-icon' : 'expense-icon'}">
                            <i class="ph ${isIncome ? 'ph-trend-up' : 'ph-trend-down'}"></i>
                        </div>
                        <div class="item-details">
                            <h4>${tx.category}</h4>
                            <p>${Utils.formatDate(tx.date)} • ${accountName} ${tx.note ? ' • ' + tx.note : ''}</p>
                        </div>
                    </div>
                    <div class="flex items-center">
                        <div class="item-amount ${isIncome ? 'text-positive' : 'text-negative'}">
                            ${isIncome ? '+' : '-'}${Utils.formatCurrency(tx.amount)}
                        </div>
                        <div class="item-actions">
                            <button class="action-btn delete" onclick="App.deleteTransaction('${tx.id}')"><i class="ph ph-trash"></i></button>
                        </div>
                    </div>
                </div>
                `;
            }).join('') + `</div>`;
        }

        html += `</div>`;
        container.innerHTML = html;
    },

    renderAccounts: (container) => {
        const accounts = Store.getAccounts();
        
        let html = `
            <div class="card border-0 shadow-none bg-transparent" style="background: transparent; box-shadow: none; padding: 0; border: none;">
                <div class="grid-3">
        `;

        accounts.forEach(acc => {
            html += `
                <div class="card" style="border-top: 4px solid var(--info); position: relative;">
                    <button class="action-btn delete" onclick="App.deleteAccount('${acc.id}')" style="position: absolute; right: 16px; top: 16px;" title="Xóa"><i class="ph ph-trash"></i></button>
                    
                    <div class="item-icon account-icon" style="margin-bottom: 16px;">
                        <i class="ph ${acc.type === 'cash' ? 'ph-money' : 'ph-bank'}"></i>
                    </div>
                    
                    <h3 style="font-size: 16px; color: var(--text-muted); margin-bottom: 8px;">${acc.name}</h3>
                    <div style="font-size: 24px; font-weight: 700; color: var(--text-main);">
                        ${Utils.formatCurrency(acc.balance)}
                    </div>
                </div>
            `;
        });

        html += `
                <div class="card" style="border: 2px dashed var(--border-color); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: var(--transition); min-height: 180px;" onclick="document.getElementById('new-account-form').style.display='block'; window.scrollTo(0,document.body.scrollHeight);" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border-color)'">
                    <i class="ph ph-plus-circle" style="font-size: 32px; color: var(--text-muted); margin-bottom: 8px;"></i>
                    <h3 style="font-size: 16px; color: var(--text-muted);">Thêm tài khoản</h3>
                </div>
            </div>
            
            <div class="card" id="new-account-form" style="display: none; margin-top: 24px; border-left: 4px solid var(--primary);">
                <h4 style="margin-bottom: 16px; font-size: 18px;">Tạo tài khoản mới</h4>
                <div class="form-row" style="align-items: flex-end;">
                    <div class="form-group mb-0" style="flex: 2;">
                        <label>Tên tài khoản</label>
                        <input type="text" id="new-acc-name" class="form-control" placeholder="Vd: Ví điện tử Momo">
                    </div>
                    <div class="form-group mb-0" style="flex: 1;">
                        <label>Loại</label>
                        <select id="new-acc-type" class="form-control">
                            <option value="cash">Tiền mặt</option>
                            <option value="bank">Ngân hàng / Ví</option>
                        </select>
                    </div>
                    <div class="form-group mb-0" style="flex: 1;">
                        <label>Số dư ban đầu</label>
                        <input type="text" inputmode="numeric" id="new-acc-balance" class="form-control" placeholder="0" oninput="Utils.formatInputNumber(this)">
                    </div>
                    <div class="form-group mb-0">
                        <button class="btn btn-primary" onclick="App.addAccount()">Lưu lại</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        container.innerHTML = html;
    },

    renderDebts: (container) => {
        const debts = Store.getDebts();
        
        let html = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Sổ nợ & Cho vay</h3>
                </div>
                
                <div class="card" style="background-color: var(--bg-hover); border: none; margin-bottom: 32px; box-shadow: none;">
                    <h4 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;"><i class="ph ph-plus-circle text-positive"></i> Ghi nhận khoản mới</h4>
                    <div class="form-row" style="align-items: flex-end;">
                        <div class="form-group mb-0" style="flex: 1;">
                            <label>Loại</label>
                            <select id="new-debt-type" class="form-control">
                                <option value="borrowed">Đi vay (Nợ ai đó)</option>
                                <option value="lent">Cho vay (Ai đó nợ mình)</option>
                            </select>
                        </div>
                        <div class="form-group mb-0" style="flex: 1.5;">
                            <label>Người giao dịch</label>
                            <input type="text" id="new-debt-person" class="form-control" placeholder="Tên đối tác">
                        </div>
                        <div class="form-group mb-0" style="flex: 1;">
                            <label>Số tiền</label>
                            <input type="text" inputmode="numeric" id="new-debt-amount" class="form-control" placeholder="0" oninput="Utils.formatInputNumber(this)">
                        </div>
                        <div class="form-group mb-0" style="flex: 1;">
                            <label>Ngày</label>
                            <input type="date" id="new-debt-date" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="form-group mb-0">
                            <button class="btn btn-primary btn-full" onclick="App.addDebt()">Lưu</button>
                        </div>
                    </div>
                </div>
        `;

        if(debts.length === 0) {
            html += `
                <div class="empty-state" style="border: none;">
                    <i class="ph ph-handshake"></i>
                    <h3>Chưa có dữ liệu</h3>
                    <p>Mọi khoản vay/nợ sẽ hiển thị ở đây.</p>
                </div>
            `;
        } else {
            html += `<div class="list-group">` + debts.map(debt => {
                const isBorrowed = debt.type === 'borrowed';
                const isPending = debt.status === 'pending';
                return `
                <div class="list-item" style="transition: all 0.3s; opacity: ${isPending ? 1 : 0.6}; border-left: 4px solid ${isBorrowed ? 'var(--danger)' : 'var(--primary)'}">
                    <div class="item-left">
                        <div class="item-icon debt-icon">
                            <i class="ph ${isBorrowed ? 'ph-download-simple' : 'ph-upload-simple'}"></i>
                        </div>
                        <div class="item-details">
                            <h4>${isBorrowed ? 'Vay của: ' : 'Cho vay: '} <strong>${debt.person}</strong></h4>
                            <p>${Utils.formatDate(debt.date)} • <span style="font-weight: 500; color: ${isPending ? 'var(--warning)' : 'var(--primary)'}">${isPending ? 'Đang treo' : 'Đã tất toán'}</span></p>
                        </div>
                    </div>
                    <div class="flex items-center" style="gap: 20px;">
                        <div class="item-amount ${isBorrowed ? 'text-negative' : 'text-positive'}">
                            ${Utils.formatCurrency(debt.amount)}
                        </div>
                        <div class="item-actions">
                            ${isPending ? `<button class="btn btn-outline btn-sm" onclick="App.resolveDebt('${debt.id}')"><i class="ph ph-check-circle"></i> Xong</button>` : ''}
                            <button class="action-btn delete" onclick="App.deleteDebt('${debt.id}')" title="Xóa"><i class="ph ph-trash"></i></button>
                        </div>
                    </div>
                </div>
                `;
            }).join('') + `</div>`;
        }

        html += `</div>`;
        container.innerHTML = html;
    },

    renderReports: (container) => {
        const txs = Store.getTransactions();
        
        let totalInc = 0; let totalExp = 0;
        txs.forEach(t => {
            if(t.type === 'income') totalInc += t.amount;
            else totalExp += t.amount;
        });

        container.innerHTML = `
            <div class="card" style="margin-bottom: 24px;">
                <div class="card-header">
                    <h3 class="card-title">So sánh Tổng Thu - Chi</h3>
                </div>
                <div class="chart-container" style="height: 120px; padding-bottom: 24px;">
                    <canvas id="compareChart"></canvas>
                </div>
            </div>
            <div class="grid-3" style="grid-template-columns: 1fr 1fr; gap: 32px;">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Cơ cấu Chi tiêu</h3>
                    </div>
                    <div class="chart-container" style="height: 350px;">
                        <canvas id="expenseChart"></canvas>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Cơ cấu Thu nhập</h3>
                    </div>
                    <div class="chart-container" style="height: 350px;">
                        <canvas id="incomeChart"></canvas>
                    </div>
                </div>
            </div>
        `;

        // Render Compare Bar Chart
        if(txs.length > 0) {
            new Chart(document.getElementById('compareChart').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: [''], // single group
                    datasets: [
                        { label: 'Tổng Thu', data: [totalInc], backgroundColor: '#10b981', borderRadius: 4 },
                        { label: 'Tổng Chi', data: [totalExp], backgroundColor: '#ef4444', borderRadius: 4 }
                    ]
                },
                options: {
                    indexAxis: 'y', // horizontal bar
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { display: true, beginAtZero: true },
                        y: { display: false }
                    },
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        } else {
            document.getElementById('compareChart').parentElement.innerHTML = '<div class="empty-state"><p>Chưa có dữ liệu giao dịch</p></div>';
        }

        // Expense Chart
        const expenseTxs = txs.filter(t => t.type === 'expense');
        const expenseData = {};
        expenseTxs.forEach(t => {
            expenseData[t.category] = (expenseData[t.category] || 0) + t.amount;
        });

        // Income Chart
        const incomeTxs = txs.filter(t => t.type === 'income');
        const incomeData = {};
        incomeTxs.forEach(t => {
            incomeData[t.category] = (incomeData[t.category] || 0) + t.amount;
        });

        const colors = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

        // Render Expense
        if(Object.keys(expenseData).length > 0) {
            new Chart(document.getElementById('expenseChart').getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(expenseData),
                    datasets: [{
                        data: Object.values(expenseData),
                        backgroundColor: colors,
                        borderWidth: 0,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    cutout: '70%'
                }
            });
        } else {
            document.getElementById('expenseChart').parentElement.innerHTML = '<div class="empty-state"><p>Không có dữ liệu chi</p></div>';
        }

        // Render Income
        if(Object.keys(incomeData).length > 0) {
            new Chart(document.getElementById('incomeChart').getContext('2d'), {
                type: 'pie',
                data: {
                    labels: Object.keys(incomeData),
                    datasets: [{
                        data: Object.values(incomeData),
                        backgroundColor: colors,
                        borderWidth: 0,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        } else {
            document.getElementById('incomeChart').parentElement.innerHTML = '<div class="empty-state"><p>Không có dữ liệu thu</p></div>';
        }
    },

    // --- INTERACTIVE ACTIONS ---

    updateUndoButton: () => {
        const btn = document.getElementById('btn-undo');
        if(btn) {
            btn.style.display = Store.history.length > 0 ? 'inline-flex' : 'none';
        }
    },

    updateAccountDropdown: () => {
        const accounts = Store.getAccounts();
        const select = document.getElementById('trans-account');
        if(select) {
            select.innerHTML = accounts.map(a => `<option value="${a.id}">${a.name} (${Utils.formatCurrency(a.balance)})</option>`).join('');
        }
    },

    openTransactionModal: () => {
        const accounts = Store.getAccounts();
        if(accounts.length === 0) {
            alert('Vui lòng thêm tài khoản trước khi tạo giao dịch.');
            App.switchTab('accounts');
            return;
        }
        App.updateAccountDropdown();
        document.getElementById('trans-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('transaction-modal').classList.add('active');
    },

    closeTransactionModal: () => {
        document.getElementById('transaction-modal').classList.remove('active');
        document.getElementById('transaction-form').reset();
    },

    handleTransactionSubmit: (e) => {
        e.preventDefault();
        const type = document.querySelector('input[name="trans_type"]:checked').value;
        const amount = Utils.parseInputNumber(document.getElementById('trans-amount').value);
        const accountId = document.getElementById('trans-account').value;
        const category = document.getElementById('trans-category').value;
        const date = document.getElementById('trans-date').value;
        const note = document.getElementById('trans-note').value;

        if(!amount || !accountId || !date) {
            alert("Vui lòng nhập đầy đủ các thông tin bắt buộc.");
            return;
        }

        Store.addTransaction({
            type, amount, accountId, category, date, note
        });

        App.closeTransactionModal();
        App.switchTab(App.currentTab); // Re-render target
    },

    deleteTransaction: (id) => {
        if(confirm("Xóa giao dịch này và hoàn trả lại số dư tài khoản?")) {
            Store.deleteTransaction(id);
            App.switchTab(App.currentTab);
        }
    },

    addAccount: () => {
        const name = document.getElementById('new-acc-name').value;
        const type = document.getElementById('new-acc-type').value;
        const balance = Utils.parseInputNumber(document.getElementById('new-acc-balance').value);

        if(!name) {
            alert("Vui lòng nhập tên tài khoản");
            return;
        }

        Store.addAccount({ name, type, balance: balance });
        // Reset and hide form
        document.getElementById('new-acc-name').value = '';
        document.getElementById('new-acc-balance').value = '';
        document.getElementById('new-account-form').style.display = 'none';
        
        App.switchTab('accounts');
    },

    deleteAccount: (id) => {
        const txs = Store.getTransactions().filter(t => t.accountId === id);
        if(txs.length > 0) {
            alert("Tài khoản này đã có giao dịch gắn liền. Vui lòng xóa các giao dịch đó trước khi xóa tài khoản.");
            return;
        }
        if(confirm("Bạn có muốn xóa tài khoản này không?")) {
            Store.deleteAccount(id);
            App.switchTab('accounts');
        }
    },

    addDebt: () => {
        const type = document.getElementById('new-debt-type').value;
        const person = document.getElementById('new-debt-person').value;
        const amount = Utils.parseInputNumber(document.getElementById('new-debt-amount').value);
        const date = document.getElementById('new-debt-date').value;

        if(!person || !amount) {
            alert("Vui lòng nhập tên người giao dịch và số tiền");
            return;
        }

        Store.addDebt({ type, person, amount, date });
        App.switchTab('debts');
    },

    resolveDebt: (id) => {
        Store.resolveDebt(id);
        App.switchTab('debts');
    },

    deleteDebt: (id) => {
        if(confirm("Xác nhận xóa bản ghi vay/nợ này?")) {
            Store.deleteDebt(id);
            App.switchTab('debts');
        }
    }
};

// Application Boot
document.addEventListener('DOMContentLoaded', App.init);
