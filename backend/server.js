
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { randomUUID } from "crypto";

const app = express();

// Configure CORS from env or allow all in development
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*'
}));

// Limit JSON body size to prevent large payloads
app.use(express.json({ limit: '10kb' }));

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

const N8N_WEBHOOK = process.env.N8N_WEBHOOK || "http://localhost:5678/webhook-test/mcp-email";


function parseMessageText(text) {
  const t = (text || '').toString().trim();
  if (!t) return { to: '', subject: '', body: '' };

  let body = t;
  let subject = '';

  // 1) Explicit Subject: line (start of line, case-insensitive)
  const subjectLineMatch = body.match(/^\s*subject\s*[:\-]\s*(.+)$/im);
  if (subjectLineMatch) {
    subject = subjectLineMatch[1].trim();
    body = body.replace(subjectLineMatch[0], '').trim();
    body = body.replace(/^\s*\n+/, '').trim();
  }

  // 2) Inline patterns like 'saying', 'about', 'regarding', 'subject is', 're:'
  if (!subject) {
    const inlineRegex = /\b(?:saying|about|regarding|subject(?: is)?|re)\b[:\s-]+(.+?)(?=(?:[\.\n]|$))/i;
    const m = body.match(inlineRegex);
    if (m) {
      subject = m[1].trim();
      body = body.replace(m[0], '').trim();
      body = body.replace(/^\s*[:,\-\s]+/, '').trim();
    }
  }

  // Fallback default
  if (!subject) subject = 'Email from Chat';

  // Extract recipient (prefer body where subject is removed)
  const emailMatch = (body.match(/\b[\w.-]+@[\w.-]+\.\w+\b/) || t.match(/\b[\w.-]+@[\w.-]+\.\w+\b/));
  const to = emailMatch ? emailMatch[0] : '';

  return { to, subject, body };
}

app.post("/api/message", (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Missing or empty message' });
  }
  const parsed = parseMessageText(message);
  res.json({
    messageId: randomUUID(),
    parsed,
    needsConfirmation: true
  });
});

app.post("/api/send", async (req, res) => {
  const { to, subject, body, messageId } = req.body || {};

  if (!to || !/[^@\s]+@[^@\s]+\.[^@\s]+/.test(to)) {
    return res.status(400).json({ error: 'Invalid recipient' });
  }
  if (!subject || typeof subject !== 'string') {
    return res.status(400).json({ error: 'Missing subject' });
  }

  try {
    const response = await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: String(to).trim(), subject: String(subject).trim(), body: String(body || ''), messageId })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('Upstream webhook error', response.status, text);
      return res.status(502).json({ status: 'error', detail: 'Upstream webhook error' });
    }

    return res.json({ status: 'sent' });
  } catch (err) {
    console.error('Send error:', err);
    return res.status(502).json({ error: 'Failed to reach webhook' });
  }
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
