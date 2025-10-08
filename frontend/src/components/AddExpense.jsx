import React, { useState, useEffect } from "react";
import { addExpense, verifyEmails } from "../api"; // new verifyEmails API

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

const AddExpense = () => {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [isSplit, setIsSplit] = useState(false);
  const [splitEmails, setSplitEmails] = useState([""]);
  const [emailStatus, setEmailStatus] = useState({}); // { email: "verified" | "invalid" }

  const handleAddEmail = () => {
    setSplitEmails([...splitEmails, ""]);
  };

  const handleEmailChange = (index, value) => {
    const newEmails = [...splitEmails];
    newEmails[index] = value;
    setSplitEmails(newEmails);

    // reset status for this email
    setEmailStatus((prev) => ({ ...prev, [value]: undefined }));
  };

  // verify emails whenever they change
  useEffect(() => {
    const verify = async () => {
      if (!isSplit || splitEmails.length === 0) return;

      try {
        const res = await verifyEmails({ emails: splitEmails.filter(e => e) });
        const status = {};
        res.data.verified.forEach(u => { status[u.email] = "verified"; });
        res.data.invalid.forEach(e => { status[e] = "invalid"; });
        setEmailStatus(status);
      } catch (err) {
        console.error("Email verification error:", err);
      }
    };

    verify();
  }, [splitEmails, isSplit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!category || !amount || !date) {
      setMessage("Category, amount, and date are required.");
      return;
    }

    try {
      let finalSplitEmails = [];

      if (isSplit) {
        finalSplitEmails = splitEmails.filter(e => emailStatus[e] === "verified");

        const invalidEmails = splitEmails.filter(e => emailStatus[e] === "invalid");
        if (invalidEmails.length > 0) {
          alert(`Invalid emails: ${invalidEmails.join(", ")}`);
          return;
        }
      }

      const data = { category, amount: parseFloat(amount), date };
      if (isSplit && finalSplitEmails.length > 0) data.split_emails = finalSplitEmails;

      const res = await addExpense(data);

      if (res.data.status === "no_budget") {
        alert(res.data.message);
        setMessage(res.data.message);
      } else if (res.data.status === "warning_90") {
        alert(res.data.message);
        setMessage(res.data.message);
        setCategory(""); setAmount(""); setDate("");
      } else if (res.data.status === "exceeded") {
        alert(res.data.message);
        setMessage(res.data.message);
      } else if (res.data.status === "success") {
        let msg = "✅ Expense added successfully!";
        if (isSplit && finalSplitEmails.length > 0) {
          msg += ` Split among ${finalSplitEmails.length + 1} users. Each owes ${(amount / (finalSplitEmails.length + 1)).toFixed(2)}.`;
        }
        setMessage(msg);
        setCategory(""); setAmount(""); setDate("");
        setSplitEmails([""]);
        setEmailStatus({});
        setIsSplit(false);
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data.error) {
        alert(err.response.data.error);
        setMessage(err.response.data.error);
      } else {
        alert("❌ Failed to add expense. Check console.");
        setMessage("❌ Failed to add expense.");
      }
    }
  };

  return (
    <div className="form-container">
      <h2>Add Expense</h2>
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
          type="date" 
          placeholder="Date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
        />

        <label className="split-label">
          <input type="checkbox" checked={isSplit} onChange={() => setIsSplit(!isSplit)} />
          Add Split
        </label>

        {isSplit && (
          <div className="split-emails">
            {splitEmails.map((email, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <input
                  type="email"
                  placeholder="Enter user email"
                  value={email}
                  onChange={(e) => handleEmailChange(idx, e.target.value)}
                />
                {emailStatus[email] === "verified" && <span style={{ color: "green" }}>✅</span>}
                {emailStatus[email] === "invalid" && <span style={{ color: "red" }}>❌</span>}
              </div>
            ))}
            <button type="button" onClick={handleAddEmail}>+ Add another user</button>
          </div>
        )}

        <button type="submit">Add Expense</button>
      </form>
      {message && (
        <p className={message.includes("success") ? "success" : "error"}>{message}</p>
      )}
    </div>
  );
};

export default AddExpense;