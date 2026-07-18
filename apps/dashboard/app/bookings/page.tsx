"use client";

import { useEffect, useState } from "react";

interface Patient {
  id: string;
  code: string;
  name: string;
  phone: string;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
}

interface Queue {
  id: string;
  queueNumber: number;
  status: string;
}

interface Booking {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  complaint: string;
  paymentType: "BPJS" | "UMUM";
  status: "WAITING" | "CONFIRMED" | "QUEUE" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  patient: Patient;
  doctor: Doctor;
  queue?: Queue | null;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${apiUrl}/bookings`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (!res.ok) throw new Error("Gagal memuat data booking");
      const data = await res.json();
      setBookings(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${apiUrl}/bookings/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Gagal memperbarui status booking");
      fetchBookings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateQueue = async (bookingId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${apiUrl}/queues/generate/${bookingId}`, {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Gagal membuat nomor antrian");
      }
      alert("Nomor antrian berhasil digenerate!");
      fetchBookings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus booking ini?")) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${apiUrl}/bookings/${id}`, {
        method: "DELETE",
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (!res.ok) throw new Error("Gagal menghapus data booking");
      fetchBookings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "WAITING": return "badge-waiting";
      case "CONFIRMED": return "badge-confirmed";
      case "QUEUE": return "badge-queue";
      case "IN_PROGRESS": return "badge-inprogress";
      case "COMPLETED": return "badge-completed";
      case "CANCELLED": return "badge-cancelled";
      default: return "";
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = 
      b.patient.name.toLowerCase().includes(search.toLowerCase()) ||
      b.doctor.name.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1>Kelola Booking Pasien</h1>
          <p>Konfirmasi pendaftaran booking jadwal dan generate nomor antrian pemeriksaan.</p>
        </div>
        <button onClick={fetchBookings} className="btn btn-secondary btn-sm">
          🔄 Segarkan
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px", background: "#fee2e2", color: "#dc2626", borderRadius: "8px", margin: "16px 0" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card filter-bar mt-4">
        <input
          type="text"
          placeholder="Cari berdasarkan nama pasien, dokter, atau kode booking..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 2 }}
        />
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ flex: 1, minWidth: "150px" }}
        >
          <option value="ALL">Semua Status</option>
          <option value="WAITING">WAITING (Menunggu)</option>
          <option value="CONFIRMED">CONFIRMED (Diterima)</option>
          <option value="QUEUE">QUEUE (Antrian)</option>
          <option value="IN_PROGRESS">IN_PROGRESS (Diperiksa)</option>
          <option value="COMPLETED">COMPLETED (Selesai)</option>
          <option value="CANCELLED">CANCELLED (Dibatalkan)</option>
        </select>
      </div>

      {/* Bookings Table */}
      <div className="card" style={{ marginTop: "16px" }}>
        {loading ? (
          <p>Memuat data booking...</p>
        ) : filteredBookings.length === 0 ? (
          <p>Tidak ada data booking ditemukan.</p>
        ) : (
          <div className="table-container">
            <table width="100%">
              <thead>
                <tr>
                  <th align="left">ID Booking</th>
                  <th align="left">Pasien</th>
                  <th align="left">Dokter / Poli</th>
                  <th align="left">Waktu Periksa</th>
                  <th align="left">Keluhan</th>
                  <th align="left">Pembayaran</th>
                  <th align="left">Status</th>
                  <th align="left">No Antrian</th>
                  <th align="right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b.id}>
                    <td><small><code>{b.id}</code></small></td>
                    <td>
                      <div><strong>{b.patient.name}</strong></div>
                      <small style={{ color: "hsl(var(--muted-foreground))" }}>{b.patient.code} | {b.patient.phone}</small>
                    </td>
                    <td>
                      <div>{b.doctor.name}</div>
                      <small style={{ color: "hsl(var(--muted-foreground))" }}>{b.doctor.specialization}</small>
                    </td>
                    <td>
                      <div>{new Date(b.date).toLocaleDateString("id-ID")}</div>
                      <small>Pukul {b.time} WIB</small>
                    </td>
                    <td>{b.complaint}</td>
                    <td>
                      <span className={`badge ${b.paymentType === "BPJS" ? "badge-confirmed" : "badge-waiting"}`}>
                        {b.paymentType}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                    <td>
                      {b.queue ? (
                        <strong style={{ fontSize: "16px", color: "hsl(var(--primary))" }}>
                          #{b.queue.queueNumber}
                        </strong>
                      ) : (
                        <span style={{ color: "hsl(var(--muted-foreground))" }}>-</span>
                      )}
                    </td>
                    <td align="right">
                      <div className="flex-gap-2" style={{ justifyContent: "flex-end", flexWrap: "wrap", maxWidth: "220px" }}>
                        {b.status === "WAITING" && (
                          <>
                            <button onClick={() => handleUpdateStatus(b.id, "CONFIRMED")} className="btn btn-primary btn-sm">
                              ✓ Setuju
                            </button>
                            <button onClick={() => handleUpdateStatus(b.id, "CANCELLED")} className="btn btn-destructive btn-sm">
                              ✕ Tolak
                            </button>
                          </>
                        )}
                        
                        {b.status === "CONFIRMED" && (
                          <>
                            <button onClick={() => handleGenerateQueue(b.id)} className="btn btn-primary btn-sm" style={{ backgroundColor: "hsl(220 70% 50%)" }}>
                              🚶 Buat Antrian
                            </button>
                            <button onClick={() => handleUpdateStatus(b.id, "CANCELLED")} className="btn btn-destructive btn-sm">
                              Batalkan
                            </button>
                          </>
                        )}

                        {b.status === "QUEUE" && (
                          <span style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>Antrian Aktif</span>
                        )}

                        {b.status === "IN_PROGRESS" && (
                          <span style={{ fontSize: "12px", color: "hsl(var(--primary))" }}>Sedang Diperiksa</span>
                        )}

                        {b.status === "COMPLETED" && (
                          <span style={{ fontSize: "12px", color: "hsl(var(--success))" }}>Selesai</span>
                        )}

                        {b.status === "CANCELLED" && (
                          <button onClick={() => handleDelete(b.id)} className="btn btn-destructive btn-sm" style={{ padding: "4px 8px" }}>
                            🗑️ Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
