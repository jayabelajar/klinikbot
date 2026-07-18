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

  useEffect(() => {
    fetchSettings();
  }, []);

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
