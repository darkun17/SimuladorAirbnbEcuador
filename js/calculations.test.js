// js/calculations.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  AIRBNB_COMISION,
  IVA_ECUADOR,
  DIAS_MES,
  sumValues,
  calcCostoFijoDiario,
  calcCostoDirectoPorReserva,
  calcTarifaInversa,
  calcTarifaPersonaAdicional,
  calcTarifaFeriado,
  calcMargenContribucionPorNoche,
  calcProyeccionMensual,
  calcPuntoEquilibrio,
  calcTarifaPersonaAdicionalRecomendada,
  calcDescuentoMaximo,
  calcNochesMinimasRentables,
} = require('./calculations.js');

test('constants match Ecuador Airbnb rules', () => {
  assert.equal(AIRBNB_COMISION, 0.155);
  assert.equal(IVA_ECUADOR, 0.15);
  assert.equal(DIAS_MES, 30);
});

test('sumValues sums numeric object values, treating invalid as 0', () => {
  assert.equal(sumValues({ a: 10, b: 20.5, c: 0 }), 30.5);
  assert.equal(sumValues({ a: 'no numerico', b: 5 }), 5);
  assert.equal(sumValues({}), 0);
});

test('calcCostoFijoDiario prorates monthly fixed costs over 30 days', () => {
  const costosFijos = { alicuota: 30, internet: 25, seguro: 10, agua: 8, luz: 12, otros: 15 };
  // total = 100 -> 100 / 30
  assert.equal(calcCostoFijoDiario(costosFijos), 100 / 30);
});

test('calcCostoDirectoPorReserva sums direct costs and per-guest courtesies', () => {
  const costosDirectos = { lavanderia: 5, limpieza: 15, amenities: 3, suministrosCocina: 2 };
  const cortesias = { aguaCostoUnitario: 0.5, aguaCantidad: 4, snacksCostoPorReserva: 3 };
  // directos = 25, cortesias = 0.5*4 + 3 = 5 -> total 30
  assert.equal(calcCostoDirectoPorReserva(costosDirectos, cortesias), 30);
});

test('calcTarifaInversa applies the Ecuador reverse pricing formula', () => {
  const result = calcTarifaInversa({
    utilidadDeseada: 20,
    costoFijoDiario: 10,
    costoDirecto: 20,
    promedioNochesPorReserva: 2,
  });
  // ingresoNetoNecesario = 20 + 10 + 20/2 = 40
  assert.equal(result.ingresoNetoNecesario, 40);
  // precioBase = 40 / (1 - 0.155) = 47.337278...
  assert.ok(Math.abs(result.precioBase - 40 / 0.845) < 1e-9);
  assert.ok(Math.abs(result.montoIVA - result.precioBase * 0.15) < 1e-9);
  assert.ok(Math.abs(result.precioFinal - (result.precioBase + result.montoIVA)) < 1e-9);
  assert.ok(Math.abs(result.comisionAirbnb - result.precioBase * 0.155) < 1e-9);
});

test('calcTarifaInversa guards against promedioNochesPorReserva of 0', () => {
  const result = calcTarifaInversa({
    utilidadDeseada: 0,
    costoFijoDiario: 0,
    costoDirecto: 30,
    promedioNochesPorReserva: 0,
  });
  // treated as 1 night, not divide-by-zero
  assert.equal(result.ingresoNetoNecesario, 30);
});

test('calcTarifaPersonaAdicional returns base price when within base capacity', () => {
  assert.equal(calcTarifaPersonaAdicional(100, 3, 3, 15), 100);
  assert.equal(calcTarifaPersonaAdicional(100, 2, 3, 15), 100);
});

test('calcTarifaPersonaAdicional adds extra-guest cost above base capacity', () => {
  // 5 guests, base 3, extra cost 15 -> +2*15 = 30
  assert.equal(calcTarifaPersonaAdicional(100, 5, 3, 15), 130);
});

test('calcTarifaFeriado increases base price by the seasonal factor before re-taxing', () => {
  const result = calcTarifaFeriado(100, 30);
  assert.equal(result.precioBase, 130);
  assert.ok(Math.abs(result.montoIVA - 19.5) < 1e-9);
  assert.ok(Math.abs(result.precioFinal - 149.5) < 1e-9);
  assert.ok(Math.abs(result.comisionAirbnb - 130 * 0.155) < 1e-9);
});

test('calcMargenContribucionPorNoche subtracts commission and per-night direct cost', () => {
  const value = calcMargenContribucionPorNoche({
    precioBase: 100,
    comisionAirbnb: 15.5,
    costoDirectoPorReserva: 20,
    promedioNochesPorReserva: 2,
  });
  // 100 - 15.5 - (20/2) = 74.5
  assert.equal(value, 74.5);
});

test('calcProyeccionMensual computes monthly KPIs for a given occupancy', () => {
  const result = calcProyeccionMensual(
    {
      precioBase: 100,
      costoDirectoPorReserva: 20,
      promedioNochesPorReserva: 2,
      costosFijosMensuales: 300,
    },
    10, // noches ocupadas
  );
  // ingresoBrutoBase = 100 * 10 = 1000
  assert.equal(result.ingresoBrutoRecaudado, 1000 + 1000 * 0.15);
  assert.equal(result.comisionTotal, 1000 * 0.155);
  assert.equal(result.ivaTotal, 1000 * 0.15);
  // reservas = 10 / 2 = 5 -> gastosDirectosTotales = 5 * 20 = 100
  assert.equal(result.gastosDirectosTotales, 100);
  assert.equal(result.gastosFijosTotales, 300);
  assert.equal(result.gastosOperativosTotales, 400);
  // utilidadNeta = 1000 - 155 - 400 = 445
  assert.equal(result.utilidadNeta, 445);
  assert.ok(Math.abs(result.margen - 44.5) < 1e-9);
});

test('calcProyeccionMensual returns zeros when zero nights are occupied', () => {
  const result = calcProyeccionMensual(
    { precioBase: 100, costoDirectoPorReserva: 20, promedioNochesPorReserva: 2, costosFijosMensuales: 300 },
    0,
  );
  assert.equal(result.ingresoBrutoRecaudado, 0);
  assert.equal(result.utilidadNeta, -300);
  assert.equal(result.margen, 0);
});

test('calcPuntoEquilibrio returns nights needed to cover fixed costs', () => {
  assert.equal(calcPuntoEquilibrio(300, 74.5), Math.ceil(300 / 74.5));
});

test('calcPuntoEquilibrio returns Infinity when contribution margin is not positive', () => {
  assert.equal(calcPuntoEquilibrio(300, 0), Infinity);
  assert.equal(calcPuntoEquilibrio(300, -5), Infinity);
});

test('calcTarifaPersonaAdicionalRecomendada suggests a percentage of the per-guest base rate', () => {
  // precioBase 60, capacidadBase 3 -> per-guest = 20, 50% of that = 10
  assert.equal(calcTarifaPersonaAdicionalRecomendada(60, 3, 50), 10);
});

test('calcTarifaPersonaAdicionalRecomendada returns 0 when capacidadBase is not positive', () => {
  assert.equal(calcTarifaPersonaAdicionalRecomendada(60, 0, 50), 0);
});

test('calcDescuentoMaximo expresses the gap to the breakeven price as a percentage', () => {
  // base 100, minimo rentable 80 -> 20% max discount
  assert.equal(calcDescuentoMaximo(100, 80), 20);
});

test('calcDescuentoMaximo returns 0 when tarifaBase is not positive', () => {
  assert.equal(calcDescuentoMaximo(0, 0), 0);
});

test('calcNochesMinimasRentables computes nights needed to absorb the per-booking direct cost', () => {
  // precioBase 60, comision 9.3, costoFijoDiario 5 -> margen por noche = 45.7
  // costoDirecto 100 -> ceil(100/45.7) = 3
  assert.equal(calcNochesMinimasRentables(100, 60, 9.3, 5), Math.ceil(100 / 45.7));
});

test('calcNochesMinimasRentables returns Infinity when the nightly margin is not positive', () => {
  assert.equal(calcNochesMinimasRentables(100, 10, 9, 5), Infinity);
});
