import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import jwt from "@fastify/jwt";
import { appConfig, getSettings, saveSettings } from "@klinikbot/config";
import { prisma, BookingStatus, QueueStatus, MessageDirection } from "@klinikbot/database";
import { generatePatientCode, isValidPhoneNumber } from "@klinikbot/utils";
import { z } from "zod";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(sensible);
await app.register(jwt, { secret: appConfig.api.jwtSecret });

app.get("/health", async () => ({ ok: true, service: "klinikbot-api" }));

// ============================================================================
// AUTHENTICATION
// ============================================================================

app.post("/auth/login", async (request, reply) => {
  const schema = z.object({
    username: z.string().min(3),
    password: z.string().min(3)
  });

  const body = schema.parse(request.body);
  const user = await prisma.user.findUnique({ where: { username: body.username } });

  if (!user || user.password !== body.password) {
    return reply.unauthorized("Invalid credentials");
  }

  const token = await reply.jwtSign({
    sub: user.id,
    username: user.username,
    role: user.role
  });

  return { token };
});

// ============================================================================
// CLINIC SETTINGS
// ============================================================================

app.get("/settings", async () => {
  return getSettings();
});

app.put("/settings", async (request, reply) => {
  const schema = z.object({
    clinicName: z.string().min(2),
    address: z.string().min(2),
    phone: z.string().min(8),
    operatingHours: z.string().min(2),
    googleMapsUrl: z.string().url().or(z.string().length(0)).optional().transform(v => v || ""),
    whatsappTemplates: z.object({
      welcome: z.string(),
      registrationSuccess: z.string(),
      bookingSuccess: z.string(),
      queueCall: z.string(),
      queueSkip: z.string(),
      clinicInfo: z.string()
    })
  });

  const body = schema.parse(request.body);
  const success = saveSettings(body);
  
  if (!success) {
    return reply.internalServerError("Gagal menyimpan pengaturan");
  }
  
  return { success: true, settings: body };
});

// ============================================================================
// WHATSAPP INTEGRATION
// ============================================================================

app.get("/whatsapp/status", async (request, reply) => {
  try {
    const res = await fetch(`http://localhost:${appConfig.bot.port}/status`);
    if (!res.ok) throw new Error("Bot returned non-OK status");
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { status: "DISCONNECTED", qr: "", phone: "", error: error.message };
  }
});

app.post("/whatsapp/logout", async (request, reply) => {
  try {
    const res = await fetch(`http://localhost:${appConfig.bot.port}/logout`, { method: "POST" });
    if (!res.ok) throw new Error("Bot failed to logout");
    const data = await res.json();
    return data;
  } catch (error: any) {
    return reply.internalServerError(error.message);
  }
});

// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

app.get("/dashboard/summary", async () => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  const [totalPatients, bookingsToday, activeQueue, completedToday] = await Promise.all([
    prisma.patient.count(),
    prisma.booking.count({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    }),
    prisma.queue.count({ 
      where: { 
        status: { in: [QueueStatus.WAITING, QueueStatus.CALLED] } 
      } 
    }),
    prisma.booking.count({ 
      where: { 
        status: BookingStatus.COMPLETED,
        updatedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      } 
    })
  ]);

  return {
    totalPatients,
    bookingsToday,
    activeQueue,
    completedToday
  };
});

// ============================================================================
// PATIENTS CRUD
// ============================================================================

app.get("/patients", async () => {
  return prisma.patient.findMany({ orderBy: { createdAt: "desc" } });
});

app.get("/patients/:id", async (request, reply) => {
  const { id } = z.object({ id: z.string() }).parse(request.params);
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: { bookings: { include: { doctor: true, queue: true }, orderBy: { date: "desc" } } }
  });
  if (!patient) return reply.notFound("Pasien tidak ditemukan");
  return patient;
});

app.post("/patients", async (request, reply) => {
  const schema = z.object({
    name: z.string().min(2),
    gender: z.enum(["MALE", "FEMALE"]),
    birthDate: z.string(),
    phone: z.string().min(8),
    address: z.string().optional()
  });

  const body = schema.parse(request.body);

  if (!isValidPhoneNumber(body.phone)) {
    return reply.badRequest("Nomor HP tidak valid");
  }

  const count = await prisma.patient.count();
  const code = generatePatientCode(count + 1);

  return prisma.patient.create({
    data: {
      code,
      name: body.name,
      gender: body.gender,
      birthDate: new Date(body.birthDate),
      phone: body.phone,
      address: body.address
    }
  });
});

app.patch("/patients/:id", async (request, reply) => {
  const { id } = z.object({ id: z.string() }).parse(request.params);
  const schema = z.object({
    name: z.string().min(2).optional(),
    gender: z.enum(["MALE", "FEMALE"]).optional(),
    birthDate: z.string().optional(),
    phone: z.string().min(8).optional(),
    address: z.string().optional()
  });

  const body = schema.parse(request.body);
  
  if (body.phone && !isValidPhoneNumber(body.phone)) {
    return reply.badRequest("Nomor HP tidak valid");
  }

  const updateData: any = { ...body };
  if (body.birthDate) {
    updateData.birthDate = new Date(body.birthDate);
  }

  return prisma.patient.update({
    where: { id },
    data: updateData
  });
});

app.delete("/patients/:id", async (request, reply) => {
  const { id } = z.object({ id: z.string() }).parse(request.params);
  
  // Check if patient has bookings
  const bookingsCount = await prisma.booking.count({ where: { patientId: id } });
  if (bookingsCount > 0) {
    return reply.badRequest("Pasien tidak dapat dihapus karena memiliki data booking");
  }

  return prisma.patient.delete({ where: { id } });
});

// ============================================================================
// DOCTORS CRUD
// ============================================================================

app.get("/doctors", async () => {
  return prisma.doctor.findMany({ orderBy: { createdAt: "desc" } });
});

app.get("/doctors/:id", async (request, reply) => {
  const { id } = z.object({ id: z.string() }).parse(request.params);
  const doctor = await prisma.doctor.findUnique({ where: { id } });
  if (!doctor) return reply.notFound("Dokter tidak ditemukan");
  return doctor;
});

app.post("/doctors", async (request) => {
  const schema = z.object({
    name: z.string().min(2),
    specialization: z.string().min(2),
    schedule: z.string().min(2),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE")
  });

  const body = schema.parse(request.body);

  return prisma.doctor.create({
    data: body
  });
});

app.patch("/doctors/:id", async (request) => {
  const { id } = z.object({ id: z.string() }).parse(request.params);
  const schema = z.object({
    name: z.string().min(2).optional(),
    specialization: z.string().min(2).optional(),
    schedule: z.string().min(2).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional()
  });

  const body = schema.parse(request.body);

  return prisma.doctor.update({
    where: { id },
    data: body
  });
});

app.delete("/doctors/:id", async (request, reply) => {
  const { id } = z.object({ id: z.string() }).parse(request.params);
  
  // Check if doctor has bookings
  const bookingsCount = await prisma.booking.count({ where: { doctorId: id } });
  if (bookingsCount > 0) {
    return reply.badRequest("Dokter tidak dapat dihapus karena memiliki data booking");
  }

  return prisma.doctor.delete({ where: { id } });
});

// ============================================================================
// BOOKINGS CRUD
// ============================================================================

app.get("/bookings", async () => {
  return prisma.booking.findMany({
    include: { patient: true, doctor: true, queue: true },
    orderBy: { createdAt: "desc" }
  });
});

app.get("/bookings/:id", async (request, reply) => {
  const { id } = z.object({ id: z.string() }).parse(request.params);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { patient: true, doctor: true, queue: true }
  });
  if (!booking) return reply.notFound("Booking tidak ditemukan");
  return booking;
});

app.post("/bookings", async (request, reply) => {
  const schema = z.object({
    patientId: z.string().min(1),
    doctorId: z.string().min(1),
    date: z.string(),
    time: z.string().min(1),
    complaint: z.string().min(2),
    paymentType: z.enum(["BPJS", "UMUM"])
  });

  const body = schema.parse(request.body);
  const dateObj = new Date(body.date);

  const existing = await prisma.booking.findFirst({
    where: {
      patientId: body.patientId,
      date: dateObj,
      time: body.time,
      status: { in: [BookingStatus.WAITING, BookingStatus.CONFIRMED, BookingStatus.QUEUE, BookingStatus.IN_PROGRESS] }
    }
  });

  if (existing) {
    return reply.badRequest("Pasien sudah punya booking aktif pada waktu yang sama");
  }

  return prisma.booking.create({
    data: {
      patientId: body.patientId,
      doctorId: body.doctorId,
      date: dateObj,
      time: body.time,
      complaint: body.complaint,
      paymentType: body.paymentType,
      status: BookingStatus.WAITING
    }
  });
});

app.patch("/bookings/:id/status", async (request) => {
  const params = z.object({ id: z.string() }).parse(request.params);
  const body = z.object({ status: z.nativeEnum(BookingStatus) }).parse(request.body);

  const updatedBooking = await prisma.booking.update({
    where: { id: params.id },
    data: { status: body.status },
    include: { patient: true, doctor: true }
  });

  // If status is CANCELLED or COMPLETED, we can also update related queue status if it exists
  if (body.status === BookingStatus.CANCELLED || body.status === BookingStatus.COMPLETED) {
    const queue = await prisma.queue.findUnique({ where: { bookingId: params.id } });
    if (queue) {
      await prisma.queue.update({
        where: { id: queue.id },
        data: { status: body.status === BookingStatus.COMPLETED ? QueueStatus.DONE : QueueStatus.SKIPPED }
      });
    }
  }

  // Notify Patient on Booking Confirmation
  if (body.status === BookingStatus.CONFIRMED) {
    const settings = getSettings();
    const text = settings.whatsappTemplates.bookingSuccess
      .replace(/{bookingId}/g, updatedBooking.id)
      .replace(/{patientName}/g, updatedBooking.patient.name)
      .replace(/{doctorName}/g, updatedBooking.doctor.name)
      .replace(/{date}/g, new Date(updatedBooking.date).toLocaleDateString("id-ID"))
      .replace(/{time}/g, updatedBooking.time);

    fetch(`http://localhost:${appConfig.bot.port}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: updatedBooking.patient.phone,
        message: text
      })
    }).catch((e: any) => console.error("Failed to notify patient of confirmation:", e.message));
  }

  return updatedBooking;
});

app.delete("/bookings/:id", async (request) => {
  const { id } = z.object({ id: z.string() }).parse(request.params);
  return prisma.booking.delete({ where: { id } });
});

// ============================================================================
// QUEUES / ANTRIAN & BOT NOTIFICATION TRIGGER
// ============================================================================

app.get("/queues", async () => {
  return prisma.queue.findMany({
    include: {
      booking: { include: { patient: true, doctor: true } }
    },
    orderBy: { queueNumber: "asc" }
  });
});

app.post("/queues/generate/:bookingId", async (request, reply) => {
  const { bookingId } = z.object({ bookingId: z.string() }).parse(request.params);

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return reply.notFound("Booking tidak ditemukan");

  // Get the maximum queue number for today
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  const latestQueue = await prisma.queue.findFirst({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    orderBy: { queueNumber: "desc" }
  });

  const queueNumber = (latestQueue?.queueNumber ?? 0) + 1;

  const queue = await prisma.queue.create({
    data: {
      bookingId,
      queueNumber,
      status: QueueStatus.WAITING
    }
  });

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: BookingStatus.QUEUE }
  });

  return queue;
});

app.patch("/queues/:id/status", async (request) => {
  const params = z.object({ id: z.string() }).parse(request.params);
  const body = z.object({ status: z.nativeEnum(QueueStatus) }).parse(request.body);

  const updatedQueue = await prisma.queue.update({
    where: { id: params.id },
    data: { status: body.status },
    include: { booking: { include: { patient: true, doctor: true } } }
  });

  // If status is CALLED, send a WhatsApp notification to the patient
  if (body.status === QueueStatus.CALLED) {
    const settings = getSettings();
    const text = settings.whatsappTemplates.queueCall
      .replace(/{queueNumber}/g, String(updatedQueue.queueNumber))
      .replace(/{patientName}/g, updatedQueue.booking.patient.name);

    fetch(`http://localhost:${appConfig.bot.port}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: updatedQueue.booking.patient.phone,
        message: text
      })
    }).catch((e: any) => console.error("Failed to send queue call notification:", e.message));

    // Also update Booking status to IN_PROGRESS
    await prisma.booking.update({
      where: { id: updatedQueue.bookingId },
      data: { status: BookingStatus.IN_PROGRESS }
    });
  }

  // If status is SKIPPED, notify and update booking to CANCELLED
  if (body.status === QueueStatus.SKIPPED) {
    const settings = getSettings();
    const text = settings.whatsappTemplates.queueSkip
      .replace(/{queueNumber}/g, String(updatedQueue.queueNumber));

    fetch(`http://localhost:${appConfig.bot.port}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: updatedQueue.booking.patient.phone,
        message: text
      })
    }).catch((e: any) => console.error("Failed to send queue skip notification:", e.message));

    await prisma.booking.update({
      where: { id: updatedQueue.bookingId },
      data: { status: BookingStatus.CANCELLED }
    });
  }

  // If status is DONE, update booking to COMPLETED
  if (body.status === QueueStatus.DONE) {
    await prisma.booking.update({
      where: { id: updatedQueue.bookingId },
      data: { status: BookingStatus.COMPLETED }
    });
  }

  return updatedQueue;
});

// ============================================================================
// MESSAGES & BROADCAST
// ============================================================================

app.get("/messages", async () => {
  return prisma.message.findMany({ orderBy: { createdAt: "desc" } });
});

app.post("/messages", async (request) => {
  const schema = z.object({
    phone: z.string().min(8),
    message: z.string().min(1),
    direction: z.nativeEnum(MessageDirection)
  });

  const body = schema.parse(request.body);
  const msg = await prisma.message.create({ data: body });

  // If it's an outbound message, ask the bot to send it
  if (body.direction === MessageDirection.OUTBOUND) {
    fetch(`http://localhost:${appConfig.bot.port}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: body.phone,
        message: body.message
      })
    }).catch((e: any) => console.error("Failed to send outbound message:", e.message));
  }

  return msg;
});

app.post("/messages/broadcast", async (request) => {
  const schema = z.object({
    message: z.string().min(1)
  });

  const { message } = schema.parse(request.body);
  const patients = await prisma.patient.findMany({ select: { phone: true } });

  let count = 0;
  for (const patient of patients) {
    if (!patient.phone) continue;

    // Log the message in the DB
    await prisma.message.create({
      data: {
        phone: patient.phone,
        message,
        direction: MessageDirection.OUTBOUND
      }
    });

    // Send it via bot
    fetch(`http://localhost:${appConfig.bot.port}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: patient.phone,
        message
      })
    }).catch((e: any) => console.error(`Failed to send broadcast to ${patient.phone}:`, e.message));

    count++;
  }

  return { success: true, count };
});

// ============================================================================
// BOOTSTRAP API
// ============================================================================

const start = async () => {
  try {
    await app.listen({
      host: appConfig.api.host,
      port: appConfig.api.port
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
