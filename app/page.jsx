import { useState } from "react";

export default function LandingPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleSubmit() {
    if (password.toLowerCase() === "limasierra") {
      setSuccess(true);
    } else {
      setError(true);
      setPassword("");
    }
  }

  if (success) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif"
      }}>
        <div style={{ color: "#22c55e", fontSize: "24px", fontWeight: 700 }}>
          ✅ Correct — would load SMS app
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: "12px",
        padding: "48px 40px",
        width: "100%",
        maxWidth: "380px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "48px", marginBottom: "8px" }}>✈️</div>
        <h1 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: 700, marginBottom: "4px" }}>
          LS AIRMOTIVE
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "32px" }}>
          Safety Management System
        </p>
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "8px",
            border: error ? "1px solid #ef4444" : "1px solid #475569",
            background: "#0f172a",
            color: "#f1f5f9",
            fontSize: "15px",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: "8px"
          }}
        />
        {error && (
          <p style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px" }}>
            Incorrect password
          </p>
        )}
        <button
          onClick={handleSubmit}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            background: "#3b82f6",
            color: "white",
            fontSize: "15px",
            fontWeight: 600,
            cursor: "pointer",
            marginTop: "8px"
          }}
        >
          Enter
        </button>
      </div>
    </div>
  );
}
