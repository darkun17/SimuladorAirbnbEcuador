// js/locations.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PROVINCIAS_ECUADOR } = require('./locations.js');

test('PROVINCIAS_ECUADOR has all 24 official provinces of Ecuador', () => {
  assert.equal(PROVINCIAS_ECUADOR.length, 24);
});

test('every province has a non-empty list of cantones', () => {
  for (const p of PROVINCIAS_ECUADOR) {
    assert.equal(typeof p.provincia, 'string');
    assert.ok(p.provincia.length > 0);
    assert.ok(Array.isArray(p.cantones));
    assert.ok(p.cantones.length > 0, `${p.provincia} has no cantones`);
  }
});

test('total canton count matches Ecuador official count (~222)', () => {
  const total = PROVINCIAS_ECUADOR.reduce((sum, p) => sum + p.cantones.length, 0);
  assert.ok(total >= 220 && total <= 225, `expected ~222 cantones, got ${total}`);
});

test('no duplicate province names', () => {
  const names = PROVINCIAS_ECUADOR.map((p) => p.provincia);
  assert.equal(new Set(names).size, names.length);
});

test('includes key provinces referenced elsewhere in the app (Loja, Pichincha, Guayas)', () => {
  const names = PROVINCIAS_ECUADOR.map((p) => p.provincia);
  assert.ok(names.includes('Loja'));
  assert.ok(names.includes('Pichincha'));
  assert.ok(names.includes('Guayas'));
});
