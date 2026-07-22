// js/holidays.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CIUDADES_ECUADOR, getFeriadosNacionales2026, crearFeriadoLocal } from './holidays.js';

test('CIUDADES_ECUADOR includes the main host cities', () => {
  for (const ciudad of ['Loja', 'Quito', 'Guayaquil', 'Cuenca', 'Salinas']) {
    assert.ok(CIUDADES_ECUADOR.includes(ciudad), `esperaba encontrar ${ciudad}`);
  }
});

test('getFeriadosNacionales2026 returns a fresh, non-empty array of holidays', () => {
  const feriados = getFeriadosNacionales2026();
  assert.ok(Array.isArray(feriados));
  assert.ok(feriados.length >= 10);
  for (const f of feriados) {
    assert.equal(typeof f.nombre, 'string');
    assert.match(f.fecha, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(typeof f.esNacional, 'boolean');
  }
  // mutating the returned array must not affect the next call (fresh copy)
  feriados.push({ nombre: 'x', fecha: '2026-01-01', esNacional: true });
  assert.notEqual(getFeriadosNacionales2026().length, feriados.length);
});

test('getFeriadosNacionales2026 includes Navidad on 2026-12-25', () => {
  const feriados = getFeriadosNacionales2026();
  assert.ok(feriados.some((f) => f.nombre === 'Navidad' && f.fecha === '2026-12-25'));
});

test('crearFeriadoLocal builds a non-national holiday entry', () => {
  const f = crearFeriadoLocal('Feria de Loja', '2026-09-08');
  assert.deepEqual(f, { nombre: 'Feria de Loja', fecha: '2026-09-08', esNacional: false });
});
