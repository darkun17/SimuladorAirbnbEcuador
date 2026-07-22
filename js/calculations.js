// js/calculations.js

// Comision que Airbnb retiene solo al anfitrion (Ecuador)
export const AIRBNB_COMISION = 0.155;
// IVA Ecuador aplicado sobre el precio base publicado
export const IVA_ECUADOR = 0.15;
export const DIAS_MES = 30;

export function sumValues(obj) {
  return Object.values(obj).reduce((sum, v) => sum + (Number(v) || 0), 0);
}

export function calcCostoFijoDiario(costosFijos) {
  return sumValues(costosFijos) / DIAS_MES;
}

export function calcCostoDirectoPorReserva(costosDirectos, cortesias) {
  const directos = sumValues(costosDirectos);
  const costoCortesias =
    (Number(cortesias.aguaCostoUnitario) || 0) * (Number(cortesias.aguaCantidad) || 0) +
    (Number(cortesias.snacksCostoPorReserva) || 0);
  return directos + costoCortesias;
}

export function calcTarifaInversa({ utilidadDeseada, costoFijoDiario, costoDirecto, promedioNochesPorReserva }) {
  const noches = promedioNochesPorReserva > 0 ? promedioNochesPorReserva : 1;
  const ingresoNetoNecesario = utilidadDeseada + costoFijoDiario + costoDirecto / noches;
  const precioBase = ingresoNetoNecesario / (1 - AIRBNB_COMISION);
  const montoIVA = precioBase * IVA_ECUADOR;
  const precioFinal = precioBase + montoIVA;
  const comisionAirbnb = precioBase * AIRBNB_COMISION;
  return { ingresoNetoNecesario, precioBase, montoIVA, precioFinal, comisionAirbnb };
}

export function calcTarifaPersonaAdicional(precioBase, huespedesReales, capacidadBase, costoHuespedExtra) {
  if (huespedesReales <= capacidadBase) return precioBase;
  const extra = (huespedesReales - capacidadBase) * costoHuespedExtra;
  return precioBase + extra;
}

export function calcTarifaFeriado(precioBase, factorIncrementoPct) {
  const precioBaseFeriado = precioBase * (1 + factorIncrementoPct / 100);
  const montoIVA = precioBaseFeriado * IVA_ECUADOR;
  const precioFinal = precioBaseFeriado + montoIVA;
  const comisionAirbnb = precioBaseFeriado * AIRBNB_COMISION;
  return { precioBase: precioBaseFeriado, montoIVA, precioFinal, comisionAirbnb };
}

export function calcMargenContribucionPorNoche({ precioBase, comisionAirbnb, costoDirectoPorReserva, promedioNochesPorReserva }) {
  const noches = promedioNochesPorReserva > 0 ? promedioNochesPorReserva : 1;
  return precioBase - comisionAirbnb - costoDirectoPorReserva / noches;
}

export function calcProyeccionMensual({ precioBase, costoDirectoPorReserva, promedioNochesPorReserva, costosFijosMensuales }, nochesOcupadas) {
  const noches = promedioNochesPorReserva > 0 ? promedioNochesPorReserva : 1;
  const reservas = nochesOcupadas / noches;
  const ingresoBrutoBase = precioBase * nochesOcupadas;
  const comisionTotal = ingresoBrutoBase * AIRBNB_COMISION;
  const ivaTotal = ingresoBrutoBase * IVA_ECUADOR;
  const ingresoBrutoRecaudado = ingresoBrutoBase + ivaTotal;
  const gastosDirectosTotales = costoDirectoPorReserva * reservas;
  const gastosFijosTotales = costosFijosMensuales;
  const gastosOperativosTotales = gastosFijosTotales + gastosDirectosTotales;
  const utilidadNeta = ingresoBrutoBase - comisionTotal - gastosOperativosTotales;
  const margen = ingresoBrutoBase > 0 ? (utilidadNeta / ingresoBrutoBase) * 100 : 0;
  return {
    ingresoBrutoRecaudado,
    comisionTotal,
    ivaTotal,
    gastosFijosTotales,
    gastosDirectosTotales,
    gastosOperativosTotales,
    utilidadNeta,
    margen,
  };
}

export function calcPuntoEquilibrio(costosFijosMensuales, margenContribucionPorNoche) {
  if (margenContribucionPorNoche <= 0) return Infinity;
  return Math.ceil(costosFijosMensuales / margenContribucionPorNoche);
}
