'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const config = require('./config');
const db = require('./db');
const { sendMail } = require('./mailer');
const { createPayment } = require('./payments');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml'
};
const COMPRESSIBLE = /^(text\/|application\/(json|xml)|image\/svg)/;
const BLOCKED = /^\/(server|data|node_modules)(\/|$)|^\/\.|package(-lock)?\.json$|\.env/i;

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (config.isProd) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const h = (hits.get(ip) || []).filter((t) => now - t < 60000);
  h.push(now);
  hits.set(ip, h);
  return h.length > config.rateLimitPerMin;
}
setInterval(() => hits.clear(), 300000).unref();

function send(req, res, status, body, type) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const headers = { 'Content-Type': type };
  if (COMPRESSIBLE.test(type) && buf.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    headers['Content-Encoding'] = 'gzip';
    headers.Vary = 'Accept-Encoding';
    res.writeHead(status, headers);
    return res.end(zlib.gzipSync(buf));
  }
  res.writeHead(status, headers);
  res.end(buf);
}
const json = (req, res, status, obj) => send(req, res, status, JSON.stringify(obj), MIME['.json']);

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 100 * 1024) { reject(Object.assign(new Error('Payload demasiado grande'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}); }
      catch (e) { reject(Object.assign(new Error('JSON inválido'), { status: 400 })); }
    });
  });
}

const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
const clean = (s, n) => String(s || '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const routes = {
  'GET /api/health': async () => [200, { ok: true, env: config.isProd ? 'production' : 'development', mail: config.mail.driver, payments: config.payments.driver }],

  'POST /api/contact': async (req) => {
    const b = await readBody(req);
    const name = clean(b.name, 100), phone = clean(b.phone, 40), message = String(b.message || '').trim().slice(0, 2000);
    if (!name || !isEmail(b.email) || message.length < 5) return [400, { error: 'Datos inválidos' }];
    db.insert('contacts', { name, email: b.email, phone, message });
    await sendMail({ to: config.mail.toContact, replyTo: b.email, subject: 'Nuevo contacto web: ' + name, text: `Nombre: ${name}\nEmail: ${b.email}\nTeléfono: ${phone}\n\n${message}` });
    return [200, { ok: true }];
  },

  'POST /api/auth/forgot': async (req) => {
    const b = await readBody(req);
    const out = { ok: true, message: 'Si el email existe, te enviamos un enlace.' };
    if (!isEmail(b.email)) return [200, out]; // misma respuesta siempre: no revela qué emails existen
    const user = db.find('users', (u) => u.email === b.email.toLowerCase())[0];
    if (!user) return [200, out];
    const token = crypto.randomBytes(32).toString('hex');
    db.insert('resetTokens', { tokenHash: sha(token), userId: user.id, expiresAt: Date.now() + 3600000, used: false });
    const link = `${config.appUrl}/?reset=${token}`;
    await sendMail({ to: user.email, subject: 'Recuperar contraseña - Costa Palmeras', text: `Hola ${user.name},\n\nUsá este enlace (válido 1 hora):\n${link}\n\nSi no lo pediste, ignorá este mensaje.` });
    if (!config.isProd) out.devLink = link;
    return [200, out];
  },

  'POST /api/auth/reset': async (req) => {
    const b = await readBody(req);
    if (typeof b.token !== 'string' || typeof b.password !== 'string' || b.password.length < 8) return [400, { error: 'Datos inválidos' }];
    const h = sha(b.token);
    const t = db.find('resetTokens', (r) => r.tokenHash === h && !r.used && r.expiresAt > Date.now())[0];
    if (!t) return [400, { error: 'Enlace inválido o vencido' }];
    db.update('users', (u) => u.id === t.userId, { passwordHash: db.hashPassword(b.password) });
    db.update('resetTokens', (r) => r.tokenHash === h, { used: true });
    return [200, { ok: true }];
  },

  'POST /api/checkout': async (req) => {
    const b = await readBody(req);
    if (!Array.isArray(b.items) || !b.items.length || b.items.length > 50) return [400, { error: 'Carrito inválido' }];
    const items = b.items.map((i) => ({ id: clean(i.id, 60), name: clean(i.name, 120), qty: Math.max(1, Math.min(99, parseInt(i.qty, 10) || 1)), price: Number(i.price) || 0 }));
    // TODO producción: tomar el precio desde el catálogo del servidor, nunca del cliente.
    const total = items.reduce((s, i) => s + i.qty * i.price, 0);
    const order = db.insert('orders', { items, total, status: 'pending', paymentRef: '' });
    const pay = await createPayment(order);
    db.update('orders', (o) => o.id === order.id, { paymentRef: pay.ref });
    return [200, { orderId: order.id, checkoutUrl: pay.checkoutUrl, status: pay.status }];
  }
};

function serveStatic(req, res, pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch (e) { return json(req, res, 400, { error: 'URL inválida' }); }
  if (rel.includes('\0') || BLOCKED.test(rel)) return json(req, res, 404, { error: 'No encontrado' });
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(config.ROOT, rel));
  if (!file.startsWith(config.ROOT + path.sep)) return json(req, res, 403, { error: 'Prohibido' });
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(req, res, 404, 'No encontrado', 'text/plain; charset=utf-8');
    const type = MIME[path.extname(file).toLowerCase()];
    if (!type) return send(req, res, 404, 'No encontrado', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', type.startsWith('text/html') ? 'no-cache' : (config.isProd ? 'public, max-age=86400' : 'no-cache'));
    fs.readFile(file, (e, buf) => (e ? send(req, res, 500, 'Error', 'text/plain') : send(req, res, 200, buf, type)));
  });
}

const server = http.createServer(async (req, res) => {
  securityHeaders(res);
  cors(req, res);
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      if (limited(req.socket.remoteAddress)) return json(req, res, 429, { error: 'Demasiadas solicitudes' });
      const handler = routes[req.method + ' ' + url.pathname];
      if (!handler) return json(req, res, 404, { error: 'No encontrado' });
      const [status, body] = await handler(req);
      return json(req, res, status, body);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(req, res, 405, 'Método no permitido', 'text/plain');
    serveStatic(req, res, url.pathname);
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error('[error]', err);
    json(req, res, status, { error: status === 500 ? 'Error interno' : err.message });
  }
});

server.listen(config.port, () => {
  console.log(`[costa-palmeras] ${config.isProd ? 'PRODUCCIÓN' : 'desarrollo'} -> ${config.appUrl}  (mail=${config.mail.driver}, pagos=${config.payments.driver})`);
  if (!config.isProd && !fs.existsSync(db.FILE)) console.log('[tip] Ejecutá "npm run seed" para cargar datos de prueba.');
});
