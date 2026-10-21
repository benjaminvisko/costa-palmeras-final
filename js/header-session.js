/* !!! TODO SEGURIDAD (IMPORTANTE) !!!
   La sesión (sessionStorage 'cp_session') y los usuarios (localStorage 'cp_obra_v3') NO son autenticación real:
   cualquiera puede editarlos desde el navegador. La autenticación debe pasar al servidor antes de subir datos
   o fotos reales de clientes. Este script solo muestra el estado de sesión (UI), nunca debe usarse para autorizar. */
(function () {
  'use strict';

  var SESSION_KEY = 'cp_session';
  var USERS_KEY = 'cp_obra_v3';
  var THEME_KEY = 'cp_theme';
  var activeUser = null;

  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function currentUser() {
    try {
      var email = sessionStorage.getItem(SESSION_KEY);
      var store = readStore();
      return email && store.users ? store.users[email.toLowerCase()] || null : null;
    } catch (error) {
      return null;
    }
  }

  function logout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (error) {
      window.location.href = 'miobra.html#/login';
      return;
    }
    window.location.href = 'miobra.html#/login';
  }

  function storedTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || 'system';
    } catch (error) {
      return 'system';
    }
  }

  function applyTheme(theme) {
    var dark = theme === 'dark';
    document.documentElement.classList.toggle('cp-dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelectorAll('.cp-theme-select').forEach(function (select) {
      select.value = theme;
    });
  }

  function setTheme(theme) {
    if (['light', 'dark', 'system'].indexOf(theme) === -1) return;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      window.alert('No se pudo guardar el tema en este navegador.');
      return;
    }
    applyTheme(theme);
  }

  function closeMenus(except) {
    document.querySelectorAll('.cp-profile-menu.is-open').forEach(function (menu) {
      if (menu === except) return;
      menu.classList.remove('is-open');
      menu.querySelector('.cp-profile-trigger').setAttribute('aria-expanded', 'false');
      menu.querySelector('.cp-profile-dropdown').hidden = true;
    });
  }

  function icon(name) {
    var paths = {
      user: '<circle cx="12" cy="8" r="4"></circle><path d="M5 21a7 7 0 0 1 14 0"></path>',
      edit: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"></path>',
      palette: '<circle cx="13.5" cy="6.5" r=".5"></circle><circle cx="17.5" cy="10.5" r=".5"></circle><circle cx="8.5" cy="7.5" r=".5"></circle><circle cx="6.5" cy="12.5" r=".5"></circle><path d="M12 22a10 10 0 1 1 10-10c0 1.1-.9 2-2 2h-2.1a1.9 1.9 0 0 0-1.6 2.9l.3.5a2 2 0 0 1-1.7 3.1Z"></path>',
      logout: '<path d="M10 17l5-5-5-5"></path><path d="M15 12H3"></path><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"></path>',
      login: '<path d="M10 17l5-5-5-5"></path><path d="M15 12H3"></path><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"></path>',
      briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18m-11 0v2h4v-2"></path>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || '') + '</svg>';
  }

  function createMenu(link, user) {
    var wrapper = document.createElement('div');
    wrapper.className = 'cp-profile-menu';
    if (link.classList.contains('portal-profile-link')) wrapper.classList.add('cp-profile-menu-portal');
    ['hidden', 'sm:inline-flex', 'md:inline-flex'].forEach(function (className) {
      if (link.classList.contains(className)) wrapper.classList.add(className);
    });
    wrapper.dataset.originalClass = link.className;

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cp-profile-trigger';
    trigger.setAttribute('aria-label', user ? 'Abrir menú de perfil de ' + user.name : 'Abrir menú de perfil');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.innerHTML = icon('user');
    if (user && user.avatar) {
      var triggerAvatar = document.createElement('img');
      triggerAvatar.className = 'cp-profile-avatar';
      triggerAvatar.alt = '';
      triggerAvatar.src = user.avatar;
      trigger.replaceChildren(triggerAvatar);
    }

    var menu = document.createElement('div');
    menu.className = 'cp-profile-dropdown';
    menu.hidden = true;
    if (user) {
      menu.innerHTML = '<div class="cp-profile-summary"><span class="cp-profile-summary-avatar"></span><span class="cp-profile-summary-name"></span></div>' +
        '<a class="cp-profile-item" href="miobra.html">' + icon('briefcase') + '<span>Mi obra</span></a>' +
        '<button type="button" class="cp-profile-item cp-edit-profile">' + icon('edit') + '<span>Editar perfil</span></button>' +
        '<label class="cp-theme-row"><span>' + icon('palette') + '<span>Tema</span></span><select class="cp-theme-select" aria-label="Elegir tema"><option value="system">Sistema (claro)</option><option value="light">Modo claro</option><option value="dark">Modo oscuro</option></select></label>' +
        '<button type="button" class="cp-profile-item cp-profile-logout">' + icon('logout') + '<span>Salir</span></button>';
      menu.querySelector('.cp-profile-summary-name').textContent = user.name;
      var summaryAvatar = menu.querySelector('.cp-profile-summary-avatar');
      summaryAvatar.innerHTML = icon('user');
      if (user.avatar) {
        var summaryImage = document.createElement('img');
        summaryImage.alt = '';
        summaryImage.src = user.avatar;
        summaryAvatar.replaceChildren(summaryImage);
      }
      menu.querySelector('.cp-profile-logout').addEventListener('click', logout);
      menu.querySelector('.cp-edit-profile').addEventListener('click', function () {
        closeMenus();
        openProfileDialog(user);
      });
      menu.querySelector('.cp-theme-select').addEventListener('change', function (event) {
        setTheme(event.target.value);
      });
      menu.querySelector('.cp-profile-item[href="miobra.html"]').addEventListener('click', closeMenus);
    } else {
      menu.innerHTML = '<a class="cp-profile-item" href="miobra.html#/login">' + icon('login') + '<span>Iniciar sesión</span></a>' +
        '<a class="cp-profile-item" href="miobra.html#/registro">' + icon('user') + '<span>Crear cuenta</span></a>' +
        '<label class="cp-theme-row"><span>' + icon('palette') + '<span>Tema</span></span><select class="cp-theme-select" aria-label="Elegir tema"><option value="system">Sistema (claro)</option><option value="light">Modo claro</option><option value="dark">Modo oscuro</option></select></label>';
      menu.querySelectorAll('.cp-profile-item').forEach(function (item) {
        item.addEventListener('click', closeMenus);
      });
      menu.querySelector('.cp-theme-select').addEventListener('change', function (event) {
        setTheme(event.target.value);
      });
    }

    trigger.addEventListener('click', function () {
      var opening = !wrapper.classList.contains('is-open');
      closeMenus(wrapper);
      wrapper.classList.toggle('is-open', opening);
      trigger.setAttribute('aria-expanded', String(opening));
      menu.hidden = !opening;
    });
    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
    link.replaceWith(wrapper);
  }

  function profileDialog() {
    var dialog = document.createElement('dialog');
    dialog.className = 'cp-profile-dialog';
    dialog.setAttribute('aria-labelledby', 'cp-profile-title');
    dialog.innerHTML = '<form class="cp-profile-form">' +
      '<div class="cp-profile-dialog-head"><div><p class="cp-profile-eyebrow">Tu cuenta</p><h2 id="cp-profile-title">Editar perfil</h2></div><button type="button" class="cp-dialog-close" aria-label="Cerrar">×</button></div>' +
      '<div class="cp-profile-photo-row"><div class="cp-profile-photo-preview"></div><div><label class="cp-profile-file-label" for="cp-profile-photo">Cambiar foto de perfil</label><input id="cp-profile-photo" type="file" accept="image/*"><small>La imagen se guarda en este navegador.</small></div></div>' +
      '<label class="cp-profile-field">Nombre completo<input name="name" autocomplete="name" required maxlength="100"></label>' +
      '<label class="cp-profile-field">Correo electrónico<input name="email" type="email" autocomplete="email" required maxlength="160"></label>' +
      '<p class="cp-profile-email-note" hidden>El correo del equipo no puede modificarse desde el perfil porque determina los permisos de acceso.</p>' +
      '<label class="cp-profile-field">Teléfono<input name="phone" type="tel" autocomplete="tel" maxlength="40"></label>' +
      '<p class="cp-profile-error" role="alert" hidden></p>' +
      '<div class="cp-profile-dialog-actions"><button type="button" class="cp-dialog-cancel">Cancelar</button><button type="submit" class="cp-dialog-save">Guardar cambios</button></div>' +
      '</form>';
    document.body.appendChild(dialog);
    dialog.querySelector('.cp-dialog-close').addEventListener('click', function () { dialog.close(); });
    dialog.querySelector('.cp-dialog-cancel').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', function () {
      if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
    });
    return dialog;
  }

  function openProfileDialog(user) {
    var dialog = profileDialog();
    var form = dialog.querySelector('form');
    var photo = '';
    var photoInput = dialog.querySelector('#cp-profile-photo');
    var preview = dialog.querySelector('.cp-profile-photo-preview');
    var emailInput = form.elements.email;
    var emailNote = dialog.querySelector('.cp-profile-email-note');
    var error = dialog.querySelector('.cp-profile-error');
    var isStaff = ['pablocostapalmeras084@gmail.com', 'adm.costapalmeras@gmail.com', 'logistica.costapalmeras@gmail.com', 'servicios@costapalmeras.com', 'comunicacion.costapalmeras@gmail.com', 'alux6536@gmail.com', 'benjaminviskovich@gmail.com', 'facuroca397@gmail.com'].indexOf(String(user.email || '').toLowerCase()) !== -1;

    form.elements.name.value = user.name || '';
    emailInput.value = user.email || '';
    form.elements.phone.value = user.phone || '';
    photo = user.avatar || '';
    emailInput.readOnly = isStaff;
    emailNote.hidden = !isStaff;

    function renderPreview() {
      preview.innerHTML = icon('user');
      if (photo) {
        var previewImage = document.createElement('img');
        previewImage.alt = '';
        previewImage.src = photo;
        preview.replaceChildren(previewImage);
      }
    }
    renderPreview();

    photoInput.addEventListener('change', function () {
      var file = photoInput.files && photoInput.files[0];
      if (!file) return;
      if (!file.type.match(/^image\//)) {
        error.textContent = 'Elegí un archivo de imagen válido.';
        error.hidden = false;
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        error.textContent = 'La imagen debe pesar menos de 2 MB.';
        error.hidden = false;
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        photo = String(reader.result || '');
        error.hidden = true;
        renderPreview();
      };
      reader.onerror = function () {
        error.textContent = 'No se pudo leer la imagen seleccionada.';
        error.hidden = false;
      };
      reader.readAsDataURL(file);
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var name = form.elements.name.value.trim();
      var email = emailInput.value.trim().toLowerCase();
      var phone = form.elements.phone.value.trim();
      if (!name || !emailInput.checkValidity()) {
        error.textContent = 'Ingresá un nombre y un correo electrónico válidos.';
        error.hidden = false;
        return;
      }
      try {
        var store = readStore();
        if (!store.users || !store.users[user.email.toLowerCase()]) throw new Error('No se encontró la cuenta para guardar los cambios.');
        if (email !== user.email.toLowerCase() && store.users[email]) throw new Error('Ya existe una cuenta con ese correo electrónico.');
        var updatedUser = Object.assign({}, store.users[user.email.toLowerCase()], { name: name, email: email, phone: phone, avatar: photo });
        if (email !== user.email.toLowerCase()) delete store.users[user.email.toLowerCase()];
        store.users[email] = updatedUser;
        localStorage.setItem(USERS_KEY, JSON.stringify(store));
        sessionStorage.setItem(SESSION_KEY, email);
        activeUser = updatedUser;
        refreshMenus();
        dialog.close();
      } catch (saveError) {
        error.textContent = saveError.message || 'No se pudieron guardar los cambios.';
        error.hidden = false;
      }
    });
    dialog.showModal();
  }

  function refreshMenus() {
    document.querySelectorAll('.cp-profile-menu').forEach(function (menu) {
      var link = document.createElement('a');
      link.href = 'miobra.html';
      link.className = menu.dataset.originalClass || '';
      link.dataset.sessionLink = '';
      menu.replaceWith(link);
    });
    document.querySelectorAll('[data-session-link]').forEach(function (link) {
      link.dataset.sessionReady = 'true';
      createMenu(link, activeUser);
    });
  }

  function updateHeaders() {
    activeUser = currentUser();
    document.querySelectorAll('[data-session-link]').forEach(function (link) {
      if (link.dataset.sessionReady === 'true') return;
      link.dataset.sessionReady = 'true';
      createMenu(link, activeUser);
    });
  }

  var style = document.createElement('style');
  style.textContent = [
    'html{transition:background-color .3s ease,color .3s ease}',
    '.cp-profile-menu{position:relative;z-index:1;display:inline-flex;align-items:center}',
    '.cp-profile-menu.hidden{display:none!important}',
    '@media(min-width:640px){.cp-profile-menu.sm\\:inline-flex{display:inline-flex!important}}',
    '@media(min-width:768px){.cp-profile-menu.md\\:inline-flex{display:inline-flex!important}}',
    '.cp-profile-trigger{display:grid;width:46px;height:46px;place-items:center;overflow:hidden;border:1px solid rgba(255,255,255,.52);border-radius:50%;background:rgba(255,255,255,.035);color:#fff;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,.12);transition:background .22s ease,border-color .22s ease,box-shadow .22s ease,transform .22s ease}',
    '.cp-profile-trigger:hover,.cp-profile-menu.is-open .cp-profile-trigger{transform:translateY(-1px);background:rgba(255,255,255,.14);border-color:#fff;box-shadow:0 7px 18px rgba(0,0,0,.18)}',
    '.cp-profile-trigger:focus-visible,.cp-profile-item:focus-visible,.cp-theme-select:focus-visible{outline:3px solid #FFB81C;outline-offset:3px}',
    '.cp-profile-trigger svg{width:23px;height:23px}',
    '.cp-profile-avatar,.cp-profile-summary-avatar img,.cp-profile-photo-preview img{width:100%;height:100%;object-fit:cover}',
    '#nav.solid .cp-profile-trigger{border-color:rgba(0,118,63,.45);color:#00763F}',
    '#nav.solid .cp-profile-trigger:hover,#nav.solid .cp-profile-menu.is-open .cp-profile-trigger{background:rgba(0,118,63,.08);border-color:#00763F}',
    'header.cart-header .cp-profile-trigger{border-color:rgba(255,255,255,.48);color:#fff}',
    'header .cp-profile-menu-portal .cp-profile-trigger{border-color:rgba(255,255,255,.52);color:#fff}',
    'header:not(#nav):not(.cart-header) .cp-profile-trigger{border-color:rgba(0,118,63,.4);color:#00763F}',
    '.cp-profile-dropdown{position:absolute;top:calc(100% + .8rem);right:0;z-index:100;display:grid;width:min(290px,calc(100vw - 2rem));gap:.3rem;padding:.65rem;border:1px solid rgba(0,118,63,.14);border-radius:18px;background:linear-gradient(145deg,#fff 0%,#FAF6F0 100%);color:#062B1B;box-shadow:0 20px 48px rgba(6,43,27,.24),0 3px 10px rgba(6,43,27,.08);animation:cpProfileIn .18s ease-out both;transform-origin:top right}',
    '.cp-profile-dropdown:before{position:absolute;top:-7px;right:16px;width:12px;height:12px;content:"";transform:rotate(45deg);border-top:1px solid rgba(0,118,63,.14);border-left:1px solid rgba(0,118,63,.14);background:#fff}',
    '.cp-profile-dropdown[hidden]{display:none}',
    '.cp-profile-summary{position:relative;display:flex;align-items:center;gap:.7rem;margin:0 0 .25rem;padding:.55rem .65rem .75rem;border-bottom:1px solid rgba(0,118,63,.13);font-size:.92rem;font-weight:700;line-height:1.4;overflow-wrap:anywhere}',
    '.cp-profile-summary-avatar{display:grid;width:38px;height:38px;flex:none;place-items:center;overflow:hidden;border:1px solid rgba(0,118,63,.2);border-radius:50%;background:rgba(0,118,63,.08);color:#00763F}',
    '.cp-profile-summary-avatar svg{width:21px;height:21px}',
    '.cp-profile-item{position:relative;display:flex;width:100%;min-height:44px;align-items:center;gap:.7rem;padding:.7rem .8rem;border:0;border-radius:11px;background:transparent;color:#145A38;text-align:left;text-decoration:none;font:inherit;font-size:.9rem;font-weight:600;cursor:pointer;transition:background .18s ease,color .18s ease,transform .18s ease}',
    '.cp-profile-item svg,.cp-theme-row svg{width:18px;height:18px;flex:none}',
    '.cp-profile-item:hover{transform:translateX(2px);background:rgba(0,118,63,.09);color:#062B1B}',
    '.cp-theme-row{display:flex;min-height:48px;align-items:center;justify-content:space-between;gap:.5rem;padding:.5rem .8rem;border-radius:11px;color:#145A38;font-size:.9rem;font-weight:600}',
    '.cp-theme-row>span{display:flex;align-items:center;gap:.7rem}',
    '.cp-theme-select{max-width:130px;border:1px solid rgba(0,118,63,.22);border-radius:8px;padding:.42rem .5rem;background:#fff;color:#145A38;font:inherit;font-size:.78rem}',
    '.cp-profile-logout{margin-top:.15rem;border-top:1px solid rgba(0,118,63,.1);border-radius:0 0 11px 11px;color:#9b2929}',
    '.cp-profile-logout:hover{background:rgba(155,41,41,.08);color:#7f1d1d}',
    '.cp-profile-dialog{width:min(100% - 2rem,520px);max-height:min(90dvh,800px);overflow:auto;margin:auto;padding:0;border:1px solid rgba(0,118,63,.18);border-radius:22px;background:#FAF6F0;color:#062B1B;box-shadow:0 26px 80px rgba(0,0,0,.32)}',
    '.cp-profile-dialog::backdrop{background:rgba(3,20,12,.68);backdrop-filter:blur(4px)}',
    '.cp-profile-form{display:grid;gap:1rem;padding:clamp(1.1rem,4vw,2rem)}',
    '.cp-profile-dialog-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding-bottom:1rem;border-bottom:1px solid rgba(0,118,63,.15)}',
    '.cp-profile-eyebrow{margin:0;color:#00763F;font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase}',
    '.cp-profile-dialog h2{margin:.2rem 0 0;font-family:"Cormorant Garamond",Georgia,serif;font-size:2rem;font-weight:600}',
    '.cp-dialog-close{display:grid;width:38px;height:38px;place-items:center;border:1px solid rgba(0,118,63,.2);border-radius:50%;background:transparent;color:#145A38;font-size:1.6rem;line-height:1}',
    '.cp-profile-photo-row{display:flex;align-items:center;gap:1rem}',
    '.cp-profile-photo-preview{display:grid;width:74px;height:74px;flex:none;place-items:center;overflow:hidden;border:2px solid rgba(0,118,63,.18);border-radius:50%;background:#e5f1e7;color:#00763F}',
    '.cp-profile-photo-preview svg{width:34px;height:34px}',
    '.cp-profile-file-label{display:inline-flex;cursor:pointer;color:#00763F;font-size:.9rem;font-weight:700}',
    '#cp-profile-photo{display:block;width:auto;max-width:100%;margin-top:.35rem;padding:0;border:0;background:transparent;font-size:.78rem}',
    '.cp-profile-photo-row small{display:block;margin-top:.25rem;color:#586862;font-size:.75rem}',
    '.cp-profile-field{display:grid;gap:.4rem;color:#145A38;font-size:.82rem;font-weight:700}',
    '.cp-profile-field input{width:100%;border:1px solid #c5d3cd;border-radius:10px;padding:.72rem .8rem;background:#fff;color:#0f1f1a;font:inherit;font-size:.92rem}',
    '.cp-profile-field input:focus{outline:2px solid rgba(0,118,63,.25);border-color:#00763F}',
    '.cp-profile-field input[readonly]{background:#edf2f0;color:#586862}',
    '.cp-profile-email-note,.cp-profile-error{margin:0;font-size:.8rem;line-height:1.5}',
    '.cp-profile-email-note{color:#586862}',
    '.cp-profile-error{color:#9b2929}',
    '.cp-profile-dialog-actions{display:flex;justify-content:flex-end;gap:.65rem;padding-top:.5rem}',
    '.cp-dialog-cancel,.cp-dialog-save{min-height:42px;border-radius:999px;padding:.65rem 1rem;font:inherit;font-size:.88rem;font-weight:700;cursor:pointer}',
    '.cp-dialog-cancel{border:1px solid rgba(0,118,63,.35);background:transparent;color:#00763F}',
    '.cp-dialog-save{border:1px solid #00763F;background:#00763F;color:#fff}',
    '.cp-dark body{background:#05160E!important;color:#F5F3EB!important}',
    '.cp-dark body{--bg:#05160E;--card:#0E2A1D;--ink:#F5F3EB;--mu:#D3D8D1;--ln:rgba(255,255,255,.12);--ln2:rgba(255,255,255,.08)}',
    '.cp-dark body .card,.cp-dark body .authwrap{background:#0E2A1D;border-color:rgba(255,255,255,.12);color:#F5F3EB}',
    '.cp-dark body .ch{background:#112A20;border-color:rgba(255,255,255,.12);border-left-color:#FFC247;color:#FFC247}',
    '.cp-dark body .ch .chd,.cp-dark body .sub,.cp-dark body .hint,.cp-dark body .empty{color:#D3D8D1}',
    '.cp-dark body .authform{background:#0E2A1D;color:#F5F3EB}',
    '.cp-dark body .authform h1,.cp-dark body .authform h2{color:#FFC247}',
    '.cp-dark body .act,.cp-dark body .res{border-color:rgba(255,255,255,.12)}',
    '.cp-dark body .ni{background:#112A20;border-color:rgba(255,255,255,.12);color:#F5F3EB}',
    '.cp-dark body main{color:#F5F3EB}',
    '.cp-dark body main section:not([class*="hero"]):not([id="inicio"]):not([id="obras"]){transition:background-color .3s ease,color .3s ease}',
    '.cp-dark body [class~="bg-white"],.cp-dark body [class~="bg-sand-50"],.cp-dark body [class~="bg-sand-100"],.cp-dark body [class~="bg-sand-200"],.cp-dark body [class~="bg-[#FAF6F0]"]{background-color:#0E2A1D!important;color:#F5F3EB!important;transition:background-color .3s ease,color .3s ease}',
    '.cp-dark body [class~="text-night-900"],.cp-dark body [class~="text-night-700"],.cp-dark body [class~="text-teal-deep"]{color:#F5F3EB!important}',
    '.cp-dark body [class~="border-sand-200"],.cp-dark body [class~="border-teal-deep/15"]{border-color:rgba(255,255,255,.12)!important}',
    '.cp-dark body .p-card,.cp-dark body .service-card,.cp-dark body .amenity,.cp-dark body .mv-section,.cp-dark body .product-detail,.cp-dark body .cart-drawer{background-color:#0E2A1D!important;color:#F5F3EB!important;border-color:rgba(255,255,255,.12)!important}',
    '.cp-dark body .p-name,.cp-dark body .p-price,.cp-dark body .service-card h2,.cp-dark body .mv-heading h2,.cp-dark body h1,.cp-dark body h2,.cp-dark body h3{color:#FFC247}',
    '.cp-dark body p,.cp-dark body li,.cp-dark body .p-specs,.cp-dark body .service-card p,.cp-dark body .mv-copy p{color:#F5F3EB}',
    '.cp-dark body input,.cp-dark body textarea,.cp-dark body select{background:#112A20!important;color:#F5F3EB!important;border-color:rgba(255,255,255,.18)!important}',
    '.cp-dark body footer{background:#031109!important}',
    '.cp-dark body #obras,.cp-dark body #proyecto,.cp-dark body #resenas,.cp-dark body #ubicacion{background:#071B12!important;color:#F5F3EB!important}',
    '.cp-dark body #modelos,.cp-dark body #amenidades,.cp-dark body #como-trabajamos,.cp-dark body #faq{background:#0A2318!important;color:#F5F3EB!important}',
    '.cp-dark body #obras h2,.cp-dark body #modelos h2,.cp-dark body #amenidades h2,.cp-dark body #proyecto h2,.cp-dark body #como-trabajamos h2,.cp-dark body #faq h2,.cp-dark body #resenas h2,.cp-dark body #ubicacion h2{color:#FFD27A}',
    '.cp-dark body #obras p,.cp-dark body #modelos p,.cp-dark body #amenidades p,.cp-dark body #proyecto p,.cp-dark body #como-trabajamos p,.cp-dark body #faq p,.cp-dark body #ubicacion p,.cp-dark body li{color:#D9DED8}',
    '.cp-dark body #contacto p,.cp-dark body #inicio p,.cp-dark body footer p,.cp-dark body footer li{color:inherit}',
    '.cp-dark body details.faq{background:#0F2D20!important;border-color:rgba(255,255,255,.12)!important}',
    '.cp-dark body details.faq summary{color:#F5F3EB}',
    '.cp-dark body .rv-card{background:#0F2D20;box-shadow:0 0 0 1px rgba(255,255,255,.1)}',
    '.cp-dark body .rv-title,.cp-dark body .rv-text,.cp-dark body .rv-count{color:#F5F3EB}',
    '.cp-dark body .rv-date,.cp-dark body .rv-powered{color:#AEB8B1}',
    '.cp-dark body .rv-name{color:#8DB4FF}',
    '.cp-dark body .rv-dot{background:#3B5247}',
    '.cp-dark body .rv-dot.on{background:#FFC247}',
    '.cp-dark body .rv-arrow{color:#AEB8B1}',
    '.cp-dark body .rv-arrow:hover{color:#FFC247}',
    '.cp-dark body .field{background:#112A20!important;color:#F5F3EB!important;border-color:rgba(255,255,255,.18)!important}',
    '.cp-dark body .field::placeholder{color:#8FA097}',
    '.cp-dark body .chip{background:#0F2D20;color:#F5F3EB;border-color:rgba(255,255,255,.18)}',
    '.cp-dark body .chip[aria-pressed="true"]{background:#FFC247;color:#062B1B;border-color:#FFC247}',
    '.cp-dark body .lift:hover{box-shadow:0 24px 50px -18px rgba(0,0,0,.7),0 0 0 1px rgba(255,194,71,.5)}',
    '.cp-dark body img{filter:brightness(.92) contrast(1.03)}',
    '.cp-dark body #inicio img,.cp-dark body .rv-logo,.cp-dark body .rv-avatar img{filter:none}',
    '.cp-dark .cp-profile-dropdown{border-color:rgba(255,194,71,.3);background:linear-gradient(145deg,#112A20,#0E2A1D);color:#F5F3EB}',
    '.cp-dark .cp-profile-dropdown:before{border-color:rgba(255,194,71,.3);background:#112A20}',
    '.cp-dark .cp-profile-summary{border-color:rgba(255,255,255,.12);color:#FFC247}',
    '.cp-dark .cp-profile-item,.cp-dark .cp-theme-row{color:#F5F3EB}',
    '.cp-dark .cp-profile-item:hover{background:rgba(255,194,71,.12);color:#FFC247}',
    '.cp-dark .cp-profile-logout{border-color:rgba(255,255,255,.12);color:#ff9d91}',
    '.cp-dark .cp-profile-menu-icon{background:rgba(255,194,71,.12);color:#FFC247}',
    '.cp-dark .cp-theme-select,.cp-dark .cp-profile-dialog{border-color:rgba(255,255,255,.14);background:#0E2A1D;color:#F5F3EB}',
    '.cp-dark .cp-profile-dialog h2{color:#FFC247}',
    '.cp-dark .cp-profile-dialog-head{border-color:rgba(255,255,255,.12)}',
    '.cp-dark .cp-profile-field,.cp-dark .cp-profile-eyebrow,.cp-dark .cp-profile-file-label{color:#FFC247}',
    '.cp-dark .cp-profile-field input{border-color:rgba(255,255,255,.18);background:#112A20;color:#F5F3EB}',
    '.cp-dark .cp-profile-photo-preview{background:#112A20;color:#FFC247}',
    '.cp-dark .cp-profile-photo-row small,.cp-dark .cp-profile-email-note{color:#d6d2c5}',
    '.cp-dark .cp-dialog-close,.cp-dark .cp-dialog-cancel{border-color:rgba(255,255,255,.22);color:#F5F3EB}',
    '.cp-dark .cp-profile-dialog::backdrop{background:rgba(0,0,0,.78)}',
    '@keyframes cpProfileIn{from{opacity:0;transform:translateY(-5px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}',
    '@media(max-width:480px){.cp-profile-trigger{width:42px;height:42px}.cp-profile-dropdown{right:-.25rem;top:calc(100% + .65rem)}.cp-profile-dialog-actions{flex-direction:column-reverse}.cp-dialog-cancel,.cp-dialog-save{width:100%}}',
    '@media(prefers-reduced-motion:reduce){.cp-profile-dropdown{animation:none}.cp-profile-trigger,.cp-profile-item,.cp-dialog-close,.cp-dialog-cancel,.cp-dialog-save{transition:none}}'
  ].join('');
  document.head.appendChild(style);

  applyTheme(storedTheme());
  updateHeaders();
  window.addEventListener('cp-session-change', function () {
    activeUser = currentUser();
    refreshMenus();
  });
  window.addEventListener('pageshow', updateHeaders);
  window.addEventListener('storage', function (event) {
    if (event.key === THEME_KEY) applyTheme(storedTheme());
    if (event.key === USERS_KEY) {
      activeUser = currentUser();
      document.querySelectorAll('.cp-profile-menu').forEach(function (menu) {
        var link = document.createElement('a');
        link.href = 'miobra.html';
        link.className = menu.dataset.originalClass || '';
        link.dataset.sessionLink = '';
        menu.replaceWith(link);
      });
      updateHeaders();
    }
  });
  document.addEventListener('click', function (event) {
    if (!event.target.closest('.cp-profile-menu')) closeMenus();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMenus();
  });
})();
