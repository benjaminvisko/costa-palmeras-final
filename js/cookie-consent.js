/*!
 * Costa Palmeras - Gestión de consentimiento de cookies (RGPD / ePrivacy)
 *
 * Uso:
 *  1) Incluir en cada página:  <script src="./js/cookie-consent.js" defer></script>
 *  2) Bloquear un script hasta el consentimiento (ejemplos al final de este archivo):
 *       <script type="text/plain" data-cookie-category="analytics" data-src="https://..."></script>
 *       <script type="text/plain" data-cookie-category="marketing">/* código inline *\/</script>
 *  3) Enlace permanente (opcional, además del botón flotante):
 *       <a href="#" data-cookie-settings>Preferencias de cookies</a>
 *
 * API: window.CPConsent.open() | .get() | .has('analytics') | evento 'cpconsent' en document.
 */
(function () {
  'use strict';

  var CONFIG = {
    storageKey: 'cp_cookie_consent',
    version: 1,                  // subirlo vuelve a pedir consentimiento a todos
    months: 6,                   // duración del consentimiento
    policyUrl: 'privacidad.html#cookies'
  };

  var CATEGORIES = [
    { id: 'necessary', locked: true, title: 'Necesarias', desc: 'Imprescindibles para que el sitio funcione: recordar tu pedido de accesorios, tu sesión del portal de clientes y esta misma elección. No pueden desactivarse.' },
    { id: 'analytics', title: 'Analíticas', desc: 'Nos ayudan a entender cómo se usa el sitio (páginas visitadas, tiempo de permanencia) para mejorarlo. Los datos se usan de forma agregada.' },
    { id: 'preferences', title: 'Preferencias', desc: 'Recuerdan ajustes opcionales como el idioma o la personalización de la interfaz entre visitas.' },
    { id: 'marketing', title: 'Marketing', desc: 'Permiten medir campañas y mostrarte publicidad relevante en otros sitios, por ejemplo con el píxel de Facebook.' }
  ];

  var state = null;
  var lastFocus = null;
  var els = {};

  /* ---------- Almacenamiento ---------- */
  function read() {
    try {
      var raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.v !== CONFIG.version || !data.exp || data.exp < Date.now()) return null;
      return data;
    } catch (e) { return null; }
  }

  function write(choices) {
    var exp = new Date();
    exp.setMonth(exp.getMonth() + CONFIG.months);
    var data = {
      v: CONFIG.version,
      ts: Date.now(),
      exp: exp.getTime(),
      c: { necessary: true, analytics: !!choices.analytics, preferences: !!choices.preferences, marketing: !!choices.marketing }
    };
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(data)); } catch (e) { /* sin almacenamiento: se vuelve a preguntar */ }
    return data;
  }

  /* ---------- Bloqueo / activación de scripts ---------- */
  var activated = {};

  function activateScripts() {
    var allowed = state ? state.c : { necessary: true };
    document.querySelectorAll('script[type="text/plain"][data-cookie-category]').forEach(function (old) {
      var cat = old.getAttribute('data-cookie-category');
      if (!allowed[cat] || old.getAttribute('data-cc-done')) return;
      var s = document.createElement('script');
      Array.prototype.forEach.call(old.attributes, function (a) {
        if (a.name === 'type' || a.name === 'data-src' || a.name === 'data-cookie-category') return;
        s.setAttribute(a.name, a.value);
      });
      if (old.getAttribute('data-src')) s.src = old.getAttribute('data-src');
      else s.text = old.text;
      old.setAttribute('data-cc-done', '1');
      old.parentNode.insertBefore(s, old.nextSibling);
      activated[cat] = true;
    });
  }

  function applyConsent(previous) {
    // Si se retira un consentimiento ya usado, se recarga para descartar scripts ya ejecutados
    var revoked = previous && ['analytics', 'preferences', 'marketing'].some(function (k) { return previous.c[k] && !state.c[k] && activated[k]; });
    activateScripts();
    document.dispatchEvent(new CustomEvent('cpconsent', { detail: state.c }));
    if (revoked) location.reload();
  }

  /* ---------- Interfaz ---------- */
  var CSS = '' +
    '.cc-root{--cc-green:#062B1B;--cc-green2:#145A38;--cc-gold:#FFB81C;--cc-gold2:#FFD27A;--cc-ink:#062B1B;font-family:"Plus Jakarta Sans",system-ui,sans-serif;line-height:1.5}' +
    '.cc-root *{box-sizing:border-box}.cc-root [hidden]{display:none!important}' +
    '.cc-banner{position:fixed;z-index:2147483000;left:16px;right:16px;bottom:16px;max-width:980px;margin:0 auto;background:#fff;color:var(--cc-ink);border:1px solid rgba(6,43,27,.12);border-top:4px solid var(--cc-gold);border-radius:18px;box-shadow:0 24px 60px -18px rgba(6,43,27,.5);padding:20px 22px;display:grid;gap:16px;animation:ccUp .45s cubic-bezier(.22,1,.36,1) both}' +
    '@media(min-width:820px){.cc-banner{grid-template-columns:1fr auto;align-items:center;gap:28px}}' +
    '.cc-title{margin:0 0 4px;font-size:1.05rem;font-weight:700}' +
    '.cc-text{margin:0;font-size:.88rem;color:rgba(6,43,27,.8)}' +
    '.cc-text a{color:#00763F;font-weight:600;text-decoration:underline;text-underline-offset:2px}' +
    '.cc-actions{display:flex;flex-wrap:wrap;gap:10px}' +
    '.cc-btn{appearance:none;cursor:pointer;font:inherit;font-weight:600;font-size:.88rem;padding:.7rem 1.2rem;border-radius:999px;border:2px solid var(--cc-green);background:var(--cc-green);color:#fff;transition:transform .2s,box-shadow .2s,background .2s;white-space:nowrap}' +
    '.cc-btn:hover{transform:translateY(-1px);box-shadow:0 8px 18px -8px rgba(6,43,27,.5)}' +
    '.cc-btn:focus-visible,.cc-link:focus-visible,.cc-close:focus-visible,.cc-switch input:focus-visible+.cc-track,.cc-fab:focus-visible{outline:3px solid var(--cc-gold);outline-offset:3px}' +
    '.cc-btn--ghost{background:transparent;color:var(--cc-green)}' +
    '.cc-btn--ghost:hover{background:rgba(6,43,27,.06)}' +
    '.cc-link{appearance:none;background:none;border:0;cursor:pointer;font:inherit;font-size:.85rem;font-weight:600;color:#00763F;text-decoration:underline;text-underline-offset:3px;padding:.5rem .4rem}' +
    '.cc-overlay{position:fixed;inset:0;z-index:2147483001;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(3,20,12,.65);backdrop-filter:blur(4px)}' +
    '.cc-overlay.is-open{display:flex}' +
    '.cc-modal{width:100%;max-width:640px;max-height:min(90vh,720px);display:flex;flex-direction:column;background:#FAF6F0;color:var(--cc-ink);border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.4);overflow:hidden;animation:ccUp .35s cubic-bezier(.22,1,.36,1) both}' +
    '.cc-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 22px 12px;background:linear-gradient(135deg,var(--cc-green),var(--cc-green2));color:#fff}' +
    '.cc-head h2{margin:0;font-size:1.25rem}' +
    '.cc-head p{margin:4px 0 0;font-size:.85rem;color:rgba(255,255,255,.85)}' +
    '.cc-close{appearance:none;cursor:pointer;flex:none;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.4);background:transparent;color:#fff;font-size:1.2rem;line-height:1}' +
    '.cc-body{padding:14px 22px;overflow:auto;display:grid;gap:10px}' +
    '.cc-cat{display:grid;grid-template-columns:1fr auto;gap:6px 16px;align-items:center;background:#fff;border:1px solid rgba(6,43,27,.1);border-radius:14px;padding:14px 16px}' +
    '.cc-cat h3{margin:0;font-size:.98rem}' +
    '.cc-cat p{grid-column:1/-1;margin:0;font-size:.83rem;color:rgba(6,43,27,.75)}' +
    '.cc-lock{font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#00763F;background:rgba(0,118,63,.1);padding:.25rem .6rem;border-radius:999px}' +
    '.cc-switch{position:relative;display:inline-block;width:48px;height:28px}' +
    '.cc-switch input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;z-index:1}' +
    '.cc-track{position:absolute;inset:0;border-radius:999px;background:#b9c2bc;transition:background .25s}' +
    '.cc-track::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .25s}' +
    '.cc-switch input:checked+.cc-track{background:#00763F}' +
    '.cc-switch input:checked+.cc-track::after{transform:translateX(20px)}' +
    '.cc-foot{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;padding:14px 22px 18px;border-top:1px solid rgba(6,43,27,.1);background:#FAF6F0}' +
    '.cc-fab{position:fixed;z-index:2147482990;left:14px;bottom:14px;width:46px;height:46px;display:grid;place-items:center;border-radius:50%;border:2px solid var(--cc-gold);background:var(--cc-green);color:var(--cc-gold2);cursor:pointer;box-shadow:0 10px 24px -8px rgba(6,43,27,.6);transition:transform .25s}' +
    '.cc-fab:hover{transform:scale(1.08) rotate(-8deg)}' +
    '.cc-fab svg{width:22px;height:22px}' +
    '.cc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    '@keyframes ccUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}' +
    '@media(max-width:520px){.cc-banner{left:10px;right:10px;bottom:10px;padding:16px}.cc-actions .cc-btn{flex:1 1 100%;text-align:center}.cc-foot .cc-btn{flex:1 1 100%}}' +
    '@media(prefers-reduced-motion:reduce){.cc-root *{animation:none!important;transition:none!important}}' +
    'html.cp-dark .cc-banner{background:#0E2A1D;color:#F5F3EB;border-color:rgba(255,255,255,.12);border-top-color:var(--cc-gold)}' +
    'html.cp-dark .cc-text{color:#D3D8D1}html.cp-dark .cc-text a,html.cp-dark .cc-link{color:#FFD27A}' +
    'html.cp-dark .cc-btn--ghost{color:#F5F3EB;border-color:rgba(255,255,255,.5)}' +
    'html.cp-dark .cc-modal,html.cp-dark .cc-foot{background:#0A2318;color:#F5F3EB}' +
    'html.cp-dark .cc-cat{background:#0F2D20;border-color:rgba(255,255,255,.12)}html.cp-dark .cc-cat p{color:#D3D8D1}';

  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01M16 15.5v.01M12 12v.01M11 17v.01M7 14v.01"/></svg>';

  function build() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var root = document.createElement('div');
    root.className = 'cc-root';
    root.innerHTML =
      '<div class="cc-banner" role="dialog" aria-labelledby="cc-t" aria-describedby="cc-d" hidden>' +
        '<div><h2 class="cc-title" id="cc-t">Tu privacidad, tu decisión</h2>' +
        '<p class="cc-text" id="cc-d">Usamos cookies necesarias para que el sitio funcione y, solo si lo aceptás, cookies analíticas, de preferencias y de marketing. Podés aceptarlas, rechazarlas o elegir por categoría. Más información en la <a href="' + CONFIG.policyUrl + '">Política de cookies</a>.</p></div>' +
        '<div class="cc-actions">' +
          '<button type="button" class="cc-btn cc-btn--ghost" data-cc="reject">Rechazar todas</button>' +
          '<button type="button" class="cc-btn" data-cc="accept">Aceptar todas</button>' +
          '<button type="button" class="cc-link" data-cc="config">Configurar</button>' +
        '</div>' +
      '</div>' +
      '<div class="cc-overlay" hidden>' +
        '<div class="cc-modal" role="dialog" aria-modal="true" aria-labelledby="cc-mt">' +
          '<div class="cc-head"><div><h2 id="cc-mt">Preferencias de cookies</h2><p>Elegí qué categorías querés permitir. Podés cambiarlo cuando quieras.</p></div>' +
          '<button type="button" class="cc-close" data-cc="close" aria-label="Cerrar preferencias">&times;</button></div>' +
          '<div class="cc-body">' + CATEGORIES.map(catHtml).join('') + '</div>' +
          '<div class="cc-foot">' +
            '<button type="button" class="cc-btn cc-btn--ghost" data-cc="reject">Rechazar todas</button>' +
            '<button type="button" class="cc-btn cc-btn--ghost" data-cc="accept">Aceptar todas</button>' +
            '<button type="button" class="cc-btn" data-cc="save">Guardar preferencias</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="cc-fab" data-cc="config" aria-label="Preferencias de cookies" title="Preferencias de cookies" hidden>' + ICON + '</button>' +
      '<div class="cc-sr" role="status" aria-live="polite"></div>';
    document.body.appendChild(root);

    els.root = root;
    els.banner = root.querySelector('.cc-banner');
    els.overlay = root.querySelector('.cc-overlay');
    els.modal = root.querySelector('.cc-modal');
    els.fab = root.querySelector('.cc-fab');
    els.live = root.querySelector('.cc-sr');
    els.toggles = {};
    root.querySelectorAll('input[data-cat]').forEach(function (i) { els.toggles[i.getAttribute('data-cat')] = i; });

    root.addEventListener('click', onClick);
    els.overlay.addEventListener('keydown', onModalKey);
    els.overlay.addEventListener('mousedown', function (e) { if (e.target === els.overlay) closeModal(); });
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-cookie-settings]');
      if (t) { e.preventDefault(); openModal(); }
    });
  }

  function catHtml(c) {
    var control = c.locked
      ? '<span class="cc-lock">Siempre activas</span>'
      : '<label class="cc-switch"><span class="cc-sr">Permitir cookies ' + c.title.toLowerCase() + '</span><input type="checkbox" role="switch" data-cat="' + c.id + '"><span class="cc-track" aria-hidden="true"></span></label>';
    return '<div class="cc-cat"><h3>' + c.title + '</h3>' + control + '<p>' + c.desc + '</p></div>';
  }

  /* ---------- Acciones ---------- */
  function commit(choices) {
    var previous = state;
    state = write(choices);
    els.banner.hidden = true;
    els.fab.hidden = false;
    closeModal(true);
    els.live.textContent = 'Preferencias de cookies guardadas.';
    applyConsent(previous);
  }

  function onClick(e) {
    var b = e.target.closest('[data-cc]');
    if (!b) return;
    var a = b.getAttribute('data-cc');
    if (a === 'accept') commit({ analytics: true, preferences: true, marketing: true });
    else if (a === 'reject') commit({ analytics: false, preferences: false, marketing: false });
    else if (a === 'save') commit({ analytics: els.toggles.analytics.checked, preferences: els.toggles.preferences.checked, marketing: els.toggles.marketing.checked });
    else if (a === 'config') openModal();
    else if (a === 'close') closeModal();
  }

  function openModal() {
    lastFocus = document.activeElement;
    var c = state ? state.c : {};
    Object.keys(els.toggles).forEach(function (k) { els.toggles[k].checked = !!c[k]; });
    els.overlay.hidden = false;
    els.overlay.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    els.modal.querySelector('.cc-close').focus();
  }

  function closeModal(skipFocus) {
    if (els.overlay.hidden) return;
    els.overlay.classList.remove('is-open');
    els.overlay.hidden = true;
    document.documentElement.style.overflow = '';
    if (skipFocus === true) return;
    var target = (!state ? els.banner.querySelector('[data-cc="config"]') : (lastFocus && document.contains(lastFocus) ? lastFocus : els.fab));
    if (target) target.focus();
  }

  function onModalKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    if (e.key !== 'Tab') return;
    var f = els.modal.querySelectorAll('button,input,a[href]');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Inicio ---------- */
  function init() {
    build();
    state = read();
    if (state) { els.fab.hidden = false; activateScripts(); }
    else { els.banner.hidden = false; }
  }

  window.CPConsent = {
    open: function () { openModal(); },
    get: function () { return state ? Object.assign({}, state.c) : null; },
    has: function (cat) { return !!(state && state.c[cat]); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* ---------- Ejemplos de scripts bloqueados (pegar en el HTML, NO aquí) ----------
 *
 * <!-- Google Analytics: no se carga hasta que se acepten las cookies analíticas -->
 * <script type="text/plain" data-cookie-category="analytics" data-src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX" async></script>
 * <script type="text/plain" data-cookie-category="analytics">
 *   window.dataLayer = window.dataLayer || [];
 *   function gtag(){ dataLayer.push(arguments); }
 *   gtag('js', new Date()); gtag('config', 'G-XXXXXXXXXX', { anonymize_ip: true });
 * </script>
 *
 * <!-- Facebook Pixel: solo con consentimiento de marketing -->
 * <script type="text/plain" data-cookie-category="marketing">
 *   !function(f,b,e,v,n,t,s){ ... código del píxel ... }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
 *   fbq('init', 'PIXEL_ID'); fbq('track', 'PageView');
 * </script>
 */
