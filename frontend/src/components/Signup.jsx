import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestSignupOtp, verifySignupOtp, setToken } from "../api";
import { GoogleLogin } from "@react-oauth/google";

const Signup = ({ setUser }) => {
  const [step, setStep] = useState(1); // step 1: enter details, step 2: verify OTP
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Step 1 → Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    try {
      await requestSignupOtp(email);
      setMessage("📩 OTP sent to your email!");
      setStep(2);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to send OTP");
    }
  };

  // Step 2 → Verify OTP & create account
  const handleVerifyOtp = async () => {
    try {
      const res = await verifySignupOtp({ name, email, password, otp });
      setToken(res.data.access_token);
      setUser({ id: res.data.user_id, email });
      setMessage("✅ Account created successfully!");
      navigate("/");
    } catch (err) {
      setMessage(err.response?.data?.error || "OTP verification failed");
    }
  };

  // Google signup
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch("http://127.0.0.1:5000/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      const data = await res.json();
      setToken(data.access_token);
      setUser(data.user);
      navigate("/");
    } catch {
      setMessage("❌ Google signup failed");
    }
  };

  return (
    <div className="form-container">
      <h2>Signup</h2>

      {step === 1 && (
        <>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
          <button onClick={handleRequestOtp}>Send OTP</button>
        </>
      )}

      {step === 2 && (
        <>
          <p>Enter the OTP sent to your email</p>
          <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" />
          <button onClick={handleVerifyOtp}>Verify & Signup</button>
        </>
      )}

      {/* <div className="oauth-container">
        <p>Or signup with</p>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setMessage("Google signup failed")}
        />
      </div> */}

      {message && <p className={message.includes("success") ? "success" : "error"}>{message}</p>}
    </div>
  );
};

export default Signup;