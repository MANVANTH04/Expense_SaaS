import React, { useState } from "react";
import { addBudget } from "../api";

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

const AddBudget = () => {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState("");
  const [message, setMessage] = useState("");
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!category || !amount || !month) {
      setMessage("Category, amount, and month are required.");
      return;
    }

    try {
      const data = { category, amount: parseFloat(amount), month };
      const res = await addBudget(data);
      if (res.data.budget_id) {
        setMessage("✅ Budget added successfully!");
        setCategory(""); setAmount(""); setMonth("");
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to add budget. Check console.");
    }
  };

  return (
    <div className="form-container">
      <h2>Add Budget</h2>
      <form onSubmit={handleSubmit}>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">-- Select Category --</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <input 
          type="number" 
          placeholder="Amount" 
          value={amount} 
          onChange={(e) => setAmount(e.target.value)} 
        />
        <input 
          type="month" 
          placeholder="Month" 
          value={month} 
          onChange={(e) => setMonth(e.target.value)} 
        />

        <button type="submit">Add Budget</button>
      </form>
      {message && <p className={message.includes("success") ? "success" : "error"}>{message}</p>}
    </div>
  );
};

export default AddBudget;