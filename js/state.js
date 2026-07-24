// js/state.js
(function (root) {
  const holidays =
    typeof module !== 'undefined' && module.exports ? require('./holidays.js') : root.Sim.holidays;
  const { getFeriadosNacionales2026 } = holidays;

  function createDefaultState() {
    return {
      costosFijos: { alicuota: 0, internet: 0, seguro: 0, agua: 0, luz: 0, otros: 0 },
      costosDirectos: { lavanderia: 0, limpieza: 0, amenities: 0, suministrosCocina: 0 },
      cortesias: { aguaCostoUnitario: 0, aguaCantidad: 0, snacksCostoPorReserva: 0 },
      configuracion: { habitaciones: 1, banos: 1, capacidadBase: 3, capacidadMaxima: 6, porcentajePersonaAdicional: 50 },
      estacionalidad: {
        ciudad: 'Loja',
        factorIncrementoTemporadaAlta: 30,
        feriados: getFeriadosNacionales2026(),
      },
      simulacion: {
        utilidadDeseadaPorNoche: 0,
        promedioNochesPorReserva: 2,
        huespedesReales: 3,
        nochesOcupadasMes: 15,
      },
    };
  }

  function sanitizeNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }

  function sanitizeInteger(value) {
    return Math.round(sanitizeNumber(value));
  }

  function mergeState(current, patch) {
    const next = { ...current };
    for (const [section, values] of Object.entries(patch)) {
      if (values && typeof values === 'object' && !Array.isArray(values)) {
        next[section] = { ...current[section], ...values };
      } else {
        next[section] = values;
      }
    }
    return next;
  }

  const api = { createDefaultState, sanitizeNumber, sanitizeInteger, mergeState };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Sim = root.Sim || {};
    root.Sim.state = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
