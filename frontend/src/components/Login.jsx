// src/components/Login.js
import React, { useState } from "react";
import { loginUser, setToken } from "../api";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

const Login = ({ setUser }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await loginUser({ email, password });
      setToken(res.data.access_token);
      setUser({ id: res.data.user_id, email });
      setMessage("✅ Logged in successfully!");
      navigate("/");
    } catch (err) {
      setMessage(err.response?.data?.error || "Login failed");
    }
  };

  // Google login success
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post("http://127.0.0.1:5000/auth/google", {
        token: credentialResponse.credential,
      });

      const { user, access_token } = res.data;
      setToken(access_token);
      setUser(user);
      navigate("/");
    } catch (err) {
      setMessage("❌ Google login failed");
    }
  };

  return (
    <div className="form-container">
      <h2>Login</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>

      {/* <div className="oauth-container">
        <p>Or login with</p>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setMessage("Google login failed")}
        />
      </div> */}

      {message && (
        <p className={message.includes("success") ? "success" : "error"}>
          {message}
        </p>
      )}
    </div>
  );
};

export default Login;