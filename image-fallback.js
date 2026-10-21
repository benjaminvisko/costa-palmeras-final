/* home — image-fallback.js */
// Si una imagen falla, muestra un degradado marino con el nombre de la pieza
  function imgFallback(el) {
    el.onerror = null;
    var label = (el.alt || 'Costa Palmeras').replace(/[<>&"]/g, '');
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#145A38"/><stop offset="1" stop-color="#2FA566"/></linearGradient></defs>' +
      '<rect width="1200" height="800" fill="url(#g)"/>' +
      '<g fill="none" stroke="rgba(255,255,255,.28)" stroke-width="3"><path d="M0 560 Q150 520 300 560 T600 560 T900 560 T1200 560"/><path d="M0 620 Q150 580 300 620 T600 620 T900 620 T1200 620"/></g>' +
      '<text x="600" y="400" fill="rgba(255,255,255,.85)" font-family="Georgia,serif" font-size="44" text-anchor="middle">' + label + '</text></svg>';
    el.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
