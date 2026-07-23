// js/ui.js
import {
  calcCostoFijoDiario,
  calcCostoDirectoPorReserva,
  calcTarifaInversa,
  calcTarifaPersonaAdicional,
  calcTarifaFeriado,
  calcMargenContribucionPorNoche,
  calcProyeccionMensual,
  calcPuntoEquilibrio,
  sumValues,
} from './calculations.js';
import { crearFeriadoLocal } from './holidays.js';
import { sanitizeNumber } from './state.js';
import { renderDoughnutChart, renderBarChart } from './charts.js';

const fmt = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });

function computeAll(state) {
  const costoFijoDiario = calcCostoFijoDiario(state.costosFijos);
  const costosFijosMensuales = sumValues(state.costosFijos);
  const costoDirectoPorReserva = calcCostoDirectoPorReserva(state.costosDirectos, state.cortesias);
  const tarifa = calcTarifaInversa({
    utilidadDeseada: state.simulacion.utilidadDeseadaPorNoche,
    costoFijoDiario,
    costoDirecto: costoDirectoPorReserva,
    promedioNochesPorReserva: state.simulacion.promedioNochesPorReserva,
  });
  const tarifaPersonaAdicional = calcTarifaPersonaAdicional(
    tarifa.precioBase,
    state.simulacion.huespedesReales,
    state.configuracion.capacidadBase,
    state.configuracion.costoHuespedExtra,
  );
  const tarifaFeriado = calcTarifaFeriado(tarifa.precioBase, state.estacionalidad.factorIncrementoTemporadaAlta);
  const margenContribucion = calcMargenContribucionPorNoche({
    precioBase: tarifa.precioBase,
    comisionAirbnb: tarifa.comisionAirbnb,
    costoDirectoPorReserva,
    promedioNochesPorReserva: state.simulacion.promedioNochesPorReserva,
  });
  const puntoEquilibrio = calcPuntoEquilibrio(costosFijosMensuales, margenContribucion);
  const proyeccion = calcProyeccionMensual(
    {
      precioBase: tarifa.precioBase,
      costoDirectoPorReserva,
      promedioNochesPorReserva: state.simulacion.promedioNochesPorReserva,
      costosFijosMensuales,
    },
    state.simulacion.nochesOcupadasMes,
  );
  const curvaUtilidad = [];
  for (let noches = 1; noches <= 30; noches++) {
    const p = calcProyeccionMensual(
      {
        precioBase: tarifa.precioBase,
        costoDirectoPorReserva,
        promedioNochesPorReserva: state.simulacion.promedioNochesPorReserva,
        costosFijosMensuales,
      },
      noches,
    );
    curvaUtilidad.push({ noches, utilidad: p.utilidadNeta });
  }
  return { costoFijoDiario, costosFijosMensuales, costoDirectoPorReserva, tarifa, tarifaPersonaAdicional, tarifaFeriado, puntoEquilibrio, proyeccion, curvaUtilidad };
}

function bindNumberInput(root, path, getValue, onChange) {
  const el = root.querySelector(`[data-field="${path}"]`);
  if (!el) return;
  el.value = getValue();
  el.addEventListener('input', () => onChange(sanitizeNumber(el.value)));
}

export function renderDashboard(root, state) {
  const results = computeAll(state);

  root.querySelector('#kpi-tarifa-regular').textContent = fmt.format(results.tarifa.precioFinal);
  root.querySelector('#kpi-tarifa-feriado').textContent = fmt.format(results.tarifaFeriado.precioFinal);
  root.querySelector('#kpi-tarifa-persona-extra').textContent = fmt.format(state.configuracion.costoHuespedExtra);

  root.querySelector('#kpi-ingreso-bruto').textContent = fmt.format(results.proyeccion.ingresoBrutoRecaudado);
  root.querySelector('#kpi-comision').textContent = fmt.format(results.proyeccion.comisionTotal);
  root.querySelector('#kpi-iva').textContent = fmt.format(results.proyeccion.ivaTotal);
  root.querySelector('#kpi-gastos').textContent = fmt.format(results.proyeccion.gastosOperativosTotales);
  root.querySelector('#kpi-utilidad').textContent = fmt.format(results.proyeccion.utilidadNeta);
  root.querySelector('#kpi-margen').textContent = `${results.proyeccion.margen.toFixed(1)}%`;
  root.querySelector('#kpi-break-even').textContent =
    results.puntoEquilibrio === Infinity ? 'No alcanzable con esta tarifa' : `${results.puntoEquilibrio} noches/mes`;

  renderDoughnutChart(root.querySelector('#chart-doughnut'), results.proyeccion);
  renderBarChart(root.querySelector('#chart-bar'), results.curvaUtilidad);

  return results;
}

export function renderFeriados(root, feriados, onChange) {
  const tbody = root.querySelector('#tabla-feriados tbody');
  tbody.innerHTML = '';
  feriados.forEach((f, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-3 py-2"><input type="text" value="${f.nombre}" data-idx="${index}" data-field="nombre" class="w-full rounded-lg border-slate-200 border px-2 py-1"></td>
      <td class="px-3 py-2"><input type="date" value="${f.fecha}" data-idx="${index}" data-field="fecha" class="w-full rounded-lg border-slate-200 border px-2 py-1"></td>
      <td class="px-3 py-2 text-center">${f.esNacional ? 'Nacional' : 'Local'}</td>
      <td class="px-3 py-2 text-center">
        <button type="button" data-remove-idx="${index}" class="text-red-500 hover:underline">Eliminar</button>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('input[data-field]').forEach((input) => {
    input.addEventListener('input', () => {
      const idx = Number(input.dataset.idx);
      const field = input.dataset.field;
      const next = feriados.map((f, i) => (i === idx ? { ...f, [field]: input.value } : f));
      onChange(next);
    });
  });
  tbody.querySelectorAll('button[data-remove-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.removeIdx);
      onChange(feriados.filter((_, i) => i !== idx));
    });
  });

  root.querySelector('#btn-agregar-feriado').onclick = () => {
    onChange([...feriados, crearFeriadoLocal('Nueva fiesta local', new Date().toISOString().slice(0, 10))]);
  };
}

export function bindStepForm(root, state, onStateChange) {
  const fields = [
    ['costosFijos.alicuota', () => state.costosFijos.alicuota, (v) => onStateChange({ costosFijos: { alicuota: v } })],
    ['costosFijos.internet', () => state.costosFijos.internet, (v) => onStateChange({ costosFijos: { internet: v } })],
    ['costosFijos.seguro', () => state.costosFijos.seguro, (v) => onStateChange({ costosFijos: { seguro: v } })],
    ['costosFijos.agua', () => state.costosFijos.agua, (v) => onStateChange({ costosFijos: { agua: v } })],
    ['costosFijos.luz', () => state.costosFijos.luz, (v) => onStateChange({ costosFijos: { luz: v } })],
    ['costosFijos.otros', () => state.costosFijos.otros, (v) => onStateChange({ costosFijos: { otros: v } })],
    ['costosDirectos.lavanderia', () => state.costosDirectos.lavanderia, (v) => onStateChange({ costosDirectos: { lavanderia: v } })],
    ['costosDirectos.limpieza', () => state.costosDirectos.limpieza, (v) => onStateChange({ costosDirectos: { limpieza: v } })],
    ['costosDirectos.amenities', () => state.costosDirectos.amenities, (v) => onStateChange({ costosDirectos: { amenities: v } })],
    ['costosDirectos.suministrosCocina', () => state.costosDirectos.suministrosCocina, (v) => onStateChange({ costosDirectos: { suministrosCocina: v } })],
    ['cortesias.aguaCostoUnitario', () => state.cortesias.aguaCostoUnitario, (v) => onStateChange({ cortesias: { aguaCostoUnitario: v } })],
    ['cortesias.aguaCantidad', () => state.cortesias.aguaCantidad, (v) => onStateChange({ cortesias: { aguaCantidad: v } })],
    ['cortesias.snacksCostoPorReserva', () => state.cortesias.snacksCostoPorReserva, (v) => onStateChange({ cortesias: { snacksCostoPorReserva: v } })],
    ['configuracion.habitaciones', () => state.configuracion.habitaciones, (v) => onStateChange({ configuracion: { habitaciones: v } })],
    ['configuracion.banos', () => state.configuracion.banos, (v) => onStateChange({ configuracion: { banos: v } })],
    ['configuracion.capacidadBase', () => state.configuracion.capacidadBase, (v) => onStateChange({ configuracion: { capacidadBase: v } })],
    ['configuracion.capacidadMaxima', () => state.configuracion.capacidadMaxima, (v) => onStateChange({ configuracion: { capacidadMaxima: v } })],
    ['configuracion.costoHuespedExtra', () => state.configuracion.costoHuespedExtra, (v) => onStateChange({ configuracion: { costoHuespedExtra: v } })],
    ['estacionalidad.factorIncrementoTemporadaAlta', () => state.estacionalidad.factorIncrementoTemporadaAlta, (v) => onStateChange({ estacionalidad: { factorIncrementoTemporadaAlta: v } })],
    ['simulacion.utilidadDeseadaPorNoche', () => state.simulacion.utilidadDeseadaPorNoche, (v) => onStateChange({ simulacion: { utilidadDeseadaPorNoche: v } })],
    ['simulacion.promedioNochesPorReserva', () => state.simulacion.promedioNochesPorReserva, (v) => onStateChange({ simulacion: { promedioNochesPorReserva: v } })],
    ['simulacion.huespedesReales', () => state.simulacion.huespedesReales, (v) => onStateChange({ simulacion: { huespedesReales: v } })],
  ];
  fields.forEach(([path, getValue, onChange]) => bindNumberInput(root, path, getValue, onChange));

  const ciudadSelect = root.querySelector('[data-field="estacionalidad.ciudad"]');
  if (ciudadSelect) {
    ciudadSelect.value = state.estacionalidad.ciudad;
    ciudadSelect.addEventListener('change', () => onStateChange({ estacionalidad: { ciudad: ciudadSelect.value } }));
  }

  const slider = root.querySelector('[data-field="simulacion.nochesOcupadasMes"]');
  if (slider) {
    slider.value = state.simulacion.nochesOcupadasMes;
    slider.addEventListener('input', () => onStateChange({ simulacion: { nochesOcupadasMes: sanitizeNumber(slider.value) } }));
  }

  renderFeriados(root, state.estacionalidad.feriados, (feriados) => onStateChange({ estacionalidad: { feriados } }));
}

export function bindStepNavigation(root) {
  const steps = Array.from(root.querySelectorAll('[data-step]'));
  const tabs = Array.from(root.querySelectorAll('[data-step-tab]'));
  function showStep(name) {
    steps.forEach((s) => s.classList.toggle('hidden', s.dataset.step !== name));
    tabs.forEach((t) => t.classList.toggle('bg-emerald-500', t.dataset.stepTab === name));
    tabs.forEach((t) => t.classList.toggle('text-white', t.dataset.stepTab === name));
  }
  tabs.forEach((t) => t.addEventListener('click', () => showStep(t.dataset.stepTab)));
  showStep(tabs[0]?.dataset.stepTab);
}
