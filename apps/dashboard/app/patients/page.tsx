"use client";

import { useEffect, useState } from "react";
import { Plus, AlertTriangle, Edit, Trash2 } from "lucide-react";

interface Patient {
  id: string;
  code: string;
  name: string;
  gender: "MALE" | "FEMALE";
  birthDate: string;
  phone: string;
  address?: string | null;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    gender: "MALE" as "MALE" | "FEMALE",
    birthDate: "",
    phone: "",
    address: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPatients = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${apiUrl}/patients`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (!res.ok) throw new Error("Gagal memuat data pasien");
      const data = await res.json();
      setPatients(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleOpenAdd = () => {
    setEditingPatient(null);
    setFormData({
      name: "",
      gender: "MALE",
      birthDate: "",
      phone: "",
      address: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      gender: patient.gender,
      birthDate: new Date(patient.birthDate).toISOString().split("T")[0],
      phone: patient.phone,
      address: patient.address || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pasien ini?")) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${apiUrl}/patients/${id}`, {
        method: "DELETE",
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Gagal menghapus pasien. Pastikan pasien tidak memiliki data booking.");
      }
      fetchPatients();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    
    const url = editingPatient 
      ? `${apiUrl}/patients/${editingPatient.id}` 
      : `${apiUrl}/patients`;
      
    const method = editingPatient ? "PATCH" : "POST";

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
        throw new Error(errData?.message || "Gagal menyimpan data pasien");
      }

      setIsModalOpen(false);
      fetchPatients();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const searchLower = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(searchLower) ||
      p.code.toLowerCase().includes(searchLower) ||
      p.phone.includes(searchLower)
    );
  });

  return (
    <div>
      <div className="flex-between">
        <div>
          <h1>Manajemen Pasien</h1>
          <p>Kelola data seluruh pasien terdaftar di Klinik.</p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary" style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
          <Plus size={16} /> Tambah Pasien Baru
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px", background: "#fee2e2", color: "#dc2626", borderRadius: "8px", margin: "16px 0", display: "flex", gap: "8px", alignItems: "center" }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Filter and Search */}
      <div className="card filter-bar mt-4">
        <input
          type="text"
          placeholder="Cari pasien berdasarkan nama, kode pasien, atau nomor telepon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Patients Table */}
      <div className="card" style={{ marginTop: "16px" }}>
        {loading ? (
          <p>Memuat data...</p>
        ) : filteredPatients.length === 0 ? (
          <p>Tidak ada data pasien ditemukan.</p>
        ) : (
          <div className="table-container">
            <table width="100%">
              <thead>
                <tr>
                  <th align="left">Kode Pasien</th>
                  <th align="left">Nama Pasien</th>
                  <th align="left">Gender</th>
                  <th align="left">Tanggal Lahir</th>
                  <th align="left">No HP</th>
                  <th align="left">Alamat</th>
                  <th align="right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.code}</strong></td>
                    <td>{p.name}</td>
                    <td>{p.gender === "MALE" ? "Laki-laki" : "Perempuan"}</td>
                    <td>{new Date(p.birthDate).toLocaleDateString("id-ID")}</td>
                    <td>{p.phone}</td>
                    <td>{p.address || "-"}</td>
                    <td align="right">
                      <div className="flex-gap-2" style={{ justifyContent: "flex-end" }}>
                        <button onClick={() => handleOpenEdit(p)} className="btn btn-secondary btn-sm" style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
                          <Edit size={14} /> Edit
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="btn btn-destructive btn-sm" style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
                          <Trash2 size={14} /> Hapus
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
            <h2>{editingPatient ? "Edit Data Pasien" : "Tambah Pasien Baru"}</h2>
            <form onSubmit={handleSubmit} style={{ marginTop: "16px" }}>
              <div className="form-group">
                <label>Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Jenis Kelamin</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as "MALE" | "FEMALE" })}
                >
                  <option value="MALE">Laki-laki</option>
                  <option value="FEMALE">Perempuan</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tanggal Lahir</label>
                <input
                  type="date"
                  required
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Nomor HP (Contoh: 081234567890)</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Alamat Lengkap</label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
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
