import { Session } from "../types";

const sessions = new Map<string, Session>();

export const getSession = (phone: string): Session => {
  if (!sessions.has(phone)) {
    sessions.set(phone, {
      state: "IDLE",
      data: {}
    });
  }
  return sessions.get(phone)!;
};

export const updateSession = (phone: string, update: Partial<Session>): void => {
  const current = getSession(phone);
  sessions.set(phone, {
    ...current,
    ...update
  });
};

export const updateSessionData = (phone: string, data: any): void => {
  const current = getSession(phone);
  sessions.set(phone, {
    ...current,
    data: {
      ...current.data,
      ...data
    }
  });
};

export const clearSession = (phone: string): void => {
  sessions.delete(phone);
};
