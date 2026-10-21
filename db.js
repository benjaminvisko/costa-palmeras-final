'use strict';
// Almacén local en JSON. Esquema (equivale a las tablas/colecciones de producción):
//  users:        { id, name, email, passwordHash, role: 'cliente'|'admin', createdAt }
//  obras:        { id, userId, nombre, etapa, avance(0-100), responsable, updatedAt }
//  orders:       { id, items:[{id,name,qty,price}], total, status, paymentRef, createdAt }
//  contacts:     { id, name, email, phone, message, createdAt }
//  resetTokens:  { tokenHash, userId, expiresAt, used }
// Para producción: reemplazar este módulo por uno con Postgres/Mongo manteniendo la misma API (read/write/insert/find/update).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ROOT } = require('./config');

const DIR = path.join(ROOT, 'data');
const FILE = path.join(DIR, 'db.json');
const EMPTY = { users: [], obras: [], orders: [], contacts: [], resetTokens: [] };

function read() {
  if (!fs.existsSync(FILE)) return JSON.parse(JSON.stringify(EMPTY));
  return Object.assign({}, EMPTY, JSON.parse(fs.readFileSync(FILE, 'utf8')));
}
function write(data) {
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
}
const id = () => crypto.randomUUID();

function insert(table, row) {
  const data = read();
  const rec = Object.assign({ id: id(), createdAt: new Date().toISOString() }, row);
  data[table].push(rec);
  write(data);
  return rec;
}
function find(table, pred) { return read()[table].filter(pred); }
function update(table, pred, patch) {
  const data = read();
  data[table].forEach((r) => { if (pred(r)) Object.assign(r, patch); });
  write(data);
}

// Contraseñas con scrypt (nativo de Node).
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex');
}
function verifyPassword(pw, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = crypto.scryptSync(pw, salt, 32);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { read, write, insert, find, update, id, hashPassword, verifyPassword, FILE };
