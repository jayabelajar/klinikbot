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
    sessionName: process.env.WHATSAPP_SESSION_NAME ?? "klinikbot-session"
  },
  database: {
    url: process.env.DATABASE_URL ?? ""
  }
};
