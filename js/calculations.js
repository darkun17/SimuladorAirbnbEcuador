// js/calculations.js
// Funciones puras del motor financiero. Sin ES modules: Chrome bloquea por
// CORS los <script type="module"> cargados vía file://, y esta app se abre
// con doble clic sin servidor. Se expone via module.exports (Node/tests) o
// window.Sim.calculations (navegador).
//
// Modelo de precios: Comisión Airbnb (15.5%) e IVA (15%) se calculan AMBOS
// directo sobre el Precio Final al Huésped (el "Ingreso Bruto Recaudado"),
// no sobre un subtotal intermedio. El anfitrión se queda con el 69.5%
// restante de ese precio publicado.
(function (root) {
  // Comision que Airbnb retiene solo al anfitrion (Ecuador)
  const AIRBNB_COMISION = 0.155;
  // IVA Ecuador aplicado sobre el precio final publicado
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
    const precioFinal = ingresoNetoNecesario / (1 - AIRBNB_COMISION - IVA_ECUADOR);
    const comisionAirbnb = precioFinal * AIRBNB_COMISION;
    // Lo que Airbnb realmente deposita al anfitrión (su "Ganas"): el IVA no
    // lo retiene Airbnb, es una obligación tributaria aparte del anfitrión.
    const gananciaAirbnb = precioFinal - comisionAirbnb;
    const montoIVA = precioFinal * IVA_ECUADOR;
    const ingresoNetoRecibido = gananciaAirbnb - montoIVA;
    return { ingresoNetoNecesario, precioFinal, comisionAirbnb, gananciaAirbnb, montoIVA, ingresoNetoRecibido };
  }

  function calcTarifaPersonaAdicional(precioFinal, huespedesReales, capacidadBase, costoHuespedExtra) {
    if (huespedesReales <= capacidadBase) return precioFinal;
    const extra = (huespedesReales - capacidadBase) * costoHuespedExtra;
    return precioFinal + extra;
  }

  function calcTarifaFeriado(precioFinal, factorIncrementoPct) {
    const precioFinalFeriado = precioFinal * (1 + factorIncrementoPct / 100);
    const comisionAirbnb = precioFinalFeriado * AIRBNB_COMISION;
    const montoIVA = precioFinalFeriado * IVA_ECUADOR;
    return { precioFinal: precioFinalFeriado, comisionAirbnb, montoIVA };
  }

  function calcMargenContribucionPorNoche({ precioFinal, comisionAirbnb, montoIVA, costoDirectoPorReserva, promedioNochesPorReserva }) {
    const noches = promedioNochesPorReserva > 0 ? promedioNochesPorReserva : 1;
    return precioFinal - comisionAirbnb - montoIVA - costoDirectoPorReserva / noches;
  }

  function calcProyeccionMensual({ precioFinal, costoDirectoPorReserva, promedioNochesPorReserva, costosFijosMensuales }, nochesOcupadas) {
    const noches = promedioNochesPorReserva > 0 ? promedioNochesPorReserva : 1;
    const reservas = nochesOcupadas / noches;
    const ingresoBrutoRecaudado = precioFinal * nochesOcupadas;
    const comisionTotal = ingresoBrutoRecaudado * AIRBNB_COMISION;
    const gananciaAirbnbTotal = ingresoBrutoRecaudado - comisionTotal;
    const ivaTotal = ingresoBrutoRecaudado * IVA_ECUADOR;
    const gastosDirectosTotales = costoDirectoPorReserva * reservas;
    const gastosFijosTotales = costosFijosMensuales;
    const gastosOperativosTotales = gastosFijosTotales + gastosDirectosTotales;
    const utilidadNeta = ingresoBrutoRecaudado - comisionTotal - ivaTotal - gastosOperativosTotales;
    const margen = ingresoBrutoRecaudado > 0 ? (utilidadNeta / ingresoBrutoRecaudado) * 100 : 0;
    return {
      ingresoBrutoRecaudado,
      comisionTotal,
      gananciaAirbnbTotal,
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

  function calcTarifaPersonaAdicionalRecomendada(precioFinal, capacidadBase, porcentaje) {
    if (capacidadBase <= 0) return 0;
    return (precioFinal / capacidadBase) * (porcentaje / 100);
  }

  function calcDescuentoMaximo(tarifaFinal, precioMinimoRentable) {
    if (tarifaFinal <= 0) return 0;
    return ((tarifaFinal - precioMinimoRentable) / tarifaFinal) * 100;
  }

  function calcNochesMinimasRentables(costoDirectoPorReserva, precioFinal, comisionAirbnb, montoIVA, costoFijoDiario) {
    const margenPorNocheConFijos = precioFinal - comisionAirbnb - montoIVA - costoFijoDiario;
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
