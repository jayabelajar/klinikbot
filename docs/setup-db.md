# Setup Database KlinikBot

Dokumen ini menjelaskan cara setup database untuk project KlinikBot.

## 1. Prasyarat

Pastikan sudah tersedia:

- Node.js v20+
- pnpm v9+
- PostgreSQL aktif (local atau managed service seperti Supabase)

## 2. Install dependencies

Dari root project:

```bash
pnpm install
```

## 3. Konfigurasi environment

Buat/update file `.env` di root project, minimal:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?sslmode=require"
JWT_SECRET="supersecret"
```

Contoh Supabase pooled connection:

```env
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
```

Contoh Supabase direct connection (umumnya untuk migrasi/DDL):

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require"
```

## 4. Setup database dengan Prisma (disarankan)

Jika muncul error `Environment variable not found: DATABASE_URL`, artinya Prisma tidak menemukan variabel env saat command dijalankan.  
Pastikan `.env` ada di root project (`d:/Project/js/bot/klinikbot/.env`) dan berisi `DATABASE_URL` valid.

### Gunakan `.env` file (direkomendasikan)

Simpan di root project (`d:/Project/js/bot/klinikbot/.env`):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?sslmode=require"
JWT_SECRET="supersecret"
```

Lalu jalankan:

```bash
pnpm --filter @klinikbot/database prisma:generate
pnpm --filter @klinikbot/database prisma:migrate
```

Untuk deploy migration (production-style):

```bash
pnpm --filter @klinikbot/database prisma:deploy
```

## 5. Opsi setup manual via SQL

Jika ingin setup manual tanpa Prisma migrate, gunakan file:

- `docs/query-db.sql`

Eksekusi contoh via `psql`:

```bash
psql "postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?sslmode=require" -f docs/query-db.sql
```

> Catatan: workflow utama tetap direkomendasikan memakai Prisma migration agar histori schema terjaga.

## 6. Verifikasi cepat

Cek bahwa tabel sudah terbentuk (`users`, `patients`, `doctors`, `bookings`, `queues`, `messages`) lalu jalankan API:

```bash
pnpm --filter @klinikbot/api dev
```

Jika API bisa start tanpa error koneksi database, setup selesai.
