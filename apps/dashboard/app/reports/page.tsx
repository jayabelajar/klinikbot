"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, Printer, AlertTriangle } from "lucide-react";

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
  date: string;
  time: string;
  paymentType: "BPJS" | "UMUM";
  status: string;
  patient: Patient;
  doctor: Doctor;
}

export default function ReportsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<"daily" | "monthly" | "all">("all");
  const [targetDate, setTargetDate] = useState("");
  const [targetMonth, setTargetMonth] = useState("");

  const fetchBookings = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${apiUrl}/bookings`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (!res.ok) throw new Error("Gagal mengambil data laporan");
      const data = await res.json();
      setBookings(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    
    // Set default target date to today and month to current month
    const today = new Date();
    setTargetDate(today.toISOString().split("T")[0]);
    
    const month = String(today.getMonth() + 1).padStart(2, "0");
    setTargetMonth(`${today.getFullYear()}-${month}`);
  }, []);

  // Filter completed and cancelled bookings based on chosen parameters
  const filteredBookings = bookings.filter((b) => {
    if (b.status !== "COMPLETED") return false; // Reports only contain completed visits

    const bDate = new Date(b.date);
    
    if (filterType === "daily" && targetDate) {
      const filterDate = new Date(targetDate);
      return (
        bDate.getDate() === filterDate.getDate() &&
        bDate.getMonth() === filterDate.getMonth() &&
        bDate.getFullYear() === filterDate.getFullYear()
      );
    }
    
    if (filterType === "monthly" && targetMonth) {
      const [year, month] = targetMonth.split("-");
      return (
        bDate.getFullYear() === parseInt(year) &&
        (bDate.getMonth() + 1) === parseInt(month)
      );
    }

    return true; // "all"
  });

  // Calculate stats
  const totalVisits = filteredBookings.length;
  const bpjsCount = filteredBookings.filter((b) => b.paymentType === "BPJS").length;
  const umumCount = filteredBookings.filter((b) => b.paymentType === "UMUM").length;
  
  // Mock estimation income: Umum = Rp 50,000, BPJS = Rp 15,000 (reimbursement rate)
  const estimatedRevenue = (umumCount * 50000) + (bpjsCount * 15000);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredBookings.length === 0) {
      alert("Tidak ada data untuk diexport!");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID Booking,Nama Pasien,Kode Pasien,Dokter,Poli,Tanggal Periksa,Jam Periksa,Metode Pembayaran\n";

    filteredBookings.forEach((b) => {
      const formattedDate = new Date(b.date).toLocaleDateString("id-ID");
      const row = [
        b.id,
        b.patient.name,
        b.patient.code,
        b.doctor.name,
        b.doctor.specialization,
        formattedDate,
        b.time,
        b.paymentType
      ].map(val => `"${val}"`).join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const fileName = `Laporan_KlinikBot_${filterType}_${filterType === "daily" ? targetDate : targetMonth}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1>Laporan Kunjungan Pasien</h1>
          <p>Unduh laporan kunjungan pasien harian atau bulanan, periksa metode pembayaran, dan ekspor ke Excel atau PDF.</p>
        </div>
        <div className="flex-gap-2">
          <button onClick={handleExportCSV} className="btn btn-secondary" style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
            <FileSpreadsheet size={16} /> Export Excel (CSV)
          </button>
          <button onClick={handlePrint} className="btn btn-primary" style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
            <Printer size={16} /> Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px", background: "#fee2e2", color: "#dc2626", borderRadius: "8px", margin: "16px 0", display: "flex", gap: "8px", alignItems: "center" }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Report Filter Dashboard */}
      <div className="card filter-bar mt-4">
        <div className="flex-gap-4" style={{ flexWrap: "wrap", width: "100%" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Filter Laporan</label>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value as any)}
              style={{ width: "160px" }}
            >
              <option value="all">Semua Kunjungan</option>
              <option value="daily">Laporan Harian</option>
              <option value="monthly">Laporan Bulanan</option>
            </select>
          </div>

          {filterType === "daily" && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Pilih Hari</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          )}

          {filterType === "monthly" && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Pilih Bulan</label>
              <input
                type="month"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-4 mt-4">
        <div className="card stat-card">
          <h3>Total Kunjungan</h3>
          <div className="stat-value">{loading ? "..." : totalVisits} pasien</div>
          <p>Total pasien selesai dilayani</p>
        </div>

        <div className="card stat-card" style={{ contentVisibility: "auto" }}>
          <h3>Pasien Umum</h3>
          <div className="stat-value" style={{ color: "hsl(var(--primary))" }}>
            {loading ? "..." : umumCount}
          </div>
          <p>Selesai dilayani (Mandiri/Umum)</p>
        </div>

        <div className="card stat-card">
          <h3>Pasien BPJS</h3>
          <div className="stat-value" style={{ color: "hsl(var(--warning))" }}>
            {loading ? "..." : bpjsCount}
          </div>
          <p>Selesai dilayani (Subsidized BPJS)</p>
        </div>

        <div className="card stat-card">
          <h3>Estimasi Klaim/Klaim & Cash</h3>
          <div className="stat-value" style={{ color: "hsl(var(--success))" }}>
            {loading ? "..." : `Rp ${estimatedRevenue.toLocaleString("id-ID")}`}
          </div>
          <p>Estimasi total omset klinik</p>
        </div>
      </div>

      {/* Report Table */}
      <div className="card mt-4">
        <h2>
          Rincian Data Kunjungan — {
            filterType === "all" ? "Semua Periode" : 
            filterType === "daily" ? `Hari ${new Date(targetDate).toLocaleDateString("id-ID")}` :
            `Bulan ${targetMonth}`
          }
        </h2>
        
        {loading ? (
          <p style={{ marginTop: "12px" }}>Memuat laporan...</p>
        ) : filteredBookings.length === 0 ? (
          <p style={{ marginTop: "12px", color: "hsl(var(--muted-foreground))" }}>Tidak ada kunjungan pasien yang selesai untuk rentang ini.</p>
        ) : (
          <div className="table-container">
            <table width="100%">
              <thead>
                <tr>
                  <th>ID Booking</th>
                  <th>Kode Pasien</th>
                  <th>Nama Pasien</th>
                  <th>Dokter Pilihan</th>
                  <th>Poli</th>
                  <th>Tanggal Kunjungan</th>
                  <th>Jam</th>
                  <th>Pembayaran</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b.id}>
                    <td><small><code>{b.id}</code></small></td>
                    <td>{b.patient.code}</td>
                    <td><strong>{b.patient.name}</strong></td>
                    <td>{b.doctor.name}</td>
                    <td>{b.doctor.specialization}</td>
                    <td>{new Date(b.date).toLocaleDateString("id-ID")}</td>
                    <td>{b.time}</td>
                    <td>
                      <span className={`badge ${b.paymentType === "BPJS" ? "badge-confirmed" : "badge-waiting"}`}>
                        {b.paymentType}
                      </span>
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
