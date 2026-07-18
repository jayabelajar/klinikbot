"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  AlertTriangle,
  Users,
  Stethoscope,
  Calendar,
  ListOrdered,
  Megaphone
} from "lucide-react";

interface SummaryData {
  totalPatients: number;
  bookingsToday: number;
  activeQueue: number;
  completedToday: number;
}

export default function HomePage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${apiUrl}/dashboard/summary`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : ""
        }
      });
      if (!res.ok) throw new Error("Gagal mengambil data ringkasan");
      const data = await res.json();
      setSummary(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Gagal memuat ringkasan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1>Dashboard Administrasi</h1>
          <p>Selamat datang kembali di sistem KlinikBot. Berikut adalah ikhtisar operasional hari ini.</p>
        </div>
        <button onClick={fetchSummary} className="btn btn-secondary btn-sm" style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Segarkan Data
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#fee2e2", color: "#dc2626", borderRadius: "8px", margin: "16px 0", fontWeight: 500, display: "flex", gap: "8px", alignItems: "center" }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-4 mt-4">
        <div className="card stat-card">
          <h3>Total Pasien Terdaftar</h3>
          <div className="stat-value">{loading ? "..." : summary?.totalPatients ?? 0}</div>
          <p>Total pasien terdaftar di klinik</p>
        </div>

        <div className="card stat-card">
          <h3>Booking Hari Ini</h3>
          <div className="stat-value">{loading ? "..." : summary?.bookingsToday ?? 0}</div>
          <p>Jadwal periksa yang terdaftar hari ini</p>
        </div>

        <div className="card stat-card" style={{ contentVisibility: "auto" }}>
          <h3>Antrian Aktif</h3>
          <div className="stat-value" style={{ color: "hsl(var(--primary))" }}>
            {loading ? "..." : summary?.activeQueue ?? 0}
          </div>
          <p>Pasien dalam antrian tunggu</p>
        </div>

        <div className="card stat-card">
          <h3>Booking Selesai</h3>
          <div className="stat-value" style={{ color: "hsl(var(--success))" }}>
            {loading ? "..." : summary?.completedToday ?? 0}
          </div>
          <p>Total pasien yang selesai dilayani hari ini</p>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-2 mt-4">
        <div className="card">
          <h2>Menu Pintasan Administrasi</h2>
          <p style={{ marginBottom: "16px" }}>Kelola data master dan operasional dengan cepat melalui navigasi berikut:</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Link href="/patients" className="btn btn-secondary" style={{ display: "flex", justifyContent: "flex-start", padding: "16px", gap: "8px", alignItems: "center" }}>
              <Users size={18} /> Kelola Pasien
            </Link>
            <Link href="/doctors" className="btn btn-secondary" style={{ display: "flex", justifyContent: "flex-start", padding: "16px", gap: "8px", alignItems: "center" }}>
              <Stethoscope size={18} /> Kelola Dokter
            </Link>
            <Link href="/bookings" className="btn btn-secondary" style={{ display: "flex", justifyContent: "flex-start", padding: "16px", gap: "8px", alignItems: "center" }}>
              <Calendar size={18} /> Kelola Booking
            </Link>
            <Link href="/queues" className="btn btn-secondary" style={{ display: "flex", justifyContent: "flex-start", padding: "16px", gap: "8px", alignItems: "center" }}>
              <ListOrdered size={18} /> Monitor Antrian
            </Link>
          </div>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h2>Integrasi WhatsApp</h2>
            <p style={{ marginTop: "8px" }}>
              Bot WhatsApp KlinikBot berjalan secara otomatis untuk merespon pendaftaran pasien, booking jadwal secara mandiri, dan memantau antrian secara real-time.
            </p>
            <p style={{ marginTop: "12px" }}>
              Status: <span className="badge badge-completed">Aktif & Terkoneksi</span>
            </p>
          </div>
          <div style={{ marginTop: "20px" }}>
            <Link href="/broadcast" className="btn btn-primary" style={{ width: "100%", display: "inline-flex", gap: "8px", alignItems: "center", justifyContent: "center" }}>
              <Megaphone size={18} /> Kirim Broadcast / Pengumuman Massal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
