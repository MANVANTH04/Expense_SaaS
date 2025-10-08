// src/components/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { getReport, getToken } from "../api";
import "../index.css";

const categories = [
  "Food",
  "Transport",
  "Utilities",
  "Entertainment",
  "Health",
  "Education",
  "Shopping",
  "Travel",
  "Rent"
];

const Dashboard = () => {
  const [month, setMonth] = useState("");
  const [report, setReport] = useState(null);

  const fetchReport = async () => {
    if (!month) return;
    const token = getToken();
    if (!token) return console.error("No token. Please login.");

    try {
      const res = await getReport(null, month, token);
      console.log("Report data:", res.data);
      setReport(res.data);
    } catch (err) {
      console.error("Token or fetch error:", err.response?.data?.error || err.message);
      setReport(null);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [month]);

  const totalBudget = report
    ? Object.values(report.breakdown || {}).reduce((acc, val) => acc + val.budget, 0)
    : 0;

  const totalSpent = report
    ? Object.values(report.breakdown || {}).reduce((acc, val) => acc + val.spent, 0)
    : 0;

  const remaining = totalBudget - totalSpent;

  const displayMonth = month
    ? new Date(`${month}-01`).toLocaleString("default", { month: "long", year: "numeric" })
    : "";

  // Prepare recent expenses (latest first)
  const recentExpenses = report && report.recentExpenses && report.recentExpenses.length > 0
    ? report.recentExpenses
        .filter(exp => categories.includes(exp.category))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 6)
    : [];

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">Dashboard</h2>

      {/* Month Selector */}
      <div className="month-selector">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="month-input"
        />
      </div>

      {/* Summary Boxes */}
      {report && (
        <div className="summary-boxes">
          <div className="card card-budget">
            <h4>Total Budget</h4>
            <p>{totalBudget}</p>
          </div>
          <div className="card card-expense">
            <h4>Total Expense</h4>
            <p>{totalSpent}</p>
          </div>
          <div className="card card-remaining">
            <h4>Remaining</h4>
            <p>{remaining}</p>
          </div>
        </div>
      )}

      {/* Recent Expenses */}
      {recentExpenses.length > 0 && (
        <div className="recent-expenses">
          <h3>Recent Expenses</h3>
          <div className="expense-grid">
            {recentExpenses.map((exp, idx) => (
              <div key={idx} className="expense-card">
                <p><strong>Date:</strong> {exp.date}</p>
                <p><strong>Category:</strong> {exp.category}</p>
                <p><strong>Expense:</strong> {exp.amount}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget by Category */}
      <div className="budget-by-category">
        <h3>Budget by Category for {displayMonth}</h3>
        <div className="budget-grid">
          {categories.map((cat) => {
            const val = report?.breakdown?.[cat] || { budget: 0, spent: 0 };
            return (
              <div key={cat} className="budget-card">
                <h4>{cat}</h4>
                <p><strong>Budget:</strong> {val.budget}</p>
                <p><strong>Spent:</strong> {val.spent}</p>
              </div>
            );
          })}
        </div>
      </div>

      {!report && month && <p>No data available for this month</p>}
    </div>
  );
};

export default Dashboard;