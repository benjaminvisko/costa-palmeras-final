/* home — home-page.js */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* ===== DATOS EDITABLES DE CONTACTO ===== */
  // TODO: confirmar con el cliente cuál es el teléfono correcto (el sitio mostraba "02474 52-1034" pero WhatsApp/tel usaban 2475 492324).
  var PHONE_E164 = '5492475492324';       // formato internacional, sin "+", para wa.me y tel:
  var PHONE_DISPLAY = '2475 492324';      // texto que ve el usuario
  var PHONE = { e164: PHONE_E164, display: PHONE_DISPLAY };
  // TODO: para recibir también las consultas por email, crear un formulario en Formspree/EmailJS y pegar acá el endpoint
  // (ej. 'https://formspree.io/f/xxxxxxx'). Mientras esté vacío, solo se abre WhatsApp.
  var FORM_ENDPOINT = '';
  var WA = 'https://wa.me/' + PHONE_E164 + '?text=';
  var WA_ICON = '<svg class="w-5 h-5" fill="currentColor" aria-hidden="true"><use href="#i-wa"/></svg>';
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]; }); }
  function icons() { if (window.lucide) lucide.createIcons(); }
  var U = function (id, w) {
    if (id.indexOf('./images/') === 0) return id;
    return 'https://images.unsplash.com/' + id + '?auto=format&fit=crop&w=' + (w || 1200) + '&q=80';
  };

  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  /* ---------- Datos editables ---------- */
  var P = {
    b: './images/playahumeda1.JPG',
    d: './images/Piscina con piedra bali 1.jpg',
  };

  var AMEN = [
    { t: 'Spa e hidromasaje', d: 'Sector de agua caliente con asientos moldeados y jets de masaje.',
      detail: 'Un espacio de relax integrado a la piscina o diseñado como sector independiente. Los asientos y jets se proyectan según el uso y el espacio disponible.',
      image: P.d, points: ['Asientos moldeados en obra', 'Jets de masaje orientables', 'Circuito de agua caliente independiente'] },
    { t: 'Playa húmeda', d: 'Acceso gradual y poco profundo para tomar sol, ideal para chicos.',
      detail: 'La playa húmeda crea una entrada suave al agua y un lugar cómodo para descansar. Su profundidad y dimensiones se definen junto con el diseño de la piscina.',
      image: P.b, points: ['Acceso gradual al agua', 'Sector poco profundo para descansar', 'Terminación antideslizante'] },
    { t: 'Ionizador', d: 'Tratamiento continuo que ayuda a cuidar el agua y reducir productos químicos.',
      detail: 'Se integra al sistema de filtrado y libera iones de cobre y plata que ayudan a controlar bacterias y algas de forma continua.\n\nPuede reducir el uso de cloro, suavizar el agua y mantenerla cristalina por más tiempo, con menos olores y mantenimiento.',
      image: './images/fotos productos/lonizador 40,000lts.webp', points: ['Iones de cobre y plata', 'Menos uso de productos químicos', 'Agua más suave y cristalina'] },
    { t: 'Ablandador electrónico', d: 'Ayuda a reducir los efectos del agua dura y a cuidar el sistema de filtrado.',
      detail: 'Se instala en la cañería de ingreso y utiliza impulsos electrónicos para tratar el agua dura, reduciendo la adherencia de minerales como calcio y magnesio.\n\nAyuda a prevenir sarro en cañerías, bombas y revestimientos, mejora la eficiencia del filtrado y reduce el mantenimiento sin agregar productos químicos.',
      image: './images/fotos productos/ablandadordeaguaECOIONIZER.webp', detailImage: './images/fotos productos/ablandador partes 2.png',
      points: ['Ayuda a prevenir sarro y depósitos minerales', 'Protege cañerías, bombas y superficies', 'Menos mantenimiento y productos químicos'] },
    { t: 'Iluminación LED', d: 'Luces LED que realzan la pileta y permiten disfrutarla de noche.',
      detail: 'La iluminación LED mejora la visibilidad y realza el diseño de la pileta. Consume poca energía, dura mucho y ofrece distintos colores para crear el ambiente ideal.',
      image: './images/Piscina azul bajo palmeras nocturnas.png', points: ['Más visibilidad para disfrutar de noche', 'Bajo consumo y larga duración', 'Colores para personalizar el ambiente'] },
    { t: 'Caldera eléctrica', d: 'Climatizá la pileta todo el año con temperatura precisa, sin gas ni emisiones.',
      detail: 'Se conecta al sistema de filtrado y calienta el agua con resistencias internas para mantener la temperatura deseada durante todo el año. Funciona de forma silenciosa, segura y sin emisiones.\n\nEs ideal para disfrutar la pileta en días frescos y extender la temporada. Es fácil de instalar, requiere poco mantenimiento y permite regular la temperatura con precisión.\n\nUna opción cómoda para piletas residenciales y spas, sin necesidad de gas ni combustibles.',
      image: './images/caldera-electrica.jpg', points: ['Se integra al sistema de filtrado', 'Temperatura precisa y funcionamiento silencioso', 'Ideal para extender la temporada sin gas ni combustibles'] }
  ];

  var bacoliImage = './images/IMG_6115.JPEG';
  var mirabilisImage = './images/Piscina con piedra bali 1.jpg';
  var LINEAS = [
    { n: 'Línea Bacoli', d: 'Una línea pensada para crear un espacio personal de relax, con opciones de revestimientos, hidromasaje e iluminación para adaptar la piscina a tu proyecto.', features: ['Revestimientos a elección', 'Hidromasaje integrado', 'Iluminación LED'], image: bacoliImage },
    { n: 'Línea Mirabilis', d: 'Una propuesta versátil para disfrutar la piscina durante más tiempo, con equipamiento y terminaciones que podés adaptar a tu espacio.', features: ['Climatización', 'Filtrado y bombas', 'Cobertor automático'], image: mirabilisImage }
  ];

  /* Para cambiar una foto del carrusel "Diseño de piscinas": copiá el archivo a la carpeta /images
     y editá el "src" (ruta) y el "alt" (descripción de lo que se ve) de la línea correspondiente. */
  var DISENO_FOTOS = [
    { src: './images/IMG_6077.JPEG',  alt: 'Diseño de piscina de hormigón 1' },
    { src: './images/IMG_6204.JPEG',  alt: 'Diseño de piscina de hormigón 2' },
    { src: './images/IMG_6728.JPEG',  alt: 'Diseño de piscina de hormigón 3' },
    { src: './images/IMG_6729.JPEG',  alt: 'Diseño de piscina de hormigón 4' },
    { src: './images/IMG_6730.JPEG',  alt: 'Diseño de piscina de hormigón 5' },
    { src: './images/IMG_6115.JPEG',  alt: 'Diseño de piscina de hormigón 6' },
    { src: './images/diseno-07.webp', alt: 'Diseño de piscina de hormigón 7' },
    { src: './images/diseno-08.webp', alt: 'Diseño de piscina de hormigón 8' },
    { src: './images/diseno-09.webp', alt: 'Diseño de piscina de hormigón 9' },
    { src: './images/diseno-10.webp', alt: 'Diseño de piscina de hormigón 10' },
    { src: './images/diseno-11.webp', alt: 'Diseño de piscina de hormigón 11' },
    { src: './images/diseno-12.webp', alt: 'Diseño de piscina de hormigón 12' }
  ];
  var OBRAS = DISENO_FOTOS.map(function (f, i) {
    return { id: i + 1, cat: 'Diseños', fecha: 'Diseño de inspiración', medidas: 'A medida', t: f.alt, d: '', fotos: [f.src], specs: [] };
  });

  /* ---------- Navbar ---------- */
  var nav = $('#nav');
  function onScroll() { nav.classList.toggle('solid', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  var burger = $('#burger'), drawer = $('#drawer');
  burger.addEventListener('click', function () {
    var open = drawer.classList.toggle('hidden') === false;
    burger.setAttribute('aria-expanded', open);
    nav.classList.add('solid');
  });
  $$('.drawer-link').forEach(function (a) { a.addEventListener('click', function () { drawer.classList.add('hidden'); burger.setAttribute('aria-expanded', 'false'); }); });

  var links = $$('.nav-link');
  var secObs = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) links.forEach(function (l) { l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(function (s) { secObs.observe(s); });

  /* ---------- Video del hero ---------- */
  var hv = $('#heroVideo');
  if (hv) {
    var conn = navigator.connection || {};
    var slow = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
    hv.addEventListener('error', function () { hv.style.display = 'none'; });
    // Con ahorro de datos o conexión lenta (2g) solo se muestra el poster.
    if (!reduce && !slow) {
      hv.src = hv.dataset.src;
      hv.autoplay = true;
      var pp = hv.play(); if (pp && pp.catch) pp.catch(function () {});
    }
  }

  /* ---------- Parallax ---------- */
  var heroBg = $('#heroVideo') && $('#hero-bg'), ticking = false;
  var heroSec = $('#inicio');
  if (hv && heroSec && 'IntersectionObserver' in window) {
    // Pausa el video cuando el hero sale de pantalla para ahorrar CPU y batería
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!hv.src) return;
        if (e.isIntersecting) { if (!reduce) { var p = hv.play(); if (p && p.catch) p.catch(function () {}); } } else hv.pause();
      });
    }, { threshold: 0.05 }).observe(heroSec);
  }
  heroBg = $('#hero-bg');
  if (!reduce) {
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        if (window.scrollY < window.innerHeight * 1.2) heroBg.style.transform = 'translate3d(0,' + (window.scrollY * 0.25) + 'px,0)';
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- Scroll reveal ---------- */
  var revObs = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); revObs.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  function observeReveals(root) { $$('.reveal:not(.in)', root).forEach(function (el) { revObs.observe(el); }); }

  /* ---------- Render: amenidades ---------- */
  $('#amenGrid').innerHTML = AMEN.slice(0, 4).map(function (a, i) {
    return '<article class="amenity lift reveal" style="--d:' + (i % 3) * 0.08 + 's">' +
      '<button type="button" class="amenity-trigger" data-amenity="' + i + '" aria-haspopup="dialog" aria-label="Ver detalles: ' + esc(a.t) + '">' +
      '<span class="amenity-photo"><img src="' + esc(a.image) + '" alt="' + esc(a.t) + '" loading="lazy" decoding="async" onerror="imgFallback(this)">' +
      '<span class="amenity-photo-title">' + esc(a.t) + '</span></span>' +
      '<span class="amenity-copy"><span class="amenity-description">' + esc(a.d) + '</span>' +
      '<span class="amenity-details">Ver detalles <span aria-hidden="true">→</span></span></span></button></article>';
  }).join('');

  /* ---------- Render: líneas ---------- */
  $('#modelGrid').innerHTML = LINEAS.map(function (linea, i) {
    return '<article class="lift reveal rounded-3xl border border-sand-200 bg-sand-50 overflow-hidden flex flex-col" style="--d:' + i * 0.08 + 's">' +
      '<div class="aspect-[16/9] overflow-hidden bg-sand-100"><img src="' + esc(linea.image) + '" alt="Piscina de la ' + esc(linea.n) + '" class="w-full h-full object-cover" loading="lazy" decoding="async" width="400" height="300" onerror="imgFallback(this)"></div>' +
      '<div class="p-6 sm:p-8 flex-1 flex flex-col"><h3 class="text-3xl font-semibold text-teal-deep">' + esc(linea.n) + '</h3>' +
      '<p class="mt-3 text-night-700/80 leading-relaxed flex-1">' + esc(linea.d) + '</p>' +
      '<ul class="mt-5 space-y-2 text-sm text-night-700/90">' + linea.features.map(function (feature) {
        return '<li class="flex items-center gap-2"><i data-lucide="check-circle-2" class="w-4 h-4 text-teal-deep shrink-0"></i><span>' + esc(feature) + '</span></li>';
      }).join('') + '</ul>' +
      '<button class="pick mt-6 btn-gold w-full" data-model="' + esc(linea.n) + '" style="padding:.7rem 1rem;font-size:.9rem">Quiero este modelo</button></div></article>';
  }).join('');
  icons();
  $$('.pick').forEach(function (b) {
    b.addEventListener('click', function () {
      var sel = $('#cModel'); for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text.indexOf(b.dataset.model) === 0) sel.selectedIndex = i;
      $('#contacto').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); toast(b.dataset.model + ' seleccionada');
    });
  });

  /* ---------- Carrusel de diseños ---------- */
  function initDesignCarousel() {
    var carousel = $('#designCarousel');
    var viewport = $('#designViewport');
    var track = $('#designTrack');
    var total = OBRAS.length;
    if (!carousel || !viewport || !track || !total) return;

    var index = 1;
    var timer = null;
    var touching = false;
    var visible = true;
    var touchStartX = null;
    var slidesData = [OBRAS[total - 1]].concat(OBRAS, [OBRAS[0]]);

    track.innerHTML = slidesData.map(function (obra, i) {
      var clone = i === 0 || i === total + 1;
      var realIndex = clone ? (i === 0 ? total - 1 : 0) : i - 1;
      return '<article class="design-slide" role="group" aria-roledescription="diapositiva" aria-label="' + (realIndex + 1) + ' de ' + total + ': ' + esc(obra.t) + '"' + (clone ? ' aria-hidden="true"' : '') + '>' +
        '<img src="' + U(obra.fotos[0], 1800) + '" alt="' + (clone ? '' : esc(obra.t)) + '" role="button" tabindex="-1" aria-label="Tocar para pausar o reanudar el carrusel"' + (i === 1 ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"') + ' width="1600" height="900" onerror="imgFallback(this)"></article>';
    }).join('');

    var slides = $$('.design-slide', track);
    function realIndex() { return ((index - 1) % total + total) % total; }
    function positionTrack() {
      var slide = slides[index];
      if (!slide) return;
      var gap = parseFloat(window.getComputedStyle(track).gap) || 0;
      var offset = (viewport.clientWidth - slide.offsetWidth) / 2 - index * (slide.offsetWidth + gap);
      track.style.transform = 'translate3d(' + offset + 'px,0,0)';
      slides.forEach(function (item, i) {
        item.setAttribute('aria-hidden', String(i !== index || i === 0 || i === total + 1));
        var image = $('img', item);
        if (image) {
          image.tabIndex = i === index ? 0 : -1;
          image.setAttribute('aria-label', userPaused ? 'Carrusel pausado. Tocar para reanudar' : 'Tocar para pausar el carrusel');
        }
      });
    }
    var userPaused = reduce;
    var posEl = $('#designPosition');
    function updatePosition() {
      if (posEl) {
        posEl.textContent = (realIndex() + 1) + ' / ' + total;
        posEl.setAttribute('aria-label', 'Foto ' + (realIndex() + 1) + ' de ' + total);
      }
    }
    function stopAutoplay() { clearInterval(timer); timer = null; }
    function canAutoplay() { return !userPaused && visible && !document.hidden && !touching; }
    function startAutoplay() {
      if (timer || !canAutoplay()) return;
      timer = setInterval(function () { move(1, false); }, 3500);
    }
    function resetAutoplay() { stopAutoplay(); startAutoplay(); }
    function move(direction, manual) {
      if (reduce) {
        index = ((realIndex() + direction + total) % total) + 1;
        track.style.transition = 'none';
        positionTrack();
        track.offsetHeight;
        track.style.transition = '';
      } else {
        index += direction;
        positionTrack();
      }
      updatePosition();
      if (manual) resetAutoplay();
    }
    function toggleAutoplay() {
      userPaused = !userPaused;
      if (userPaused) stopAutoplay(); else startAutoplay();
      positionTrack();
    }
    track.addEventListener('click', function (event) {
      if (event.target.matches('.design-slide img') && event.target.closest('.design-slide') === slides[index]) toggleAutoplay();
    });
    track.addEventListener('keydown', function (event) {
      if (event.target.matches('.design-slide img') && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        toggleAutoplay();
      }
    });

    track.addEventListener('transitionend', function (event) {
      if (event.target !== track || (index !== 0 && index !== total + 1)) return;
      index = index === 0 ? total : 1;
      updatePosition();
      track.style.transition = 'none';
      positionTrack();
      track.offsetHeight;
      requestAnimationFrame(function () { track.style.transition = ''; });
    });
    $('#designPrev').addEventListener('click', function () { move(-1, true); });
    $('#designNext').addEventListener('click', function () { move(1, true); });
    viewport.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1, true); }
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1, true); }
    });
    viewport.addEventListener('touchstart', function (event) {
      touchStartX = event.changedTouches[0].clientX;
      touching = true;
      stopAutoplay();
    }, { passive: true });
    viewport.addEventListener('touchend', function (event) {
      if (touchStartX === null) return;
      var delta = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      touching = false;
      if (Math.abs(delta) > 45) move(delta < 0 ? 1 : -1, false);
      startAutoplay();
    }, { passive: true });
    viewport.addEventListener('touchcancel', function () { touchStartX = null; touching = false; startAutoplay(); }, { passive: true });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopAutoplay(); else startAutoplay(); });
    window.addEventListener('resize', positionTrack);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) startAutoplay(); else stopAutoplay();
      }, { threshold: 0.15 }).observe(carousel);
    }
    positionTrack();
    updatePosition();
    icons();
    startAutoplay();
  }

  /* ---------- Modales ---------- */
  var lastFocus = null, openModalEl = null;
  function openOverlay(el, trigger) {
    lastFocus = trigger || document.activeElement; openModalEl = el;
    el.classList.add('open'); document.body.classList.add('lock'); icons();
    var f = $('.close', el); if (f) f.focus();
  }
  function closeOverlay() {
    if (!openModalEl) return;
    openModalEl.classList.remove('open'); document.body.classList.remove('lock'); openModalEl = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $$('.overlay').forEach(function (ov) {
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) closeOverlay(); });
    $$('.close', ov).forEach(function (b) { b.addEventListener('click', closeOverlay); });
  });

  $('#amenGrid').addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-amenity]'); if (!trigger) return;
    var amenity = AMEN[+trigger.dataset.amenity]; if (!amenity) return;
    $('#amenityImage').src = U(amenity.image, 1400);
    $('#amenityImage').alt = amenity.t;
    var amenityDetailImage = $('#amenityDetailImage');
    if (amenity.detailImage) {
      amenityDetailImage.src = amenity.detailImage;
      amenityDetailImage.alt = amenity.t + ' — vista detallada de sus componentes';
      amenityDetailImage.classList.remove('hidden');
    } else {
      amenityDetailImage.removeAttribute('src');
      amenityDetailImage.alt = '';
      amenityDetailImage.classList.add('hidden');
    }
    $('#amenityTitle').textContent = amenity.t;
    $('#amenityDescription').textContent = amenity.detail;
    $('#amenityPoints').innerHTML = amenity.points.map(function (point) {
      return '<li class="flex gap-2"><i data-lucide="check-circle-2" class="w-4 h-4 text-teal-deep shrink-0 mt-0.5"></i><span>' + esc(point) + '</span></li>';
    }).join('');
    var cartLinks = { 'Iluminación LED': 'carrito.html?cat=luces' };
    var cartLink = cartLinks[amenity.t];
    var amenityCta = $('#amenityWhatsApp');
    if (cartLink) {
      amenityCta.href = cartLink;
      amenityCta.removeAttribute('target');
      amenityCta.innerHTML = '<i data-lucide="shopping-cart" class="w-5 h-5"></i> Ver luces en el pedido';
    } else {
      amenityCta.href = WA + encodeURIComponent('Hola, quisiera consultar por la amenidad: ' + amenity.t);
      amenityCta.target = '_blank';
      amenityCta.innerHTML = WA_ICON + ' Consultar por WhatsApp';
    }
    openOverlay($('#amenityModal'), trigger);
  });

  /* ---------- Modal de obra ---------- */
  var cur = null, idx = 0;
  function showPhoto(i) {
    idx = (i + cur.fotos.length) % cur.fotos.length;
    var img = $('#mImg'); img.src = U(cur.fotos[idx], 1400); img.alt = cur.t + ', foto ' + (idx + 1);
    $('#mCount').textContent = (idx + 1) + ' / ' + cur.fotos.length;
    $$('#mThumbs .thumb').forEach(function (t, k) { t.classList.toggle('on', k === idx); });
  }
  function openObra(id, trigger) {
    cur = OBRAS.filter(function (o) { return o.id === id; })[0]; if (!cur) return;
    $('#mTitle').textContent = cur.t; $('#mStatus').textContent = 'Inspiración · ' + cur.cat;
    $('#mDate').textContent = cur.fecha + ' · ' + cur.medidas; $('#mDesc').textContent = cur.d;
    $('#mSpecs').innerHTML = cur.specs.map(function (s) { return '<li class="flex gap-2"><i data-lucide="check-circle-2" class="w-4 h-4 text-teal-deep shrink-0 mt-0.5"></i><span>' + esc(s) + '</span></li>'; }).join('');
    $('#mThumbs').innerHTML = cur.fotos.map(function (f, k) {
      return '<button class="thumb shrink-0 w-20 h-14 rounded-lg overflow-hidden" data-k="' + k + '" aria-label="Ver foto ' + (k + 1) + '"><img src="' + U(f, 300) + '" alt="" class="w-full h-full object-cover" onerror="imgFallback(this)"></button>';
    }).join('');
    $$('#mThumbs .thumb').forEach(function (t) { t.addEventListener('click', function () { showPhoto(+t.dataset.k); }); });
    $('#mWa').href = WA + encodeURIComponent('Hola, vi este diseño de piscina: "' + cur.t + '" y quisiera consultar una propuesta similar.');
    $('#mPrev').classList.toggle('hidden', cur.fotos.length < 2);
    $('#mNext').classList.toggle('hidden', cur.fotos.length < 2);
    showPhoto(0); openOverlay($('#obraModal'), trigger);
  }
  $('#mPrev').addEventListener('click', function () { showPhoto(idx - 1); });
  $('#mNext').addEventListener('click', function () { showPhoto(idx + 1); });

  /* ---------- Validación de formularios ---------- */
  var RULES = {
    name:  function (v) { return v.trim().length >= 3 ? '' : 'Ingresá tu nombre completo.'; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Ingresá un correo válido, por ejemplo nombre@correo.com.'; },
    phone: function (v) { return v.replace(/\D/g, '').length >= 8 ? '' : 'Ingresá un teléfono de al menos 8 dígitos.'; },
    month: function (v) { return v ? '' : 'Elegí una opción.'; },
    model: function (v) { return v ? '' : 'Elegí una línea o "Todavía no lo sé".'; },
    msg:   function (v) { return v.trim().length >= 10 ? '' : 'Contanos un poco más (mínimo 10 caracteres).'; }
  };
  function checkField(form, el) {
    var rule = RULES[el.name]; if (!rule) return true;
    var err = rule(el.value), out = $('[data-err="' + el.name + '"]', form);
    el.classList.toggle('bad', !!err); el.classList.toggle('ok', !err && el.value !== '');
    if (out) out.textContent = err; el.setAttribute('aria-invalid', !!err);
    return !err;
  }
  function wireForm(id, onValid) {
    var form = $(id); if (!form) return;
    $$('input,select,textarea', form).forEach(function (el) {
      el.addEventListener('blur', function () { checkField(form, el); });
      if (el.name === 'phone') {
        el.addEventListener('beforeinput', function (e) {
          if (e.data && /[^0-9]/.test(e.data)) {
            e.preventDefault();
            el.dataset.numericWarning = 'true';
            el.classList.add('bad');
            el.setAttribute('aria-invalid', 'true');
            $('[data-err="phone"]', form).textContent = 'Solo se permiten números en este campo.';
          }
        });
        el.addEventListener('input', function () {
          var digits = el.value.replace(/[^0-9]/g, '');
          if (digits !== el.value) {
            el.value = digits;
            el.dataset.numericWarning = 'true';
            el.classList.add('bad');
            el.setAttribute('aria-invalid', 'true');
            $('[data-err="phone"]', form).textContent = 'Solo se permiten números en este campo.';
            return;
          }
          if (el.dataset.numericWarning) {
            delete el.dataset.numericWarning;
            checkField(form, el);
          } else if (el.classList.contains('bad')) {
            checkField(form, el);
          }
        });
      } else {
        el.addEventListener('input', function () { if (el.classList.contains('bad')) checkField(form, el); });
      }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true, first = null;
      $$('input,select,textarea', form).forEach(function (el) { if (!checkField(form, el)) { ok = false; first = first || el; } });
      if (!ok) { first.focus(); return; }
      onValid(form); form.reset(); $$('.ok', form).forEach(function (x) { x.classList.remove('ok'); });
    });
  }
  function info(title, text) { $('#iTitle').textContent = title; $('#iText').textContent = text; openOverlay($('#infoModal')); }

  var FORM_LABELS = { name: 'Nombre', email: 'Correo', phone: 'Teléfono', month: 'Mes de inicio', model: 'Línea de interés', msg: 'Mensaje' };
  function sendToWhatsApp(form, heading) {
    var lines = [heading];
    $$('input,select,textarea', form).forEach(function (el) {
      if (el.name && el.value.trim()) lines.push((FORM_LABELS[el.name] || el.name) + ': ' + el.value.trim());
    });
    var text = lines.join('\n');
    // TODO: si se configura FORM_ENDPOINT (Formspree/EmailJS), enviar acá los mismos datos con fetch(FORM_ENDPOINT, { method: 'POST', ... }).
    window.open(WA + encodeURIComponent(text), '_blank', 'noopener');
    info('Se abrió WhatsApp', 'Se abrió WhatsApp para enviar tu consulta. Si no se abrió, escribinos al ' + PHONE.display + '.');
  }
  wireForm('#quickForm', function (f) { sendToWhatsApp(f, 'Hola Costa Palmeras, quiero consultar disponibilidad para una piscina.'); });
  wireForm('#contactForm', function (f) { sendToWhatsApp(f, 'Hola Costa Palmeras, quiero pedir un presupuesto.'); });
  // TODO: conectar el newsletter a un servicio de email (Mailchimp, Brevo, etc.). Por ahora no guarda el correo.
  wireForm('#newsForm', function () { info('Boletín en preparación', 'Todavía estamos preparando el boletín y no guardamos tu correo. Mientras tanto, seguinos en Instagram o escribinos por WhatsApp.'); });

  /* ---------- Copiar contacto ---------- */
  (function applyPhone() {
    var a = $('#phoneLink'), c = $('#phoneCopy'), f = $('#footPhone');
    if (a) { a.textContent = PHONE.display; a.href = 'tel:+' + PHONE.e164; }
    if (c) c.dataset.copy = PHONE.display;
    if (f) f.textContent = PHONE.display;
  })();
  $$('.copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.dataset.copy;
      (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { toast('Copiado: ' + v); }, function () { toast('Copiá manualmente: ' + v); });
    });
  });

  /* ---------- Teclado ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeOverlay();
    if (openModalEl && openModalEl.id === 'obraModal') {
      if (e.key === 'ArrowLeft') showPhoto(idx - 1);
      if (e.key === 'ArrowRight') showPhoto(idx + 1);
    }
  });

  /* ---------- Saludo si hay sesión (enlace del menú móvil) ---------- */
  (function greet() {
    try {
      var mail = sessionStorage.getItem('cp_session');
      var store = JSON.parse(localStorage.getItem('cp_obra_v3') || '{}');
      var user = mail && store.users && store.users[mail.toLowerCase()];
      if (!user || !user.name) return;
      var first = String(user.name).split(' ')[0];
      $$('#drawer a[href="miobra.html"]').forEach(function (a) { a.textContent = 'Hola, ' + first; });
    } catch (e) {}
  })();

  /* ---------- Contador del carrito ---------- */
  function updateCartBadge() {
    var n = 0;
    try {
      var c = JSON.parse(localStorage.getItem('cp_cart')) || {};
      Object.keys(c).forEach(function (k) { n += c[k]; });
    } catch (e) {}
    var b = $('#cartBadge');
    if (b) { b.textContent = n; b.hidden = n === 0; }
    var d = $('#drawerCartCount');
    if (d) d.textContent = n;
  }
  updateCartBadge();
  window.addEventListener('storage', updateCartBadge);
  window.addEventListener('pageshow', updateCartBadge);

  /* ---------- Inicio ---------- */
  initDesignCarousel();
  icons();
  document.documentElement.classList.add('reveal-ready');
  observeReveals();
  new MutationObserver(function () { observeReveals(); }).observe(document.body, { childList: true, subtree: true });
})();
