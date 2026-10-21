'use strict';
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Driver "console": imprime el correo y lo guarda en data/outbox/*.txt (revisable sin SMTP).
async function sendConsole(msg) {
  const dir = path.join(config.ROOT, 'data', 'outbox');
  fs.mkdirSync(dir, { recursive: true });
  const body = `From: ${config.mail.from}\nTo: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n`;
  fs.writeFileSync(path.join(dir, Date.now() + '.txt'), body);
  console.log('\n[mail:console] ' + msg.subject + ' -> ' + msg.to + '\n' + msg.text + '\n');
  return { id: 'console-' + Date.now() };
}

// Driver "resend": API HTTP real, sin dependencias (Node >= 18).
async function sendResend(msg) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + config.mail.resendKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: config.mail.from, to: [msg.to], subject: msg.subject, text: msg.text, reply_to: msg.replyTo })
  });
  if (!res.ok) throw new Error('Resend ' + res.status + ': ' + (await res.text()));
  return res.json();
}

async function sendMail(msg) {
  return config.mail.driver === 'resend' ? sendResend(msg) : sendConsole(msg);
}

module.exports = { sendMail };
