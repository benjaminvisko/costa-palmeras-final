/* client-portal — client-portal.js */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, signOut, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot, query, where, writeBatch } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

/* ================= Configuración ================= */
/* EQUIPO: cada Gmail de esta lista accede al portal de trabajadores, puede EDITAR todas las obras
   y ser asignado como ENCARGADO. Para dar acceso a otra persona, agregá su Gmail acá.
   (name es opcional: si está vacío se usa el nombre con el que la persona se registró). */
const TEAM = [
  { email: 'pablocostapalmeras084@gmail.com',    name: 'Pablo Martin Rimaulo' },
  { email: 'adm.costapalmeras@gmail.com',        name: 'Carolina Moreno Guerrero' },
  { email: 'logistica.costapalmeras@gmail.com',  name: 'Logística' },
  { email: 'servicios@costapalmeras.com',        name: 'Servicios y postventa' },
  { email: 'comunicacion.costapalmeras@gmail.com', name: 'Daniela Olmedo (Comunicación)' },
  { email: 'alux6536@gmail.com',                 name: '' },
  { email: 'benjaminviskovich@gmail.com',        name: '' },
  { email: 'facuroca397@gmail.com',              name: '' }
];
const STAFF = TEAM.map(t => t.email);

const DEPARTMENTS = [
  { id: 'direccion', name: 'Dirección y ventas', responsibility: 'Generar oportunidades de negocio y administrar los procesos para garantizar su correcta ejecución.', people: ['Pablo Martin Rimaulo'] },
  { id: 'administracion-rrhh', name: 'Administración y RRHH', responsibility: 'Gestionar recursos económicos, documentación y flujos de dinero; acompañar el desarrollo, bienestar y rendimiento de las personas.', people: ['Carolina Moreno Guerrero'] },
  { id: 'logistica', name: 'Logística', responsibility: 'Coordinar materiales, herramientas, inventario, depósito, transporte, almacenamiento y producción de premoldeados.', people: ['Alexis Martin Olmedo Bargo', 'Maximiliano Daniel Hipólito', 'Román Agustín Aguirre Zabala'] },
  { id: 'comunicacion', name: 'Comunicación', responsibility: 'Diseñar y comunicar la identidad de la organización a audiencias internas y externas, alineada con sus objetivos.', people: ['Daniela Nathalie Olmedo Bargo'] },
  { id: 'servicios', name: 'Servicios y postventa', responsibility: 'Resolver las necesidades de los clientes con calidad antes, durante y después de la compra. Daniela atiende, presupuesta y agenda los trabajos.', people: ['Daniela Nathalie Olmedo Bargo'] },
  { id: 'obra', name: 'Obra de piscinas', responsibility: 'Completar cada proyecto dentro del presupuesto y los plazos, cumpliendo estándares de calidad y seguridad.', people: ['Daniel Aguirre Zabala', 'Carlos de Jesús Godoy', 'Juan Ángel Ramírez Móngelos'], internal: true }
];
const getDepartment = id => DEPARTMENTS.find(d => d.id === id) || DEPARTMENTS.find(d => d.id === 'obra');

/* Catálogo de 8 actividades. Se eligen al crear la obra, se agregan después, y cada una se puede
   unir con otras, dividir en partes, reordenar (arrastrando o con las flechas) o asignar en lote. */
const CATALOG = [
  { name: 'Replanteo', days: 1 },
  { name: 'Excavación', days: 3 },
  { name: 'Estructura', days: 4 },
  { name: 'Hormigonado', days: 2 },
  { name: 'Instalación de equipos', days: 5 },
  { name: 'Revestimiento', days: 3 },
  { name: 'Terminaciones', days: 4 },
  { name: 'Control de agua', days: 2 }
];
/* Combinaciones rápidas para armar el cronograma (índices del catálogo) */
const PRESETS = [
  { n: 'Obra completa', a: [0, 1, 2, 3, 4, 5, 6, 7] },
  { n: 'Renovación', a: [0, 5, 4, 6, 7] },
  { n: 'Equipos y agua', a: [4, 7] }
];
const MSG_TPL = ['Mañana llega el equipo a las 8.', 'Trabajo reprogramado por clima.', 'Necesitamos acceso al terreno.', 'Etapa finalizada, seguimos con la siguiente.'];
const RESOURCES = [
  { t: 'Usos y mantenimiento de la piscina', f: './PDF/Usos%20y%20mantenimientos.pdf' },
  { t: 'Instructivo de cuidado del agua',    f: './PDF/Cuidado%20del%20agua.pdf' },
  { t: 'Folleto de productos y servicios',   f: './PDF/Folleto%20de%20productos.pdf' }
];
// Foto y productos por línea (editá acá).
const LINE_INFO = {
  'Mirabilis': { img: 'images/28.jpg', prods: ['Iluminación LED', 'Climatización', 'Filtrado y bombas', 'Cobertor automático'] },
  'Bacoli': { img: 'images/28.jpg', prods: ['Iluminación LED', 'Climatización solar', 'Revestimientos', 'Hidromasaje'] }
};
const DEF_LINE = { img: 'images/28.jpg', prods: ['Análisis de agua', 'Servicio técnico', 'Productos para piscina'] };
const LINES = ['Mirabilis', 'Bacoli', 'Mantenimiento', 'Servicio técnico', 'Otro servicio'];
const STATES = ['Pendiente', 'En desarrollo', 'Completado'];
/* Firebase: Consola de Firebase → Configuración del proyecto → Tus apps → App web → "Configuración del SDK".
   Estos valores NO son secretos (la seguridad la dan las reglas de Firestore), pero tienen que ser los de TU proyecto. */
const FIREBASE = { apiKey: 'AIzaSyCCjCnBPA-3-RAd8qMC0xdWeMER5Ly4Rqg', authDomain: 'costa-palmeras-760ef.firebaseapp.com', projectId: 'costa-palmeras-760ef', appId: '1:1037246021369:web:db52961fc8425aca146c28' };
const CONFIGURED = !FIREBASE.apiKey.startsWith('TU_');
const app = initializeApp(FIREBASE), auth = getAuth(app), db = getFirestore(app);

/* ================= Utilidades ================= */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').trim().toLowerCase();
/* ---------- Clave de la obra ----------
   Cada obra tiene un código (nº de presupuesto) y una CLAVE aleatoria que se genera sola al crearla.
   El cliente necesita las dos para vincular su cuenta. codeKey (lo que comparan las reglas de Firestore)
   es un hash SHA-256 de código + clave, así que el número de presupuesto solo no alcanza. */
const PIN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para evitar confusiones al dictarla
const genPin = (n = 8) => [...crypto.getRandomValues(new Uint8Array(n))].map(b => PIN_CHARS[b % PIN_CHARS.length]).join('');
const normPin = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const fmtPin = p => { p = normPin(p); return p.length === 8 ? p.slice(0, 4) + '-' + p.slice(4) : p; };
async function keyOf(code, pin) { // obras anteriores sin clave: se mantiene el codeKey viejo (código solo)
  const c = norm(code), p = normPin(pin); if (!p) return c;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(c + '|' + p));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); return true; } catch (e) { return false; } }
const isStaff = e => STAFF.includes(norm(e));
const uid = () => Math.random().toString(36).slice(2, 10);
const stamp = () => new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
const ic = n => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const msg = x => typeof x === 'string' ? x : x instanceof Error ? x.message : 'Ocurrió un error. Probá de nuevo.';
const cls = s => (s === 'Completado' || s === 'Terminada') ? 'ok' : s === 'En desarrollo' ? 'go' : s === 'Lista para terminar' ? 'rdy' : 'wait';
const gcls = a => a.st === 'Completado' ? 'ok' : a.st === 'En desarrollo' ? 'go' : 'wait';

function toast(t, act) {
  const e = $('toast'); e.textContent = '';
  const s = document.createElement('span'); s.textContent = t; e.append(s);
  if (act) { const b = document.createElement('button'); b.type = 'button'; b.textContent = act.label; b.onclick = () => { e.classList.remove('on'); act.fn(); }; e.append(b); }
  e.classList.add('on'); e.classList.toggle('act', !!act);
  clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), act ? 7000 : 2800);
}
const undoToast = t => toast(t, { label: 'Deshacer', fn: doUndo });

function ask(title, text, ok = 'Confirmar', danger = false) {
  return new Promise(res => {
    $('dct').textContent = title; $('dctx').textContent = text;
    const b = $('dcok'); b.textContent = ok; b.className = 'btn sm' + (danger ? ' red' : '');
    const d = $('dc'); d.returnValue = '';
    d.addEventListener('close', () => res(d.returnValue === 'ok'), { once: true });
    d.showModal();
  });
}
/* ---------- Teléfonos (WhatsApp) ---------- */
/* Deja el celular argentino como lo pide WhatsApp: 549 + característica + número (sin 0 ni 15). null = inválido. */
function normPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '').replace(/^00/, '');
  if (d.startsWith('54') && d.length > 10) d = d.slice(2);
  if (d.startsWith('9') && d.length === 11) d = d.slice(1);
  d = d.replace(/^0/, '');
  if (d.length === 12) for (const n of [2, 3, 4]) if (d.slice(n, n + 2) === '15') { d = d.slice(0, n) + d.slice(n + 2); break; }
  return d.length === 10 ? '549' + d : null;
}
const PHONE_ERR = 'El número de WhatsApp no parece válido. Cargalo con la característica, sin 0 ni 15 (ej: 2475 123456).';

/* ---------- Fechas (días hábiles, lunes a viernes) ---------- */
const parseD = s => { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
const fmtD = d => d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric' }).replace(/[.,]/g, '');
const isBiz = d => d.getDay() % 6 !== 0;
const nextBiz = d => { d = new Date(d); while (!isBiz(d)) d.setDate(d.getDate() + 1); return d; };
const addBiz = (d, n) => { d = new Date(d); while (n > 0) { d.setDate(d.getDate() + 1); if (isBiz(d)) n--; } return d; };
function schedule(w) { // [{s,e}] por actividad, o null si la obra no tiene fecha de inicio
  const s = parseD((w.spec || {}).start); if (!s) return null; let prev = null;
  return w.acts.map(a => {
    if (!a.days) return { s: null, e: null };
    let st; if (prev) { st = new Date(prev); st.setDate(st.getDate() + 1); st = nextBiz(st); } else st = nextBiz(s);
    const e = addBiz(st, a.days - 1); prev = e; return { s: st, e };
  });
}
const rng = x => x && x.s ? (+x.s === +x.e ? fmtD(x.s) : fmtD(x.s) + ' → ' + fmtD(x.e)) : '';
const endDate = w => { const sc = schedule(w); if (!sc) return null; const e = sc.filter(x => x.e); return e.length ? e[e.length - 1].e : null; };
const hasTbd = w => w.acts.some(a => !a.days);

/* ---------- Servicios posteriores ---------- */
const SERVICE_TYPES = ['Limpieza general', 'Control y análisis de agua', 'Revisión de equipos (bombas y filtros)', 'Mantenimiento de revestimiento', 'Revisión de iluminación', 'Cambio de arena del filtro'];
const SVC_NOTICE_DAYS = 7; // días de anticipación con los que se avisa al cliente
const todayD = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const toISO = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const addMonths = (d, n) => { d = new Date(d); const day = d.getDate(); d.setMonth(d.getMonth() + n); if (d.getDate() !== day) d.setDate(0); return d; };
const fmtFull = d => d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
const daysTo = s => Math.round((parseD(s) - todayD()) / 864e5);
const svcBadge = s => { const d = daysTo(s.due); return s.done ? ['ok', 'Realizado'] : d < 0 ? ['wait', 'Vencido'] : d <= SVC_NOTICE_DAYS ? ['near', 'Coordinar fecha'] : ['go', 'Programado']; };
/* ---------- WhatsApp manual (wa.me, sin API) ---------- */
const waMsg = (w, s) => {
  const f = fmtFull(parseD(s.due));
  return daysTo(s.due) <= SVC_NOTICE_DAYS
    ? `Hola ${w.client}, se acerca el servicio de ${s.name} de tu piscina (fecha estimada: ${f}). Comunicate con Costa Palmeras al ${CONTACT.tel} para coordinar el día del servicio.`
    : `Hola ${w.client}, te escribimos de Costa Palmeras. Programamos el servicio de ${s.name} para tu piscina, con fecha estimada ${f}. Una semana antes te vamos a avisar para coordinar el día. Consultas: ${CONTACT.tel}.`;
};
const waLink = (w, s) => { const p = normPhone((w.spec || {}).phone); return p ? `https://wa.me/${p}?text=${encodeURIComponent(waMsg(w, s))}` : null; };
const waBtn = (w, s, cl = 'btn sm') => {
  const sp = w.spec || {};
  if (!normPhone(sp.phone)) return '<span class="pill wait">Falta el WhatsApp del cliente</span>';
  if (!sp.waOptIn) return '<span class="pill wait">Cliente sin autorización de WhatsApp</span>';
  return `<a class="${cl}" href="${esc(waLink(w, s))}" target="_blank" rel="noopener">${ic('send')} WhatsApp</a>`;
};
const svcWhen = s => { if (s.done) return ''; const d = daysTo(s.due); return d < 0 ? ' · venció hace ' + (-d) + (d === -1 ? ' día' : ' días') : d === 0 ? ' · es hoy' : ' · faltan ' + d + (d === 1 ? ' día' : ' días'); };

/* ================= Datos en la nube (Firebase) =================
   D() es una copia en memoria que se mantiene sincronizada EN VIVO con Firestore (onSnapshot), y C() guarda en la
   nube las obras que cambiaron. Cada método de `api` sigue funcionando igual que antes: modifica D() y llama a C().
   Colecciones:
     works/{id}          obra (la ve el cliente cuyo código coincide)
     works_private/{id}  notas internas, historial y "deshacer" (solo equipo)
     users/{uid}         nombre, email y código de cliente */
const mem = { users: {}, works: [] };
const D = () => mem;
const delay = ms => new Promise(r => setTimeout(r, ms));
const LOCAL_KEY = 'cp_obra_v3'; // clave de la versión anterior (LocalStorage), solo para importar
let authUser = null, regBusy = false, sync = null;
const saved = new Map(); // id de obra -> JSON de lo último guardado/recibido (para guardar solo lo que cambió)

const AUTH_ERR = {
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
  'auth/invalid-email': 'El email no es válido.',
  'auth/weak-password': 'La contraseña es muy débil (mínimo 8 caracteres).',
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/wrong-password': 'Email o contraseña incorrectos.',
  'auth/user-not-found': 'Email o contraseña incorrectos.',
  'auth/too-many-requests': 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
  'auth/network-request-failed': 'Sin conexión. Revisá tu internet.'
};
const authMsg = x => typeof x === 'string' ? x : AUTH_ERR[x && x.code] || 'Ocurrió un error. Probá de nuevo.';

/* La obra se guarda en dos documentos: el público (lo puede leer el cliente) y el privado (solo equipo). */
function splitWork(w, codeKey) {
  const { log, undo, spec, pin, ...rest } = w; const { notes, ...pspec } = spec || {};
  return [{ ...rest, spec: pspec, codeKey }, { log: log || [], undo: undo ?? null, notes: notes || '', pin: pin || '' }]; // la clave queda solo en works_private
}
async function writeWork(w) {
  const [pub, priv] = splitWork(JSON.parse(JSON.stringify(w)), await keyOf(w.code, w.pin)); // el JSON saca los undefined, que Firestore no acepta
  const b = writeBatch(db);
  b.set(doc(db, 'works', w.id), pub); b.set(doc(db, 'works_private', w.id), priv);
  await b.commit();
}
async function removeWork(id) {
  const b = writeBatch(db);
  b.delete(doc(db, 'works', id)); b.delete(doc(db, 'works_private', id));
  await b.commit();
}
/* Guarda en la nube las obras que cambiaron. Solo el equipo escribe obras. */
async function C() {
  if (!me || !isStaff(me.email)) return;
  const jobs = [], ids = new Set();
  for (const w of mem.works) {
    ids.add(w.id); const j = JSON.stringify(w);
    if (saved.get(w.id) !== j) { saved.set(w.id, j); jobs.push(writeWork(w).catch(e => { saved.delete(w.id); throw e; })); }
  }
  for (const id of [...saved.keys()]) if (!ids.has(id)) { saved.delete(id); jobs.push(removeWork(id).catch(e => { saved.set(id, ''); throw e; })); }
  if (!jobs.length) return;
  const all = Promise.all(jobs);
  try {
    const r = await Promise.race([all.then(() => 'ok'), delay(10000).then(() => 'slow')]);
    if (r === 'slow') { toast('Sin conexión con el servidor: los cambios se guardan cuando vuelva internet. No cierres la página.'); all.catch(e => console.error(e)); }
  } catch (e) {
    console.error(e);
    throw e && e.code === 'permission-denied' ? 'La base de datos rechazó el cambio (permisos). Revisá las reglas de Firestore y que hayas entrado con un Gmail del equipo.' : 'No se pudo guardar en la nube. Revisá tu conexión y probá de nuevo.';
  }
}

/* Sincronización en vivo. Equipo: todas las obras + privadas + usuarios.
   Cliente: solo la obra cuyo código tiene vinculado (lo exigen las reglas de Firestore). */
function stopSync() { if (sync) sync.off.forEach(f => f()); sync = null; saved.clear(); mem.works = []; mem.users = {}; }
function startSync() {
  const staff = me.role === 'equipo', ck = me.codeKey || '', key = me.uid + '|' + (staff ? 'staff' : ck);
  if (sync && sync.key === key) return sync.ready;
  stopSync();
  const s = sync = { key, off: [], error: null, live: false, ready: null };
  const refresh = snap => { if (s.live && !snap.metadata.hasPendingWrites && idle()) render().catch(console.error); };
  const listen = (q, fn) => new Promise(res => {
    let first = true;
    s.off.push(onSnapshot(q, snap => { fn(snap); if (first) { first = false; res(); } else refresh(snap); }, err => { console.error(err); s.error = err; res(); }));
  });
  const byDate = (a, b) => (a.createdAt || 0) - (b.createdAt || 0);
  if (staff) {
    const pubs = new Map(), privs = new Map();
    const rebuild = () => {
      mem.works = [...pubs.values()].map(p => {
        const { codeKey, ...pub } = p, v = privs.get(p.id) || {};
        return { ...pub, spec: { ...(pub.spec || {}), notes: v.notes || '' }, log: v.log || [], undo: v.undo ?? null, pin: v.pin || '' };
      }).sort(byDate);
      mem.works.forEach(w => saved.set(w.id, JSON.stringify(w)));
    };
    s.ready = Promise.all([
      listen(collection(db, 'works'), snap => { pubs.clear(); snap.docs.forEach(d => pubs.set(d.id, { ...d.data(), id: d.id })); rebuild(); }),
      listen(collection(db, 'works_private'), snap => { privs.clear(); snap.docs.forEach(d => privs.set(d.id, d.data())); rebuild(); }),
      listen(collection(db, 'users'), snap => { mem.users = {}; snap.docs.forEach(d => { const u = d.data(); if (u.email) mem.users[norm(u.email)] = { ...u, uid: d.id }; }); }),
    ]).then(() => { s.live = true; });
  } else {
    s.ready = (ck ? listen(query(collection(db, 'works'), where('codeKey', '==', ck)), snap => {
      mem.works = snap.docs.map(d => { const { codeKey, ...w } = d.data(); return { ...w, id: d.id }; }).sort(byDate);
    }) : Promise.resolve()).then(() => { s.live = true; });
    // Si el equipo cambia el código de la obra, la cuenta del cliente se actualiza sola y hay que reconectar.
    s.off.push(onSnapshot(doc(db, 'users', me.uid), snap => { const u = snap.data(); if (u && (u.codeKey || '') !== ck) boot(); }, () => {}));
  }
  return s.ready;
}

/* Obras guardadas en este navegador por la versión anterior (LocalStorage), para importarlas una vez. */
function localPending() {
  try {
    const d = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    return ((d && d.works) || []).filter(w => w && w.id && w.code && !mem.works.some(x => norm(x.code) === norm(w.code)));
  } catch (e) { return []; }
}

const findW = id => { const w = D().works.find(w => w.id === id); if (!w) throw 'La obra ya no existe.'; return w; };
function ping(w, t) { w.notifs.unshift({ t, time: stamp(), u: 1 }); w.notifs = w.notifs.slice(0, 60); }
function touch(w, t) { w.log = w.log || []; w.log.unshift({ t, time: stamp(), by: me ? me.email : null }); w.log = w.log.slice(0, 80); }
function snap(w, label) { w.undo = JSON.stringify({ acts: w.acts, label }); }
const need = () => { if (!me || !isStaff(me.email)) throw 'Tu cuenta no tiene permisos para editar obras.'; };
const open = w => { if (w.closed) throw 'La obra está terminada. Reabrila para editar las etapas.'; };

/* Personas del equipo (todas pueden editar y ser encargadas) */
const staffName = e => { const k = norm(e), t = TEAM.find(x => x.email === k), u = D().users[k]; return (t && t.name) || (u && u.name) || e; };
const ownerName = o => isStaff(o) ? staffName(o) : (o || 'A definir'); // datos viejos guardaban el nombre como texto
const ownerOpts = sel => {
  const list = TEAM.map(t => { const n = staffName(t.email); return [t.email, n === t.email ? t.email : n + ' · ' + t.email]; });
  if (sel && !isStaff(sel)) list.unshift([sel, sel + ' (anterior)']);
  return list.map(([v, l]) => `<option value="${esc(v)}"${norm(v) === norm(sel) ? ' selected' : ''}>${esc(l)}</option>`).join('');
};

const api = {
  async register({ name, email, pw, code, pin }) {
    const e = norm(email);
    if (code.trim() && !normPin(pin)) throw 'Si ingresás el código de tu obra, ingresá también la clave que te dio Costa Palmeras.';
    if (isStaff(e)) throw 'Los correos del equipo ingresan con el botón de Google.';
    regBusy = true;
    try {
      const { user } = await createUserWithEmailAndPassword(auth, e, pw);
      authUser = user;
      await updateProfile(user, { displayName: name });
      const c = code.trim();
      await setDoc(doc(db, 'users', user.uid), { name, email: e, code: c, codeKey: c ? await keyOf(c, pin) : '' });
    } catch (x) { throw authMsg(x); } finally { regBusy = false; }
  },
  async login(email, pw) {
    const e = norm(email);
    if (isStaff(e)) throw 'Los correos del equipo ingresan con el botón de Google.';
    try { await signInWithEmailAndPassword(auth, e, pw); } catch (x) { throw authMsg(x); }
  },
  async google() { // equipo (y cualquiera con Google): se exige correo verificado; el rol sale de la lista TEAM
    const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
    if (!user.emailVerified) { await signOut(auth); throw 'Tu correo de Google no está verificado.'; }
  },
  async reset(email) {
    try { await sendPasswordResetEmail(auth, norm(email)); } catch (x) { if (!x || x.code !== 'auth/user-not-found') throw authMsg(x); }
  },
  async me() {
    if (!authUser) return null;
    const e = norm(authUser.email), ref = doc(db, 'users', authUser.uid);
    let u = (await getDoc(ref)).data();
    if (!u) { u = { name: authUser.displayName || e, email: e }; await setDoc(ref, u); }
    return { uid: authUser.uid, name: u.name || e, email: e, code: u.code || '', codeKey: u.codeKey || '', role: isStaff(e) ? 'equipo' : 'cliente' };
  },
  async logout() { await signOut(auth); },
  async works() { return mem.works; },
  async setProgressPhoto(wid, imageUrl) {
    need(); const w = findW(wid);
    if (typeof imageUrl !== 'string' || !imageUrl.startsWith('data:image/jpeg;base64,') || imageUrl.length > 600000) {
      throw 'La foto no tiene un formato válido o supera el tamaño permitido.';
    }
    const previous = { imageUrl: w.obraImageUrl, notifs: (w.notifs || []).slice(), log: (w.log || []).slice() };
    w.notifs = w.notifs || [];
    w.obraImageUrl = imageUrl;
    ping(w, 'Se actualizó la foto de avance de tu obra.');
    touch(w, 'Actualizó la foto de avance.');
    try { await C(); }
    catch (e) {
      if (previous.imageUrl === undefined) delete w.obraImageUrl;
      else w.obraImageUrl = previous.imageUrl;
      w.notifs = previous.notifs;
      w.log = previous.log;
      throw e;
    }
  },
  async createWork(f) {
    need(); const d = D();
    if (!f.client) throw 'Ingresá el nombre del cliente.';
    if (!f.acts.length) throw 'Elegí al menos una actividad.';
    if (f.phone && !normPhone(f.phone)) throw PHONE_ERR;
    if (!f.code) throw 'Ingresá el número de presupuesto.';
    if (d.works.some(w => norm(w.code) === norm(f.code))) throw 'Ya existe una obra con ese número de presupuesto.';
    const w = { id: uid(), createdAt: Date.now(), client: f.client, code: f.code, pin: genPin(), line: f.line, closed: false, spec: { addr: f.addr, size: f.size, start: f.start || '', notes: '', phone: f.phone || '', waOptIn: !!f.wa }, notifs: [], acts: [], log: [], undo: null };
    f.acts.forEach((a, i) => w.acts.push({ id: uid(), name: a.name, area: f.area, owner: f.owner, days: a.days, st: i === 0 && a.days ? 'En desarrollo' : 'Pendiente' }));
    ping(w, `Tu obra fue cargada · ${f.line} · ${w.acts.length} actividades programadas. Primera etapa: ${w.acts[0].name} (encargado: ${ownerName(f.owner)}).`);
    touch(w, `Creó la obra con ${w.acts.length} actividades.`);
    d.works.push(w); await C(); return w;
  },
  async linkWork(email, code, pin) {
    const c = code.trim(); if (!c) throw 'Ingresá el código de tu obra.';
    if (!normPin(pin)) throw 'Ingresá la clave de tu obra.';
    const key = await keyOf(c, pin), oldCode = me.code || '', oldKey = me.codeKey || '', ref = doc(db, 'users', me.uid);
    await setDoc(ref, { code: c, codeKey: key }, { merge: true });
    const r = await getDocs(query(collection(db, 'works'), where('codeKey', '==', key)));
    if (r.empty) { await setDoc(ref, { code: oldCode, codeKey: oldKey }, { merge: true }); throw 'El código o la clave no coinciden con ninguna obra. Revisalos o consultá al equipo.'; }
  },
  async setLine(wid, line) { need(); const w = findW(wid); w.line = line; ping(w, `Línea de la obra actualizada: ${line}.`); touch(w, `Cambió la línea a ${line}.`); await C(); },
  async setMeta(wid, m) {
    need(); const d = D(), w = findW(wid);
    if (!m.client) throw 'Ingresá el nombre del cliente.';
    if (!m.code) throw 'Ingresá el número de presupuesto.';
    if (m.phone && !normPhone(m.phone)) throw PHONE_ERR;
    if (d.works.some(x => x.id !== wid && norm(x.code) === norm(m.code))) throw 'Ya existe otra obra con ese código.';
    const oldCode = w.code, oldStart = (w.spec || {}).start || '', oldKey = await keyOf(w.code, w.pin);
    if (m.regen) w.pin = genPin(); // clave nueva: los clientes vinculados con la anterior pierden el acceso
    const newKey = await keyOf(m.code, w.pin);
    const stale = newKey === oldKey ? [] : Object.values(d.users).filter(u => u.uid && u.codeKey === oldKey); // clientes vinculados a la clave/código viejo
    w.client = m.client; w.code = m.code;
    w.spec = { ...w.spec, addr: m.addr, size: m.size, start: m.start, notes: m.notes, phone: m.phone || '', waOptIn: !!m.wa };
    if (m.start && m.start !== oldStart) ping(w, `Inicio previsto de la obra: ${fmtD(parseD(m.start))}.`);
    touch(w, m.regen ? 'Generó una clave nueva para la obra.' : 'Editó los datos de la obra.'); await C();
    await Promise.all(stale.map(u => updateDoc(doc(db, 'users', u.uid), m.regen ? { code: '', codeKey: '' } : { code: m.code, codeKey: newKey }).catch(e => console.error(e))));
    return m.regen ? w.pin : null;
  },
  async setClosed(wid, closed) {
    need(); const w = findW(wid);
    if (closed && (!w.acts.length || !w.acts.every(a => a.st === 'Completado'))) throw 'Completá todas las actividades antes de terminar la obra.';
    w.closed = closed; if (closed) w.closedAt = toISO(todayD()); ping(w, closed ? 'Tu obra fue finalizada. ¡Gracias por confiar en Costa Palmeras!' : 'Tu obra fue reabierta por el equipo.');
    touch(w, closed ? 'Marcó la obra como terminada.' : 'Reabrió la obra.'); await C();
  },
  async deleteWork(wid) {
    need(); const d = D(), w = findW(wid);
    if (!w.closed) throw 'Solo se pueden eliminar obras terminadas.';
    d.works = d.works.filter(x => x.id !== wid); await C();
  },
  async deleteAct(wid, aid) {
    need(); const w = findW(wid); open(w); const a = w.acts.find(x => x.id === aid);
    snap(w, `Eliminar ${a ? a.name : 'actividad'}`); w.acts = w.acts.filter(x => x.id !== aid); touch(w, `Eliminó la actividad ${a ? a.name : ''}.`); await C();
  },
  async saveAct(wid, f) {
    need(); const w = findW(wid); let a = w.acts.find(x => x.id === f.id);
    if (!a) {
      open(w); snap(w, `Agregar ${f.name}`);
      a = { id: uid() }; w.acts.push(a);
      ping(w, `Nueva actividad: ${f.name} · ${getDepartment(f.area).name} · ${f.st} · encargado: ${ownerName(f.owner)}${f.days ? ' · ' + f.days + ' días' : ''}.`);
      touch(w, `Agregó la actividad ${f.name}.`);
    } else {
      snap(w, `Editar ${a.name}`);
      if (a.st !== f.st) { ping(w, f.st === 'Completado' ? `Se completó: ${f.name}.` : `${f.name} pasó a "${f.st}".`); touch(w, `${f.name}: estado "${f.st}".`); }
      if (a.owner !== f.owner) { a.prev = ownerName(a.owner); ping(w, `Nuevo encargado de ${f.name}: ${ownerName(f.owner)}.`); touch(w, `${f.name}: encargado ${ownerName(f.owner)}.`); }
      if ((a.area || 'obra') !== (f.area || 'obra')) ping(w, `Área responsable de ${f.name}: ${getDepartment(f.area).name}.`);
      if ((a.days || 0) !== (f.days || 0)) { ping(w, `${f.name}: ${f.days ? f.days + ' días hábiles estimados' : 'duración a definir'}.`); touch(w, `${f.name}: ${f.days ? f.days + ' días' : 'duración a definir'}.`); }
      if ((a.note || '') !== (f.note || '') && f.note) ping(w, `${f.name}: ${f.note}`);
    }
    Object.assign(a, { name: f.name, area: f.area || 'obra', owner: f.owner, days: f.days, st: f.st, note: f.note || '' }); await C();
  },
  async moveTo(wid, aid, idx) {
    need(); const w = findW(wid); open(w); const i = w.acts.findIndex(a => a.id === aid);
    if (i < 0 || idx < 0 || idx >= w.acts.length || idx === i) return;
    snap(w, 'Reordenar'); const [a] = w.acts.splice(i, 1); w.acts.splice(idx, 0, a);
    ping(w, `Cronograma actualizado: ${a.name} ahora es la etapa ${idx + 1}.`); touch(w, `Reordenó ${a.name} (etapa ${idx + 1}).`); await C();
  },
  async mergeActs(wid, ids) {
    need(); const w = findW(wid); open(w); const picked = w.acts.filter(a => ids.includes(a.id));
    if (picked.length < 2) throw 'Seleccioná al menos dos actividades para unir.';
    snap(w, 'Unir etapas');
    const first = picked[0], idx = w.acts.indexOf(first);
    const days = picked.every(a => a.days) ? picked.reduce((s, a) => s + a.days, 0) : null;
    const st = picked.every(a => a.st === 'Completado') ? 'Completado' : picked.some(a => a.st !== 'Pendiente') ? 'En desarrollo' : 'Pendiente';
    const name = picked.map(a => a.name).join(' + ');
    w.acts = w.acts.filter(a => !ids.includes(a.id));
    w.acts.splice(idx, 0, { id: uid(), name, area: first.area, owner: first.owner, days, st, note: picked.map(a => a.note).filter(Boolean).join(' · ') });
    ping(w, `Etapas unificadas: ${name}${days ? ' · ' + days + ' días' : ''}.`); touch(w, `Unió ${picked.length} actividades: ${name}.`); await C();
  },
  async splitAct(wid, aid, n) {
    need(); const w = findW(wid); open(w); const i = w.acts.findIndex(a => a.id === aid), a = w.acts[i];
    n = Math.max(2, Math.min(6, Math.floor(n) || 2));
    if (a.days && a.days < n) throw `Para dividir en ${n} partes hacen falta al menos ${n} días (esta actividad tiene ${a.days}).`;
    snap(w, 'Dividir etapa');
    const base = a.name.replace(/\s*\(\d+\/\d+\)$/, ''), q = a.days ? Math.floor(a.days / n) : 0, r = a.days ? a.days % n : 0;
    const parts = Array.from({ length: n }, (_, k) => ({ id: uid(), name: `${base} (${k + 1}/${n})`, area: a.area, owner: a.owner, days: a.days ? q + (k < r ? 1 : 0) : null, st: a.st === 'Completado' ? 'Completado' : k === 0 ? a.st : 'Pendiente', note: k === 0 ? (a.note || '') : '' }));
    w.acts.splice(i, 1, ...parts);
    ping(w, `${base} se dividió en ${n} partes${a.days ? ' (' + parts.map(p => p.days).join(' + ') + ' días)' : ''}.`); touch(w, `Dividió ${base} en ${n} partes.`); await C();
  },
  async bulk(wid, ids, patch) {
    need(); const w = findW(wid); open(w); const picked = w.acts.filter(a => ids.includes(a.id));
    if (!picked.length) throw 'Seleccioná al menos una etapa.';
    snap(w, patch.owner ? 'Asignar encargado' : 'Cambiar estado');
    const names = picked.map(a => a.name).join(', ');
    picked.forEach(a => { if (patch.owner && norm(a.owner) !== norm(patch.owner)) a.prev = ownerName(a.owner); Object.assign(a, patch); });
    if (patch.owner) { ping(w, `Nuevo encargado (${ownerName(patch.owner)}) en: ${names}.`); touch(w, `Asignó a ${ownerName(patch.owner)} en ${picked.length} etapas.`); }
    if (patch.st) { ping(w, `Estado "${patch.st}": ${names}.`); touch(w, `Pasó ${picked.length} etapas a "${patch.st}".`); }
    await C(); return picked.length;
  },
  /* Cualquier Gmail del equipo puede tomar a cargo una o varias etapas (traspaso de encargado) */
  async takeOver(wid, ids) {
    need(); const w = findW(wid); open(w);
    const picked = w.acts.filter(a => ids.includes(a.id) && norm(a.owner) !== norm(me.email));
    if (!picked.length) throw 'Ya sos el encargado de esa etapa.';
    snap(w, 'Tomar a cargo');
    const who = staffName(me.email);
    picked.forEach(a => { a.prev = ownerName(a.owner); a.owner = me.email; });
    ping(w, `Nuevo encargado: ${who} se hizo cargo de ${picked.map(a => a.name).join(', ')}.`);
    touch(w, `Tomó a cargo ${picked.map(a => `${a.name} (antes: ${a.prev})`).join(', ')}.`); await C();
    return picked.length;
  },
  async advance(wid) {
    need(); const w = findW(wid); open(w);
    const cur = w.acts.filter(a => a.st === 'En desarrollo'), nxt = w.acts.find(a => a.st === 'Pendiente');
    if (!cur.length && !nxt) throw 'No hay etapas para avanzar: todas están completadas.';
    snap(w, 'Avanzar etapa');
    cur.forEach(a => a.st = 'Completado'); if (nxt) nxt.st = 'En desarrollo';
    const done = cur.map(a => a.name).join(', ');
    ping(w, `${done ? 'Se completó: ' + done + '. ' : ''}${nxt ? 'Comenzó: ' + nxt.name + ' (encargado: ' + ownerName(nxt.owner) + ').' : 'Todas las etapas están completadas.'}`);
    touch(w, `Avanzó la obra${done ? ': completó ' + done : ''}${nxt ? ', inició ' + nxt.name : ''}.`); await C();
    return { done, next: nxt ? nxt.name : null };
  },
  async undo(wid) {
    need(); const w = findW(wid); if (!w.undo) throw 'No hay cambios para deshacer.';
    const s = JSON.parse(w.undo); w.acts = s.acts; w.undo = null;
    ping(w, 'Se revirtió el último cambio del cronograma.'); touch(w, `Deshizo: ${s.label}.`); await C(); return s.label;
  },
  /* Servicios posteriores a la obra (limpieza, control de agua, etc.) */
  async saveService(wid, f) {
    need(); const w = findW(wid);
    if (!w.closed) throw 'Los servicios posteriores se programan cuando la obra está terminada.';
    if (!f.name) throw 'Elegí o escribí el servicio.';
    if (!parseD(f.due)) throw 'Indicá una fecha válida.';
    w.services = w.services || [];
    let s = w.services.find(x => x.id === f.id); const fecha = fmtFull(parseD(f.due)); let sendWA = false; // WhatsApp solo al programar o cambiar la fecha
    if (!s) {
      s = { id: uid(), notified: false, done: false }; w.services.push(s); sendWA = true;
      ping(w, `Programamos un servicio posterior: ${f.name}, estimado para el ${fecha}. Una semana antes te avisamos para coordinar la fecha.`);
      touch(w, `Programó el servicio ${f.name} (${fecha}).`);
    } else if (s.due !== f.due) {
      s.notified = false; sendWA = true;
      ping(w, `Se actualizó la fecha estimada de ${f.name}: ${fecha}.`);
      touch(w, `Cambió la fecha de ${f.name} a ${fecha}.`);
    } else if (f.done !== undefined && f.done !== s.done) {
      if (f.done) { ping(w, `Servicio realizado: ${f.name}.`); touch(w, `Marcó como realizado ${f.name}.`); }
      else { s.notified = false; touch(w, `Reabrió el servicio ${f.name}.`); }
    } else touch(w, `Editó el servicio ${f.name}.`);
    Object.assign(s, { name: f.name, due: f.due, note: f.note || '' });
    if (f.done !== undefined) s.done = f.done;
    await C();
    return sendWA && !s.done ? s.id : null; // id = hay que ofrecer el aviso por WhatsApp
  },
  async deleteService(wid, sid) {
    need(); const w = findW(wid); const s = (w.services || []).find(x => x.id === sid); if (!s) return;
    w.services = w.services.filter(x => x.id !== sid); touch(w, `Eliminó el servicio ${s.name}.`); await C();
  },
  async markNotified(wid, sid) {
    need(); const w = findW(wid), s = (w.services || []).find(x => x.id === sid);
    if (!s) throw 'El servicio ya no existe.';
    s.notified = true;
    ping(w, `Se acerca tu servicio de ${s.name} (fecha estimada: ${fmtFull(parseD(s.due))}). Comunicate con Costa Palmeras al ${CONTACT.tel} para coordinar la fecha del servicio.`);
    touch(w, `Marcó como avisado el servicio ${s.name}.`); await C();
  },
  async notify(wid, t) { need(); const w = findW(wid); ping(w, t); touch(w, `Envió un aviso: "${t}".`); await C(); },
  async markRead(wid) { // el cliente solo puede modificar sus notificaciones
    const w = findW(wid); w.notifs.forEach(n => n.u = 0);
    try { await updateDoc(doc(db, 'works', wid), { notifs: w.notifs }); } catch (e) { console.error(e); }
  }
};

/* ================= Estado ================= */
function general(w) {
  if (w.closed) return 'Terminada';
  if (!w.acts.length) return 'Pendiente';
  if (w.acts.some(a => a.st === 'En desarrollo')) return 'En desarrollo';
  return w.acts.every(a => a.st === 'Completado') ? 'Lista para terminar' : 'Pendiente';
}
const pct = w => w.acts.length ? Math.round(w.acts.filter(a => a.st === 'Completado').length / w.acts.length * 100) : 0;
const win = (t, b, extra = '') => `<section class="card"><div class="ch"><span>${t}</span>${extra}</div><div class="cb">${b}</div></section>`;
const dias = a => a.days ? a.days + (a.days === 1 ? ' día' : ' días') : 'A definir';
const areaName = a => getDepartment(a.area).name;
const lineInfo = l => LINE_INFO[l] || DEF_LINE;
const totalDays = w => w.acts.reduce((s, a) => s + (a.days || 0), 0);
const curAct = w => w.acts.find(a => a.st === 'En desarrollo') || w.acts.find(a => a.st === 'Pendiente');
const ring = (p, sz = 112, c = '') => { const r = (sz - 14) / 2, L = 2 * Math.PI * r, h = sz / 2; return `<svg class="ring ${c}" width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" role="img" aria-label="${p}% completado"><circle class="rt" cx="${h}" cy="${h}" r="${r}"/><circle class="rv" cx="${h}" cy="${h}" r="${r}" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - p / 100)}" transform="rotate(-90 ${h} ${h})"/><text class="rn" x="50%" y="50%" text-anchor="middle" dominant-baseline="central" style="font-size:${Math.round(sz * .24)}px">${p}%</text></svg>`; };
const endTxt = w => { const e = endDate(w); return e ? fmtD(e) + (hasTbd(w) ? ' (+ etapas a definir)' : '') : null; };

/* ================= Vistas ================= */
let me = null, wid = null, WS = [], fq = '', ff = 'activas', tab = 'act';
const sel = new Set();
const view = v => { ['login', 'reg', 'app'].forEach(k => $('v-' + k).hidden = k !== v); scrollTo(0, 0); };
const myW = () => WS.find(x => me.code && norm(x.code) === norm(me.code));

let bootBusy = false, bootAgain = false;
async function boot() { // si llegan varios pedidos juntos, se agrupan
  if (bootBusy) { bootAgain = true; return; }
  bootBusy = true;
  try { do { bootAgain = false; await doBoot(); } while (bootAgain); } finally { bootBusy = false; }
}
async function doBoot() {
  const paint = () => {
    $('nl1').hidden = $('nl2').hidden = !!me; $('out').hidden = !me; $('who').hidden = !me;
    if (me) {
      const staff = me.role === 'equipo';
      $('who').innerHTML = `<span class="rb ${me.role}">${staff ? 'Equipo' : 'Cliente'}</span><span class="wn">${esc(staff ? staffName(me.email) : me.name)}</span>`;
    }
  };
  if (!CONFIGURED) { me = null; paint(); view('login'); $('lerr').textContent = 'Falta cargar la configuración de Firebase en el código (constante FIREBASE).'; return; }
  try { me = await api.me(); }
  catch (x) { console.error(x); me = null; paint(); view('login'); $('lerr').textContent = 'No se pudo conectar con la base de datos. Revisá tu conexión y las reglas de Firestore.'; return; }
  paint();
  if (!me) { stopSync(); return view(location.hash === '#/registro' ? 'reg' : 'login'); }
  if ($('v-app').hidden) { $('body').innerHTML = '<p class="sub">Cargando…</p>'; view('app'); }
  await startSync();
  if (sync && sync.error) {
    $('body').innerHTML = `<div class="narrow">${win('No se pudieron cargar los datos', `<p class="sub">${sync.error.code === 'permission-denied' ? 'La base de datos rechazó la consulta. Revisá que las reglas de Firestore estén publicadas y que hayas entrado con un Gmail del equipo.' : 'Revisá tu conexión a internet y volvé a intentar.'}</p><button class="btn" style="margin-top:14px" onclick="location.reload()">Reintentar</button>`)}</div>`;
    return view('app');
  }
  await render(); view('app');
}

async function render() {
  const sideTop = document.querySelector('.side')?.scrollTop || 0;
  const staff = me.role === 'equipo'; WS = await api.works(); let w;
  if (staff) { if (!WS.some(x => x.id === wid)) { wid = (WS.find(x => !x.closed) || WS[0])?.id; sel.clear(); } w = WS.find(x => x.id === wid); }
  else w = myW();
  document.querySelector('#v-app .app').classList.toggle('client-mode', !staff && !!w);
  $('hi').textContent = staff ? 'Panel de gestión de obras' : 'Hola, ' + me.name.split(' ')[0];
  $('hp').textContent = staff ? 'Todo el equipo habilitado puede editar obras, actividades y ser encargado de cada etapa.' : 'Este es el avance de tu piscina. Te mantenemos al tanto en cada etapa.';
  const un = w ? w.notifs.filter(n => n.u).length : 0;
  $('tb').innerHTML = staff ? `${localPending().length ? `<button class="btn ghost" data-a="imp">${ic('download')} Importar ${localPending().length} obra${localPending().length > 1 ? 's' : ''} de este navegador</button>` : ''}<button class="btn acc" data-a="nw">${ic('plus')} Nueva obra</button>` : (w ? `<div class="bellw"><button class="bell" data-a="bell" aria-label="Notificaciones">${ic('bell')} Notificaciones${un ? `<i class="dot">${un}</i>` : ''}</button><div class="np" id="np"><b>Notificaciones</b>${w.notifs.map(n => `<div class="ni ${n.u ? 'u' : ''}">${esc(n.t)}<small>${n.time}</small></div>`).join('') || '<p class="sub">Todavía no hay novedades.</p>'}</div></div>` : '');
  $('body').innerHTML = staff ? staffHTML(w) : clientHTML(w);
  const s = document.querySelector('.side'); if (s) s.scrollTop = sideTop;
}

const departmentsWin = () => `<details class="card"><summary class="ch"><span>Áreas y responsabilidades</span><span>▾</span></summary><div class="cb">${DEPARTMENTS.map(d => `
  <div class="act"><div><h3>${esc(d.name)}</h3><p class="sub">${esc(d.responsibility)}</p>
  <p class="sub"><b>${d.internal ? 'Cuadrilla interna' : 'Referentes'}:</b> ${d.people.map(esc).join(', ')}</p></div></div>`).join('')}</div></details>`;

/* Contacto único e invariable para la clienta (no depende del encargado) */
const CONTACT = { name: 'Daniela Nathalie Olmedo Bargo', tel: '24746600' };
const callCard = () => `<div class="call"><div><small>Contacto directo</small><b>${esc(CONTACT.name)}</b><span>${esc(CONTACT.tel)}</span></div><a href="tel:${CONTACT.tel}" aria-label="Llamar a ${esc(CONTACT.name)}">📞</a></div>`;
const clientOwnerName = owner => {
  const name = ownerName(owner);
  return name.includes('@') ? 'Equipo Costa Palmeras' : name;
};
const clientStatus = status => status === 'En desarrollo' ? 'En curso' : status;
const clientStatusClass = status => status === 'Completado' ? 'done' : status === 'En desarrollo' ? 'working' : 'pending';
const clientWhatsAppLink = (w, owner) => {
  const text = `Hola ${clientOwnerName(owner)}, soy ${w.client}. Quería consultar sobre el avance de mi obra ${w.code}.`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};
const progressPhotoUrl = w => {
  const url = String(w.obraImageUrl || w.fotoAvance || '').trim();
  return /^(?:https?:\/\/|data:image\/|\/|\.\/|[^:]+$)/i.test(url) ? url : '';
};
function progressPhotoCard(w, editable) {
  const src = progressPhotoUrl(w);
  const photo = src
    ? `<button type="button" data-a="view-photo" aria-label="Ver foto de avance en pantalla completa"><img src="${esc(src)}" alt="Foto reciente de la obra ${esc(w.code)}"><span class="photo-badge">${editable ? 'Foto de avance actual' : 'Foto reciente de la obra'}</span></button>`
    : `<div class="photo-empty">${editable ? ic('image') : '<svg class="client-pool-illustration" viewBox="0 0 180 92" role="img" aria-label="Ilustración de una piscina"><path d="M17 48h146l-13 29H30z" fill="#d9eee5" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M28 58h124M38 68h104M48 78h84" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M48 39c0-8 8-8 8-16M88 39c0-8 8-8 8-16M128 39c0-8 8-8 8-16" fill="none" stroke="#d4af37" stroke-width="3" stroke-linecap="round"/></svg>'}<b>${editable ? 'Aún no hay foto de avance' : 'Tu piscina está tomando forma'}</b><span>${editable ? 'Subí una imagen para compartir el progreso con el cliente.' : 'Cuando el equipo comparta una foto reciente, la vas a encontrar acá.'}</span></div>`;
  return `<section class="card progress-photo-card"><div class="ch"><span>${editable ? 'Foto de avance' : 'Estado actual de tu piscina'}</span>${editable ? '<span class="chd">Visible para el cliente</span>' : ''}</div>
    <div class="progress-photo">${photo}</div>
    ${editable ? `<div class="photo-admin"><div><button type="button" class="btn sm acc" data-a="photo-upload">${ic('image')} Cambiar foto de avance</button><input type="file" accept="image/*" data-work-photo hidden><p class="sub" style="margin-top:6px">La imagen se optimiza para guardarla en la obra.</p></div></div>` : ''}
  </section>
  <dialog id="photoViewer" class="photo-viewer" aria-label="Foto de avance ampliada">
    <button type="button" class="photo-viewer-close" data-a="close-photo" aria-label="Cerrar foto ampliada">${ic('x')}</button>
    <img alt="Foto de avance de la obra ${esc(w.code)}">
  </dialog>`;
}

async function optimizeProgressPhoto(file) {
  if (!file || !file.type.startsWith('image/')) throw 'Elegí un archivo de imagen válido.';
  if (file.size > 20 * 1024 * 1024) throw 'La imagen supera el máximo de 20 MB.';
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const loaded = new Image();
      loaded.onload = () => resolve(loaded);
      loaded.onerror = () => reject(new Error('No se pudo abrir la imagen seleccionada.'));
      loaded.src = objectUrl;
    });
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    for (let attempt = 0; attempt < 10; attempt++) {
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo preparar la imagen en este navegador.');
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', Math.max(.5, .84 - attempt * .04));
      if (dataUrl.length <= 600000) return dataUrl;
      canvas.width = Math.max(1, Math.round(canvas.width * .82));
      canvas.height = Math.max(1, Math.round(canvas.height * .82));
    }
    throw new Error('No se pudo reducir la imagen al tamaño permitido. Elegí una imagen más pequeña.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/* Tarjeta destacada: qué se está haciendo ahora */
function spot(w, cur, sc, i) {
  if (w.closed) return `<section class="spot done"><div class="sp-ic">🎉</div><div><span class="eyebrow">Obra finalizada</span><h2>¡Tu piscina está lista!</h2><p>Gracias por confiar en Costa Palmeras. Ante cualquier duda, el equipo de Servicios y postventa te acompaña.</p></div></section>`;
  if (!cur) return '';
  const r = sc && i >= 0 && sc[i].s ? rng(sc[i]) : '', go = cur.st === 'En desarrollo';
  return `<section class="spot"><div class="sp-ic">${go ? '🛠️' : '⏳'}</div><div><span class="eyebrow">${go ? 'Ahora estamos trabajando en' : 'Próxima etapa'}</span><h2>${esc(cur.name)}</h2><p>${esc(areaName(cur))} · Equipo: <b>${esc(clientOwnerName(cur.owner))}</b> · ${dias(cur)}${r ? ' · ' + r : ''}</p>${cur.note ? `<p class="sp-n">“${esc(cur.note)}”</p>` : ''}</div></section>`;
}

/* Servicios posteriores visibles para el cliente */
function svcClient(w) {
  const l = (w.services || []).slice().sort((a, b) => a.due.localeCompare(b.due)); if (!l.length) return '';
  return win('Servicios posteriores', l.map(s => { const [c, t] = svcBadge(s), near = !s.done && daysTo(s.due) <= SVC_NOTICE_DAYS;
    return `<div class="act"><div><h3>${esc(s.name)}</h3><p class="sub">Fecha estimada: <b>${esc(fmtFull(parseD(s.due)))}</b></p>${s.note ? `<p class="nt">${esc(s.note)}</p>` : ''}${near ? `<div class="notice" style="margin-top:8px"><b>Es momento de coordinar.</b> Comunicate con Costa Palmeras al ${esc(CONTACT.tel)} para acordar la fecha de este servicio.</div>` : ''}</div><span class="pill ${c}">${t}</span></div>`; }).join('') + '<p class="sub" style="margin-top:10px">La fecha es estimada y puede ajustarse. Te avisamos una semana antes.</p>');
}

/* ---------- CLIENTE: una sola obra, ordenada ---------- */
function clientHTML(w) {
  if (!w) return `<div class="narrow">${win('Vinculá tu obra', `<p class="sub">${me.code ? `El código ${esc(me.code)} con esa clave no corresponde a una obra. Revisalos o consultá al equipo.` : 'Ingresá el código y la clave de tu obra que te dio Costa Palmeras.'}</p><div class="f"><label for="lc">Código de tu obra</label><input id="lc" value="${esc(me.code || '')}" autocomplete="off"></div><div class="f"><label for="lk">Clave de tu obra</label><input id="lk" placeholder="XXXX-XXXX" autocomplete="off" autocapitalize="characters" maxlength="12"></div><div class="err" id="lerr2" role="alert"></div><button class="btn" data-a="link">Vincular obra</button>`)}</div>`;
  const L = lineInfo(w.line), cur = curAct(w), sp = w.spec || {}, sc = schedule(w);
  const currentIndex = cur ? w.acts.indexOf(cur) : -1;
  const progress = pct(w), end = endTxt(w);
  const phrase = w.closed ? 'Tu piscina está terminada' : cur ? `En etapa de ${cur.name}` : w.acts.length ? 'Etapas pendientes de iniciar' : 'El cronograma se está preparando';
  const stages = w.acts.map((a, i) => {
    const completed = a.st === 'Completado';
    const current = !w.closed && i === currentIndex && !completed;
    const status = completed ? 'Completada' : current ? 'En proceso' : 'Pendiente';
    const date = sc && sc[i].s ? rng(sc[i]) : 'Fechas a confirmar';
    const detail = a.note ? `<p>${esc(a.note)}</p>` : '<p>El equipo actualizará esta etapa cuando haya novedades.</p>';
    return `<details class="client-step ${completed ? 'is-done' : current ? 'is-current' : 'is-pending'}"><summary><span class="client-step-icon">${completed ? ic('check') : i + 1}</span><span class="client-step-info"><span class="client-step-name">${esc(a.name)}</span><span class="client-step-meta">${esc(dias(a))} · ${esc(date)}</span><span class="client-step-status">${status}</span></span></summary><div class="client-step-details"><p><b>Duración estimada:</b> ${esc(dias(a))}</p><p><b>Fechas:</b> ${esc(date)}</p>${detail}</div></details>`;
  }).join('');
  const owner = cur ? cur.owner : w.acts.find(a => a.st !== 'Completado')?.owner;
  const contactName = owner ? clientOwnerName(owner) : CONTACT.name;
  const intro = `Costa Palmeras · Obra ${w.code} · ${w.client}`;
  return `<div class="po">${esc(intro)}</div><div class="client-view">
    <section class="client-hero" aria-labelledby="clientGreeting">
      <div><span class="client-kicker">MI OBRA · ${esc(w.code)}</span><h1 id="clientGreeting">Hola, ${esc(w.client)}</h1><p>${esc(sp.addr || 'Seguimiento de tu piscina')}</p></div>
      <div class="client-progress" role="group" aria-label="Avance general de la obra">
        ${ring(progress, 116, 'light')}
        <p class="client-progress-count"><span>${ic('check')}</span><span><strong>${w.acts.filter(a => a.st === 'Completado').length} de ${w.acts.length}</strong> etapas completadas</span></p>
      </div>
    </section>
    <section class="client-overview" aria-label="Resumen de tu obra">
      <div class="client-overview-item"><span>Estado actual</span><b>${esc(phrase)}</b></div>
      <div class="client-overview-item"><span>Finalización estimada</span><b>${w.closed ? 'Obra finalizada' : end ? esc(end) : 'A confirmar'}</b></div>
    </section>
    <div class="client-layout">
      <div class="client-column">
        <section class="card client-card" aria-labelledby="clientTimelineTitle">
          <div class="client-section-heading"><div><h2 class="client-section-title" id="clientTimelineTitle">Etapas de tu obra</h2><p class="client-section-subtitle">Tocá una etapa para ver más detalles.</p></div><button class="btn sm ghost no-print" data-a="print">${ic('print')} Imprimir</button></div>
          <div class="client-timeline">${stages || '<p class="sub">Apenas el equipo cargue las actividades, las vas a ver acá.</p>'}</div>
        </section>
        <section class="card client-card" aria-labelledby="clientResourcesTitle">
          <div class="client-section-heading"><div><h2 class="client-section-title" id="clientResourcesTitle">Recursos y documentos</h2><p class="client-section-subtitle">Guías útiles para disfrutar y cuidar tu piscina.</p></div></div>
          ${RESOURCES.map(r => `<div class="res"><span>${esc(r.t)}</span><span class="res-actions"><a class="resource-btn" href="${r.f}" target="_blank" rel="noopener" aria-label="Ver ${esc(r.t)}">${ic('eye')} Ver</a><a class="resource-btn download" href="${r.f}" download aria-label="Descargar ${esc(r.t)}">${ic('download')} Descargar</a></span></div>`).join('')}
        </section>
        <section class="card client-card" aria-labelledby="clientFactsTitle">
          <div class="client-section-heading"><div><h2 class="client-section-title" id="clientFactsTitle">Datos de tu obra</h2></div></div>
          <dl class="client-facts"><div class="client-fact"><dt>Cliente</dt><dd>${esc(w.client)}</dd></div><div class="client-fact"><dt>Código de obra</dt><dd>${esc(w.code)}</dd></div><div class="client-fact"><dt>Dirección</dt><dd>${esc(sp.addr || 'A confirmar')}</dd></div>${sp.size ? `<div class="client-fact"><dt>Piscina</dt><dd>${esc(sp.size)}</dd></div>` : ''}<div class="client-fact"><dt>Inicio previsto</dt><dd>${sp.start ? esc(fmtD(parseD(sp.start))) : 'A confirmar'}</dd></div></dl>
        </section>
      </div>
      <aside class="client-column" aria-label="Estado y contacto">
        ${progressPhotoCard(w, false)}
        <section class="client-contact" aria-label="Contacto del responsable">
          <span class="client-contact-label">Contacto del responsable</span><b class="client-contact-name">${esc(contactName)}</b>
          <a class="btn" href="${clientWhatsAppLink(w, owner)}" target="_blank" rel="noopener noreferrer">${ic('send')} Hablar por WhatsApp</a>
        </section>
        <section class="card client-note"><b>Clima y planificación.</b> Los trabajos exteriores pueden reprogramarse por clima. Si cambian las fechas, te avisamos automáticamente.</section>
        ${win('Tu línea', `<div class="lbl">Productos</div><ul class="plist">${L.prods.map(p => `<li>${esc(p)}</li>`).join('')}</ul><a class="btn sm" href="servicios.html">Saber más</a>`)}
      </aside>
    </div>
    ${svcClient(w)}
  </div>`;
}

/* ---------- EQUIPO: gestión de todas las obras ---------- */
const mine = w => !w.closed && w.acts.some(a => a.st !== 'Completado' && norm(a.owner) === norm(me.email));
const wItem = w => { const c = curAct(w); return `<button class="wi${w.id === wid ? ' on' : ''}" data-a="pick" data-id="${w.id}"><div class="row"><b>${esc(w.client)}</b><span class="pill ${cls(general(w))}">${general(w)}</span></div><div class="sub">${esc(w.code)} · ${esc(w.line)} · ${pct(w)}%</div><div class="bar"><span style="width:${pct(w)}%"></span></div><div class="nx">${w.closed ? 'Obra finalizada' : c ? 'Ahora: ' + esc(c.name) + ' · ' + esc(ownerName(c.owner).split(' ')[0]) : 'Sin etapas'}</div></button>`; };
const listHTML = () => {
  const q = norm(fq), l = WS.filter(w => (ff === 'todas' || (ff === 'activas' ? !w.closed : ff === 'mias' ? mine(w) : w.closed)) && (!q || norm(w.client + ' ' + w.code + ' ' + w.line).includes(q)));
  return l.map(wItem).join('') || `<p class="sub" style="margin-top:12px">${ff === 'mias' ? 'No tenés etapas abiertas asignadas.' : 'Sin obras para este filtro.'}</p>`;
};
const pendingAvisos = () => WS.flatMap(w => w.closed ? (w.services || []).filter(s => !s.done && !s.notified && daysTo(s.due) <= SVC_NOTICE_DAYS).map(s => ({ w, s })) : []).sort((a, b) => a.s.due.localeCompare(b.s.due));
const avisosWin = () => {
  const l = pendingAvisos(); if (!l.length) return '';
  return `<div style="margin-bottom:24px">${win(`Avisos pendientes (${l.length})`, l.map(({ w, s }) => `<div class="act"><div><h3>${esc(s.name)} · ${esc(w.client)}</h3><p class="sub">${esc(w.code)} · ${esc(fmtFull(parseD(s.due)))}${svcWhen(s)}</p></div><div class="ac">${waBtn(w, s, 'btn sm ghost')}<button class="btn sm" data-a="snot" data-w="${w.id}" data-id="${s.id}">${ic('check')} Marcar como avisado</button></div></div>`).join(''))}</div>`;
};
function workload() {
  const m = {};
  WS.filter(w => !w.closed).forEach(w => w.acts.forEach(a => { if (a.st === 'Completado') return; const k = norm(a.owner); (m[k] = m[k] || { o: a.owner, go: 0, wait: 0 }); a.st === 'En desarrollo' ? m[k].go++ : m[k].wait++; }));
  return Object.values(m).sort((a, b) => (b.go + b.wait) - (a.go + a.wait));
}
const bulkHTML = () => {
  const n = sel.size, off = n ? '' : ' disabled';
  return `<div class="bulk${n ? ' on' : ''}"><b>${n ? n + (n > 1 ? ' etapas seleccionadas' : ' etapa seleccionada') : 'Seleccioná etapas para actuar en lote'}</b>
    <select id="bo" aria-label="Encargado para las seleccionadas"${off}>${ownerOpts(me.email)}</select><button class="btn sm ghost" data-a="bown"${off}>${ic('check')} Asignar</button><button class="btn sm acc" data-a="btake"${off} title="Pasar a ser el encargado de todas las seleccionadas">${ic('user')} Tomar yo</button>
    <select id="bs" aria-label="Estado para las seleccionadas"${off}>${STATES.map(s => `<option>${s}</option>`).join('')}</select><button class="btn sm ghost" data-a="bst"${off}>${ic('check')} Estado</button>
    <button class="btn sm" data-a="merge"${n < 2 ? ' disabled' : ''}>${ic('merge')} Unir (${n})</button><button class="btn sm ghost" data-a="bclr"${off}>Limpiar</button></div>`;
};

function actRow(a, i, w, sc) {
  const on = sel.has(a.id), c = w.closed, mineAct = norm(a.owner) === norm(me.email);
  return `<div class="arow s-${gcls(a)}${on ? ' picked' : ''}" data-id="${a.id}">
    <button class="grip" type="button" aria-label="Arrastrar para reordenar ${esc(a.name)}" title="Arrastrá para reordenar"${c ? ' disabled' : ''}>${ic('grip')}</button>
    <input type="checkbox" data-sel data-id="${a.id}"${on ? ' checked' : ''}${c ? ' disabled' : ''} aria-label="Seleccionar ${esc(a.name)}">
    <span class="idx">${i + 1}</span>
    <div><h3>${esc(a.name)}</h3><p class="sub">${esc(areaName(a))} · Encargado: ${mineAct ? '<span class="you">Vos</span>' : esc(ownerName(a.owner))}${a.prev ? ` <span class="prev">(antes: ${esc(a.prev)})</span>` : ''} · ${dias(a)}</p>${sc && sc[i].s ? `<p class="dt">${ic('cal')} ${rng(sc[i])}</p>` : ''}${a.note ? `<p class="nt">${esc(a.note)}</p>` : ''}</div>
    <div class="ac">
      ${mineAct || c ? '' : `<button class="btn sm acc" data-a="take" data-id="${a.id}" title="Pasar a ser el encargado de esta etapa">${ic('user')} Tomar a cargo</button>`}
      <select data-st data-id="${a.id}" aria-label="Estado de ${esc(a.name)}"${c ? ' disabled' : ''}>${STATES.map(s => `<option${s === a.st ? ' selected' : ''}>${s}</option>`).join('')}</select>
      <button class="ib" data-a="up" data-id="${a.id}" title="Subir etapa" aria-label="Subir ${esc(a.name)}"${c || i === 0 ? ' disabled' : ''}>${ic('up')}</button>
      <button class="ib" data-a="dn" data-id="${a.id}" title="Bajar etapa" aria-label="Bajar ${esc(a.name)}"${c || i === w.acts.length - 1 ? ' disabled' : ''}>${ic('down')}</button>
      <button class="btn sm ghost" data-a="split" data-id="${a.id}"${c ? ' disabled' : ''}>${ic('split')} Dividir</button>
      <button class="ib" data-a="ea" data-id="${a.id}" title="Editar" aria-label="Editar ${esc(a.name)}"${c ? ' disabled' : ''}>${ic('edit')}</button>
      <button class="ib danger" data-a="da" data-id="${a.id}" title="Eliminar" aria-label="Eliminar ${esc(a.name)}"${c ? ' disabled' : ''}>${ic('trash')}</button>
    </div></div>`;
}

function staffHTML(w) {
  const act = WS.filter(x => !x.closed), allActs = act.flatMap(x => x.acts);
  const kpi = (n, l, c) => `<div class="st ${c}"><b>${n}</b><span>${l}</span></div>`;
  const kpis = `<div class="stats">${kpi(act.length, 'Obras activas', 'c1')}${kpi(WS.length - act.length, 'Terminadas (para archivar)', 'c2')}${kpi(allActs.filter(a => a.st === 'En desarrollo').length, 'Actividades en desarrollo', 'c3')}${kpi(allActs.filter(a => !a.days && a.st !== 'Completado').length, 'Con duración a definir', 'c4')}${kpi(pendingAvisos().length, 'Avisos pendientes', 'c3')}</div>`;
  const wl = workload(), mx = Math.max(1, ...wl.map(x => x.go + x.wait));
  const wlHTML = wl.map(x => `<div class="load"><span class="n" title="${esc(ownerName(x.o))}">${esc(ownerName(x.o))}</span><div class="lb" title="${x.go} en desarrollo · ${x.wait} pendientes"><i style="width:${x.go / mx * 100}%;background:var(--blue)"></i><i style="width:${x.wait / mx * 100}%;background:var(--amber)"></i></div><b>${x.go + x.wait}</b></div>`).join('') || '<p class="sub">Sin tareas abiertas.</p>';
  const segs = [['activas', 'Activas'], ['mias', 'Mías'], ['terminadas', 'Cerradas'], ['todas', 'Todas']];
  const side = `<div class="stack">${win('Obras', `<input id="fq" type="search" placeholder="Buscar cliente, código o línea" value="${esc(fq)}" aria-label="Buscar obra"><div class="seg">${segs.map(([k, l]) => `<button data-a="flt" data-f="${k}" class="${ff === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="wlist">${listHTML()}</div>`, `<button class="btn sm acc" data-a="nw">${ic('plus')} Nueva</button>`)}${win('Carga por encargado', wlHTML, '<span class="chd">etapas abiertas</span>')}</div>`;
  if (!w) return kpis + avisosWin() + `<div class="sg"><div class="side">${side}</div><section class="card"><div class="empty">${ic('folder')}<h3>${WS.length ? 'Elegí una obra' : 'Todavía no hay obras'}</h3><p>${WS.length ? 'Seleccioná una obra de la lista para ver su cronograma.' : 'Creá la primera obra para empezar a informar al cliente.'}</p><button class="btn acc" data-a="nw">${ic('plus')} Nueva obra</button></div></section></div>`;
  [...sel].forEach(id => { if (!w.acts.some(a => a.id === id)) sel.delete(id); });
  const sp = w.spec || {}, ready = w.acts.length && w.acts.every(a => a.st === 'Completado'), td = totalDays(w), sc = schedule(w), et = endTxt(w);
  const canAdv = !w.closed && w.acts.some(a => a.st !== 'Completado');
  const head = win(`Obra ${esc(w.code)}`, `<div class="ohead"><div><h2 class="obra-title">${esc(w.client)}</h2><p class="sub">Línea ${esc(w.line)} · ${w.acts.length} actividades · ${td ? td + ' días hábiles' : 'duración a definir'}</p>
      <div class="meta"><span>${ic('key')} Clave del cliente: ${w.pin ? `<b class="pinbox" id="hpin">${esc(fmtPin(w.pin))}</b> <button type="button" class="minilink" data-a="pincopy" data-src="hpin">Copiar</button>` : `<b>sin clave (obra anterior)</b> <button type="button" class="minilink" data-a="pinregen">Generar</button>`}</span><span>${ic('cal')} Inicio: <b>${sp.start ? esc(fmtD(parseD(sp.start))) : 'sin definir'}</b></span><span>${ic('flag')} Entrega estimada: <b>${et ? esc(et) : 'cargá la fecha de inicio'}</b></span><span class="pill ${cls(general(w))}">${general(w)}</span></div></div>${ring(pct(w), 116)}</div>
    <div class="f"><label for="sl">Línea o servicio</label><select id="sl" data-line ${w.closed ? 'disabled' : ''}>${LINES.map(l => `<option${l === w.line ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="btns"><button class="btn sm acc" data-a="adv"${canAdv ? '' : ' disabled'} title="Completa la etapa en desarrollo y arranca la siguiente">${ic('play')} Avanzar etapa</button>
      <button class="btn sm ghost" data-a="takecur"${w.closed || !curAct(w) || norm(curAct(w).owner) === norm(me.email) ? ' disabled' : ''} title="Pasar a ser el encargado de la etapa actual">${ic('user')} Tomar la etapa actual</button>
      <button class="btn sm ghost" data-a="meta">${ic('edit')} Editar datos</button>
      <button class="btn sm ghost" data-a="print">${ic('print')} Imprimir</button>
      <button class="btn sm ghost" data-a="csv">${ic('download')} Exportar CSV</button>
      ${w.closed ? '<button class="btn sm ghost" data-a="reopen">Reabrir obra</button>' : `<button class="btn sm" data-a="close"${ready ? '' : ' disabled title="Completá todas las actividades"'}>${ic('check')} Marcar como terminada</button>`}
      <button class="btn sm danger" data-a="delw"${w.closed ? '' : ' disabled title="Solo se pueden eliminar obras terminadas"'}>${ic('trash')} Eliminar</button></div>`);
  const tabs = `<div class="tabs" role="tablist">${[['act', 'Cronograma y actividades'], ['info', 'Datos y avisos'], ['svc', 'Servicios'], ['log', 'Historial']].map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-a="tab" data-t="${k}">${l}</button>`).join('')}</div>`;
  const gantt = w.acts.length ? `<div class="gantt">${w.acts.map((a, i) => `<div class="gb ${gcls(a)}${a.days ? '' : ' tbd'}" style="flex:${a.days || 2} 1 0" title="${esc(a.name)} · ${dias(a)} · ${a.st}"><b>${esc(a.name)}</b><small>${dias(a)}${sc && sc[i].s ? ' · ' + rng(sc[i]) : ''}</small></div>`).join('')}</div><div class="legend"><span><i style="background:var(--g6)"></i>Completado</span><span><i style="background:var(--blue)"></i>En desarrollo</span><span><i style="background:var(--amber-d)"></i>Pendiente</span><span>El ancho es proporcional a los días · rayado = a definir</span></div>` : `<div class="empty">${ic('cal')}<p>Agregá actividades para ver el cronograma.</p></div>`;
  const undo = w.undo ? `<button class="btn sm ghost no-print" data-a="undo" title="Deshacer el último cambio del cronograma">${ic('undo')} Deshacer: ${esc(JSON.parse(w.undo).label)}</button>` : '';
  const tool = w.closed ? '' : `<div class="atool"><span class="lbl">Agregar del catálogo</span>${CATALOG.map((c, i) => `<button class="chip" data-a="cat" data-i="${i}">${ic('plus')} ${esc(c.name)}</button>`).join('')}<button class="chip alt" data-a="cust">${ic('plus')} Personalizada</button></div>`;
  const list = w.acts.length ? `<div class="lhead"><label><input type="checkbox" id="sall"${w.closed ? ' disabled' : ''}${sel.size && sel.size === w.acts.length ? ' checked' : ''}> Seleccionar todas</label><span style="margin-left:auto">Arrastrá ⠿ para reordenar · marcá varias para unirlas o editarlas en lote</span></div><div class="alist">${w.acts.map((a, i) => actRow(a, i, w, sc)).join('')}</div>` : `<div class="empty">${ic('folder')}<h3>Sin actividades</h3><p>Agregá actividades del catálogo para armar el cronograma.</p></div>`;
  const pAct = `<div class="stack tabpanel" ${tab === 'act' ? '' : 'hidden'}>
    ${win('Cronograma', gantt, sp.start ? `<span class="chd">Inicio ${esc(fmtD(parseD(sp.start)))}${et ? ' · Entrega ' + esc(et) : ''}</span>` : '<span class="chd">Cargá la fecha de inicio para ver fechas</span>')}
    ${win('Actividades', tool + (w.closed ? '' : `<div id="bulk">${bulkHTML()}</div>`) + list, undo)}</div>`;
  const pInfo = `<div class="stack tabpanel" ${tab === 'info' ? '' : 'hidden'}>
    ${win('Datos de la obra', `<div class="spec"><div><div class="lbl">Cliente</div><b>${esc(w.client)}</b></div><div><div class="lbl">Dirección</div><b>${esc(sp.addr || '—')}</b></div><div><div class="lbl">Medidas / tipo</div><b>${esc(sp.size || '—')}</b></div><div><div class="lbl">Inicio previsto</div><b>${sp.start ? esc(fmtD(parseD(sp.start))) : '—'}</b></div><div><div class="lbl">WhatsApp</div><b>${sp.phone ? esc(sp.phone) + (sp.waOptIn ? '' : ' (sin autorización)') : '—'}</b></div></div>${sp.notes ? `<div class="note"><b>Notas internas</b><br>${esc(sp.notes)}</div>` : ''}`, `<button class="btn sm ghost" data-a="meta">${ic('edit')} Editar</button>`)}
    <div class="two">
      ${win('Avisar al cliente', `<div class="f" style="margin-top:0"><label for="mm">Mensaje</label><input id="mm" placeholder="Ej: Mañana llega el equipo a las 8"></div><div class="tpls">${MSG_TPL.map(t => `<button class="chip pre" data-a="tpl" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div><button class="btn sm" style="margin-top:14px" data-a="msg">${ic('send')} Enviar aviso</button><p class="sub" style="margin-top:10px">Los cambios de actividad, estado y encargado se notifican solos.</p>`)}
      ${win('Avisos enviados', w.notifs.map(n => `<div class="ni">${esc(n.t)}<small>${n.time}</small></div>`).join('') || '<p class="sub">Sin envíos.</p>')}
    </div>${departmentsWin()}</div>`;
  const svcs = (w.services || []).slice().sort((a, b) => a.due.localeCompare(b.due));
  const svcRows = svcs.map(s => { const [c, l] = svcBadge(s); return `<div class="act"><div><h3>${esc(s.name)}</h3><p class="sub">${ic('cal')} ${esc(fmtFull(parseD(s.due)))}${svcWhen(s)}${s.notified && !s.done ? ' · cliente avisado' : ''}</p>${s.note ? `<p class="nt">${esc(s.note)}</p>` : ''}</div>
    <div class="ac"><span class="pill ${c}">${l}</span>${s.done ? '' : waBtn(w, s, 'btn sm ghost')}<button class="btn sm ghost" data-a="sdone" data-id="${s.id}">${ic('check')} ${s.done ? 'Reabrir' : 'Realizado'}</button><button class="ib" data-a="es" data-id="${s.id}" title="Editar" aria-label="Editar ${esc(s.name)}">${ic('edit')}</button><button class="ib danger" data-a="ds" data-id="${s.id}" title="Eliminar" aria-label="Eliminar ${esc(s.name)}">${ic('trash')}</button></div></div>`; }).join('');
  const pSvc = `<div class="stack tabpanel" ${tab === 'svc' ? '' : 'hidden'}>${win('Servicios posteriores', w.closed
    ? (svcRows || '<div class="empty">' + ic('cal') + '<h3>Sin servicios programados</h3><p>Programá, por ejemplo, una limpieza para dentro de 2 años.</p></div>') + `<div class="notice" style="margin-top:14px"><b>Avisos.</b> Al programar el servicio usá el botón “WhatsApp” para avisar al cliente. Una semana antes aparece en “Avisos pendientes” para que le escribas y lo marques como avisado (así también le llega una notificación en su portal).</div>`
    : '<div class="empty">' + ic('flag') + '<h3>La obra todavía no está terminada</h3><p>Cuando la marques como terminada vas a poder programar los servicios posteriores.</p></div>',
    `<button class="btn sm acc" data-a="ns"${w.closed ? '' : ' disabled'}>${ic('plus')} Programar servicio</button>`)}</div>`;
  const pLog = `<div class="stack tabpanel" ${tab === 'log' ? '' : 'hidden'}>${win('Historial de cambios del equipo', (w.log || []).map(l => `<div class="ni"><b>${esc(l.by ? staffName(l.by) : 'Sistema')}</b> · ${esc(l.t)}<small>${l.time}</small></div>`).join('') || '<p class="sub">Todavía no hay cambios registrados.</p>')}</div>`;
  const cb = curAct(w);
  const mbar = `<nav class="mbar no-print" aria-label="Acciones rápidas"><button data-a="adv"${canAdv ? '' : ' disabled'}>${ic('play')}<span>Avanzar</span></button><button data-a="cust"${w.closed ? ' disabled' : ''}>${ic('plus')}<span>Actividad</span></button><button data-a="tab" data-t="info">${ic('send')}<span>Avisar</span></button><button data-a="tab" data-t="act">${ic('cal')}<span>Etapas</span></button></nav>`;
  const obar = `<div class="obra-bar no-print"><div><b>${esc(w.client)}</b><small>${esc(w.code)} · ${esc(w.line)} · ${pct(w)}%${cb ? ' · ' + esc(cb.name) : ''}</small></div><button class="btn sm acc" data-a="side">Cambiar obra</button></div>`;
  return kpis + avisosWin() + mbar + `<div class="sg">${obar}<div class="side">${side}</div><div class="stack"><div class="po">Costa Palmeras · Obra ${esc(w.code)} · ${esc(w.client)}</div>${head}${progressPhotoCard(w, true)}${tabs}${pAct}${pInfo}${pSvc}${pLog}</div></div>`;
}

/* ================= Eventos ================= */
const curW = () => findW(wid);
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('dialog').close());
const opts = a => a.map(x => `<option value="${esc(x[0])}">${esc(x[1])}</option>`).join('');
$('wl').innerHTML = LINES.map(l => `<option>${l}</option>`).join('');
$('warea').innerHTML = $('aa').innerHTML = opts(DEPARTMENTS.map(d => [d.id, d.name]));
$('warea').value = $('aa').value = 'obra';
$('as').innerHTML = STATES.map(s => `<option>${s}</option>`).join('');
$('acts').innerHTML = CATALOG.map(c => `<option>${esc(c.name)}</option>`).join('');
$('wacts').innerHTML = CATALOG.map((c, i) => `<div class="ap"><label class="ck"><input type="checkbox" name="ca${i}" checked>${esc(c.name)}</label><input type="number" name="cd${i}" min="1" max="365" value="${c.days}" aria-label="Días de ${esc(c.name)}"><small>días</small></div>`).join('');
$('wpre').innerHTML = PRESETS.map((p, i) => `<button type="button" class="chip pre" data-a="preset" data-i="${i}">${esc(p.n)}</button>`).join('');

/* Servicios posteriores: formulario y cálculo de fecha */
$('svtypes').innerHTML = SERVICE_TYPES.map(s => `<option>${esc(s)}</option>`).join('');
const svcBase = () => { const w = curW(); return parseD(w.closedAt) || todayD(); };
const svcRecalc = () => { const q = +$('svq').value; if (q > 0) $('svd').value = toISO(addMonths(svcBase(), q * ($('svu').value === 'y' ? 12 : 1))); };
$('svq').oninput = $('svu').onchange = svcRecalc;
function openSvc(s) {
  $('dsvt').textContent = s ? 'Editar servicio' : 'Programar servicio'; $('sverr').textContent = '';
  $('svid').value = s ? s.id : ''; $('svn').value = s ? s.name : ''; $('svo').value = s ? (s.note || '') : '';
  if (s) $('svd').value = s.due; else { $('svq').value = 2; $('svu').value = 'y'; svcRecalc(); }
  const sp = curW().spec || {}, ok = normPhone(sp.phone) && sp.waOptIn;
  $('svwa').innerHTML = ok
    ? `<b>Aviso por WhatsApp.</b> Al guardar vas a ver el botón “Avisar por WhatsApp”, que abre el chat con el cliente (${esc(sp.phone)}) con el mensaje ya escrito.`
    : `<b>No se podrá avisar por WhatsApp:</b> ${!normPhone(sp.phone) ? 'falta un número de WhatsApp válido' : 'el cliente no figura como autorizado'}. Cargalo en “Editar datos” de la obra.`;
  $('dsv').showModal();
}
$('fv').onsubmit = async e => {
  e.preventDefault();
  try {
    const sid = await api.saveService(wid, { id: $('svid').value, name: $('svn').value.trim(), due: $('svd').value, note: $('svo').value.trim() });
    $('dsv').close(); await render();
    const w = curW(), s = sid && (w.services || []).find(x => x.id === sid), sp = w.spec || {};
    if (!s) toast('Servicio guardado');
    else if (!normPhone(sp.phone)) toast('Servicio guardado. No se puede avisar por WhatsApp: falta el número del cliente (Editar datos).');
    else if (!sp.waOptIn) toast('Servicio guardado. El cliente no figura como autorizado a recibir WhatsApp (Editar datos).');
    else toast('Servicio guardado', { label: 'Avisar por WhatsApp', fn: () => window.open(waLink(w, s), '_blank', 'noopener') });
  }
  catch (x) { $('sverr').textContent = msg(x); }
};

function openAct(a) {
  $('dat').textContent = a ? 'Editar actividad' : 'Nueva actividad';
  $('ao').innerHTML = ownerOpts(a ? a.owner : me.email);
  $('aid').value = a ? a.id : ''; $('aa').value = a ? (a.area || 'obra') : 'obra'; $('an').value = a ? a.name : '';
  $('ad').value = a && a.days ? a.days : ''; $('as').value = a ? a.st : 'Pendiente'; $('ano').value = a ? (a.note || '') : '';
  $('da').showModal();
}
function openMeta() { const w = curW(), s = w.spec || {}; $('merr').textContent = ''; $('mc').value = w.client; $('mk').value = w.code; $('mpin').textContent = w.pin ? fmtPin(w.pin) : 'sin clave (obra anterior)'; $('sad').value = s.addr || ''; $('ssz').value = s.size || ''; $('sst').value = s.start || ''; $('snt').value = s.notes || ''; $('mph').value = s.phone || ''; $('mwa').checked = !!s.waOptIn; $('dm').showModal(); }
function openSplit(a) { $('spid').value = a.id; $('spn').value = 2; $('sperr').textContent = ''; $('spinfo').textContent = `${a.name} · ${dias(a)}`; $('dsp').showModal(); }
async function doUndo() { try { const l = await api.undo(wid); await render(); toast(`Se deshizo: ${l}`); } catch (x) { toast(msg(x)); } }
const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
function exportCSV() {
  const w = curW(), sc = schedule(w), rows = [['Etapa', 'Actividad', 'Área', 'Encargado', 'Días hábiles', 'Estado', 'Inicio', 'Fin', 'Observación']];
  w.acts.forEach((a, i) => rows.push([i + 1, a.name, areaName(a), ownerName(a.owner), a.days || 'a definir', a.st, sc && sc[i].s ? fmtD(sc[i].s) : '', sc && sc[i].e ? fmtD(sc[i].e) : '', a.note || '']));
  const csv = '﻿' + rows.map(r => r.map(c => { c = String(c); if (/^[=+\-@]/.test(c)) c = "'" + c; return '"' + c.replace(/"/g, '""') + '"'; }).join(';')).join('\r\n');
  download(`obra-${w.code}.csv`, csv, 'text/csv;charset=utf-8'); toast('Cronograma exportado');
}
const syncBulk = () => {
  const b = $('bulk'); if (b) b.innerHTML = bulkHTML();
  const all = $('sall'); if (all) { const n = curW().acts.length; all.checked = n > 0 && sel.size === n; }
};

let clientStageOpenSequence = 0;
const clientStageOpenOrder = new WeakMap();
document.addEventListener('toggle', e => {
  const stage = e.target;
  if (!(stage instanceof HTMLDetailsElement) || !stage.matches('.client-step') || !stage.open) return;
  clientStageOpenOrder.set(stage, ++clientStageOpenSequence);
  const openStages = [...stage.closest('.client-timeline').querySelectorAll('.client-step[open]')]
    .sort((a, b) => clientStageOpenOrder.get(a) - clientStageOpenOrder.get(b));
  while (openStages.length > 3) openStages.shift().open = false;
}, true);

document.addEventListener('click', async e => {
  if (!e.target.closest('.np,.bell')) $('np')?.classList.remove('on');
  const photoViewer = $('photoViewer');
  if (photoViewer && e.target === photoViewer) { photoViewer.close(); return; }
  const b = e.target.closest('[data-a]'); if (!b) return;
  try {
    const a = b.dataset.a;
    if (a === 'view-photo') {
      const source = b.querySelector('img'), target = photoViewer && photoViewer.querySelector('img');
      if (source && target && photoViewer) { target.src = source.currentSrc || source.src; photoViewer.showModal(); }
    }
    else if (a === 'close-photo') photoViewer?.close();
    else if (a === 'photo-upload') document.querySelector('[data-work-photo]')?.click();
    else if (a === 'nw') { $('werr').textContent = ''; $('wo').innerHTML = ownerOpts(me.email); $('dw').showModal(); }
    else if (a === 'pickall' || a === 'picknone') document.querySelectorAll('#wacts input[type=checkbox]').forEach(c => c.checked = a === 'pickall');
    else if (a === 'preset') { const p = PRESETS[+b.dataset.i]; CATALOG.forEach((_, i) => document.querySelector(`#wacts [name=ca${i}]`).checked = p.a.includes(i)); }
    else if (a === 'na' || a === 'cust') openAct(null);
    else if (a === 'cat') {
      const c = CATALOG[+b.dataset.i];
      await api.saveAct(wid, { id: '', name: c.name, area: 'obra', owner: me.email, days: c.days, st: 'Pendiente' }); await render(); undoToast(`Se agregó "${c.name}"`);
    }
    else if (a === 'up' || a === 'dn') { const w = curW(), i = w.acts.findIndex(x => x.id === b.dataset.id); await api.moveTo(wid, b.dataset.id, i + (a === 'up' ? -1 : 1)); await render(); }
    else if (a === 'split') openSplit(curW().acts.find(x => x.id === b.dataset.id));
    else if (a === 'merge') { await api.mergeActs(wid, [...sel]); sel.clear(); await render(); undoToast('Etapas unidas en una sola'); }
    else if (a === 'bown') { const n = await api.bulk(wid, [...sel], { owner: $('bo').value }); sel.clear(); await render(); undoToast(`Encargado asignado en ${n} etapas`); }
    else if (a === 'bst') { const n = await api.bulk(wid, [...sel], { st: $('bs').value }); sel.clear(); await render(); undoToast(`Estado actualizado en ${n} etapas`); }
    else if (a === 'bclr') { sel.clear(); await render(); }
    else if (a === 'take') { await api.takeOver(wid, [b.dataset.id]); await render(); undoToast('Ahora sos el encargado de esa etapa'); }
    else if (a === 'btake') { const n = await api.takeOver(wid, [...sel]); sel.clear(); await render(); undoToast(`Tomaste a cargo ${n} etapa${n > 1 ? 's' : ''}`); }
    else if (a === 'takecur') { await api.takeOver(wid, [curAct(curW()).id]); await render(); undoToast('Ahora sos el encargado de la etapa actual'); }
    else if (a === 'adv') {
      const r = await api.advance(wid); await render();
      undoToast(r.next ? `${r.done ? 'Completada: ' + r.done + ' · ' : ''}Comenzó ${r.next}` : 'Todas las etapas completadas: podés terminar la obra');
    }
    else if (a === 'undo') await doUndo();
    else if (a === 'ea') openAct(curW().acts.find(x => x.id === b.dataset.id));
    else if (a === 'meta') openMeta();
    else if (a === 'pincopy') { const w = curW(); if (!w.pin) return; toast(await copyText(`Portal Costa Palmeras — Código de obra: ${w.code} · Clave: ${fmtPin(w.pin)}`) ? 'Copiado: código y clave para el cliente' : 'No se pudo copiar. Seleccionala y copiala a mano.'); }
    else if (a === 'pinregen') {
      const w = curW();
      if (!await ask('Generar clave nueva', w.pin ? 'La clave actual deja de funcionar y los clientes que ya entraron con ella tendrán que vincular su obra de nuevo con la clave nueva.' : 'Se crea una clave para esta obra anterior. Los clientes que ya estaban vinculados tendrán que ingresar de nuevo con el código y la clave nueva.', 'Generar', true)) return;
      const pin = await api.setMeta(wid, { client: w.client, code: w.code, addr: (w.spec || {}).addr, size: (w.spec || {}).size, start: (w.spec || {}).start, notes: (w.spec || {}).notes, phone: (w.spec || {}).phone, wa: (w.spec || {}).waOptIn, regen: true });
      if ($('dm').open) $('dm').close(); await render(); showPin(curW());
    }
    else if (a === 'tab') { tab = b.dataset.t; await render(); }
    else if (a === 'pick') { wid = b.dataset.id; sel.clear(); document.body.classList.remove('sideopen'); await render(); scrollTo(0, 0); }
    else if (a === 'side') { document.body.classList.toggle('sideopen'); }
    else if (a === 'flt') { ff = b.dataset.f; await render(); }
    else if (a === 'da') {
      const x = curW().acts.find(v => v.id === b.dataset.id);
      if (await ask('Eliminar actividad', `Se eliminará "${x.name}" del cronograma. Podés deshacerlo enseguida.`, 'Eliminar', true)) { await api.deleteAct(wid, b.dataset.id); await render(); undoToast('Actividad eliminada'); }
    }
    else if (a === 'close') { await api.setClosed(wid, true); tab = 'svc'; await render(); toast('Obra terminada. Ahora podés programar los servicios posteriores.'); }
    else if (a === 'reopen') { await api.setClosed(wid, false); await render(); toast('Obra reabierta'); }
    else if (a === 'delw') {
      const w = curW();
      if (await ask('Eliminar obra', `Se eliminará definitivamente la obra de ${w.client} (${w.code}). Esta acción no se puede deshacer.`, 'Eliminar obra', true)) { await api.deleteWork(wid); wid = null; await render(); toast('Obra eliminada'); }
    }
    else if (a === 'bell') {
      const np = $('np'), on = np.classList.toggle('on'), w = myW();
      if (on && w && w.notifs.some(n => n.u)) { await api.markRead(w.id); b.querySelector('.dot')?.remove(); }
    }
    else if (a === 'link') { await api.linkWork(me.email, $('lc').value, $('lk').value); await boot(); toast('Obra vinculada'); }
    else if (a === 'tpl') { $('mm').value = b.dataset.t; $('mm').focus(); }
    else if (a === 'msg') {
      const t = $('mm').value.trim(); if (!t) return toast('Escribí el mensaje del aviso');
      await api.notify(wid, t); await render(); toast('Aviso enviado al cliente');
    }
    else if (a === 'ns') openSvc(null);
    else if (a === 'snot') { await api.markNotified(b.dataset.w, b.dataset.id); await render(); toast('Marcado como avisado · el cliente ve la notificación en su portal'); }
    else if (a === 'imp') {
      const l = localPending(); if (!l.length) return;
      if (await ask('Importar obras', `Se van a copiar ${l.length} obra${l.length > 1 ? 's' : ''} guardada${l.length > 1 ? 's' : ''} en este navegador a la base de datos online. Las cuentas de clientes no se copian: cada cliente crea su cuenta de nuevo con su código.`, 'Importar')) {
        l.forEach((w, i) => { w.createdAt = w.createdAt || Date.now() + i; w.notifs = w.notifs || []; w.log = w.log || []; w.undo = w.undo ?? null; w.spec = w.spec || {}; w.acts = w.acts || []; mem.works.push(w); });
        await C(); wid = l[0].id; await render(); toast('Obras importadas');
      }
    }
    else if (a === 'es') openSvc(curW().services.find(x => x.id === b.dataset.id));
    else if (a === 'svpre') { $('svq').value = b.dataset.q; $('svu').value = b.dataset.u; svcRecalc(); }
    else if (a === 'sdone') { const s = curW().services.find(x => x.id === b.dataset.id); await api.saveService(wid, { ...s, done: !s.done }); await render(); toast(s.done ? 'Servicio reabierto' : 'Servicio marcado como realizado'); }
    else if (a === 'ds') {
      const s = curW().services.find(x => x.id === b.dataset.id);
      if (await ask('Eliminar servicio', `Se eliminará "${s.name}" de los servicios programados.`, 'Eliminar', true)) { await api.deleteService(wid, b.dataset.id); await render(); toast('Servicio eliminado'); }
    }
    else if (a === 'csv') exportCSV();
    else if (a === 'print') { if (me.role === 'equipo' && tab !== 'act') { tab = 'act'; await render(); } window.print(); }
  } catch (x) { const el = $('lerr2'); if (el) el.textContent = msg(x); else toast(msg(x)); }
});

document.addEventListener('input', e => { if (e.target.id === 'fq') { fq = e.target.value; $('wlist').innerHTML = listHTML(); } });

document.addEventListener('change', async e => {
  const t = e.target;
  try {
    if (t.matches('[data-work-photo]')) {
      const file = t.files && t.files[0];
      if (!file) return;
      t.disabled = true;
      const imageUrl = await optimizeProgressPhoto(file);
      await api.setProgressPhoto(wid, imageUrl);
      await render();
      toast('Foto de avance actualizada y visible para el cliente.');
    }
    else if (t.matches('[data-show]')) t.dataset.show.split(',').forEach(id => $(id).type = t.checked ? 'text' : 'password');
    else if (t.id === 'sall') {
      curW().acts.forEach(a => t.checked ? sel.add(a.id) : sel.delete(a.id));
      document.querySelectorAll('.arow').forEach(r => { r.classList.toggle('picked', sel.has(r.dataset.id)); r.querySelector('[data-sel]').checked = sel.has(r.dataset.id); });
      syncBulk();
    }
    else if (t.matches('[data-sel]')) {
      t.checked ? sel.add(t.dataset.id) : sel.delete(t.dataset.id);
      t.closest('.arow').classList.toggle('picked', t.checked); syncBulk();
    } else if (t.matches('[data-st]')) {
      const a = curW().acts.find(x => x.id === t.dataset.id);
      await api.saveAct(wid, { ...a, st: t.value }); await render(); undoToast('Estado actualizado y cliente notificado');
    } else if (t.matches('[data-line]')) { await api.setLine(wid, t.value); await render(); toast('Línea actualizada'); }
  } catch (x) { toast(msg(x)); }
  finally { if (t.matches('[data-work-photo]')) { t.value = ''; t.disabled = false; } }
});

/* Reordenar arrastrando (la manija ⠿ activa el arrastre; en pantallas táctiles quedan las flechas) */
let drag = null;
document.addEventListener('pointerdown', e => { const g = e.target.closest('.grip'); if (g && !g.disabled) g.closest('.arow').draggable = true; });
document.addEventListener('dragstart', e => { const r = e.target.closest?.('.arow'); if (!r || !r.draggable) return; drag = r.dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', drag); r.classList.add('dragging'); });
document.addEventListener('dragend', () => { drag = null; document.querySelectorAll('.arow').forEach(r => { r.draggable = false; r.classList.remove('dragging', 'over'); }); });
document.addEventListener('dragover', e => { if (!drag) return; const r = e.target.closest('.arow'); if (!r) return; e.preventDefault(); document.querySelectorAll('.over').forEach(x => x.classList.remove('over')); r.classList.add('over'); });
document.addEventListener('drop', async e => {
  if (!drag) return; const r = e.target.closest('.arow'); if (!r) return; e.preventDefault();
  const id = drag, to = [...document.querySelectorAll('.alist .arow')].indexOf(r); drag = null;
  try { await api.moveTo(wid, id, to); await render(); undoToast('Etapa reordenada'); } catch (x) { toast(msg(x)); }
});

$('fw').onsubmit = async e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const acts = CATALOG.map((c, i) => ({ c, i })).filter(({ i }) => f['ca' + i]).map(({ c, i }) => ({ name: c.name, days: +f['cd' + i] > 0 ? +f['cd' + i] : null }));
  try {
    const w = await api.createWork({ client: f.client.trim(), code: f.code.trim(), line: f.line, area: f.area, addr: f.addr.trim(), size: f.size.trim(), owner: f.owner, start: f.start, phone: (f.phone || '').trim(), wa: !!f.wa, acts });
    wid = w.id; sel.clear(); ff = 'activas'; tab = 'act'; e.target.reset(); $('warea').value = 'obra'; $('dw').close(); await render(); toast('Obra creada'); showPin(w);
  } catch (x) { $('werr').textContent = msg(x); }
};

/* Aviso con la clave para pasársela al cliente (se muestra al crear la obra o al regenerarla). */
function showPin(w) {
  $('dpt').textContent = `Obra ${w.code} · ${w.client}`; $('dpc').textContent = w.code; $('dpk').textContent = fmtPin(w.pin); $('dp').showModal();
}
$('dpcopy').onclick = async () => toast(await copyText(`Portal Costa Palmeras — Código de obra: ${$('dpc').textContent} · Clave: ${$('dpk').textContent}`) ? 'Copiado: código y clave para el cliente' : 'No se pudo copiar. Seleccionala y copiala a mano.');

$('fs').onsubmit = async e => {
  e.preventDefault();
  try {
    await api.setMeta(wid, { client: $('mc').value.trim(), code: $('mk').value.trim(), addr: $('sad').value.trim(), size: $('ssz').value.trim(), start: $('sst').value, notes: $('snt').value.trim(), phone: $('mph').value.trim(), wa: $('mwa').checked });
    $('dm').close(); await render(); toast('Datos guardados');
  } catch (x) { $('merr').textContent = msg(x); }
};

$('fa').onsubmit = async e => {
  e.preventDefault();
  try {
    await api.saveAct(wid, { id: $('aid').value, area: $('aa').value, name: $('an').value.trim(), owner: $('ao').value, days: +$('ad').value > 0 ? +$('ad').value : null, st: $('as').value, note: $('ano').value.trim() });
    $('da').close(); await render(); undoToast('Actividad guardada y cliente notificado');
  } catch (x) { toast(msg(x)); }
};

$('fsp').onsubmit = async e => {
  e.preventDefault();
  try { await api.splitAct(wid, $('spid').value, +$('spn').value); sel.clear(); $('dsp').close(); await render(); undoToast('Actividad dividida en partes'); }
  catch (x) { $('sperr').textContent = msg(x); }
};

/* ================= Autenticación ================= */
$('fl').onsubmit = async e => {
  e.preventDefault(); const f = new FormData(e.target);
  try { await api.login(f.get('email'), f.get('pw')); e.target.reset(); $('lerr').textContent = ''; location.hash = '#/mi-obra'; await boot(); }
  catch (x) { $('lerr').textContent = msg(x); }
};
$('fr').onsubmit = async e => {
  e.preventDefault(); const f = new FormData(e.target), er = t => $('rerr').textContent = t;
  if (f.get('pw') !== f.get('pw2')) return er('Las contraseñas no coinciden.');
  try { await api.register({ name: f.get('name').trim(), email: f.get('email'), pw: f.get('pw'), code: f.get('code'), pin: f.get('pin') }); e.target.reset(); er(''); location.hash = '#/mi-obra'; await boot(); }
  catch (x) { er(msg(x)); }
};
$('out').onclick = async e => { e.preventDefault(); try { await api.logout(); } catch (x) {} location.hash = '#/login'; await boot(); toast('Sesión cerrada'); };
window.addEventListener('hashchange', boot);
const idle = () => me && !$('v-app').hidden && !document.querySelector('dialog[open]') && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);

$('forgot').onclick = async e => {
  e.preventDefault(); const er = $('lerr'), m = $('le').value.trim();
  if (!m) return er.textContent = 'Escribí tu email arriba y volvé a tocar el enlace.';
  try { await api.reset(m); er.textContent = ''; toast('Si el email existe, te enviamos un enlace para restablecer la contraseña.'); } catch (x) { er.textContent = msg(x); }
};

// Google (equipo). Se exige correo verificado; el rol sale de la lista TEAM.
$('g').onclick = async () => {
  const er = $('gerr'); er.textContent = '';
  if (!CONFIGURED) return er.textContent = 'Falta cargar la configuración de Firebase en el código.';
  try { await api.google(); location.hash = '#/mi-obra'; }
  catch (x) { er.textContent = typeof x === 'string' ? x : 'No se pudo iniciar sesión con Google.'; }
};

// Firebase mantiene la sesión: este aviso llega al abrir la página y cada vez que alguien entra o sale.
if (CONFIGURED) onAuthStateChanged(auth, u => { authUser = u; if (!regBusy) boot(); });
else boot();
