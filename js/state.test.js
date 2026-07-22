// js/state.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, sanitizeNumber, mergeState } from './state.js';

test('createDefaultState returns a fresh object with all required sections', () => {
  const state = createDefaultState();
  for (const key of ['costosFijos', 'costosDirectos', 'cortesias', 'configuracion', 'estacionalidad', 'simulacion']) {
    assert.ok(key in state, `falta la seccion ${key}`);
  }
  assert.ok(Array.isArray(state.estacionalidad.feriados));
  assert.ok(state.estacionalidad.feriados.length > 0);
  // must be a fresh copy each call
  const other = createDefaultState();
  state.configuracion.capacidadBase = 999;
  assert.notEqual(other.configuracion.capacidadBase, 999);
});

test('sanitizeNumber clamps negatives and invalid input to 0', () => {
  assert.equal(sanitizeNumber(-5), 0);
  assert.equal(sanitizeNumber('abc'), 0);
  assert.equal(sanitizeNumber(''), 0);
  assert.equal(sanitizeNumber(null), 0);
  assert.equal(sanitizeNumber(undefined), 0);
});

test('sanitizeNumber passes through valid non-negative numbers', () => {
  assert.equal(sanitizeNumber(12.5), 12.5);
  assert.equal(sanitizeNumber('42'), 42);
  assert.equal(sanitizeNumber(0), 0);
});

test('mergeState deep-merges a partial patch into the current state without mutating it', () => {
  const current = createDefaultState();
  const patch = { costosFijos: { alicuota: 45 }, configuracion: { capacidadBase: 4 } };
  const next = mergeState(current, patch);
  assert.equal(next.costosFijos.alicuota, 45);
  assert.equal(next.configuracion.capacidadBase, 4);
  // untouched sibling fields survive
  assert.equal(next.costosFijos.internet, current.costosFijos.internet);
  assert.equal(next.configuracion.capacidadMaxima, current.configuracion.capacidadMaxima);
  // original object is untouched
  assert.equal(current.costosFijos.alicuota, 0);
});
