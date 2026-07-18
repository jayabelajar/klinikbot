"use client";

import { useEffect, useState } from "react";

interface ClinicSettings {
  clinicName: string;
  address: string;
  phone: string;
  operatingHours: string;
  googleMapsUrl: string;
  whatsappTemplates: {
    welcome: string;
    registrationSuccess: string;
    bookingSuccess: string;
    queueCall: string;
    queueSkip: string;
    clinicInfo: string;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WhatsApp connection states
  const [whatsappStatus, setWhatsappStatus] = useState<{ status: string; qr: string; phone: string; error?: string } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchSettings = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${apiUrl}/settings`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (!res.ok) throw new Error("Gagal memuat pengaturan klinik");
      const data = await res.json();
      setSettings(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchWhatsappStatus = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${apiUrl}/whatsapp/status`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (res.ok) {
        const data = await res.json();
        setWhatsappStatus(data);
      }
    } catch (err) {
      console.error("Gagal memuat status WhatsApp:", err);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchWhatsappStatus();

    // Poll status every 5 seconds to automatically detect qr updates & successful scans
    const interval = setInterval(fetchWhatsappStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDisconnectWhatsapp = async () => {
    if (!confirm("Apakah Anda yakin ingin memutus koneksi WhatsApp Bot?")) return;
    setDisconnecting(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${apiUrl}/whatsapp/logout`, {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (res.ok) {
        alert("WhatsApp Bot berhasil diputus!");
        fetchWhatsappStatus();
      } else {
        throw new Error("Gagal memutuskan koneksi");
      }
    } catch (err: any) {
      alert(err.message || "Gagal memproses.");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${apiUrl}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(settings)
      });

      if (!res.ok) throw new Error("Gagal menyimpan pengaturan");
      alert("Pengaturan klinik berhasil diperbarui!");
      fetchSettings();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateChange = (key: string, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      whatsappTemplates: {
        ...settings.whatsappTemplates,
        [key]: value
      }
    });
  };

  if (loading) {
    return <p>Memuat data pengaturan...</p>;
  }

  return (
    <div>
      <div>
        <h1>Pengaturan Klinik & Template Pesan</h1>
        <p>Edit profil klinik, jam operasional, dan sesuaikan template pesan respons otomatis untuk bot WhatsApp.</p>
      </div>

      {error && (
        <div style={{ padding: "12px", background: "#fee2e2", color: "#dc2626", borderRadius: "8px", margin: "16px 0" }}>
          ⚠️ {error}
        </div>
      )}

      {settings && (
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "16px" }}>
          {/* WhatsApp Connection Integration Panel */}
          <div className="card">
            <h2>Koneksi WhatsApp Bot</h2>
            <p style={{ marginBottom: "16px" }}>Hubungkan nomor WhatsApp untuk mengirimkan notifikasi antrian, konfirmasi booking, dan merespons pesan pasien secara otomatis.</p>
            
            {checkingStatus && !whatsappStatus ? (
              <p>Memeriksa status koneksi...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <strong>Status Koneksi:</strong>
                  {whatsappStatus?.status === "CONNECTED" && (
                    <span style={{ padding: "4px 12px", background: "#dcfce7", color: "#15803d", borderRadius: "9999px", fontWeight: "bold", fontSize: "14px" }}>
                      🟢 Terhubung {whatsappStatus.phone ? `(${whatsappStatus.phone})` : ""}
                    </span>
                  )}
                  {whatsappStatus?.status === "QR_READY" && (
                    <span style={{ padding: "4px 12px", background: "#fef9c3", color: "#a16207", borderRadius: "9999px", fontWeight: "bold", fontSize: "14px" }}>
                      🟡 Menunggu Pemindaian QR Code
                    </span>
                  )}
                  {whatsappStatus?.status === "CONNECTING" && (
                    <span style={{ padding: "4px 12px", background: "#dbeafe", color: "#1d4ed8", borderRadius: "9999px", fontWeight: "bold", fontSize: "14px" }}>
                      🔵 Menghubungkan...
                    </span>
                  )}
                  {(whatsappStatus?.status === "DISCONNECTED" || !whatsappStatus?.status) && (
                    <span style={{ padding: "4px 12px", background: "#fee2e2", color: "#b91c1c", borderRadius: "9999px", fontWeight: "bold", fontSize: "14px" }}>
                      🔴 Terputus
                    </span>
                  )}
                </div>

                {whatsappStatus?.status === "QR_READY" && whatsappStatus.qr && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                    <p style={{ marginBottom: "12px", fontWeight: "600", color: "#475569", textAlign: "center" }}>
                      Pindai QR Code di bawah dengan aplikasi WhatsApp Anda (Perangkat Tertaut):
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(whatsappStatus.qr)}`} 
                      alt="WhatsApp QR Code"
                      style={{ border: "4px solid white", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
                    <p style={{ marginTop: "12px", fontSize: "12px", color: "#64748b", textAlign: "center" }}>
                      QR Code akan diperbarui secara berkala jika belum dipindai.
                    </p>
                  </div>
                )}

                {whatsappStatus?.status === "CONNECTED" && (
                  <div style={{ background: "#f0fdf4", padding: "16px", borderRadius: "8px", border: "1px solid #bbf7d0", color: "#166534" }}>
                    Bot WhatsApp aktif dan berjalan menggunakan nomor <strong>{whatsappStatus.phone}</strong>. Sistem siap mengirimkan notifikasi dan melayani antrian pasien.
                  </div>
                )}

                {whatsappStatus?.status === "CONNECTED" && (
                  <div>
                    <button 
                      type="button" 
                      onClick={handleDisconnectWhatsapp} 
                      className="btn" 
                      style={{ background: "#dc2626", color: "white", padding: "10px 20px" }}
                      disabled={disconnecting}
                    >
                      {disconnecting ? "Memutus..." : "🔌 Putuskan Koneksi WhatsApp"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clinic Profile Metadata */}
          <div className="card">
            <h2>Profil & Metadata Klinik</h2>
            <p style={{ marginBottom: "16px" }}>Informasi di bawah ini digunakan oleh sistem dan bot ketika pasien menanyakan info klinik.</p>
            
            <div className="grid grid-2">
              <div className="form-group">
                <label>Nama Klinik</label>
                <input
                  type="text"
                  required
                  value={settings.clinicName}
                  onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Nomor Telepon Klinik (Untuk WhatsApp & Bantuan)</label>
                <input
                  type="text"
                  required
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group mt-4">
              <label>Alamat Lengkap Klinik</label>
              <input
                type="text"
                required
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>

            <div className="grid grid-2 mt-4">
              <div className="form-group">
                <label>Jam Operasional</label>
                <input
                  type="text"
                  required
                  value={settings.operatingHours}
                  onChange={(e) => setSettings({ ...settings, operatingHours: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Link Google Maps Klinik</label>
                <input
                  type="url"
                  value={settings.googleMapsUrl}
                  onChange={(e) => setSettings({ ...settings, googleMapsUrl: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* WhatsApp Template Customizations */}
          <div className="card">
            <h2>Template Pesan WhatsApp Otomatis</h2>
            <p style={{ marginBottom: "16px" }}>Sesuaikan format pesan yang akan dikirim secara otomatis ke pasien. Anda dapat menggunakan variabel penampung `{`nama_variabel`}`.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label>1. Pesan Selamat Datang & Menu Utama (Ketik *menu* atau *halo*)</label>
                <textarea
                  rows={4}
                  value={settings.whatsappTemplates.welcome}
                  onChange={(e) => handleTemplateChange("welcome", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>2. Pesan Pendaftaran Baru Sukses (Variabel: `{`{name}`}`, `{`{code}`}`, `{`{phone}`}`)</label>
                <textarea
                  rows={4}
                  value={settings.whatsappTemplates.registrationSuccess}
                  onChange={(e) => handleTemplateChange("registrationSuccess", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>3. Pesan Booking Sukses (Variabel: `{`{bookingId}`}`, `{`{patientName}`}`, `{`{doctorName}`}`, `{`{date}`}`, `{`{time}`}`)</label>
                <textarea
                  rows={5}
                  value={settings.whatsappTemplates.bookingSuccess}
                  onChange={(e) => handleTemplateChange("bookingSuccess", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>4. Pesan Panggilan Antrian (Variabel: `{`{queueNumber}`}`, `{`{patientName}`}`)</label>
                <textarea
                  rows={4}
                  value={settings.whatsappTemplates.queueCall}
                  onChange={(e) => handleTemplateChange("queueCall", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>5. Pesan Antrian Dilewati / Skip (Variabel: `{`{queueNumber}`}`)</label>
                <textarea
                  rows={3}
                  value={settings.whatsappTemplates.queueSkip}
                  onChange={(e) => handleTemplateChange("queueSkip", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>6. Pesan Informasi Klinik (Variabel: `{`{clinicName}`}`, `{`{address}`}`, `{`{operatingHours}`}`, `{`{phone}`}`, `{`{googleMapsUrl}`}`)</label>
                <textarea
                  rows={5}
                  value={settings.whatsappTemplates.clinicInfo}
                  onChange={(e) => handleTemplateChange("clinicInfo", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" style={{ padding: "14px 28px" }} disabled={saving}>
              {saving ? "Menyimpan pengaturan..." : "💾 Simpan Perubahan Pengaturan"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
