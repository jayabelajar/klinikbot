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

Minimal wajib untuk database:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public"
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
