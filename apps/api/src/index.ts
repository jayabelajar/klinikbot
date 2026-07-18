import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import jwt from "@fastify/jwt";
import { appConfig } from "@klinikbot/config";
import { prisma, BookingStatus, QueueStatus } from "@klinikbot/database";
import { generatePatientCode, isValidPhoneNumber } from "@klinikbot/utils";
import { z } from "zod";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(sensible);
await app.register(jwt, { secret: appConfig.api.jwtSecret });

app.get("/health", async () => ({ ok: true, service: "klinikbot-api" }));

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

app.get("/dashboard/summary", async () => {
  const [totalPatients, bookingsToday, activeQueue, completedToday] = await Promise.all([
    prisma.patient.count(),
    prisma.booking.count({
      where: {
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    }),
    prisma.queue.count({ where: { status: { in: [QueueStatus.WAITING, QueueStatus.CALLED] } } }),
    prisma.booking.count({ where: { status: BookingStatus.COMPLETED } })
  ]);

  return {
    totalPatients,
    bookingsToday,
    activeQueue,
    completedToday
  };
});

app.get("/patients", async () => {
  return prisma.patient.findMany({ orderBy: { createdAt: "desc" } });
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

app.get("/doctors", async () => {
  return prisma.doctor.findMany({ orderBy: { createdAt: "desc" } });
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

app.get("/bookings", async () => {
  return prisma.booking.findMany({
    include: { patient: true, doctor: true, queue: true },
    orderBy: { createdAt: "desc" }
  });
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

  return prisma.booking.update({
    where: { id: params.id },
    data: { status: body.status }
  });
});

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

  const latestQueue = await prisma.queue.findFirst({
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

  return prisma.queue.update({
    where: { id: params.id },
    data: { status: body.status }
  });
});

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
