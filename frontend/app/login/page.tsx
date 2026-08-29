"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiAuth } from "@/lib/api";
import Head from "next/head";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const res = await apiAuth.login(username, password);
      localStorage.setItem("cpa_token", res.data.access_token);
      router.push("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login gagal. Periksa kembali username & password Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login - CPA Platform</title>
      </Head>
      <div style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end", // Align card to the right
        paddingRight: "10%",
        backgroundColor: "#f4f5f7",
        overflow: "hidden",
        fontFamily: "'Montserrat', sans-serif"
      }}>
        {/* Background Image explicitly rendered */}
        <img 
          src="/images/bg-shell.png" 
          alt="background"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0
          }}
        />

        <div style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "480px",
          padding: "3rem",
          background: "linear-gradient(135deg, rgba(225, 208, 150, 0.85) 0%, rgba(245, 245, 245, 0.6) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          borderRadius: "20px",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Header Row: Title & Logo */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "flex-start",
            marginBottom: "2.5rem" 
          }}>
            <div>
              <h1 style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: "1.8rem",
                color: "#1a1a1a",
                margin: "0 0 0.5rem 0",
                fontWeight: 500,
                letterSpacing: "1px"
              }}>Login</h1>
              <div style={{
                width: "60px",
                height: "2px",
                background: "#dcdcdc",
                borderRadius: "2px",
              }}></div>
            </div>
            
            <img 
              src="/images/logo-cpa.png" 
              alt="CPA Logo"
              style={{
                width: "140px",
                height: "auto",
                objectFit: "contain"
              }}
            />
          </div>
          
          {error && (
            <div style={{
              background: "rgba(255, 87, 87, 0.1)",
              color: "#d93025",
              padding: "1rem",
              borderRadius: "7px",
              marginBottom: "1.5rem",
              border: "1px solid rgba(255, 87, 87, 0.3)",
              fontSize: "0.9rem"
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{
                display: "block",
                marginBottom: "0.5rem",
                color: "#333",
                fontSize: "0.95rem",
                fontWeight: 500
              }}>Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoFocus
                style={{
                  width: "100%",
                  padding: "1rem 1.25rem",
                  background: "rgba(255, 255, 255, 0.4)",
                  border: "none",
                  borderRadius: "7px",
                  color: "#333",
                  fontSize: "0.95rem",
                  fontFamily: "'Montserrat', sans-serif",
                  outline: "none",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)"
                }}
              />
            </div>
            
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{
                display: "block",
                marginBottom: "0.5rem",
                color: "#333",
                fontSize: "0.95rem",
                fontWeight: 500
              }}>Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{
                  width: "100%",
                  padding: "1rem 1.25rem",
                  background: "rgba(255, 255, 255, 0.4)",
                  border: "none",
                  borderRadius: "7px",
                  color: "#333",
                  fontSize: "0.95rem",
                  fontFamily: "'Montserrat', sans-serif",
                  outline: "none",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)"
                }}
              />
            </div>

            <div style={{ textAlign: "right", marginTop: "-0.5rem", marginBottom: "2rem" }}>
              <a href="#" style={{
                color: "#333",
                fontSize: "0.8rem",
                textDecoration: "none",
                fontWeight: 500
              }}>Forgot Password?</a>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: "100%",
                padding: "1rem",
                background: "#a5d9d0",
                border: "none",
                borderRadius: "7px",
                color: "#1a1a1a",
                fontSize: "1rem",
                fontWeight: 600,
                letterSpacing: "1px",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                boxShadow: "0 4px 15px rgba(165, 217, 208, 0.3)",
                transition: "all 0.2s ease"
              }}
            >
              {loading ? "PROCESSING..." : "LOGIN"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
