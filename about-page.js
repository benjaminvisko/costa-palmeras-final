/* about — about-page.js */
(function () {
      if (window.lucide) lucide.createIcons();
      var burger = document.getElementById('burger');
      var drawer = document.getElementById('drawer');
      var heroVideo = document.getElementById('heroVideo');
      if (heroVideo && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        heroVideo.removeAttribute('autoplay');
        heroVideo.pause();
      }
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
    })();
