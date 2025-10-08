// src/components/Reports.jsx
import React, { useState, useEffect } from "react";
import { getReport, getToken } from "../api";
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
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
  "Rent",
];

const Reports = () => {
  const [month, setMonth] = useState("");
  const [report, setReport] = useState(null);

  const fetchReport = async () => {
    if (!month) return;
    const token = getToken();
    if (!token) return console.error("No token. Please login.");

    try {
      const res = await getReport(null, month, token);
      setReport(res.data);
    } catch (err) {
      console.error("Token or fetch error:", err.response?.data?.error || err.message);
      setReport(null);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [month]);

  const displayMonth = month ? new Date(`${month}-01`).toLocaleString("default", { month: "long", year: "numeric" }) : "";

  // Prepare data for charts
  const chartData = categories.map((cat) => {
    const val = report?.breakdown?.[cat] || { budget: 0, spent: 0 };
    return {
      category: cat,
      budget: val.budget,
      spent: val.spent,
    };
  });

  const pieData = chartData.map((c) => ({ name: c.category, value: c.spent }));

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A569BD", "#F39C12", "#5DADE2", "#48C9B0", "#EC7063"];

  return (
    <div className="reports-container">
      <h2 className="dashboard-title">Reports</h2>

      <div className="month-selector">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="month-input" />
      </div>

      {report ? (
        <>
        {/* Expense Distribution Pie Chart */}
<div className="chart-section chart-wide">
  <h3>Expense Distribution for {displayMonth}</h3>
  <ResponsiveContainer width="100%" height={400}>
    <PieChart>
      <Pie
        data={pieData}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={120}
        fill="#8884d8"
        stroke="#555"
        strokeWidth={2}
        label
      >
        {pieData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
</div>

{/* Budget vs Expense Bar Chart */}
<div className="chart-section chart-wide">
  <h3>Budget vs Expense ({displayMonth})</h3>
  <ResponsiveContainer width="100%" height={450}>
    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="category" interval={0} angle={-30} textAnchor="end" minTickGap={0} />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="budget" fill="#82ca9d" name="Budget" />
      <Bar dataKey="spent" fill="#8884d8" name="Spent" />
    </BarChart>
  </ResponsiveContainer>
</div>
        </>
      ) : (
        month && <p>No data available for this month</p>
      )}
    </div>
  );
};

export default Reports;