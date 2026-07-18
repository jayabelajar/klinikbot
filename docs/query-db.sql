-- docs/query-db.sql
-- SQL manual untuk membuat struktur database KlinikBot (PostgreSQL)
-- Catatan:
-- 1) Ini setara dengan schema Prisma saat ini.
-- 2) Untuk workflow utama, tetap disarankan pakai Prisma migrate.
-- 3) Eksekusi file ini hanya jika ingin setup manual via SQL.

BEGIN;

-- =========================================================
-- ENUM TYPES
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'RECEPTIONIST');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Gender') THEN
    CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DoctorStatus') THEN
    CREATE TYPE "DoctorStatus" AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentType') THEN
    CREATE TYPE "PaymentType" AS ENUM ('BPJS', 'UMUM');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookingStatus') THEN
    CREATE TYPE "BookingStatus" AS ENUM (
      'WAITING',
      'CONFIRMED',
      'QUEUE',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QueueStatus') THEN
    CREATE TYPE "QueueStatus" AS ENUM ('WAITING', 'CALLED', 'SKIPPED', 'DONE');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageDirection') THEN
    CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');
  END IF;
END
$$;

-- =========================================================
-- TABLES
-- =========================================================

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'RECEPTIONIST',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "patients" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "gender" "Gender" NOT NULL,
  "birth_date" TIMESTAMP(3) NOT NULL,
  "phone" TEXT NOT NULL UNIQUE,
  "address" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "doctors" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "specialization" TEXT NOT NULL,
  "schedule" TEXT NOT NULL,
  "status" "DoctorStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "bookings" (
  "id" TEXT PRIMARY KEY,
  "patient_id" TEXT NOT NULL,
  "doctor_id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "time" TEXT NOT NULL,
  "complaint" TEXT NOT NULL,
  "payment_type" "PaymentType" NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'WAITING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "queues" (
  "id" TEXT PRIMARY KEY,
  "booking_id" TEXT NOT NULL UNIQUE,
  "queue_number" INTEGER NOT NULL,
  "status" "QueueStatus" NOT NULL DEFAULT 'WAITING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" TEXT PRIMARY KEY,
  "phone" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "direction" "MessageDirection" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS "bookings_patient_id_idx" ON "bookings"("patient_id");
CREATE INDEX IF NOT EXISTS "bookings_doctor_id_idx" ON "bookings"("doctor_id");
CREATE INDEX IF NOT EXISTS "bookings_date_time_idx" ON "bookings"("date", "time");
CREATE INDEX IF NOT EXISTS "queues_queue_number_idx" ON "queues"("queue_number");
CREATE INDEX IF NOT EXISTS "messages_phone_idx" ON "messages"("phone");

-- =========================================================
-- FOREIGN KEYS
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_patient_id_fkey'
  ) THEN
    ALTER TABLE "bookings"
      ADD CONSTRAINT "bookings_patient_id_fkey"
      FOREIGN KEY ("patient_id") REFERENCES "patients"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_doctor_id_fkey'
  ) THEN
    ALTER TABLE "bookings"
      ADD CONSTRAINT "bookings_doctor_id_fkey"
      FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'queues_booking_id_fkey'
  ) THEN
    ALTER TABLE "queues"
      ADD CONSTRAINT "queues_booking_id_fkey"
      FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

COMMIT;
