"use client";

import { useEffect, useState } from "react";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  schedule: string;
  status: "ACTIVE" | "INACTIVE";
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    schedule: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE"
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchDoctors = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${apiUrl}/doctors`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (!res.ok) throw new Error("Gagal memuat data dokter");
      const data = await res.json();
      setDoctors(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleOpenAdd = () => {
    setEditingDoctor(null);
    setFormData({
      name: "",
      specialization: "",
      schedule: "",
      status: "ACTIVE"
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc: Doctor) => {
    setEditingDoctor(doc);
    setFormData({
      name: doc.name,
      specialization: doc.specialization,
      schedule: doc.schedule,
      status: doc.status
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (doc: Doctor) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    const newStatus = doc.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`${apiUrl}/doctors/${doc.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Gagal mengubah status dokter");
      fetchDoctors();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus dokter ini?")) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${apiUrl}/doctors/${id}`, {
        method: "DELETE",
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Gagal menghapus dokter. Pastikan dokter tidak memiliki data booking.");
      }
      fetchDoctors();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");

    const url = editingDoctor 
      ? `${apiUrl}/doctors/${editingDoctor.id}` 
      : `${apiUrl}/doctors`;
      
    const method = editingDoctor ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Gagal menyimpan data dokter");
      }

      setIsModalOpen(false);
      fetchDoctors();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const searchLower = search.toLowerCase();
    return (
      doc.name.toLowerCase().includes(searchLower) ||
      doc.specialization.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1>Jadwal & Master Dokter</h1>
          <p>Kelola data dokter, spesialisasi, dan jadwal praktik di Klinik.</p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          ➕ Tambah Dokter Baru
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px", background: "#fee2e2", color: "#dc2626", borderRadius: "8px", margin: "16px 0" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Filter and Search */}
      <div className="card filter-bar mt-4">
        <input
          type="text"
          placeholder="Cari dokter berdasarkan nama atau spesialisasi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Doctors Table */}
      <div className="card" style={{ marginTop: "16px" }}>
        {loading ? (
          <p>Memuat data...</p>
        ) : filteredDoctors.length === 0 ? (
          <p>Tidak ada data dokter ditemukan.</p>
        ) : (
          <div className="table-container">
            <table width="100%">
              <thead>
                <tr>
                  <th align="left">Nama Dokter</th>
                  <th align="left">Spesialisasi</th>
                  <th align="left">Jadwal Praktik</th>
                  <th align="left">Status Keaktifan</th>
                  <th align="right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doc) => (
                  <tr key={doc.id}>
                    <td><strong>{doc.name}</strong></td>
                    <td>{doc.specialization}</td>
                    <td>{doc.schedule}</td>
                    <td>
                      <button 
                        onClick={() => handleToggleStatus(doc)} 
                        className={`badge ${doc.status === "ACTIVE" ? "badge-active" : "badge-inactive"}`}
                        style={{ border: "none", cursor: "pointer" }}
                        title="Klik untuk ubah status"
                      >
                        {doc.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td align="right">
                      <div className="flex-gap-2" style={{ justifyContent: "flex-end" }}>
                        <button onClick={() => handleOpenEdit(doc)} className="btn btn-secondary btn-sm">
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDelete(doc.id)} className="btn btn-destructive btn-sm">
                          🗑️ Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingDoctor ? "Edit Data Dokter" : "Tambah Dokter Baru"}</h2>
            <form onSubmit={handleSubmit} style={{ marginTop: "16px" }}>
              <div className="form-group">
                <label>Nama Lengkap Dokter</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: dr. Andi Wijaya"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Spesialisasi / Poli</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Poli Umum, Poli Gigi"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Jadwal Praktik</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Senin - Jumat (08:00 - 12:00)"
                  value={formData.schedule}
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Status Keaktifan</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                >
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Nonaktif</option>
                </select>
              </div>

              <div className="flex-gap-2 mt-4" style={{ justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
