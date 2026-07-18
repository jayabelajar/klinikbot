import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import path from "path";
import fs from "fs";
import pino from "pino";
import qrcode from "qrcode-terminal";
import http from "http";
import { appConfig } from "@klinikbot/config";
import { handleIncomingMessage } from "./flows/handler";

// Logger for Baileys - set to silent or warn to avoid spamming the console
const logger = pino({ level: "silent" });

const sessionDir = path.resolve(process.cwd(), "whatsapp_session");

let sock: any = null;
let connectionStatus: "CONNECTED" | "DISCONNECTED" | "CONNECTING" | "QR_READY" = "DISCONNECTED";
let qrCodeString = "";
let phoneNumber = "";

async function connectToWhatsApp() {
  connectionStatus = "CONNECTING";
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // We will manually print it with qrcode-terminal
    logger
  });

  sock.ev.on("connection.update", (update: any) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      connectionStatus = "QR_READY";
      qrCodeString = qr;
      console.log("\n================ WHATSAPP LOGIN QR ================");
      console.log("Scan QR code below with your WhatsApp to log in:");
      qrcode.generate(qr, { small: true });
      console.log("===================================================\n");
    }

    if (connection === "close") {
      qrCodeString = "";
      const shouldReconnect =
        (lastDisconnect?.error as any)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log(
        "WhatsApp connection closed due to",
        lastDisconnect?.error?.message || lastDisconnect?.error,
        ", reconnecting:",
        shouldReconnect
      );
      if (shouldReconnect) {
        connectionStatus = "CONNECTING";
        connectToWhatsApp();
      } else {
        connectionStatus = "DISCONNECTED";
        phoneNumber = "";
        console.log("Logged out from WhatsApp. Clearing session and restarting to generate new QR code...");
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (e: any) {
          console.error("Failed to clear session folder:", e.message);
        }
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      connectionStatus = "CONNECTED";
      qrCodeString = "";
      const userJid = sock.user?.id;
      phoneNumber = userJid ? userJid.split(":")[0].split("@")[0] : "";
      console.log(`WhatsApp connection successfully established for ${phoneNumber}!`);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (m: any) => {
    if (m.type !== "notify") return;
    for (const msg of m.messages) {
      if (!msg.key.fromMe && msg.message) {
        const from = msg.key.remoteJid;
        if (!from) continue;
        
        // Extract text message content
        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          "";

        if (!text) continue;

        const phone = from.split("@")[0];
        console.log(`Received message from ${phone}: ${text}`);

        try {
          const response = await handleIncomingMessage(phone, text);
          await sock.sendMessage(from, { text: response });
        } catch (error: any) {
          console.error("Error processing message:", error.message);
        }
      }
    }
  });
}

// Start WhatsApp Client
connectToWhatsApp().catch((err) => console.error("Error starting bot:", err));

// Start built-in HTTP Server for outbound messages (notifications, queue calls)
const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: connectionStatus,
      qr: qrCodeString,
      phone: phoneNumber
    }));
  } else if (req.method === "POST" && req.url === "/logout") {
    const handleLogout = async () => {
      try {
        if (sock) {
          await sock.logout();
        } else {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (error: any) {
        console.error("Failed to logout:", error.message);
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (e) {}
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error.message }));
      }
    };
    handleLogout();
  } else if (req.method === "POST" && req.url === "/send") {
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      try {
        const { phone, message } = JSON.parse(body);
        if (!phone || !message) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing phone or message" }));
          return;
        }

        if (!sock) {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "WhatsApp client not initialized" }));
          return;
        }

        const jid = `${phone}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
        console.log(`Sent outbound WhatsApp to ${phone}: ${message}`);
        
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (error: any) {
        console.error("Failed to send outbound message:", error.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

server.listen(appConfig.bot.port, () => {
  console.log(`Bot HTTP webhook server listening on port ${appConfig.bot.port}`);
});
