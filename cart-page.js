/* cart — cart-page.js */
(function () {
    'use strict';

    /* ========== CONFIGURACIÓN EDITABLE ========== */
    var WA_NUMBER = '5492475492324';       // WhatsApp de la empresa
    var STORAGE_KEY = 'cp_cart';           // Clave en localStorage

    var PRICE_FILE_URL = './data/precios.xlsx';
    var PRICE_REFRESH_MS = 5 * 60 * 1000;

    var IMAGE_ROOT = './images/';
    var PRODUCT_IMAGE_ROOT = IMAGE_ROOT + 'fotos productos/';

    var CATEGORY_LIST = [
      { id: 'luces', short: 'Luces LED', name: 'Luces LED y Apliques Subacuáticos', icon: 'lightbulb' },
      { id: 'controladoras', short: 'Controladoras', name: 'Controladoras y Módulos de Mando', icon: 'sliders-horizontal' },
      { id: 'fuentes', short: 'Fuentes', name: 'Fuentes de Alimentación', icon: 'zap' },
      { id: 'filtrado', short: 'Filtrado', name: 'Filtrado y bombas', icon: 'filter' },
      { id: 'climatizacion', short: 'Climatización', name: 'Climatización', icon: 'thermometer' },
      { id: 'tratamiento', short: 'Tratamiento', name: 'Tratamiento del agua', icon: 'droplets' },
      { id: 'instalacion', short: 'Instalación', name: 'Cajas y Accesorios de Instalación', icon: 'cable' },
      { id: 'lacas-pisos', short: 'Lacas para pisos', name: 'Lacas para pisos', icon: 'paintbrush' }
    ];

    var LED_WHITE_VIEWS = [
      PRODUCT_IMAGE_ROOT + 'Luminaria_LED_12W_vista-1.jpg',
      PRODUCT_IMAGE_ROOT + 'Luminaria_LED_12W_vista-2.jpg',
      PRODUCT_IMAGE_ROOT + 'Luminaria_LED_12W_vista-3.jpg'
    ];
    var LED_RGB_VIEWS = [LED_WHITE_VIEWS[1], LED_WHITE_VIEWS[0], LED_WHITE_VIEWS[2]];
    var CONTROLLER_IMAGE = IMAGE_ROOT + 'ACQW7511.png';
    var POWER_SUPPLY_IMAGE = IMAGE_ROOT + 'ARLK3171.png';

    // Para vincular un producto con el Excel, agregar sku con el código exacto de la columna "Codigo" (string o arreglo de strings).
    // Lista inicial / Respaldo en caso de error en la red
    // Los valores convertidos desde USD usan la cotización vendedora Banco Nación del 19/10/2026: ARS 1.535 por USD.
    var PRODUCTS = [
      { id: 'led-4110', category: 'luces', name: 'Luz LED RGB', code: '4110', price: 44200, currency: 'ARS', image: LED_RGB_VIEWS[0], images: LED_RGB_VIEWS,
        specs: [['Tipo', 'Aplique subacuático'], ['Diámetro', '108 mm'], ['Potencia', '12 W'], ['Color', 'RGB']] },
      { id: 'led-4120', category: 'luces', name: 'Luz LED Blanca', code: '4120', price: 44200, currency: 'ARS', image: LED_WHITE_VIEWS[0], images: LED_WHITE_VIEWS,
        specs: [['Tipo', 'Aplique subacuático'], ['Diámetro', '108 mm'], ['Potencia', '12 W'], ['Color', 'Blanca']] },
      { id: 'led-4131', category: 'luces', name: 'Luz LED Cuadrada', code: '4131', price: 49070, currency: 'ARS', image: LED_WHITE_VIEWS[0], images: LED_WHITE_VIEWS,
        specs: [['Línea', 'Especial'], ['Forma', 'Cuadrada'], ['Tipo', 'Aplique LED']] },
      { id: 'led-4132', category: 'luces', name: 'Luz LED Redonda', code: '4132', price: 49070, currency: 'ARS', image: LED_WHITE_VIEWS[0], images: LED_WHITE_VIEWS,
        specs: [['Línea', 'Especial'], ['Forma', 'Redonda'], ['Tipo', 'Aplique LED']] },
      { id: 'led-4133', category: 'luces', name: 'Luz LED Octogonal', code: '4133', price: 49070, currency: 'ARS', image: LED_WHITE_VIEWS[0], images: LED_WHITE_VIEWS,
        specs: [['Línea', 'Especial'], ['Forma', 'Octogonal'], ['Tipo', 'Aplique LED']] },
      { id: 'led-4134', category: 'luces', name: 'Luz LED Flor', code: '4134', price: 49070, currency: 'ARS', image: LED_WHITE_VIEWS[0], images: LED_WHITE_VIEWS,
        specs: [['Línea', 'Especial'], ['Forma', 'Flor'], ['Tipo', 'Aplique LED']] },
      { id: 'led-4210', category: 'luces', name: 'Luz LED para Playa Húmeda', code: '4210', price: 44200, currency: 'ARS', image: LED_WHITE_VIEWS[0], images: LED_WHITE_VIEWS,
        specs: [['Tipo', 'Luz LED'], ['Instalación', 'Zona de playa húmeda']] },
      { id: 'led-4310', category: 'luces', name: 'Luz LED para Skimmer Chico', code: '4310', price: 57720, currency: 'ARS', image: LED_WHITE_VIEWS[0], images: LED_WHITE_VIEWS,
        specs: [['Tipo', 'Aplique LED'], ['Compatible con', 'Skimmer chico']] },
      { id: 'led-4320', category: 'luces', name: 'Luz LED para Skimmer Grande', code: '4320', price: 133710, currency: 'ARS', image: LED_WHITE_VIEWS[0], images: LED_WHITE_VIEWS,
        specs: [['Tipo', 'Aplique LED'], ['Compatible con', 'Skimmer grande']] },
      { id: 'led-4510', category: 'luces', name: 'Luz LED de Gran Tamaño', code: '4510', sku: ['LUZ LED CIRCULAR RGB GDE', 'LUZ LED CIRCULAR BCA GDE'], price: 55330, currency: 'ARS', pricePrefix: 'Desde', image: LED_WHITE_VIEWS[0], images: LED_WHITE_VIEWS,
        specs: [['Tipo', 'Aplique subacuático'], ['Medidas', '146 mm / 182 mm']] },
      { id: 'foco-acero-20w', category: 'luces', name: 'Foco de acero inoxidable 20 W', price: null, image: PRODUCT_IMAGE_ROOT + 'Foco_Acero_20W_sin_nombre.png',
        specs: [['Potencia', '20 W']] },
      { id: 'luz-empotrada-acero-10w', category: 'luces', name: 'Luminaria empotrada de acero 10 W', price: null, image: PRODUCT_IMAGE_ROOT + 'SL_Pileta_Embutido_Acero_10W.png',
        specs: [['Potencia', '10 W']] },
      { id: 'placa-led-111mm-12w', category: 'luces', name: 'Placa LED resinada 111 mm 12 W', price: null, image: PRODUCT_IMAGE_ROOT + 'SL_Placa_LED_Resinada_111mm_12W.png',
        specs: [['Diámetro', '111 mm'], ['Potencia', '12 W']] },

      { id: 'control-5100', category: 'controladoras', name: 'Controladora WiFi RGB', code: '5100', sku: 'CONTROLADORA WIFI RGB', price: 23025, currency: 'ARS', image: CONTROLLER_IMAGE,
        specs: [['Conectividad', 'WiFi'], ['Iluminación', 'RGB'], ['Incluye', 'Fuente']] },
      { id: 'control-5200', category: 'controladoras', name: 'Controladora Touch RGB', code: '5200', price: 24667, currency: 'ARS', image: CONTROLLER_IMAGE,
        specs: [['Mando', 'Táctil'], ['Iluminación', 'RGB']] },
      { id: 'control-5300', category: 'controladoras', name: 'Controladora con Teclado RGB', code: '5300', price: 32849, currency: 'ARS', image: CONTROLLER_IMAGE,
        specs: [['Mando', 'Teclado'], ['Control remoto', '1 incluido'], ['Iluminación', 'RGB']] },
      { id: 'control-5400', category: 'controladoras', name: 'Controladora Touch RGBW', code: '5400', price: 40294, currency: 'ARS', image: CONTROLLER_IMAGE,
        specs: [['Mando', 'Táctil'], ['Iluminación', 'RGBW'], ['Alcance', '15 m']] },

      { id: 'fuente-6110', category: 'fuentes', name: 'Fuente Switching', code: '6110', price: 6263, currency: 'ARS', image: POWER_SUPPLY_IMAGE,
        specs: [['Tipo', 'Switching'], ['Voltaje', '12 V'], ['Corriente', '3 A']] },
      { id: 'fuente-6120', category: 'fuentes', name: 'Fuente Switching Metálica', code: '6120', price: 14736, currency: 'ARS', image: POWER_SUPPLY_IMAGE,
        specs: [['Tipo', 'Switching'], ['Carcasa', 'Metálica'], ['Voltaje', '12 V'], ['Corriente', '5 A']] },
      { id: 'fuente-6130', category: 'fuentes', name: 'Fuente Switching Metálica', code: '6130', price: 22948, currency: 'ARS', image: POWER_SUPPLY_IMAGE,
        specs: [['Tipo', 'Switching'], ['Carcasa', 'Metálica'], ['Voltaje', '12 V'], ['Corriente', '10 A']] },

      { id: 'bomba-lacus-40', category: 'filtrado', name: 'Bomba Lacus 40', price: null, image: PRODUCT_IMAGE_ROOT + 'bomba lacus 40.png',
        specs: [] },
      { id: 'bomba-lacus-50', category: 'filtrado', name: 'Bomba Lacus 50', price: null, image: PRODUCT_IMAGE_ROOT + 'bomba lacus 50.png',
        specs: [] },
      { id: 'bomba-lacus-60', category: 'filtrado', name: 'Bomba Lacus 60', price: null, image: PRODUCT_IMAGE_ROOT + 'bomba lacus 60.png',
        images: [PRODUCT_IMAGE_ROOT + 'bomba lacus 60.png', PRODUCT_IMAGE_ROOT + 'bomba 60 partes.jpeg'],
        specs: [] },

      { id: 'caldera-tameco-cp30', category: 'climatizacion', name: 'Caldera Tameco', price: null, image: PRODUCT_IMAGE_ROOT + 'caldera tameco.png',
        images: [PRODUCT_IMAGE_ROOT + 'caldera tameco.png', PRODUCT_IMAGE_ROOT + 'caldera partes.jpeg'],
        specs: [] },

      { id: 'ionizador-eco', category: 'tratamiento', name: 'Ionizador de agua Eco-Ionizer', sku: ['200-10', '200-3'], price: null, image: PRODUCT_IMAGE_ROOT + 'lonizador 40,000lts.webp',
        images: [PRODUCT_IMAGE_ROOT + 'lonizador 40,000lts.webp', PRODUCT_IMAGE_ROOT + 'lonizador partes.jpeg'],
        specs: [['Modelo', 'Eco-Ionizer']] },
      { id: 'ablandador-electronico', category: 'tratamiento', name: 'Ablandador electrónico', price: null, image: PRODUCT_IMAGE_ROOT + 'ablandadordeaguaECOIONIZER.webp',
        images: [PRODUCT_IMAGE_ROOT + 'ablandadordeaguaECOIONIZER.webp', PRODUCT_IMAGE_ROOT + 'ablandador partes 2.png'],
        specs: [] },

      { id: 'caja-controladora', category: 'instalacion', name: 'Caja para Controladora', code: 'Línea 7000', price: 38145, currency: 'ARS', pricePrefix: 'Desde',
        specs: [['Compatible con', 'Controladora WiFi / Teclado / Touch']] },
      { id: 'acople-8100', category: 'instalacion', name: 'Acople para Luz LED', code: '8100', price: 7315, currency: 'ARS',
        specs: [['Se instala en', 'Caño / jet']] },
      { id: 'soporte-8200', category: 'instalacion', name: 'Soporte para Ionizador', code: '8200', price: 6180, currency: 'ARS',
        specs: [['Material', 'Metálico']] },
      { id: 'tiras-8300', category: 'instalacion', name: 'Tiras Reactivas', code: '8300', price: 9057, currency: 'ARS',
        specs: [['Mide', 'Cloro, pH, dureza y cobre']] },
      { id: 'plafon-8400', category: 'instalacion', name: 'Plafón Separador', code: '8400', price: 7525, currency: 'ARS',
        specs: [['Instalación', 'Pared'], ['Compatible con', 'Luz chica']] },
      { id: 'cajas-8510-8520', category: 'instalacion', name: 'Cajas de Conexión', code: '8510 / 8520', price: 5620, currency: 'ARS', pricePrefix: 'Desde',
        specs: [['Conexiones', '2 o 3']] }
    ];

    var LIGHT_SPARES = [
      { name: 'Plaqueta LED de repuesto', code: 'A confirmar' },
      { name: 'Marco de acero', code: 'A confirmar' },
      { name: 'Junta de goma', code: 'A confirmar' },
      { name: 'Transformador / fuente', code: 'A confirmar' },
      { name: 'Cable sumergible', code: 'A confirmar' }
    ];

    /* ========== UTILIDADES Y SELECCIÓN ========== */
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.from((r || document).querySelectorAll(s)); };
    function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]; }); }
    function icons() { if (window.lucide) lucide.createIcons(); }
    function toast(msg) {
      var t = $('#toast'); t.textContent = msg; t.classList.add('on');
      clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('on'); }, 2200);
    }
    function find(id) { return PRODUCTS.filter(function (p) { return p.id === id; })[0]; }
    function group(id) { return CATEGORY_LIST.filter(function (g) { return g.id === id; })[0]; }
    function productSpares(p) { return p.spares || (p.category === 'luces' ? LIGHT_SPARES : []); }
    function whatsappUrl(message) { return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(message); }
    function spareWhatsAppUrl(spare, product) {
      return whatsappUrl('Hola Costa Palmeras, necesito consultar por el repuesto ' + spare.name + ' (código ' + spare.code + ') para el producto ' + product.name + '.');
    }
    function productDescription(p) {
      if (p.description) return p.description;
      if (p.specs.length) {
        return 'Información del producto según los datos publicados en el catálogo: ' +
          p.specs.map(function (spec) { return spec[0] + ': ' + spec[1]; }).join('; ') + '.';
      }
      return 'Consultá con nuestro equipo las características, compatibilidad y disponibilidad de este producto.';
    }
    function sparePartsMarkup(p, detail) {
      var spares = productSpares(p);
      var summary = '<summary>Ver información de repuestos <i data-lucide="chevron-down" class="h-4 w-4"></i></summary>';
      var intro = spares.length ?
        '<p class="mb-2 text-xs leading-relaxed text-night-700/70">Compatibilidad, código y disponibilidad a confirmar según el modelo.</p>' :
        '<p class="py-2 text-xs leading-relaxed text-night-700/70">No hay repuestos publicados para este producto. Consultá compatibilidad y disponibilidad con nuestro equipo.</p>' +
        '<a class="inline-flex items-center gap-1 py-1 font-semibold text-teal-deep underline underline-offset-2" href="' + spareWhatsAppUrl({ name: 'repuestos', code: 'a confirmar' }, p) + '" target="_blank" rel="noopener noreferrer">Consultar por repuestos <i data-lucide="message-circle" class="h-3.5 w-3.5"></i></a>';
      var rows = spares.map(function (spare) {
        return '<div class="spare-part"><span><span class="block font-medium text-night-900">' + esc(spare.name) + '</span><span class="text-xs text-night-700/65">Código: ' + esc(spare.code) + '</span></span>' +
          '<a href="' + spareWhatsAppUrl(spare, p) + '" target="_blank" rel="noopener noreferrer">Consultar por repuesto</a></div>';
      }).join('');
      var content = summary + '<div class="mt-3">' + intro + rows + '</div>';
      return detail ? content : '<details class="p-spares-card">' + content + '</details>';
    }
    function money(amount) {
      return '$ ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(amount);
    }
    function priceLabel(p) {
      if (p.price == null) return 'Consultar precio';
      return (p.pricePrefix ? p.pricePrefix + ' ' : '') + money(p.price);
    }
    function productImages(p) { return p.images && p.images.length ? p.images : (p.image ? [p.image] : []); }
    function imgTag(p, cls) {
      var images = productImages(p);
      if (!images.length) return '<div class="image-pending"><i data-lucide="image-off"></i><span>Imagen pendiente de revisión</span></div>';
      return '<img src="' + encodeURI(images[0]) + '" alt="' + esc(p.name) + '" class="' + (cls || '') + '" loading="lazy">';
    }
    function bindImageFallbacks(root) {
      root.querySelectorAll('img').forEach(function (image) {
        image.addEventListener('error', function () {
          var pending = document.createElement('div');
          pending.className = 'image-pending';
          pending.textContent = 'Imagen pendiente de revisión';
          image.replaceWith(pending);
        }, { once: true });
      });
    }

    function normKey(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toUpperCase(); }
    function toNumber(v) {
      if (typeof v === 'number') return v;
      var s = String(v == null ? '' : v).replace(/[^\d.,-]/g, '');
      if (!s) return NaN;
      if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
      return parseFloat(s);
    }

    async function syncPricesFromExcel() {
      if (!window.XLSX) return;
      try {
        var res = await fetch(PRICE_FILE_URL + '?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var wb = XLSX.read(await res.arrayBuffer(), { type: 'array' });
        var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        var byCode = {};
        rows.forEach(function (r) {
          var code = normKey(r['Codigo']);
          var price = toNumber(r['Lista Publico']);
          if (code && price > 1) byCode[code] = price;
        });
        var changed = false;
        PRODUCTS.forEach(function (p) {
          if (!p.sku) return;
          var prices = [].concat(p.sku).map(function (s) { return byCode[normKey(s)]; }).filter(function (x) { return x != null; });
          if (!prices.length) return;
          var min = Math.min.apply(null, prices), max = Math.max.apply(null, prices);
          if (p._pf === undefined) p._pf = p.pricePrefix || '';
          var prefix = min !== max ? 'Desde' : p._pf;
          if (p.price !== min || p.currency !== 'ARS' || (p.pricePrefix || '') !== prefix) changed = true;
          p.price = min; p.currency = 'ARS'; p.pricePrefix = prefix;
        });
        if (changed) { renderCatalog(); renderCart(); }
      } catch (err) {
        console.warn('No se pudo leer precios.xlsx, se usan los precios por defecto.', err);
      }
    }

    /* ========== ESTADO CARRITO (localStorage) ========== */
    var memory = {};
    function load() {
      try {
        var v = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (v && typeof v === 'object') {
          var ok = {};
          var legacyIds = { led: 'led-4110', ionizador: 'ionizador-eco', ablandador: 'ablandador-electronico', caldera: 'caldera-tameco-cp30' };
          Object.keys(v).forEach(function (id) {
            var targetId = legacyIds[id] || id;
            if (find(targetId) && Number.isInteger(v[id]) && v[id] > 0) ok[targetId] = (ok[targetId] || 0) + v[id];
          });
          return ok;
        }
      } catch (e) {}
      return memory;
    }
    var cart = load();
    var activeCat = CATEGORY_LIST[0].id;
    function save() { memory = cart; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) {} }
    function count() { return Object.keys(cart).reduce(function (a, k) { return a + cart[k]; }, 0); }

    /* ========== SECCIONES + CATÁLOGO ========== */
    function renderTabs() {
      $('#catTabs').innerHTML = CATEGORY_LIST.map(function (g) {
        var sel = g.id === activeCat;
        return '<button type="button" class="chip" role="tab" id="tab-' + g.id + '" aria-selected="' + sel + '" tabindex="' + (sel ? 0 : -1) + '" data-cat="' + g.id + '">' +
          '<i data-lucide="' + esc(g.icon) + '" class="h-4 w-4"></i>' + esc(g.short) + '</button>';
      }).join('');
    }

    function renderCatalog() {
      var g = group(activeCat);
      var list = PRODUCTS.filter(function (p) { return p.category === activeCat; });
      $('#catTitle').textContent = g.name;
      $('#catCount').textContent = activeCat === 'lacas-pisos' && list.length === 0
        ? 'Sección en preparación'
        : list.length + (list.length === 1 ? ' producto' : ' productos');
      $('#catalog').setAttribute('aria-labelledby', 'tab-' + g.id);
      if (activeCat === 'lacas-pisos' && list.length === 0) {
        $('#catalog').innerHTML = '<div class="col-span-full rounded-xl border border-teal-deep/15 bg-white px-6 py-12 text-center shadow-sm sm:px-10">' +
          '<i data-lucide="paintbrush" class="mx-auto mb-4 h-9 w-9 text-teal-deep" aria-hidden="true"></i>' +
          '<h2 class="font-display text-2xl font-semibold text-night-900">Lacas para pisos</h2>' +
          '<p class="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-night-700/75">Estamos preparando esta sección. Cuando compartas la información y las imágenes de los productos, los incorporaremos al catálogo.</p>' +
        '</div>';
        icons();
        return;
      }
      $('#catalog').innerHTML = list.map(function (p, i) {
        return '<article class="p-card" style="animation-delay:' + Math.min(i, 8) * 0.04 + 's">' +
          '<div class="p-media">' + imgTag(p, '') + '</div>' +
          '<div class="p-body">' +
            '<h3 class="p-name">' + esc(p.name) + '</h3>' +
            '<p class="p-price">' + (p.pricePrefix ? '<small>' + esc(p.pricePrefix) + '</small>' : '') + esc(priceLabel(p)) + '</p>' +
            ((p.code || p.specs.length) ? '<div class="p-specs"><p class="p-specs-title">Información disponible</p><dl>' +
              (p.code ? '<div><dt>Código</dt><dd>' + esc(p.code) + '</dd></div>' : '') +
              p.specs.map(function (s) { return '<div><dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd></div>'; }).join('') +
            '</dl></div>' : '') +
            sparePartsMarkup(p, false) +
            '<div class="p-action"><button type="button" class="btn-gold sm w-full" data-add="' + esc(p.id) + '"><i data-lucide="plus" class="h-4 w-4"></i> Agregar</button></div>' +
          '</div><button type="button" class="p-detail-trigger" data-product-detail="' + esc(p.id) + '" aria-label="Ver imágenes y detalles de ' + esc(p.name) + '"></button></article>';
      }).join('');
      bindImageFallbacks($('#catalog'));
      icons();
    }

    /* ========== MODAL DETALLE DE PRODUCTO ========== */
    var detailOverlay = $('#productDetailOverlay'), detailDialog = $('#productDetail'), detailTrigger = null;
    var imageZoomOverlay = $('#imageZoomOverlay'), imageZoom = $('#imageZoom'), imageZoomTrigger = null;
    var imageZoomButtons = [], imageZoomIndex = 0, imageChangeTimer = null, zoomTouchStart = null;
    function updateZoomImage(animate) {
      var button = imageZoomButtons[imageZoomIndex];
      var source = button && button.querySelector('img');
      if (!source) return;
      var update = function () {
        imageZoom.src = source.currentSrc || source.src;
        imageZoom.alt = source.alt;
        $('#imageZoomCount').textContent = (imageZoomIndex + 1) + ' / ' + imageZoomButtons.length;
        imageZoomTrigger = button;
        imageZoom.classList.remove('changing');
      };
      if (!animate) { update(); return; }
      imageZoom.classList.add('changing');
      clearTimeout(imageChangeTimer);
      imageChangeTimer = setTimeout(update, 140);
    }

    function stepZoomImage(direction) {
      if (imageZoomButtons.length < 2) return;
      imageZoomIndex = (imageZoomIndex + direction + imageZoomButtons.length) % imageZoomButtons.length;
      updateZoomImage(true);
    }

    function openImageZoom(trigger) {
      imageZoomButtons = Array.prototype.slice.call($('#detailGallery').querySelectorAll('[data-zoom-image]')).filter(function (button) {
        return button.querySelector('img');
      });
      imageZoomIndex = imageZoomButtons.indexOf(trigger);
      if (imageZoomIndex < 0) imageZoomIndex = 0;
      updateZoomImage(false);
      var hasMultipleImages = imageZoomButtons.length > 1;
      $('#previousZoomImage').hidden = !hasMultipleImages;
      $('#nextZoomImage').hidden = !hasMultipleImages;
      $('#imageZoomCount').hidden = !hasMultipleImages;
      detailOverlay.setAttribute('aria-hidden', 'true');
      imageZoomOverlay.classList.add('open');
      imageZoomOverlay.setAttribute('aria-hidden', 'false');
      $('#closeImageZoom').focus();
    }

    function closeImageZoom() {
      imageZoomOverlay.classList.remove('open');
      imageZoomOverlay.setAttribute('aria-hidden', 'true');
      imageZoom.removeAttribute('src');
      detailOverlay.setAttribute('aria-hidden', 'false');
      if (imageZoomTrigger) { imageZoomTrigger.focus(); imageZoomTrigger = null; }
      imageZoomButtons = [];
      clearTimeout(imageChangeTimer);
    }

    function openProductDetail(id, trigger) {
      var p = find(id);
      if (!p) return;
      detailTrigger = trigger;
      var category = group(p.category);
      $('#detailCategory').textContent = category ? category.name : 'Producto';
      $('#detailTitle').textContent = p.name;
      $('#detailPrice').textContent = priceLabel(p);
      $('#detailPriceNote').textContent = p.price == null ? 'El precio se confirma al cotizar.' : 'Precio orientativo, sujeto a confirmación.';
      var specs = [];
      if (p.code) specs.push(['Código', p.code]);
      specs = specs.concat(p.specs);
      $('#detailSpecs').innerHTML = specs.length ?
        '<p class="p-specs-title mb-3">Características disponibles</p><ul class="detail-checks">' +
        specs.map(function (s) { return '<li class="detail-check"><i data-lucide="circle-check"></i><span><strong>' + esc(s[0]) + ':</strong> ' + esc(s[1]) + '</span></li>'; }).join('') +
        '</ul>' : '<p class="text-sm text-night-700/70">No hay características adicionales publicadas.</p>';
      $('#detailDescription').textContent = productDescription(p);
      $('#detailSpares').innerHTML = sparePartsMarkup(p, true);
      $('#detailGallery').innerHTML = productImages(p).map(function (image, index) {
        var alt = p.name + ' - vista ' + (index + 1);
        return '<button type="button" class="detail-image-zoom" data-zoom-image aria-label="Ampliar ' + esc(alt) + '"><img src="' + encodeURI(image) + '" alt="' + esc(alt) + '" loading="lazy"></button>';
      }).join('') || '<div class="image-pending"><i data-lucide="image-off"></i><span>Imagen pendiente de revisión</span></div>';
      bindImageFallbacks($('#detailGallery'));
      $('#detailAdd').setAttribute('data-add', p.id);
      $('#detailWhatsApp').href = whatsappUrl('Hola Costa Palmeras, quiero consultar sobre ' + p.name + '.');
      detailOverlay.classList.add('open');
      detailOverlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lock');
      detailDialog.focus();
      icons();
    }

    function closeProductDetail() {
      detailOverlay.classList.remove('open');
      detailOverlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lock');
      if (detailTrigger) { detailTrigger.focus(); detailTrigger = null; }
    }

    /* ========== DRAWER DEL CARRITO ========== */
    var drawerOverlay = $('#drawerOverlay'), cartDrawer = $('#cartDrawer');
    function openCart() {
      cartDrawer.classList.add('open');
      drawerOverlay.classList.add('open');
      cartDrawer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lock');
      renderCart();
    }
    function closeCart() {
      cartDrawer.classList.remove('open');
      drawerOverlay.classList.remove('open');
      cartDrawer.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lock');
      $('#openCartFloating').focus();
    }

    function renderCart() {
      var keys = Object.keys(cart);
      var container = $('#cartItems');
      var totalC = count();
      
      $$('#cartCount').forEach(function(el) { el.textContent = totalC + (totalC === 1 ? ' producto' : ' productos'); });
      var badge = $('#cartBadge');
      if (totalC > 0) {
        badge.removeAttribute('hidden');
        badge.textContent = totalC;
        badge.classList.add('bump');
        setTimeout(function() { badge.classList.remove('bump'); }, 400);
      } else {
        badge.setAttribute('hidden', '');
      }
      $('#floatingCartCount').textContent = totalC + ' productos';
      $('#clearCart').toggleAttribute('hidden', totalC === 0);
      $('#floatingCart').toggleAttribute('hidden', totalC === 0);

      if (keys.length === 0) {
        container.innerHTML = '<div class="text-center py-12"><p class="text-night-700/70">Tu carrito está vacío.</p><p class="text-sm text-night-700/50 mt-1">Agregá accesorios desde el catálogo.</p></div>';
        $('#cartTotalARS').textContent = 'ARS $ 0';
        $('#cartPriceNotice').setAttribute('hidden', '');
        $('#checkout').setAttribute('disabled', '');
        return;
      }

      var totalARS = 0;
      var hasNoPrice = false;

      container.innerHTML = keys.map(function (id) {
        var p = find(id);
        var qty = cart[id];
        if (!p) return '';
        if (p.price == null) hasNoPrice = true;
        else totalARS += p.price * qty;

        return '<div class="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm line-in">' +
          '<div class="product-thumb">' + imgTag(p, '') + '</div>' +
          '<div class="flex-1 min-w-0">' +
            '<h4 class="text-sm font-semibold text-night-900 truncate">' + esc(p.name) + '</h4>' +
            '<p class="text-xs text-night-700/75">' + esc(priceLabel(p)) + '</p>' +
          '</div>' +
          '<div class="flex items-center gap-1.5 shrink-0">' +
            '<button type="button" class="qty-btn" data-dec="' + esc(p.id) + '" aria-label="Disminuir cantidad">-</button>' +
            '<span class="w-6 text-center text-sm font-semibold">' + qty + '</span>' +
            '<button type="button" class="qty-btn" data-inc="' + esc(p.id) + '" aria-label="Aumentar cantidad">+</button>' +
          '</div>' +
        '</div>';
      }).join('');

      bindImageFallbacks(container);

      $('#cartTotalARS').textContent = money(totalARS);
      if (hasNoPrice) {
        $('#cartPriceNotice').removeAttribute('hidden');
      } else {
        $('#cartPriceNotice').setAttribute('hidden', '');
      }
      $('#checkout').removeAttribute('disabled');
    }

    function addToCart(id) {
      cart[id] = (cart[id] || 0) + 1;
      save();
      renderCart();
      toast('Producto agregado al carrito');
    }

    function updateQty(id, delta) {
      if (!cart[id]) return;
      cart[id] += delta;
      if (cart[id] <= 0) delete cart[id];
      save();
      renderCart();
    }

    /* ========== EVENTOS GLOBALES ========== */
    document.addEventListener('click', function (e) {
      var zoomBtn = e.target.closest('[data-zoom-image]');
      if (zoomBtn) {
        if (zoomBtn.querySelector('img')) openImageZoom(zoomBtn);
        return;
      }
      var addBtn = e.target.closest('[data-add]');
      if (addBtn) {
        addToCart(addBtn.getAttribute('data-add'));
        closeProductDetail();
        return;
      }
      var detailBtn = e.target.closest('[data-product-detail]');
      if (detailBtn) {
        openProductDetail(detailBtn.getAttribute('data-product-detail'), detailBtn);
        return;
      }
      var incBtn = e.target.closest('[data-inc]');
      if (incBtn) { updateQty(incBtn.getAttribute('data-inc'), 1); return; }
      var decBtn = e.target.closest('[data-dec]');
      if (decBtn) { updateQty(decBtn.getAttribute('data-dec'), -1); return; }
    });

    $('#catTabs').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cat]');
      if (!btn) return;
      activeCat = btn.getAttribute('data-cat');
      renderTabs();
      renderCatalog();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    $('#openCartFloating').addEventListener('click', openCart);
    $('#closeCart').addEventListener('click', closeCart);
    $('#drawerOverlay').addEventListener('click', closeCart);
    $('#keepShopping').addEventListener('click', closeCart);
    $('#clearCart').addEventListener('click', function () {
      cart = {};
      save();
      renderCart();
      toast('Carrito vaciado');
    });

    $('#closeProductDetail').addEventListener('click', closeProductDetail);
    detailOverlay.addEventListener('click', function (e) { if (e.target === detailOverlay) closeProductDetail(); });
    $('#closeImageZoom').addEventListener('click', closeImageZoom);
    imageZoomOverlay.addEventListener('click', function (e) { if (e.target === imageZoomOverlay) closeImageZoom(); });
    $('#previousZoomImage').addEventListener('click', function () { stepZoomImage(-1); });
    $('#nextZoomImage').addEventListener('click', function () { stepZoomImage(1); });
    imageZoom.addEventListener('touchstart', function (e) {
      var touch = e.changedTouches[0];
      zoomTouchStart = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });
    imageZoom.addEventListener('touchend', function (e) {
      if (!zoomTouchStart) return;
      var touch = e.changedTouches[0];
      var deltaX = touch.clientX - zoomTouchStart.x;
      var deltaY = touch.clientY - zoomTouchStart.y;
      zoomTouchStart = null;
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) stepZoomImage(deltaX < 0 ? 1 : -1);
    }, { passive: true });

    $('#checkout').addEventListener('click', function () {
      var text = 'Hola! Me gustaría consultar el siguiente pedido de accesorios para piscina de Costa Palmeras:\n\n';
      var keys = Object.keys(cart);
      keys.forEach(function (id) {
        var p = find(id);
        if (p) text += '• ' + p.name + ' (x' + cart[id] + ') - ' + priceLabel(p) + '\n';
      });
      text += '\nQuedo a la espera de la confirmación y cotización final. ¡Gracias!';
      window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text), '_blank');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (imageZoomOverlay.classList.contains('open')) { closeImageZoom(); return; }
        closeCart();
        closeProductDetail();
      } else if (imageZoomOverlay.classList.contains('open') && e.key === 'ArrowRight') {
        stepZoomImage(1);
      } else if (imageZoomOverlay.classList.contains('open') && e.key === 'ArrowLeft') {
        stepZoomImage(-1);
      }
    });

    // ========== INICIALIZACIÓN ==========
    // Parámetros de URL: ?cat=luces activa esa categoría (sin agregar nada); ?add=ID agrega ese producto.
    (function readUrlParams() {
      var params;
      try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
      var addId = params.get('add');
      var addProduct = addId && find(addId);
      var catId = params.get('cat') || (addProduct && addProduct.category);
      if (catId && group(catId)) activeCat = catId;
      if (addProduct) {
        cart[addProduct.id] = (cart[addProduct.id] || 0) + 1; save();
        if (window.history && history.replaceState) history.replaceState(null, '', window.location.pathname + '?cat=' + addProduct.category);
      }
    })();
    renderTabs();
    renderCatalog();
    renderCart();
    icons();
    
    syncPricesFromExcel();
    setInterval(syncPricesFromExcel, PRICE_REFRESH_MS);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) syncPricesFromExcel(); });

  })();
