

const STORAGE_KEY = "expenseTrackerTx";
const THEME_KEY = "expenseTrackerTheme";
const PAGE_SIZE = 5;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const CATEGORY_ICONS = {
    Food: "🍴",
    Transport: "🚌",
    Shopping: "🛍️",
    Bills: "🧾",
    Salary: "💼",
    Other: "📦"
};

const CATEGORY_COLORS = {
    Food: "#3b82f6",
    Transport: "#f59e0b",
    Shopping: "#22c55e",
    Bills: "#a855f7",
    Other: "#ef4444",
    Salary: "#14b8a6"
};

const datePicker = document.getElementById("date-picker");
const themeToggle = document.getElementById("theme-toggle");
const incomeAmount = document.getElementById("income-amount");
const expenseAmount = document.getElementById("expense-amount");
const balanceAmount = document.getElementById("balance-amount");
const form = document.getElementById("transaction-form");
const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const periodSelect = document.getElementById("period");
const donut = document.getElementById("donut");
const totalSpent = document.getElementById("total-spent");
const legend = document.getElementById("legend");
const tabs = document.querySelectorAll(".tab");
const categoryFilter = document.getElementById("category-filter");
const clearAllBtn = document.getElementById("clear-all");
const txBody = document.getElementById("tx-body");
const emptyState = document.getElementById("empty-state");
const showing = document.getElementById("showing");
const pagination = document.getElementById("pagination");


function getToday() {
    const now = new Date();
    return toDateString(now);
}

function toDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatDate(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}



let transactions = loadTransactions();
let typeFilter = "all";
let page = 1;

function loadTransactions() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (Array.isArray(saved)) return saved;
    } catch (e) {
      
    }
    return sampleData();
}

function saveTransactions() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (e) {
        
    }
}


function sampleData() {
    const today = new Date();
    const daysAgo = n => {
        const d = new Date(today);
        d.setDate(d.getDate() - n);
        return toDateString(d);
    };
    return [
        { id: 1, title: "Salary",         amount: 1500, type: "income",  category: "Salary",    date: daysAgo(0) },
        { id: 2, title: "Lunch",          amount: 10,   type: "expense", category: "Food",      date: daysAgo(0) },
        { id: 3, title: "Bus Fare",       amount: 5,    type: "expense", category: "Transport", date: daysAgo(1) },
        { id: 4, title: "Freelance Work", amount: 500,  type: "income",  category: "Other",     date: daysAgo(2) }
    ];
}



function renderSummary() {
    const income = transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

    incomeAmount.textContent = money.format(income);
    expenseAmount.textContent = money.format(expense);
    balanceAmount.textContent = money.format(income - expense);
}



function inPeriod(dateStr, period) {
    const [y, m] = dateStr.split("-").map(Number);
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth() + 1;

    if (period === "this-year") return y === thisYear;
    if (period === "last-month") {
        const lastMonth = thisMonth === 1 ? 12 : thisMonth - 1;
        const lastMonthYear = thisMonth === 1 ? thisYear - 1 : thisYear;
        return y === lastMonthYear && m === lastMonth;
    }
    return y === thisYear && m === thisMonth; 
}

function renderChart() {
    const expenses = transactions.filter(
        t => t.type === "expense" && inPeriod(t.date, periodSelect.value)
    );

    const totals = {};
    expenses.forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
    });

    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, amount]) => sum + amount, 0);

    totalSpent.textContent = money.format(total);
    legend.innerHTML = "";

    if (total === 0) {
        donut.style.background = "#2a2a4a";
        legend.appendChild(el("li", "legend-empty", "No expenses for this period"));
        return;
    }

   
    let start = 0;
    const stops = [];

    entries.forEach(([category, amount]) => {
        const percent = (amount / total) * 100;
        const color = CATEGORY_COLORS[category] || "#94a3b8";
        stops.push(`${color} ${start}% ${start + percent}%`);
        start += percent;

        const li = el("li");
        const dot = el("span", "dot");
        dot.style.background = color;
        li.append(
            dot,
            el("span", "legend-name", category),
            el("span", "legend-percent", `${Math.round(percent)}%`)
        );
        legend.appendChild(li);
    });

    donut.style.background = `conic-gradient(${stops.join(", ")})`;
}



function getFiltered() {
    return transactions
        .filter(t => typeFilter === "all" || t.type === typeFilter)
        .filter(t => categoryFilter.value === "all" || t.category === categoryFilter.value)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id); // newest first
}

function renderTable() {
    const list = getFiltered();
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (page > totalPages) page = totalPages;

    const start = (page - 1) * PAGE_SIZE;
    const pageItems = list.slice(start, start + PAGE_SIZE);

    txBody.innerHTML = "";

    pageItems.forEach(t => {
        const tr = el("tr");

        const titleTd = el("td");
        titleTd.append(el("span", `arrow ${t.type}`, t.type === "income" ? "▲" : "▼"), t.title);

        const categoryTd = el("td", "", `${CATEGORY_ICONS[t.category] || "📦"} ${t.category}`);
        const dateTd = el("td", "", formatDate(t.date));
        const amountTd = el("td", `amount-${t.type}`, money.format(t.amount));

        const typeTd = el("td");
        typeTd.appendChild(el("span", `pill ${t.type}`, t.type === "income" ? "Income" : "Expense"));

        const actionTd = el("td");
        const deleteBtn = el("button", "delete-btn", "🗑");
        deleteBtn.dataset.id = t.id;
        deleteBtn.setAttribute("aria-label", `Delete ${t.title}`);
        actionTd.appendChild(deleteBtn);

        tr.append(titleTd, categoryTd, dateTd, amountTd, typeTd, actionTd);
        txBody.appendChild(tr);
    });

    emptyState.classList.toggle("hidden", list.length > 0);
    showing.textContent = list.length === 0
        ? "Showing 0 of 0 transactions"
        : `Showing ${start + 1}–${start + pageItems.length} of ${list.length} transactions`;

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    pagination.innerHTML = "";

    const prev = el("button", "page-btn", "‹");
    prev.setAttribute("aria-label", "Previous page");
    prev.disabled = page === 1;
    prev.addEventListener("click", () => goToPage(page - 1));
    pagination.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
        const btn = el("button", "page-btn" + (i === page ? " active" : ""), String(i));
        btn.addEventListener("click", () => goToPage(i));
        pagination.appendChild(btn);
    }

    const next = el("button", "page-btn", "›");
    next.setAttribute("aria-label", "Next page");
    next.disabled = page === totalPages;
    next.addEventListener("click", () => goToPage(page + 1));
    pagination.appendChild(next);
}

function goToPage(n) {
    page = n;
    renderTable();
}



function renderAll() {
    renderSummary();
    renderChart();
    renderTable();
}




form.addEventListener("submit", event => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const amount = Number(amountInput.value);
    if (!title || !(amount > 0) || !categoryInput.value) return;

    transactions.push({
        id: Date.now(),
        title,
        amount,
        type: typeInput.value,
        category: categoryInput.value,
        date: dateInput.value || getToday()
    });

    saveTransactions();
    form.reset();
    dateInput.value = datePicker.value || getToday();
    page = 1;
    renderAll();
});


txBody.addEventListener("click", event => {
    const btn = event.target.closest(".delete-btn");
    if (!btn) return;

    transactions = transactions.filter(t => t.id !== Number(btn.dataset.id));
    saveTransactions();
    renderAll();
});


tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        typeFilter = tab.dataset.filter;
        page = 1;
        renderTable();
    });
});


categoryFilter.addEventListener("change", () => {
    page = 1;
    renderTable();
});


periodSelect.addEventListener("change", renderChart);


clearAllBtn.addEventListener("click", () => {
    if (transactions.length === 0) return;
    if (!confirm("Delete all transactions? This can't be undone.")) return;

    transactions = [];
    saveTransactions();
    page = 1;
    renderAll();
});


datePicker.addEventListener("change", () => {
    if (datePicker.value) dateInput.value = datePicker.value;
});



function applyTheme(theme) {
    document.body.classList.toggle("light", theme === "light");
    themeToggle.textContent = theme === "light" ? "☀" : "☾";
}

themeToggle.addEventListener("click", () => {
    const next = document.body.classList.contains("light") ? "dark" : "light";
    applyTheme(next);
    try {
        localStorage.setItem(THEME_KEY, next);
    } catch (e) {
        
    }
});



datePicker.value = getToday();
dateInput.value = getToday();

let savedTheme = "dark";
try {
    savedTheme = localStorage.getItem(THEME_KEY) || "dark";
} catch (e) {
    
}
applyTheme(savedTheme);

renderAll();