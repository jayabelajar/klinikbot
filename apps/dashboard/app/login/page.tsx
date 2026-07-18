"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Username atau password salah");
      }

      const { token } = await res.json();
      localStorage.setItem("token", token);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Gagal masuk ke sistem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="card glass login-card">
        <div className="login-header">
          <div className="login-logo" style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <HeartPulse size={48} style={{ color: "hsl(var(--primary))" }} />
          </div>
          <h1>KlinikBot Admin</h1>
          <p>Masuk untuk mengelola administrasi klinik</p>
        </div>

        {error && (
          <div style={{ backgroundColor: "#fee2e2", color: "#dc2626", padding: "12px", borderRadius: "8px", fontSize: "14px", marginBottom: "16px", fontWeight: 500, display: "flex", gap: "8px", alignItems: "center", justifyContent: "center" }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "12px" }}
            disabled={loading}
          >
            {loading ? "Menghubungkan..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
