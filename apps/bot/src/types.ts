export type BotState =
  | "IDLE"
  // Registration Flow
  | "REG_NAME"
  | "REG_DOB"
  | "REG_GENDER"
  | "REG_PHONE"
  | "REG_ADDRESS"
  | "REG_COMPLAINT"
  | "REG_PAYMENT"
  // Booking Flow
  | "BOOK_PATIENT_CODE"
  | "BOOK_DOCTOR"
  | "BOOK_DATE"
  | "BOOK_TIME"
  | "BOOK_COMPLAINT"
  | "BOOK_PAYMENT"
  | "BOOK_CONFIRM";

export interface Session {
  state: BotState;
  data: {
    // Patient Registration details
    name?: string;
    dob?: string;
    gender?: "MALE" | "FEMALE";
    phone?: string;
    address?: string;
    complaint?: string;
    paymentType?: "BPJS" | "UMUM";

    // Booking appointment details
    patientCode?: string;
    patientId?: string;
    patientName?: string;
    doctorId?: string;
    doctorName?: string;
    date?: string;
    time?: string;
    doctorsList?: Array<{ id: string; name: string; specialization: string; schedule: string }>;
  };
}
