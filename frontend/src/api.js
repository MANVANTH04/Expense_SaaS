import axios from "axios";

const BASE_URL = "http://127.0.0.1:5000";

// Token storage
export const setToken = (token) => localStorage.setItem("token", token);
export const getToken = () => localStorage.getItem("token");

const authHeaders = () => {
  const token = getToken();
  return {
    headers: { Authorization: token ? `Bearer ${token}` : "" },
  };
};

// ---------------- Auth APIs ----------------
export const requestSignupOtp = (email) =>
  axios.post(`${BASE_URL}/auth/signup/request`, { email });

export const verifySignupOtp = (data) =>
  axios.post(`${BASE_URL}/auth/signup/verify`, data);

export const loginUser = (data) => axios.post(`${BASE_URL}/auth/login`, data);

// ---------------- Expenses & Budgets ----------------
export const addBudget = (data) =>
  axios.post(`${BASE_URL}/users/budgets`, data, authHeaders());

export const addExpense = (data) =>
  axios.post(`${BASE_URL}/users/expenses`, data, authHeaders());

// --------- NEW: Verify Emails for Split ---------
export const verifyEmails = (data) =>
  axios.post(`${BASE_URL}/users/verify_emails`, data, authHeaders());

// ---------------- Reports ----------------
export const getReport = (userId, month, token) =>
  axios.get(`${BASE_URL}/users/reports?month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  });