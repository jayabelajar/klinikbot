# PRD — KlinikBot
### WhatsApp Clinic Administration System

## 1. Ringkasan

**KlinikBot** adalah sistem administrasi klinik berbasis WhatsApp yang membantu proses pendaftaran pasien, booking jadwal, dan manajemen antrian secara otomatis. Admin mengelola seluruh data melalui dashboard web sehingga proses administrasi menjadi lebih cepat, rapi, dan efisien.

> **Scope:** Single Clinic (bukan SaaS)

---

# 2. Tujuan

- Mempermudah pendaftaran pasien melalui WhatsApp.
- Mengurangi antrean di resepsionis.
- Mempermudah admin mengelola pasien dan jadwal.
- Menyediakan informasi klinik secara otomatis.
- Menyimpan data administrasi secara terpusat.

---

# 3. Target Pengguna

### Pasien
- Pasien baru
- Pasien lama

### Admin
- Resepsionis
- Pemilik klinik

---

# 4. Tech Stack

| Bagian | Teknologi |
|---------|-----------|
| Bot | Node.js, TypeScript, Baileys |
| Backend API | Fastify |
| Dashboard | Next.js, Tailwind CSS, shadcn/ui |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma |
| Auth | Better Auth / Auth.js |
| Deployment | Vercel (Dashboard), Railway/Fly.io (API & Bot) |

---

# 5. Fitur Pasien (WhatsApp)

### Menu Utama

- Daftar Berobat
- Booking Jadwal
- Cek Antrian
- Jadwal Dokter
- Informasi Klinik
- Hubungi Admin

### Daftar Berobat

Data yang diminta:

- Nama
- Tanggal lahir
- Jenis kelamin
- Nomor HP
- Keluhan
- Jenis pembayaran (BPJS/Umum)

Output:
- Kode booking
- Konfirmasi pendaftaran

### Booking Jadwal

- Pilih poli
- Pilih dokter
- Pilih tanggal
- Pilih jam
- Konfirmasi

### Cek Antrian

Menampilkan:

- Nomor antrian
- Nomor yang sedang dilayani
- Estimasi waktu

### Jadwal Dokter

Menampilkan jadwal praktik seluruh dokter.

### Informasi Klinik

- Alamat
- Jam operasional
- Nomor telepon
- Google Maps

### Hubungi Admin

Menghubungkan pasien ke admin apabila membutuhkan bantuan.

---

# 6. Dashboard Admin

### Dashboard

Menampilkan ringkasan:

- Total pasien
- Booking hari ini
- Antrian aktif
- Pasien selesai
- Statistik singkat

### Pasien

- Tambah
- Edit
- Hapus
- Cari
- Detail pasien

### Dokter

- CRUD dokter
- Jadwal praktik
- Status aktif/nonaktif

### Booking

- Lihat booking
- Konfirmasi
- Tolak
- Batalkan
- Selesaikan

### Antrian

- Generate nomor antrian
- Panggil pasien
- Skip
- Selesai

Saat admin memanggil nomor, bot otomatis mengirim notifikasi ke pasien.

### Broadcast

Mengirim pengumuman ke seluruh pasien, misalnya perubahan jadwal atau informasi klinik.

### Laporan

Export data:

- Excel
- PDF

Filter:

- Harian
- Bulanan

### Pengaturan

- Profil klinik
- Jam operasional
- Template pesan WhatsApp

---

# 7. Database

## users

- id
- username
- password
- role

## patients

- id
- code
- name
- gender
- birth_date
- phone
- address

## doctors

- id
- name
- specialization
- schedule
- status

## bookings

- id
- patient_id
- doctor_id
- date
- time
- complaint
- payment_type
- status

## queues

- id
- booking_id
- queue_number
- status

## messages

- id
- phone
- message
- direction
- created_at

---

# 8. Status Booking

```
WAITING
    ↓
CONFIRMED
    ↓
QUEUE
    ↓
IN_PROGRESS
    ↓
COMPLETED

atau

CANCELLED
```

---

# 9. Alur Sistem

```
Pasien
    │
WhatsApp
    │
Baileys Bot
    │
Fastify API
    │
PostgreSQL
    │
Dashboard Admin
```

---

# 10. Struktur Project

```
apps/
├── bot/
├── api/
└── dashboard/

packages/
├── database/
├── types/
├── utils/
└── config/
```

---

# 11. Struktur Bot

```
src/
├── commands/
├── flows/
├── handlers/
├── services/
├── repositories/
├── middlewares/
├── utils/
├── config/
└── index.ts
```

---

# 12. Validasi

- Nomor HP harus valid.
- Jadwal tidak boleh bentrok.
- Kuota dokter tidak boleh melebihi batas.
- Pasien tidak boleh memiliki booking aktif pada waktu yang sama.
- Semua input wajib divalidasi.

---

# 13. Non-Functional Requirements

- Responsive dashboard.
- Waktu respon bot < 3 detik.
- Logging aktivitas.
- Error handling.
- Backup database.
- Keamanan autentikasi admin.

---

# 14. MVP

### WhatsApp Bot

- Menu utama
- Daftar berobat
- Booking jadwal
- Cek antrian
- Jadwal dokter
- Informasi klinik

### Dashboard

- Login admin
- Dashboard
- CRUD pasien
- CRUD dokter
- Kelola booking
- Kelola antrian
- Broadcast WhatsApp
- Export laporan

---

# 15. Future Development

- Reminder otomatis H-1
- QR Code Check-in
- Rekam medis (EMR)
- Pembayaran QRIS
- AI FAQ
- Integrasi BPJS
- Upload hasil laboratorium

---

# 16. Target Hasil

KlinikBot menjadi sistem administrasi klinik berbasis WhatsApp yang mampu menangani proses pendaftaran, booking, dan antrian secara otomatis dengan dashboard admin yang sederhana, sehingga meningkatkan efisiensi pelayanan klinik tanpa memerlukan aplikasi mobile khusus.