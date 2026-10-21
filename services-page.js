/* services — services-page.js */
var burger = document.getElementById('burger');
    var drawer = document.getElementById('drawer');
    burger.addEventListener('click', function () {
      var expanded = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!expanded));
      drawer.classList.toggle('hidden', expanded);
    });
    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        drawer.classList.add('hidden');
        burger.setAttribute('aria-expanded', 'false');
      });
    });

    var serviceTabs = Array.from(document.querySelectorAll('[data-service-tab]'));
    var servicePanels = Array.from(document.querySelectorAll('[data-service-panel]'));

    function selectServiceTab(tab, focusTab) {
      var activeCategory = tab.dataset.serviceTab;
      serviceTabs.forEach(function (item) {
        var selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
      });
      servicePanels.forEach(function (panel) {
        var selected = panel.dataset.servicePanel === activeCategory;
        panel.hidden = !selected;
        panel.classList.toggle('hidden', !selected);
      });
      if (focusTab) tab.focus();
      if (window.lucide) lucide.createIcons();
    }

    serviceTabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { selectServiceTab(tab, false); });
      tab.addEventListener('keydown', function (event) {
        var nextIndex = index;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % serviceTabs.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + serviceTabs.length) % serviceTabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = serviceTabs.length - 1;
        else return;
        event.preventDefault();
        selectServiceTab(serviceTabs[nextIndex], true);
      });
    });

    document.querySelectorAll('[data-product-gallery]').forEach(function (gallery) {
      var track = gallery.querySelector('.product-gallery-track');
      var count = gallery.querySelector('.product-gallery-count');
      var slides = track.querySelectorAll('img');
      var index = 0;

      function showSlide(nextIndex) {
        index = (nextIndex + slides.length) % slides.length;
        track.style.transform = 'translateX(-' + (index * 100) + '%)';
        count.textContent = (index + 1) + ' / ' + slides.length;
      }

      gallery.querySelector('[data-gallery-prev]').addEventListener('click', function () {
        showSlide(index - 1);
      });
      gallery.querySelector('[data-gallery-next]').addEventListener('click', function () {
        showSlide(index + 1);
      });
    });

    if (window.lucide) lucide.createIcons();
