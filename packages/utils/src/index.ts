export const formatPhoneNumber = (raw: string): string => {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return `62${digits}`;
};

export const isValidPhoneNumber = (raw: string): boolean => {
  const normalized = formatPhoneNumber(raw);
  return /^62\d{8,13}$/.test(normalized);
};

export const generatePatientCode = (sequence: number): string => {
  return `PSN-${String(sequence).padStart(6, "0")}`;
};

export const generateBookingCode = (sequence: number): string => {
  return `BKG-${String(sequence).padStart(6, "0")}`;
};

export const toStartOfDayISO = (date: Date): string => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
