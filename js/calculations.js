// js/calculations.js
// Funciones puras del motor financiero. Sin ES modules: Chrome bloquea por
// CORS los <script type="module"> cargados vía file://, y esta app se abre
// con doble clic sin servidor. Se expone via module.exports (Node/tests) o
// window.Sim.calculations (navegador).
(function (root) {
  // Comision que Airbnb retiene solo al anfitrion (Ecuador)
  const AIRBNB_COMISION = 0.155;
  // IVA Ecuador aplicado sobre el precio base publicado
  const IVA_ECUADOR = 0.15;
  const DIAS_MES = 30;

  function sumValues(obj) {
    return Object.values(obj).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }

  function calcCostoFijoDiario(costosFijos) {
    return sumValues(costosFijos) / DIAS_MES;
  }

  function calcCostoDirectoPorReserva(costosDirectos, cortesias) {
    const directos = sumValues(costosDirectos);
    const costoCortesias =
      (Number(cortesias.aguaCostoUnitario) || 0) * (Number(cortesias.aguaCantidad) || 0) +
      (Number(cortesias.snacksCostoPorReserva) || 0);
    return directos + costoCortesias;
  }

  function calcTarifaInversa({ utilidadDeseada, costoFijoDiario, costoDirecto, promedioNochesPorReserva }) {
    const noches = promedioNochesPorReserva > 0 ? promedioNochesPorReserva : 1;
    const ingresoNetoNecesario = utilidadDeseada + costoFijoDiario + costoDirecto / noches;
    const precioBase = ingresoNetoNecesario / (1 - AIRBNB_COMISION);
    const montoIVA = precioBase * IVA_ECUADOR;
    const precioFinal = precioBase + montoIVA;
    const comisionAirbnb = precioBase * AIRBNB_COMISION;
    return { ingresoNetoNecesario, precioBase, montoIVA, precioFinal, comisionAirbnb };
  }

  function calcTarifaPersonaAdicional(precioBase, huespedesReales, capacidadBase, costoHuespedExtra) {
    if (huespedesReales <= capacidadBase) return precioBase;
    const extra = (huespedesReales - capacidadBase) * costoHuespedExtra;
    return precioBase + extra;
  }

  function calcTarifaFeriado(precioBase, factorIncrementoPct) {
    const precioBaseFeriado = precioBase * (1 + factorIncrementoPct / 100);
    const montoIVA = precioBaseFeriado * IVA_ECUADOR;
    const precioFinal = precioBaseFeriado + montoIVA;
    const comisionAirbnb = precioBaseFeriado * AIRBNB_COMISION;
    return { precioBase: precioBaseFeriado, montoIVA, precioFinal, comisionAirbnb };
  }

  function calcMargenContribucionPorNoche({ precioBase, comisionAirbnb, costoDirectoPorReserva, promedioNochesPorReserva }) {
    const noches = promedioNochesPorReserva > 0 ? promedioNochesPorReserva : 1;
    return precioBase - comisionAirbnb - costoDirectoPorReserva / noches;
  }

  function calcProyeccionMensual({ precioBase, costoDirectoPorReserva, promedioNochesPorReserva, costosFijosMensuales }, nochesOcupadas) {
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

  function calcPuntoEquilibrio(costosFijosMensuales, margenContribucionPorNoche) {
    if (margenContribucionPorNoche <= 0) return Infinity;
    return Math.ceil(costosFijosMensuales / margenContribucionPorNoche);
  }

  function calcTarifaPersonaAdicionalRecomendada(precioBase, capacidadBase, porcentaje) {
    if (capacidadBase <= 0) return 0;
    return (precioBase / capacidadBase) * (porcentaje / 100);
  }

  function calcDescuentoMaximo(tarifaBase, precioMinimoRentable) {
    if (tarifaBase <= 0) return 0;
    return ((tarifaBase - precioMinimoRentable) / tarifaBase) * 100;
  }

  function calcNochesMinimasRentables(costoDirectoPorReserva, precioBase, comisionAirbnb, costoFijoDiario) {
    const margenPorNocheConFijos = precioBase - comisionAirbnb - costoFijoDiario;
    if (margenPorNocheConFijos <= 0) return Infinity;
    return Math.ceil(costoDirectoPorReserva / margenPorNocheConFijos);
  }

  const api = {
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
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Sim = root.Sim || {};
    root.Sim.calculations = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
