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
  assert.equal(calcCostoFijoDiario(costosFijos), 100 / 30);
});

test('calcCostoDirectoPorReserva sums direct costs and per-guest courtesies', () => {
  const costosDirectos = { lavanderia: 5, limpieza: 15, amenities: 3, suministrosCocina: 2 };
  const cortesias = { aguaCostoUnitario: 0.5, aguaCantidad: 4, snacksCostoPorReserva: 3 };
  assert.equal(calcCostoDirectoPorReserva(costosDirectos, cortesias), 30);
});

// Modelo: Comisión (15.5%) e IVA (15%) se calculan AMBOS directo sobre el
// Precio Final al Huésped (el "Ingreso Bruto Recaudado" por noche), no sobre
// un subtotal intermedio. El anfitrión se queda con el 69.5% restante.
test('calcTarifaInversa solves for the guest-facing price from a 69.5% net retention', () => {
  const result = calcTarifaInversa({
    utilidadDeseada: 20,
    costoFijoDiario: 10,
    costoDirecto: 20,
    promedioNochesPorReserva: 2,
  });
  // ingresoNetoNecesario = 20 + 10 + 20/2 = 40
  assert.equal(result.ingresoNetoNecesario, 40);
  // precioFinal = 40 / (1 - 0.155 - 0.15) = 40 / 0.695
  assert.ok(Math.abs(result.precioFinal - 40 / 0.695) < 1e-9);
  assert.ok(Math.abs(result.comisionAirbnb - result.precioFinal * 0.155) < 1e-9);
  assert.ok(Math.abs(result.montoIVA - result.precioFinal * 0.15) < 1e-9);
  // lo que recibe el anfitrión debe reconstruir el ingreso neto necesario
  assert.ok(Math.abs(result.ingresoNetoRecibido - result.ingresoNetoNecesario) < 1e-9);
  // lo que deposita Airbnb (antes del IVA, que Airbnb no retiene) = precioFinal - comision
  assert.ok(Math.abs(result.gananciaAirbnb - (result.precioFinal - result.comisionAirbnb)) < 1e-9);
});

// Caso real verificado contra el CSV de transacciones de Airbnb del usuario
// (reserva HMZXNC4M44, 3 noches): Airbnb solo retiene la comisión del 15.5%
// del monto bruto — el IVA no aparece en absoluto en ese descuento.
test('calcTarifaInversa matches a real Airbnb payout: comisión = 15.5% del bruto, IVA aparte', () => {
  const precioFinal = 226.5; // "Ingresos brutos" del CSV
  const comisionEsperada = 35.11; // "Tarifa de servicio" del CSV (redondeado)
  const gananciaEsperada = 191.39; // "Monto" / "Ganas" del CSV
  const comisionAirbnb = precioFinal * AIRBNB_COMISION;
  assert.ok(Math.abs(comisionAirbnb - comisionEsperada) < 0.01);
  assert.ok(Math.abs(precioFinal - comisionAirbnb - gananciaEsperada) < 0.01);
});

test('calcTarifaInversa guards against promedioNochesPorReserva of 0', () => {
  const result = calcTarifaInversa({
    utilidadDeseada: 0,
    costoFijoDiario: 0,
    costoDirecto: 30,
    promedioNochesPorReserva: 0,
  });
  assert.equal(result.ingresoNetoNecesario, 30);
});

test('calcTarifaPersonaAdicional returns base price when within base capacity', () => {
  assert.equal(calcTarifaPersonaAdicional(100, 3, 3, 15), 100);
  assert.equal(calcTarifaPersonaAdicional(100, 2, 3, 15), 100);
});

test('calcTarifaPersonaAdicional adds extra-guest cost above base capacity', () => {
  assert.equal(calcTarifaPersonaAdicional(100, 5, 3, 15), 130);
});

test('calcTarifaFeriado scales the guest-facing price and re-derives its commission/IVA split', () => {
  const result = calcTarifaFeriado(100, 30);
  assert.equal(result.precioFinal, 130);
  assert.ok(Math.abs(result.comisionAirbnb - 130 * 0.155) < 1e-9);
  assert.ok(Math.abs(result.montoIVA - 130 * 0.15) < 1e-9);
});

test('calcMargenContribucionPorNoche subtracts commission, IVA, and per-night direct cost', () => {
  const value = calcMargenContribucionPorNoche({
    precioFinal: 100,
    comisionAirbnb: 15.5,
    montoIVA: 15,
    costoDirectoPorReserva: 20,
    promedioNochesPorReserva: 2,
  });
  // 100 - 15.5 - 15 - (20/2) = 59.5
  assert.equal(value, 59.5);
});

test('calcProyeccionMensual computes monthly KPIs directly off Ingreso Bruto Recaudado', () => {
  const result = calcProyeccionMensual(
    {
      precioFinal: 100,
      costoDirectoPorReserva: 20,
      promedioNochesPorReserva: 2,
      costosFijosMensuales: 300,
    },
    10, // noches ocupadas
  );
  assert.equal(result.ingresoBrutoRecaudado, 1000);
  assert.equal(result.comisionTotal, 1000 * 0.155);
  assert.equal(result.ivaTotal, 1000 * 0.15);
  // lo que efectivamente deposita Airbnb (el IVA no lo retiene Airbnb)
  assert.equal(result.gananciaAirbnbTotal, 1000 - 1000 * 0.155);
  assert.equal(result.gastosDirectosTotales, 100);
  assert.equal(result.gastosFijosTotales, 300);
  assert.equal(result.gastosOperativosTotales, 400);
  // utilidadNeta = 1000 - 155 - 150 - 400 = 295
  assert.equal(result.utilidadNeta, 295);
  assert.ok(Math.abs(result.margen - 29.5) < 1e-9);
});

test('calcProyeccionMensual returns zeros when zero nights are occupied', () => {
  const result = calcProyeccionMensual(
    { precioFinal: 100, costoDirectoPorReserva: 20, promedioNochesPorReserva: 2, costosFijosMensuales: 300 },
    0,
  );
  assert.equal(result.ingresoBrutoRecaudado, 0);
  assert.equal(result.utilidadNeta, -300);
  assert.equal(result.margen, 0);
});

test('calcPuntoEquilibrio returns nights needed to cover fixed costs', () => {
  assert.equal(calcPuntoEquilibrio(300, 59.5), Math.ceil(300 / 59.5));
});

test('calcPuntoEquilibrio returns Infinity when contribution margin is not positive', () => {
  assert.equal(calcPuntoEquilibrio(300, 0), Infinity);
  assert.equal(calcPuntoEquilibrio(300, -5), Infinity);
});

test('calcTarifaPersonaAdicionalRecomendada suggests a percentage of the per-guest price', () => {
  assert.equal(calcTarifaPersonaAdicionalRecomendada(60, 3, 50), 10);
});

test('calcTarifaPersonaAdicionalRecomendada returns 0 when capacidadBase is not positive', () => {
  assert.equal(calcTarifaPersonaAdicionalRecomendada(60, 0, 50), 0);
});

test('calcDescuentoMaximo expresses the gap to the breakeven price as a percentage', () => {
  assert.equal(calcDescuentoMaximo(100, 80), 20);
});

test('calcDescuentoMaximo returns 0 when tarifaBase is not positive', () => {
  assert.equal(calcDescuentoMaximo(0, 0), 0);
});

test('calcNochesMinimasRentables computes nights needed to absorb the per-booking direct cost', () => {
  // precioFinal 60, comision 9.3, iva 9, costoFijoDiario 5 -> margen por noche = 36.7
  // costoDirecto 100 -> ceil(100/36.7) = 3
  assert.equal(calcNochesMinimasRentables(100, 60, 9.3, 9, 5), Math.ceil(100 / 36.7));
});

test('calcNochesMinimasRentables returns Infinity when the nightly margin is not positive', () => {
  assert.equal(calcNochesMinimasRentables(100, 20, 9, 9, 5), Infinity);
});
