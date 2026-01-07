const API_BASE = "http://localhost:3000/api";

(function () {
  // Elements
  const messageEl = document.getElementById("message");
  const parseBtn = document.getElementById("parse-button");
  const previewEl = document.getElementById("preview");
  const toEl = document.getElementById("to");
  const subjectEl = document.getElementById("subject");
  const bodyEl = document.getElementById("body");
  const sendBtn = document.getElementById("send-button");
  const statusEl = document.getElementById("status");

  const state = { messageId: null };

  function setStatus(text, type = "info") {
    statusEl.textContent = text;
    statusEl.hidden = !text;
    // Keep a base 'status' class and add modifier classes
    statusEl.classList.remove('status-info', 'status-error');
    statusEl.classList.add('status');
    statusEl.classList.add(type === 'error' ? 'status-error' : 'status-info');
    // Ensure screen readers announce it
    statusEl.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    console.debug('status:', text);
  }

  function validateEmail(email) {
    // Simple RFC-5322-lite regex for basic validation
    const re = /[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/;
    return re.test(String(email).toLowerCase());
  }

  async function handleParse() {
    const message = messageEl.value.trim();
    if (!message) {
      setStatus('Please enter an instruction to parse.', 'error');
      messageEl.focus();
      return;
    }

    parseBtn.disabled = true;
    setStatus('Parsing message...', 'info');

    try {
      const res = await fetch(API_BASE + "/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      previewEl.classList.remove('hidden');
      previewEl.setAttribute('aria-hidden', 'false');
      toEl.value = data.parsed?.to || '';
      subjectEl.value = data.parsed?.subject || '';
      bodyEl.value = data.parsed?.body || '';
      state.messageId = data.messageId || null;

      setStatus('Parsed. Review the email and click Send.', 'info');
      toEl.focus();
    } catch (err) {
      console.error(err);
      setStatus('Failed to parse message. Try again.', 'error');
    } finally {
      parseBtn.disabled = false;
    }
  }

  async function handleSend() {
    const to = toEl.value.trim();
    const subject = subjectEl.value.trim();
    const body = bodyEl.value.trim();

    if (!to || !validateEmail(to)) {
      setStatus('Please provide a valid recipient email.', 'error');
      toEl.focus();
      return;
    }

    if (!subject) {
      setStatus('Please provide an email subject.', 'error');
      subjectEl.focus();
      return;
    }

    // Show visible loading on the button immediately
    sendBtn.disabled = true;
    sendBtn.dataset.originalText = sendBtn.textContent;
    sendBtn.textContent = 'Sending…';
    sendBtn.classList.add('is-loading');
    sendBtn.setAttribute('aria-busy', 'true');
    setStatus('Sending email...', 'info');

    const payload = {
      messageId: state.messageId,
      to,
      subject,
      body
    };

    try {
      const res = await fetch(API_BASE + "/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Send failed: ${res.status} ${text}`);
      }

      const data = await res.json();
      if (data?.status === 'sent') {
        setStatus('Email sent', 'info');
      } else {
        setStatus(`Send failed: ${data?.error || data?.detail || data?.status || 'unknown'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      setStatus('Failed to send email. Try again later.', 'error');
    } finally {
      // Restore button
      sendBtn.disabled = false;
      sendBtn.classList.remove('is-loading');
      sendBtn.removeAttribute('aria-busy');
      if (sendBtn.dataset.originalText) {
        sendBtn.textContent = sendBtn.dataset.originalText;
        delete sendBtn.dataset.originalText;
      }
    }
  }

  // Keyboard shortcuts
  messageEl.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleParse();
    }
  });

  bodyEl.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSend();
    }
  });

  // Bind buttons
  parseBtn.addEventListener('click', handleParse);
  sendBtn.addEventListener('click', handleSend);

  // Small UX: show preview if values already present (e.g., after refresh)
  if (toEl.value || subjectEl.value || bodyEl.value) {
    previewEl.classList.remove('hidden');
    previewEl.setAttribute('aria-hidden', 'false');
  }
  
})();
