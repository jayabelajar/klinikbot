export type UserRole = "ADMIN" | "RECEPTIONIST";

export type BookingStatus =
  | "WAITING"
  | "CONFIRMED"
  | "QUEUE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type QueueStatus = "WAITING" | "CALLED" | "SKIPPED" | "DONE";

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
}

export interface Patient {
  id: string;
  code: string;
  name: string;
  gender: "MALE" | "FEMALE";
  birthDate: string;
  phone: string;
  address?: string | null;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  schedule: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface Booking {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  complaint: string;
  paymentType: "BPJS" | "UMUM";
  status: BookingStatus;
}

export interface Queue {
  id: string;
  bookingId: string;
  queueNumber: number;
  status: QueueStatus;
}

export interface MessageLog {
  id: string;
  phone: string;
  message: string;
  direction: "INBOUND" | "OUTBOUND";
  createdAt: string;
}
