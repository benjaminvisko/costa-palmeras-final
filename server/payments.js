'use strict';
const crypto = require('crypto');
const config = require('./config');

// Ambos drivers devuelven la misma forma: { ref, checkoutUrl, status }.
async function createMock(order) {
  const ref = 'MOCK-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  return { ref, status: 'pending', checkoutUrl: config.appUrl + '/carrito.html?mockpay=' + ref + '&total=' + order.total };
}

async function createMercadoPago(order) {
  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + config.payments.mpToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: order.items.map((i) => ({ title: i.name, quantity: i.qty, unit_price: i.price, currency_id: 'ARS' })),
      external_reference: order.id,
      back_urls: { success: config.appUrl + '/carrito.html?pago=ok', failure: config.appUrl + '/carrito.html?pago=error' }
    })
  });
  if (!res.ok) throw new Error('MercadoPago ' + res.status);
  const j = await res.json();
  return { ref: j.id, status: 'pending', checkoutUrl: j.init_point };
}

module.exports = { createPayment: (o) => (config.payments.driver === 'mercadopago' ? createMercadoPago(o) : createMock(o)) };
