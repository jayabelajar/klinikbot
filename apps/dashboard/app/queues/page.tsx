"use client";

import { useEffect, useState } from "react";
import { RefreshCw, AlertTriangle, Stethoscope, Volume2, CheckCircle, XCircle, Clock } from "lucide-react";

interface Patient {
  name: string;
  code: string;
  phone: string;
}

interface Doctor {
  name: string;
  specialization: string;
}

interface Booking {
  id: string;
  complaint: string;
  patient: Patient;
  doctor: Doctor;
}

interface Queue {
  id: string;
  bookingId: string;
  queueNumber: number;
  status: "WAITING" | "CALLED" | "SKIPPED" | "DONE";
  booking: Booking;
}

export default function QueuesPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueues = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${apiUrl}/queues`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (!res.ok) throw new Error("Gagal memuat antrian aktif");
      const data = await res.json();
      setQueues(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
    // Refresh queue board every 10 seconds
    const interval = setInterval(fetchQueues, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${apiUrl}/queues/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Gagal memperbarui status antrian");
      fetchQueues();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const activeCalledQueue = queues.find((q) => q.status === "CALLED");
  const waitingQueues = queues.filter((q) => q.status === "WAITING");
  const historyQueues = queues.filter((q) => q.status === "DONE" || q.status === "SKIPPED");

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1>Papan Panggilan Antrian (Real-Time)</h1>
          <p>Panggil pasien, lewati pasien, atau selesaikan pemeriksaan medis pasien.</p>
        </div>
        <button onClick={fetchQueues} className="btn btn-secondary btn-sm" style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Segarkan
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px", background: "#fee2e2", color: "#dc2626", borderRadius: "8px", margin: "16px 0", display: "flex", gap: "8px", alignItems: "center" }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Main Calling Screen & Stats Grid */}
      <div className="grid grid-2 mt-4">
        {/* Active Caller Display */}
        <div className="card glass" style={{ border: "2px solid hsl(var(--primary))", background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--accent) / 0.3) 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "260px", textAlign: "center", gap: "12px" }}>
          <h3>Sedang Diperiksa / Dipanggil</h3>
          {activeCalledQueue ? (
            <>
              <div style={{ fontSize: "72px", fontWeight: "800", color: "hsl(var(--primary))", lineHeight: 1 }}>
                #{activeCalledQueue.queueNumber}
              </div>
              <div style={{ fontSize: "24px", fontWeight: "700" }}>
                {activeCalledQueue.booking.patient.name}
              </div>
              <p style={{ fontSize: "14px", fontWeight: "500", display: "flex", gap: "4px", alignItems: "center" }}>
                <Stethoscope size={16} /> {activeCalledQueue.booking.doctor.name} ({activeCalledQueue.booking.doctor.specialization})
              </p>
              
              <div className="flex-gap-2 mt-4">
                <button 
                  onClick={() => handleUpdateStatus(activeCalledQueue.id, "CALLED")} 
                  className="btn btn-primary"
                  style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}
                >
                  <Volume2 size={16} /> Panggil Ulang (WA)
                </button>
                <button 
                  onClick={() => handleUpdateStatus(activeCalledQueue.id, "DONE")} 
                  className="btn btn-secondary"
                  style={{ backgroundColor: "hsl(var(--success))", color: "#ffffff", borderColor: "transparent", display: "inline-flex", gap: "6px", alignItems: "center" }}
                >
                  <CheckCircle size={16} /> Selesai
                </button>
                <button 
                  onClick={() => handleUpdateStatus(activeCalledQueue.id, "SKIPPED")} 
                  className="btn btn-destructive"
                  style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}
                >
                  <XCircle size={16} /> Lewati
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <Clock size={48} style={{ color: "hsl(var(--muted-foreground))" }} />
              <p style={{ fontSize: "16px", fontWeight: "600", color: "hsl(var(--foreground))" }}>Tidak ada panggilan aktif.</p>
              <p>Pilih pasien di daftar tunggu untuk melakukan panggilan.</p>
            </div>
          )}
        </div>

        {/* Queue Statistics Card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h2>Statistik Antrian Hari Ini</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: "hsl(var(--secondary))", padding: "16px", borderRadius: "8px" }}>
              <div style={{ color: "hsl(var(--muted-foreground))", fontSize: "14px", fontWeight: "600" }}>TOTAL MENUNGGU</div>
              <div style={{ fontSize: "28px", fontWeight: "700", marginTop: "4px" }}>{waitingQueues.length} orang</div>
            </div>
            <div style={{ background: "hsl(var(--secondary))", padding: "16px", borderRadius: "8px" }}>
              <div style={{ color: "hsl(var(--muted-foreground))", fontSize: "14px", fontWeight: "600" }}>SELESAI DILAYANI</div>
              <div style={{ fontSize: "28px", fontWeight: "700", marginTop: "4px", color: "hsl(var(--success))" }}>
                {queues.filter((q) => q.status === "DONE").length} orang
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid hsl(var(--card-border))", paddingTop: "12px" }}>
            <p style={{ display: "flex", gap: "6px", alignItems: "center" }}><RefreshCw size={14} /> Nomor antrian akan berlanjut secara otomatis setiap kali pasien melakukan booking terkonfirmasi.</p>
          </div>
        </div>
      </div>

      {/* Queue Lists Grid */}
      <div className="grid grid-2 mt-4">
        {/* Waiting List */}
        <div className="card">
          <h2>Daftar Tunggu Antrian ({waitingQueues.length})</h2>
          <div className="table-container" style={{ marginTop: "12px" }}>
            {loading ? (
              <p>Memuat data...</p>
            ) : waitingQueues.length === 0 ? (
              <p style={{ padding: "16px 0", color: "hsl(var(--muted-foreground))" }}>Daftar tunggu kosong.</p>
            ) : (
              <table width="100%">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Pasien</th>
                    <th>Dokter / Poli</th>
                    <th align="right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingQueues.map((q) => (
                    <tr key={q.id}>
                      <td>
                        <strong style={{ fontSize: "16px", color: "hsl(var(--primary))" }}>
                          #{q.queueNumber}
                        </strong>
                      </td>
                      <td>
                        <div><strong>{q.booking.patient.name}</strong></div>
                        <small>{q.booking.patient.code}</small>
                      </td>
                      <td>
                        <div>{q.booking.doctor.name}</div>
                        <small>{q.booking.doctor.specialization}</small>
                      </td>
                      <td align="right">
                        <button onClick={() => handleUpdateStatus(q.id, "CALLED")} className="btn btn-primary btn-sm" style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
                          <Volume2 size={14} /> Panggil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* History / Completed List */}
        <div className="card">
          <h2>Riwayat Panggilan Hari Ini ({historyQueues.length})</h2>
          <div className="table-container" style={{ marginTop: "12px" }}>
            {loading ? (
              <p>Memuat data...</p>
            ) : historyQueues.length === 0 ? (
              <p style={{ padding: "16px 0", color: "hsl(var(--muted-foreground))" }}>Belum ada riwayat panggilan.</p>
            ) : (
              <table width="100%">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Pasien</th>
                    <th>Dokter / Poli</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyQueues.map((q) => (
                    <tr key={q.id}>
                      <td>#{q.queueNumber}</td>
                      <td>
                        <div>{q.booking.patient.name}</div>
                        <small>{q.booking.patient.code}</small>
                      </td>
                      <td>{q.booking.doctor.name}</td>
                      <td>
                        <span className={`badge ${q.status === "DONE" ? "badge-completed" : "badge-cancelled"}`}>
                          {q.status === "DONE" ? "Selesai" : "Dilewati"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
