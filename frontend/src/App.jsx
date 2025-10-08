import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import AddExpense from "./components/AddExpense";
import AddBudget from "./components/AddBudget";
import Reports from "./components/Reports";
import Login from "./components/Login";
import Signup from "./components/Signup";
import "./index.css";

function App() {
  const [user, setUser] = React.useState(null);

  return (
    <Router>
      <div>
        <nav className="navbar">
          <h1>Expense SaaS</h1>
          <div>
            {!user ? (
              <>
                <Link to="/login">Login</Link>
                <Link to="/signup">Sign Up</Link>
              </>
            ) : (
              <>
                <Link to="/">Dashboard</Link>
                <Link to="/add-expense">Add Expense</Link>
                <Link to="/add-budget">Add Budget</Link>
                <Link to="/reports">Reports</Link>
                <button
                  onClick={() => setUser(null)}
                  style={{
                    marginLeft: "15px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#ef4444",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </nav>

        <main className="main">
          <Routes>
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/signup" element={<Signup setUser={setUser} />} />
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/add-expense" element={user ? <AddExpense /> : <Navigate to="/login" />} />
            <Route path="/add-budget" element={user ? <AddBudget /> : <Navigate to="/login" />} />
            <Route path="/reports" element={user ? <Reports /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;