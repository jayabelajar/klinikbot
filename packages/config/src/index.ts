import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory path for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const settingsPath = path.resolve(__dirname, "settings.json");

export interface ClinicSettings {
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

export const getSettings = (): ClinicSettings => {
  try {
    const data = fs.readFileSync(settingsPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {
      clinicName: "Klinik Sehat Sentosa",
      address: "Jl. Raya Sehat No. 123, Kota Bandung",
      phone: "081234567890",
      operatingHours: "Senin - Sabtu (08:00 - 20:00)",
      googleMapsUrl: "https://maps.google.com/?q=Klinik+Sehat+Sentosa",
      whatsappTemplates: {
        welcome: "Selamat datang di *KlinikBot* 🏥\nSilakan pilih menu:\n1. Daftar Berobat\n2. Booking Jadwal\n3. Cek Antrian\n4. Jadwal Dokter\n5. Informasi Klinik\n6. Hubungi Admin",
        registrationSuccess: "Registrasi Pasien Sukses! 🎉\n\nNama: {name}\nKode Pasien: {code}\nNo HP: {phone}\n\nSilakan gunakan Kode Pasien ini untuk melakukan Booking Jadwal.",
        bookingSuccess: "Booking Jadwal Sukses! 🗓️\n\nKode Booking: {bookingId}\nPasien: {patientName}\nDokter: {doctorName}\nTanggal: {date}\nJam: {time}\n\nKetik *3* atau *CEK#{bookingId}* untuk memantau status antrian Anda.",
        queueCall: "Panggilan Antrian 🔔\n\nNomor Antrian: *{queueNumber}*\nAtas Nama: {patientName}\n\nSilakan menuju ke ruang pemeriksaan sekarang.",
        queueSkip: "Antrian Anda dengan Nomor *{queueNumber}* telah dilewati karena tidak hadir saat dipanggil. Silakan hubungi bagian pendaftaran untuk mengatur ulang antrian Anda.",
        clinicInfo: "🏥 *{clinicName}*\n📍 Alamat: {address}\n🕗 Jam Operasional: {operatingHours}\n☎️ Telepon: {phone}\n🗺️ Maps: {googleMapsUrl}"
      }
    };
  }
};

export const saveSettings = (settings: ClinicSettings): boolean => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
};

export const appConfig = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  api: {
    host: process.env.API_HOST ?? "0.0.0.0",
    port: Number(process.env.API_PORT ?? 3001),
    jwtSecret: process.env.API_JWT_SECRET ?? "super-secret-key"
  },
  dashboard: {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001"
  },
  bot: {
    apiBaseUrl: process.env.BOT_API_BASE_URL ?? "http://localhost:3001",
    sessionName: process.env.WHATSAPP_SESSION_NAME ?? "klinikbot-session",
    port: Number(process.env.BOT_PORT ?? 3002) // Bot HTTP server port
  },
  database: {
    url: process.env.DATABASE_URL ?? ""
  }
};

