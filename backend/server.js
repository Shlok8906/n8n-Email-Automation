import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { randomUUID } from "crypto";

const app = express();

/* =========================
   CONFIG & MIDDLEWARE
========================= */

// ✅ SAFE CORS CONFIG (FIXES ERR_INVALID_CHAR)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Postman, server-to-server, and same-origin
      if (!origin) return callback(null, true);

      // If no frontend origin is set, allow all
      if (!FRONTEND_ORIGIN) return callback(null, true);

      // Allow only the configured frontend
      if (origin === FRONTEND_ORIGIN) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  })
);

// JSON body limit
app.use(express.json({ limit: "10kb" }));

// Basic security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// Environment variables
const N8N_WEBHOOK =
  process.env.N8N_WEBHOOK ||
  "http://localhost:5678/webhook/mcp-email";

/* =========================
   HELPERS
========================= */

function parseMessageText(text) {
  const t = (text || "").toString().trim();
  if (!t) return { to: "", subject: "", body: "" };

  let body = t;
  let subject = "";

  // Subject line
  const subjectLineMatch = body.match(/^\s*subject\s*[:\-]\s*(.+)$/im);
  if (subjectLineMatch) {
    subject = subjectLineMatch[1].trim();
    body = body.replace(subjectLineMatch[0], "").trim();
  }

  if (!subject) subject = "Email from Chat";

  const emailMatch = body.match(/\b[\w.-]+@[\w.-]+\.\w+\b/);
  const to = emailMatch ? emailMatch[0] : "";

  return { to, subject, body };
}

/* =========================
   ROUTES
========================= */

// Health check
app.get("/health", (req, res) => {
  res.send("Backend is alive");
});

// Parse message
app.post("/api/message", (req, res) => {
  const { message } = req.body || {};

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Missing or empty message" });
  }

  const parsed = parseMessageText(message);

  res.json({
    messageId: randomUUID(),
    parsed,
    needsConfirmation: true,
  });
});

// Send email via n8n
app.post("/api/send", async (req, res) => {
  const { to, subject, body, messageId } = req.body || {};

  if (!to || !/[^@\s]+@[^@\s]+\.[^@\s]+/.test(to)) {
    return res.status(400).json({ error: "Invalid recipient" });
  }

  if (!subject || typeof subject !== "string") {
    return res.status(400).json({ error: "Missing subject" });
  }

  try {
    const response = await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: String(to).trim(),
        subject: String(subject).trim(),
        body: String(body || ""),
        messageId,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Upstream webhook error:", response.status, text);
      return res.status(502).json({ error: "Upstream webhook error" });
    }

    // ✅ CRITICAL: consume response body (prevents 500 crash)
    await response.text();

    return res.json({ status: "sent" });
  } catch (err) {
    console.error("Send error:", err);
    return res.status(502).json({ error: "Failed to reach webhook" });
  }
});

/* =========================
   ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack || err);
  res.status(500).json({
    error: "Internal server error",
    detail: err.message,
  });
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
