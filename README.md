# KlinikBot Monorepo

KlinikBot adalah monorepo berbasis **pnpm workspace** untuk sistem klinik yang terdiri dari beberapa aplikasi dan package bersama:

- `apps/api` → Backend API (Fastify + Prisma)
- `apps/bot` → Bot service
- `apps/dashboard` → Frontend dashboard (Next.js)
- `packages/config` → Shared config
- `packages/database` → Prisma schema + database client
- `packages/types` → Shared types
- `packages/utils` → Shared utility functions

---

## 1) Prerequisites

Pastikan environment sudah punya:

- **Node.js**: disarankan v20+
- **pnpm**: v9+
- **PostgreSQL**: aktif dan bisa diakses

Cek versi:

```bash
node -v
pnpm -v
```

---

## 2) Install Dependencies

Dari root project:

```bash
pnpm install
```

---

## 3) Konfigurasi Environment

Buat file `.env` sesuai kebutuhan Prisma/API.

Minimal wajib untuk database (Supabase PostgreSQL), contoh:

```env
# Disarankan untuk aplikasi (pooled connection)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
```

Alternatif direct connection (biasanya untuk migration/DDL):
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require"
```

Untuk API JWT secret (sesuaikan dengan implementasi config package):

```env
JWT_SECRET="supersecret"
```

> Catatan:
> - Sesuaikan host, user, password, dbname dengan PostgreSQL kamu.
> - Jika project memakai lokasi env spesifik per app/package, pastikan variabel ini tetap terbaca saat run command.

---

## 4) Setup Database (Prisma)

Jalankan generate Prisma Client:

```bash
pnpm --filter @klinikbot/database prisma:generate
```

Jalankan migration ke database:

```bash
pnpm --filter @klinikbot/database prisma:migrate
```

Jika butuh deploy migration (production-style):

```bash
pnpm --filter @klinikbot/database prisma:deploy
```

---

## 5) Menjalankan Project

### Jalankan semua workspace (yang punya script `dev`)

```bash
pnpm -r dev
```

### Jalankan per app

API:
```bash
pnpm --filter @klinikbot/api dev
```

Bot:
```bash
pnpm --filter @klinikbot/bot dev
```

Dashboard:
```bash
pnpm --filter @klinikbot/dashboard dev
```

---

## 6) Script Penting

### Typecheck semua workspace

```bash
pnpm -r typecheck
```

### Build (jika tersedia per package/app)

```bash
pnpm -r build
```

### Prisma generate manual (database package)

```bash
pnpm --filter @klinikbot/database prisma:generate
```

---

## 7) Login API (Dasar)

Endpoint login:

- **POST** `/auth/login`

Body JSON contoh:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

Response sukses akan mengembalikan token JWT.

> Penting:
> User harus sudah ada di tabel `users`.
> Jika belum ada, login akan gagal `Invalid credentials`.

---

## 8) Troubleshooting

### A) Error typecheck:
`Module "@klinikbot/database" has no exported member 'BookingStatus' / 'QueueStatus'`

Penyebab umum:
- Prisma Client belum tergenerate sesuai schema terbaru.

Solusi:
```bash
pnpm --filter @klinikbot/database prisma:generate
pnpm -r typecheck
```

---

### B) Warning TypeScript:
`Option 'baseUrl' is deprecated ... Specify "ignoreDeprecations": "6.0"`

Penjelasan:
- Ini warning deprecation dari TypeScript versi baru.
- `baseUrl` masih dipakai sekarang, tapi akan dihentikan di TS 7.

Fix cepat (silence warning):
- Update `ignoreDeprecations` di `tsconfig.base.json` ke `"6.0"`.

Catatan:
- Solusi jangka panjang adalah migrasi config path alias mengikuti rekomendasi TS terbaru.

---

## 9) Struktur Singkat Repository

```text
.
├─ apps/
│  ├─ api/
│  ├─ bot/
│  └─ dashboard/
├─ packages/
│  ├─ config/
│  ├─ database/
│  │  ├─ prisma/
│  │  │  └─ schema.prisma
│  │  └─ src/
│  ├─ types/
│  └─ utils/
├─ package.json
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

---

## 10) Quick Start Ringkas

```bash
pnpm install
pnpm --filter @klinikbot/database prisma:generate
pnpm --filter @klinikbot/database prisma:migrate
pnpm -r typecheck
pnpm --filter @klinikbot/api dev
```

Selesai. API siap dipakai setelah env dan database valid.

---

## 11) FAQ & Arsitektur Workspace (pnpm)

### A. Mengapa ada folder `node_modules` di setiap sub-folder `apps/`?
Monorepo ini menggunakan **pnpm workspaces**. Berbeda dengan npm atau yarn klasik, pnpm memiliki sistem manajemen dependency yang efisien dan aman:
1. **Tidak Ada Duplikasi Fisik (Hard-link/Symlink)**: pnpm mengunduh dependency sekali saja ke global/root store (`node_modules/.pnpm/`). Folder `node_modules` di dalam masing-masing app (`apps/api`, `apps/dashboard`, dll.) sebenarnya hanya berisi **symlink** (atau junction di Windows) ke root store tersebut. Jadi, space disk Anda tetap hemat dan tidak terduplikasi secara fisik.
2. **Koneksi Workspace Internal**: Local packages (seperti `@klinikbot/database`, `@klinikbot/utils`) juga di-link otomatis melalui symlink ke `node_modules` aplikasi yang memerlukannya agar bisa di-import langsung tanpa build/publish manual.
3. **Mencegah Phantom Dependencies**: pnpm memastikan tiap app hanya bisa mengimpor library yang dideklarasikan secara eksplisit pada `package.json` miliknya sendiri.

### B. Mengapa saat menjalankan `pnpm -r dev` terasa lama / berat?
Perintah `pnpm -r dev` (atau `pnpm -r --parallel dev`) menjalankan seluruh aplikasi (`apps/api`, `apps/bot`, dan `apps/dashboard`) secara **bersamaan (paralel)**. Berikut beberapa alasannya:
1. **Beban Resource Next.js**: `apps/dashboard` (Next.js) memakan resource RAM/CPU yang cukup besar pada inisialisasi awal dev server karena Next.js mempersiapkan compiler dev server secara on-demand.
2. **TypeScript Compilation (On-the-fly)**: API dan Bot menggunakan `tsx watch` yang melakukan transpilasi TypeScript ke JavaScript secara real-time.
3. **Koneksi Database (Prisma Client)**: Saat startup, `apps/api` dan `apps/bot` mencoba menginisialisasi Prisma Client. Jika database Postgres di local/remote (sesuai `DATABASE_URL` di `.env`) mati, lambat, atau mengalami gangguan koneksi, proses startup akan **hang / tertunda lama** sebelum akhirnya timeout.
4. **WhatsApp Connection**: Bot WhatsApp (`@whiskeysockets/baileys`) mencoba memulihkan koneksi dan membaca state auth dari folder `whatsapp_session/` ke server WhatsApp, yang memerlukan waktu sinkronisasi data.

**Tips Menghemat Waktu & Resource:**
- **Jalankan Aplikasi Spesifik Saja**: Jika Anda hanya sedang mengerjakan backend API, tidak perlu menjalankan dashboard/bot. Gunakan filter pnpm untuk menjalankan yang dibutuhkan saja:
  - Hanya jalankan API: `pnpm --filter @klinikbot/api dev`
  - Hanya jalankan API & Bot: `pnpm --filter @klinikbot/api --filter @klinikbot/bot dev`
- **Pastikan Database Aktif**: Sebelum menjalankan dev server, pastikan PostgreSQL (lokal atau cloud Supabase) sudah menyala dan dapat diakses dengan sukses agar Prisma tidak tertunda melakukan koneksi.
- **Gunakan Single Service Startup**: Jika hardware komputer terbatas, Anda dapat membuka beberapa terminal terpisah dan menjalankan service tertentu secara bertahap sesuai kebutuhan alur kerja coding Anda.

