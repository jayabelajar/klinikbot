"use client";

import { useEffect, useState } from "react";
import { Megaphone, Send, ChevronRight, AlertTriangle } from "lucide-react";

interface MessageLog {
  id: string;
  phone: string;
  message: string;
  direction: "INBOUND" | "OUTBOUND";
  createdAt: string;
}

export default function BroadcastPage() {
  const [message, setMessage] = useState("");
  const [patientCount, setPatientCount] = useState(0);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const fetchStatsAndLogs = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    try {
      // Get patient count
      const patRes = await fetch(`${apiUrl}/patients`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (patRes.ok) {
        const patients = await patRes.json();
        setPatientCount(patients.length);
      }

      // Get messages log
      const msgRes = await fetch(`${apiUrl}/messages`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (msgRes.ok) {
        const msgs = await msgRes.json();
        setLogs(msgs.filter((m: any) => m.direction === "OUTBOUND"));
      }
    } catch (err) {
      console.error("Failed to load broadcast page stats/logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchStatsAndLogs();
  }, []);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (!confirm(`Apakah Anda yakin ingin mengirim pesan ini ke seluruh ${patientCount} pasien terdaftar?`)) {
      return;
    }

    setSending(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${apiUrl}/messages/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ message })
      });

      if (!res.ok) throw new Error("Gagal mengirim broadcast");
      
      const result = await res.json();
      alert(`Broadcast sukses dikirim ke ${result.count} nomor pasien!`);
      setMessage("");
      fetchStatsAndLogs();
    } catch (err: any) {
      alert(err.message || "Gagal mengirim pesan");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div>
        <h1>WhatsApp Broadcast & Pengumuman</h1>
        <p>Kirim pesan pengumuman massal secara instan ke seluruh nomor pasien yang terdaftar di database.</p>
      </div>

      <div className="grid grid-2 mt-4">
        {/* Broadcast Composer */}
        <div className="card">
          <h2>Tulis Pesan Broadcast</h2>
          <p style={{ marginBottom: "16px" }}>Pesan akan dikirim secara sekuensial melalui bot WhatsApp KlinikBot.</p>
          
          <div style={{ padding: "12px", background: "hsl(var(--accent))", border: "1px solid hsl(var(--primary) / 0.2)", color: "hsl(var(--accent-foreground))", borderRadius: "8px", fontSize: "14px", marginBottom: "16px", display: "flex", gap: "8px", alignItems: "center" }}>
            <Megaphone size={16} /> <span>**Target Penerima:** *{patientCount} nomor pasien* terdaftar.</span>
          </div>

          <form onSubmit={handleSendBroadcast}>
            <div className="form-group">
              <label>Isi Pesan WhatsApp</label>
              <textarea
                rows={6}
                required
                placeholder="Tulis pengumuman Anda di sini... (Contoh: Informasi perubahan jam praktik, pengumuman libur klinik, atau info vaksinasi)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ resize: "vertical" }}
              />
            </div>

            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: "100%", padding: "12px", display: "inline-flex", gap: "8px", alignItems: "center", justifyContent: "center" }}
                disabled={sending || patientCount === 0 || !message.trim()}
              >
                {sending ? "Mengirim broadcast massal..." : <><Send size={16} /> Kirim Pengumuman Sekarang</>}
              </button>
            </div>
          </form>
        </div>

        {/* Tip / Guidelines */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h2>Tips Penulisan Pesan</h2>
          <div style={{ fontSize: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <ChevronRight size={16} style={{ color: "hsl(var(--primary))", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Gunakan Format Tebal (Bold):</strong>
                <p>Tambahkan tanda bintang di awal dan akhir kata untuk membuat teks tebal di WhatsApp. Contoh: `*PENGUMUMAN*` akan menjadi *PENGUMUMAN*.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <ChevronRight size={16} style={{ color: "hsl(var(--primary))", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Singkat dan Jelas:</strong>
                <p>Pasien lebih suka membaca pengumuman yang padat dan langsung ke poin utama.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <ChevronRight size={16} style={{ color: "hsl(var(--primary))", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Sertakan Nomor Bantuan:</strong>
                <p>Berikan kontak admin klinik di akhir pesan agar pasien dapat merespon jika ada pertanyaan lanjutan.</p>
              </div>
            </div>
            <div style={{ borderTop: "1px solid hsl(var(--card-border))", paddingTop: "12px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <AlertTriangle size={16} style={{ color: "hsl(var(--warning))", flexShrink: 0, marginTop: "2px" }} />
              <p style={{ color: "hsl(var(--muted-foreground))" }}>Pastikan status koneksi bot WhatsApp di server dalam keadaan aktif/tersambung sebelum menekan tombol kirim.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Outbound Broadcast History Logs */}
      <div className="card mt-4">
        <h2>Riwayat Pengiriman Pesan Outbound</h2>
        <div className="table-container" style={{ marginTop: "12px" }}>
          {loadingLogs ? (
            <p>Memuat riwayat...</p>
          ) : logs.length === 0 ? (
            <p style={{ padding: "16px 0", color: "hsl(var(--muted-foreground))" }}>Belum ada riwayat pesan dikirim.</p>
          ) : (
            <table width="100%">
              <thead>
                <tr>
                  <th>No HP Penerima</th>
                  <th>Pesan Terkirim</th>
                  <th>Waktu Pengiriman</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 20).map((log) => (
                  <tr key={log.id}>
                    <td><code>{log.phone}</code></td>
                    <td style={{ whiteSpace: "pre-wrap", maxWidth: "450px" }}>{log.message}</td>
                    <td>{new Date(log.createdAt).toLocaleString("id-ID")}</td>
                    <td>
                      <span className="badge badge-completed">Terkirim</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
