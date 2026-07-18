import axios from "axios";
import { appConfig } from "@klinikbot/config";

type MainMenuKey =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6";

const mainMenu = `Selamat datang di *KlinikBot* 🏥
Silakan pilih menu:
1. Daftar Berobat
2. Booking Jadwal
3. Cek Antrian
4. Jadwal Dokter
5. Informasi Klinik
6. Hubungi Admin`;

const api = axios.create({
  baseURL: appConfig.bot.apiBaseUrl,
  timeout: 5000
});

const clinicInfo = `📍 Alamat: Klinik Sehat Sentosa
🕗 Jam Operasional: 08:00 - 20:00
☎️ Telepon: 0812-3456-7890
🗺️ Maps: https://maps.google.com`;

export const handleIncomingMessage = async (
  phone: string,
  text: string
): Promise<string> => {
  const normalized = text.trim();

  if (normalized.toLowerCase() === "menu" || normalized.toLowerCase() === "halo") {
    return mainMenu;
  }

  if (["1", "2", "3", "4", "5", "6"].includes(normalized)) {
    const key = normalized as MainMenuKey;

    switch (key) {
      case "1":
        return `*Daftar Berobat*
Format:
Nama, TglLahir(YYYY-MM-DD), JenisKelamin(MALE/FEMALE), NoHP, Keluhan, Pembayaran(BPJS/UMUM)

Contoh:
Budi, 1999-01-01, MALE, 08123456789, Demam 2 hari, UMUM`;

      case "2":
        return `*Booking Jadwal*
Kirim format:
ID_PASIEN, ID_DOKTER, TANGGAL(YYYY-MM-DD), JAM(HH:mm), KELUHAN, PEMBAYARAN(BPJS/UMUM)`;

      case "3":
        return `*Cek Antrian*
Kirim: CEK#ID_BOOKING`;

      case "4": {
        const doctors = await api.get("/doctors").then((r) => r.data as Array<{ name: string; specialization: string; schedule: string }>);
        if (!doctors.length) return "Belum ada jadwal dokter tersedia.";
        return doctors
          .map((d, i) => `${i + 1}. ${d.name} (${d.specialization}) - ${d.schedule}`)
          .join("\n");
      }

      case "5":
        return clinicInfo;

      case "6":
        return "Admin akan segera menghubungi Anda. Mohon tunggu ya 🙏";
    }
  }

  if (normalized.startsWith("CEK#")) {
    const bookingId = normalized.replace("CEK#", "").trim();
    try {
      const queues = await api.get("/queues").then((r) => r.data as Array<any>);
      const item = queues.find((q) => q.bookingId === bookingId);
      if (!item) return "Data antrian tidak ditemukan.";
      return `Nomor antrian Anda: ${item.queueNumber}\nStatus: ${item.status}`;
    } catch {
      return "Gagal cek antrian. Coba lagi.";
    }
  }

  await api.post("/messages", {
    phone,
    message: text,
    direction: "INBOUND"
  }).catch(() => null);

  return `Input tidak dikenali.
Ketik *menu* untuk melihat layanan yang tersedia.`;
};

const bootstrap = async () => {
  console.log("KlinikBot mock runner aktif.");
  console.log("Ketik \"menu\" untuk melihat menu.");
};

bootstrap();
