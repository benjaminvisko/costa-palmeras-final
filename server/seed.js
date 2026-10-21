'use strict';
// Datos de prueba ficticios. Uso: npm run seed  (sobrescribe data/db.json)
const db = require('./db');
const config = require('./config');

if (config.isProd) {
  console.error('[seed] Bloqueado en producción.');
  process.exit(1);
}

const now = new Date().toISOString();
const u1 = db.id(), u2 = db.id(), u3 = db.id();

db.write({
  users: [
    { id: u1, name: 'Cliente Demo', email: 'cliente@demo.com', passwordHash: db.hashPassword('demo1234'), role: 'cliente', createdAt: now },
    { id: u2, name: 'María González', email: 'maria@demo.com', passwordHash: db.hashPassword('demo1234'), role: 'cliente', createdAt: now },
    { id: u3, name: 'Admin Demo', email: 'admin@demo.com', passwordHash: db.hashPassword('admin1234'), role: 'admin', createdAt: now }
  ],
  obras: [
    { id: db.id(), userId: u1, nombre: 'Piscina 8x4 - Pilar', etapa: 'Excavación', avance: 35, responsable: 'Personal a definir', updatedAt: now },
    { id: db.id(), userId: u2, nombre: 'Piscina 6x3 - Country', etapa: 'Revestimiento', avance: 80, responsable: 'Personal a definir', updatedAt: now }
  ],
  orders: [
    { id: db.id(), items: [{ id: 'led-1', name: 'Iluminación LED', qty: 2, price: 45000 }], total: 90000, status: 'paid', paymentRef: 'MOCK-0001', createdAt: now }
  ],
  contacts: [
    { id: db.id(), name: 'Lucía Pérez', email: 'lucia@demo.com', phone: '2475000000', message: 'Quisiera un presupuesto para una piscina de hormigón.', createdAt: now }
  ],
  resetTokens: []
});
console.log('[seed] OK -> data/db.json\n  cliente@demo.com / demo1234\n  admin@demo.com / admin1234');
