'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Carga .env sin dependencias; las variables ya definidas en el sistema tienen prioridad.
(function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m || line.trim().startsWith('#')) return;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
})();

const env = process.env;
const isProd = env.NODE_ENV === 'production';

const config = {
  ROOT,
  isProd,
  port: Number(env.PORT) || 3000,
  appUrl: (env.APP_URL || 'http://localhost:' + (env.PORT || 3000)).replace(/\/$/, ''),
  corsOrigins: (env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  dbDriver: env.DB_DRIVER || 'json',
  mail: {
    driver: env.MAIL_DRIVER || 'console',
    from: env.MAIL_FROM || 'Costa Palmeras <no-responder@localhost>',
    toContact: env.MAIL_TO_CONTACT || 'contacto@localhost',
    resendKey: env.RESEND_API_KEY || ''
  },
  payments: { driver: env.PAYMENTS_DRIVER || 'mock', mpToken: env.MP_ACCESS_TOKEN || '' },
  sessionSecret: env.SESSION_SECRET || 'dev-secret',
  rateLimitPerMin: Number(env.RATE_LIMIT_PER_MIN) || 60
};

// En producción fallar rápido ante configuración insegura o de juguete.
if (isProd) {
  const errors = [];
  if (config.sessionSecret === 'dev-secret' || config.sessionSecret === 'cambiar-en-produccion') errors.push('SESSION_SECRET sin definir');
  if (!/^https:\/\//.test(config.appUrl)) errors.push('APP_URL debe ser https://');
  if (config.mail.driver === 'console') errors.push('MAIL_DRIVER=console no envía correos reales');
  if (config.mail.driver === 'resend' && !config.mail.resendKey) errors.push('Falta RESEND_API_KEY');
  if (config.payments.driver === 'mercadopago' && !config.payments.mpToken) errors.push('Falta MP_ACCESS_TOKEN');
  if (errors.length) {
    console.error('[config] Configuración de producción inválida:\n - ' + errors.join('\n - '));
    process.exit(1);
  }
}

module.exports = config;
