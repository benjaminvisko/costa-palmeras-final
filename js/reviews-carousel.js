/* home — reviews-carousel.js */
(function () {
  /* ===== EDITÁ ACÁ TUS RESEÑAS =====
     IMPORTANTE: el puntaje, el total y las reseñas deben coincidir con las reseñas reales de Google Business.
     TODO: completar el mes y año real de cada reseña en "d" (ej. 'marzo 2023'); mientras esté vacío no se muestra fecha.
     TODO (opcional): reemplazar todo este bloque por el widget oficial de Google o de Trustindex. */
  var RV_RATING = 4.8;   // TODO: verificar contra Google Business
  var RV_TOTAL = 33;     // TODO: verificar contra Google Business
  var RESENAS = [
    { n: 'Gabriel Pérez Rodríguez', d: '', bg: '#111',    t: 'Nuestra experiencia fue muy buena .! Cumplen lo prometido y responden rápidamente a las inquietudes.' },
    { n: 'Miguel Mónaco',           d: '', bg: '#7c8a99', t: 'Muy recomendable la empresa. Excelente trabajo.' },
    { n: 'Gaston Laborde',          d: '', bg: '#2d6a1f', t: 'Excelente servicio!' },
    { n: 'Lucía Secreto',           d: '', bg: '#8d7b72', t: '' },
    { n: 'Yesica Ayerbe',           d: '', bg: '#2FA566', t: 'Excelente organización y manera de trabajar. Cumplieron todo dentro del tiempo estipulado. Nos hicieron la pile tal cual la pedimos.' },
    { n: 'Julieta Garilio',         d: '', bg: '#0F766E', t: 'Una experiencia muy buena en todo sentido, resalto el laburo de la cuadrilla, muy respetuosos y amables. Dejaron todo funcionando impecable.' },
    { n: 'Ana Cordich',             d: '', bg: '#B45309', t: 'Muy buena decisión elegir Costa Palmeras. Desde el contacto por asesoramiento hasta el fin de la obra en tiempo y forma.' }
  ];
  /* ================================== */

  var STAR = '<svg viewBox="0 0 24 24"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>';
  var FIVE = STAR + STAR + STAR + STAR + STAR;
  var G = '<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.3-4 6.8-9.9 6.8-16.9z"/><path fill="#FBBC05" d="M10.5 28.7a14.500 14.500 0 010-9.400l-7.900-6.100a24 24 0 000 21.600l7.900-6.100z"/><path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.100-5.500c-2 1.300-4.500 2.100-8.800 2.100-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"/></svg>';

  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }

  $('rvSumStars').innerHTML = FIVE;
  $('rvSumStars').setAttribute('aria-label', RV_RATING + ' de 5 estrellas');
  $('rvScore').textContent = String(RV_RATING);
  $('rvCount').textContent = 'Basado en ' + RV_TOTAL + ' reseñas.';
  $('rvBtnG').innerHTML = G;

  var track = $('rvTrack'), dots = $('rvDots');
  track.innerHTML = RESENAS.map(function (r) {
    var avatar = r.img
      ? '<img src="' + esc(r.img) + '" alt="" onerror="this.remove()">'
      : esc(r.n.charAt(0).toUpperCase());
    return '<figure class="rv-card" style="margin:0">' +
      '<div class="rv-head"><div class="rv-avatar" style="background:' + (r.bg || '#2FA566') + '">' + avatar + '</div>' +
      '<div style="min-width:0"><figcaption class="rv-name" title="' + esc(r.n) + '">' + esc(r.n) + '</figcaption>' + (r.d ? '<div class="rv-date">' + esc(r.d) + '</div>' : '') + '</div></div>' +
      '<span class="rv-gicon">' + G + '</span>' +
      '<div class="rv-stars" aria-label="5 estrellas">' + FIVE + '</div>' +
      (r.t ? '<blockquote class="rv-text" style="margin:0">' + esc(r.t) + '</blockquote>' : '') +
      '</figure>';
  }).join('');

  var cards = Array.prototype.slice.call(track.children), dotEls = [];
  function step() { return cards[0].offsetWidth + 24; }
  function perView() { return Math.max(1, Math.round(track.clientWidth / step())); }
  function pages() { return Math.max(1, cards.length - perView() + 1); }
  function buildDots() {
    dots.innerHTML = '';
    dotEls = [];
    for (var i = 0; i < pages(); i++) {
      (function (i) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'rv-dot'; b.setAttribute('aria-label', 'Ir a la posición ' + (i + 1));
        b.addEventListener('click', function () { track.scrollTo({ left: i * step() }); });
        dots.appendChild(b); dotEls.push(b);
      })(i);
    }
    sync();
  }
  function sync() {
    var i = Math.min(dotEls.length - 1, Math.round(track.scrollLeft / step()));
    dotEls.forEach(function (d, k) { d.classList.toggle('on', k === i); });
  }
  function go(dir) {
    var max = track.scrollWidth - track.clientWidth;
    var target = track.scrollLeft + dir * step();
    if (target > max + 4) target = 0;
    if (target < -4) target = max;
    track.scrollTo({ left: target });
  }
  $('rvPrev').addEventListener('click', function () { go(-1); });
  $('rvNext').addEventListener('click', function () { go(1); });
  track.addEventListener('scroll', function () { window.requestAnimationFrame(sync); }, { passive: true });
  track.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); });
  window.addEventListener('resize', buildDots);
  buildDots();
})();
