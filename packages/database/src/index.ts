import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __klinikbotPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__klinikbotPrisma__ ??
  new PrismaClient({
    log: ["query", "info", "warn", "error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__klinikbotPrisma__ = prisma;
}

export * from "@prisma/client";
