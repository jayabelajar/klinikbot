import axios from "axios";
import { appConfig, getSettings } from "@klinikbot/config";
import { getSession, updateSession, updateSessionData, clearSession } from "../repositories/session";
import { BotState } from "../types";

const api = axios.create({
  baseURL: appConfig.bot.apiBaseUrl,
  timeout: 5000
});

export const handleIncomingMessage = async (
  phone: string,
  text: string
): Promise<string> => {
  const normalized = text.trim();
  const session = getSession(phone);
  const settings = getSettings();

  // Global commands
  if (normalized.toLowerCase() === "batal") {
    clearSession(phone);
    return "Percakapan dibatalkan.\n\n" + settings.whatsappTemplates.welcome;
  }

  if (normalized.toLowerCase() === "menu" || normalized.toLowerCase() === "halo") {
    clearSession(phone);
    return settings.whatsappTemplates.welcome;
  }

  // Check if they directly sent a check queue command (e.g. CEK#BKG-000001)
  if (normalized.startsWith("CEK#")) {
    const bookingId = normalized.replace("CEK#", "").trim();
    return handleCheckQueueDirect(bookingId);
  }

  // State Machine
  switch (session.state) {
    case "IDLE":
      return handleIdleState(phone, normalized, settings);

    // ========================================================================
    // REGISTRATION FLOW
    // ========================================================================
    case "REG_NAME":
      if (normalized.length < 2) {
        return "Nama terlalu pendek. Silakan masukkan Nama Lengkap Anda:";
      }
      updateSession(phone, { state: "REG_DOB" });
      updateSessionData(phone, { name: normalized });
      return `Halo ${normalized}. Sekarang, silakan masukkan *Tanggal Lahir* Anda dengan format *YYYY-MM-DD* (Contoh: 1999-01-01):`;

    case "REG_DOB":
      const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dobRegex.test(normalized)) {
        return "Format tanggal lahir salah. Silakan masukkan dengan format *YYYY-MM-DD* (Contoh: 1999-01-01):";
      }
      // Check if valid date
      const birthDate = new Date(normalized);
      if (isNaN(birthDate.getTime())) {
        return "Tanggal lahir tidak valid. Silakan masukkan tanggal lahir yang benar (YYYY-MM-DD):";
      }
      updateSession(phone, { state: "REG_GENDER" });
      updateSessionData(phone, { dob: normalized });
      return "Pilih *Jenis Kelamin* Anda:\n1. Laki-laki (MALE)\n2. Perempuan (FEMALE)\n\n(Ketik angka 1 atau 2):";

    case "REG_GENDER":
      let gender: "MALE" | "FEMALE" | null = null;
      if (normalized === "1" || normalized.toLowerCase() === "male" || normalized.toLowerCase() === "laki") {
        gender = "MALE";
      } else if (normalized === "2" || normalized.toLowerCase() === "female" || normalized.toLowerCase() === "perempuan") {
        gender = "FEMALE";
      }

      if (!gender) {
        return "Pilihan tidak valid. Silakan ketik *1* untuk Laki-laki atau *2* untuk Perempuan:";
      }

      updateSession(phone, { state: "REG_PHONE" });
      updateSessionData(phone, { gender });
      return "Masukkan *Nomor HP* Anda yang aktif (Contoh: 081234567890):";

    case "REG_PHONE":
      // Clean phone
      const phoneDigits = normalized.replace(/\D/g, "");
      if (phoneDigits.length < 9 || phoneDigits.length > 14) {
        return "Nomor HP tidak valid. Masukkan Nomor HP yang benar (Contoh: 081234567890):";
      }
      // Standardize to 62...
      const formattedPhone = phoneDigits.startsWith("0") 
        ? "62" + phoneDigits.slice(1) 
        : phoneDigits.startsWith("62") 
        ? phoneDigits 
        : "62" + phoneDigits;

      updateSession(phone, { state: "REG_ADDRESS" });
      updateSessionData(phone, { phone: formattedPhone });
      return "Masukkan *Alamat Lengkap* tempat tinggal Anda:";

    case "REG_ADDRESS":
      if (normalized.length < 3) {
        return "Alamat terlalu pendek. Silakan masukkan Alamat Lengkap Anda:";
      }
      updateSession(phone, { state: "REG_PAYMENT" });
      updateSessionData(phone, { address: normalized });
      return "Pilih *Jenis Pembayaran*:\n1. BPJS\n2. UMUM\n\n(Ketik angka 1 atau 2):";

    case "REG_PAYMENT":
      let paymentType: "BPJS" | "UMUM" | null = null;
      if (normalized === "1" || normalized.toUpperCase() === "BPJS") {
        paymentType = "BPJS";
      } else if (normalized === "2" || normalized.toUpperCase() === "UMUM") {
        paymentType = "UMUM";
      }

      if (!paymentType) {
        return "Pilihan tidak valid. Silakan ketik *1* untuk BPJS atau *2* untuk UMUM:";
      }

      // Finalize Registration
      try {
        const regData = {
          name: session.data.name,
          gender: session.data.gender,
          birthDate: session.data.dob,
          phone: session.data.phone,
          address: session.data.address
        };

        const res = await api.post("/patients", regData);
        const patient = res.data;

        clearSession(phone);
        
        let successText = settings.whatsappTemplates.registrationSuccess
          .replace(/{name}/g, patient.name)
          .replace(/{code}/g, patient.code)
          .replace(/{phone}/g, patient.phone);

        return successText;
      } catch (err: any) {
        console.error("Registration error:", err.response?.data || err.message);
        const errorMsg = err.response?.data?.message || "Nomor HP atau data pasien sudah terdaftar.";
        return `Gagal mendaftar: ${errorMsg}\n\nKetik *1* untuk mencoba mendaftar kembali atau *menu* untuk kembali ke menu utama.`;
      }

    // ========================================================================
    // BOOKING JADWAL FLOW
    // ========================================================================
    case "BOOK_PATIENT_CODE":
      const pCode = normalized.toUpperCase();
      try {
        const patients = await api.get("/patients").then(r => r.data);
        const matchedPatient = patients.find((p: any) => p.code === pCode || p.phone === phone);
        
        if (!matchedPatient) {
          return "Kode Pasien tidak ditemukan. Mohon cek kembali Kode Pasien Anda (Format: PSN-XXXXXX).\nJika belum terdaftar, ketik *batal* lalu ketik *1* untuk pendaftaran baru.";
        }

        updateSessionData(phone, { patientId: matchedPatient.id, patientName: matchedPatient.name, patientCode: matchedPatient.code });
        
        // Fetch active doctors
        const doctors = await api.get("/doctors").then(r => r.data as Array<any>);
        const activeDoctors = doctors.filter((d: any) => d.status === "ACTIVE");
        
        if (activeDoctors.length === 0) {
          clearSession(phone);
          return "Mohon maaf, saat ini belum ada dokter aktif yang tersedia untuk booking. Silakan hubungi admin.";
        }

        updateSession(phone, { state: "BOOK_DOCTOR" });
        updateSessionData(phone, { doctorsList: activeDoctors });

        let docListText = `Halo *${matchedPatient.name}*. Silakan pilih Dokter yang dituju:\n`;
        activeDoctors.forEach((doc, idx) => {
          docListText += `${idx + 1}. ${doc.name} (${doc.specialization}) - ${doc.schedule}\n`;
        });
        docListText += "\nKetik angka pilihan dokter Anda (contoh: 1):";
        return docListText;

      } catch (err) {
        return "Gagal memproses Kode Pasien. Silakan ketik *menu* dan coba lagi.";
      }

    case "BOOK_DOCTOR":
      const docIdx = parseInt(normalized) - 1;
      const doctorsList = session.data.doctorsList || [];
      if (isNaN(docIdx) || docIdx < 0 || docIdx >= doctorsList.length) {
        return `Pilihan tidak valid. Silakan ketik angka antara 1 sampai ${doctorsList.length}:`;
      }

      const selectedDoc = doctorsList[docIdx];
      updateSession(phone, { state: "BOOK_DATE" });
      updateSessionData(phone, { doctorId: selectedDoc.id, doctorName: selectedDoc.name });
      return `Anda memilih *${selectedDoc.name}*.
Silakan masukkan *Tanggal Periksa* dengan format *YYYY-MM-DD* (Contoh: 2026-07-20):`;

    case "BOOK_DATE":
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(normalized)) {
        return "Format tanggal salah. Silakan masukkan tanggal periksa dengan format *YYYY-MM-DD* (Contoh: 2026-07-20):";
      }

      const targetDate = new Date(normalized);
      if (isNaN(targetDate.getTime())) {
        return "Tanggal periksa tidak valid. Silakan masukkan tanggal yang benar:";
      }

      const today = new Date();
      today.setHours(0,0,0,0);
      if (targetDate < today) {
        return "Tanggal periksa tidak boleh di masa lalu. Silakan masukkan tanggal hari ini atau tanggal di masa depan:";
      }

      updateSession(phone, { state: "BOOK_TIME" });
      updateSessionData(phone, { date: normalized });
      return "Masukkan *Jam Periksa* yang Anda inginkan (Contoh: 09:00, 10:30, 14:00, atau 16:30):";

    case "BOOK_TIME":
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(normalized)) {
        return "Format jam periksa salah. Gunakan format HH:mm (Contoh: 09:00 atau 14:30):";
      }

      updateSession(phone, { state: "BOOK_COMPLAINT" });
      updateSessionData(phone, { time: normalized });
      return "Silakan jelaskan singkat *Keluhan utama* Anda:";

    case "BOOK_COMPLAINT":
      if (normalized.length < 2) {
        return "Mohon jelaskan keluhan Anda dengan lebih detail:";
      }

      updateSession(phone, { state: "BOOK_PAYMENT" });
      updateSessionData(phone, { complaint: normalized });
      return "Pilih *Jenis Pembayaran* untuk booking ini:\n1. BPJS\n2. UMUM\n\n(Ketik angka 1 atau 2):";

    case "BOOK_PAYMENT":
      let bookPayment: "BPJS" | "UMUM" | null = null;
      if (normalized === "1" || normalized.toUpperCase() === "BPJS") {
        bookPayment = "BPJS";
      } else if (normalized === "2" || normalized.toUpperCase() === "UMUM") {
        bookPayment = "UMUM";
      }

      if (!bookPayment) {
        return "Pilihan tidak valid. Silakan ketik *1* untuk BPJS atau *2* untuk UMUM:";
      }

      updateSession(phone, { state: "BOOK_CONFIRM" });
      updateSessionData(phone, { paymentType: bookPayment });

      return `Mohon konfirmasi data Booking Jadwal Anda:
      
- Pasien: ${session.data.patientName} (${session.data.patientCode})
- Dokter: ${session.data.doctorName}
- Tanggal: ${session.data.date}
- Jam: ${session.data.time}
- Keluhan: ${session.data.complaint}
- Pembayaran: ${bookPayment}

Apakah data di atas sudah benar?
Ketik *YA* untuk memproses booking, atau *BATAL* untuk membatalkan.`;

    case "BOOK_CONFIRM":
      if (normalized.toLowerCase() === "ya") {
        try {
          const bookingPayload = {
            patientId: session.data.patientId,
            doctorId: session.data.doctorId,
            date: session.data.date,
            time: session.data.time,
            complaint: session.data.complaint,
            paymentType: session.data.paymentType
          };

          const res = await api.post("/bookings", bookingPayload);
          const booking = res.data;

          clearSession(phone);
          return `Booking Berhasil Dikirim! 🎉

Kode Booking Anda: *${booking.id}*
Status: WAITING (Menunggu Konfirmasi Admin)

Admin akan memproses booking Anda. Anda dapat mengecek status antrian dengan mengetik: *CEK#${booking.id}*`;
        } catch (err: any) {
          console.error("Booking error:", err.response?.data || err.message);
          const errorMsg = err.response?.data?.message || "Terjadi bentrok jadwal atau kuota penuh.";
          return `Gagal memproses booking: ${errorMsg}\n\nKetik *menu* untuk kembali ke menu utama.`;
        }
      } else {
        return "Ketik *YA* untuk konfirmasi booking, atau *BATAL* untuk membatalkan.";
      }
  }

  return "Perintah tidak dimengerti. Ketik *menu* untuk melihat layanan.";
};

// Handle IDLE state menu options
const handleIdleState = async (phone: string, input: string, settings: any): Promise<string> => {
  switch (input) {
    case "1":
      updateSession(phone, { state: "REG_NAME" });
      return "=== Pendaftaran Pasien Baru ===\n\nSilakan masukkan *Nama Lengkap* Anda:";
    
    case "2":
      updateSession(phone, { state: "BOOK_PATIENT_CODE" });
      return "=== Booking Jadwal Periksa ===\n\nSilakan masukkan *Kode Pasien* Anda (Contoh: PSN-000001):\n(Atau ketik *batal* untuk kembali)";

    case "3":
      return "=== Cek Antrian ===\n\nSilakan kirimkan format: *CEK#KODE_BOOKING*\n\nContoh:\n*CEK#clj...* (ID Booking Anda)";

    case "4":
      try {
        const doctors = await api.get("/doctors").then(r => r.data as Array<any>);
        const activeDocs = doctors.filter((d: any) => d.status === "ACTIVE");
        if (activeDocs.length === 0) return "Belum ada jadwal dokter aktif saat ini.";

        let text = "🏥 *Jadwal Praktik Dokter Klinik* 🏥\n\n";
        activeDocs.forEach((d, i) => {
          text += `${i + 1}. ${d.name}\n   Spesialisasi: ${d.specialization}\n   Jadwal: ${d.schedule}\n\n`;
        });
        text += "Ketik *menu* untuk kembali ke menu utama.";
        return text;
      } catch {
        return "Gagal mengambil jadwal dokter. Silakan coba lagi nanti.";
      }

    case "5":
      return settings.whatsappTemplates.clinicInfo
        .replace(/{clinicName}/g, settings.clinicName)
        .replace(/{address}/g, settings.address)
        .replace(/{operatingHours}/g, settings.operatingHours)
        .replace(/{phone}/g, settings.phone)
        .replace(/{googleMapsUrl}/g, settings.googleMapsUrl);

    case "6":
      return "Admin akan segera menghubungi Anda. Jika butuh bantuan darurat, silakan telepon di: " + settings.phone;

    default:
      return "Pilihan menu tidak dikenal.\n\n" + settings.whatsappTemplates.welcome;
  }
};

// Direct Queue Check
const handleCheckQueueDirect = async (bookingId: string): Promise<string> => {
  try {
    const res = await api.get(`/bookings/${bookingId}`);
    const booking = res.data;
    
    let text = `🏥 *Status Antrian KlinikBot* 🏥\n\n`;
    text += `Pasien: ${booking.patient.name}\n`;
    text += `Dokter: ${booking.doctor.name}\n`;
    text += `Status Booking: *${booking.status}*\n`;
    
    if (booking.queue) {
      text += `Nomor Antrian: *${booking.queue.queueNumber}*\n`;
      text += `Status Antrian: *${booking.queue.status}*\n`;
      
      // Calculate estimated waiting time if waiting
      if (booking.queue.status === "WAITING") {
        // Count how many queues ahead
        const allQueues = await api.get("/queues").then(r => r.data as Array<any>);
        const activeWaiting = allQueues.filter((q: any) => q.status === "WAITING" && q.queueNumber < booking.queue.queueNumber);
        
        text += `Antrian Menunggu di Depan Anda: ${activeWaiting.length} orang\n`;
        text += `Estimasi Waktu Tunggu: ~${activeWaiting.length * 15} menit\n`;
      }
    } else {
      text += `Nomor Antrian: Belum digenerate (Menunggu Konfirmasi Admin)\n`;
    }
    
    return text;
  } catch (err: any) {
    return "Data booking tidak ditemukan. Mohon cek kembali ID Booking Anda.";
  }
};
