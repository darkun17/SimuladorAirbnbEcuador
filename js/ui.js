// js/ui.js
window.Sim = window.Sim || {};

(function () {
  const {
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
    sumValues,
  } = window.Sim.calculations;
  const { crearFeriadoLocal } = window.Sim.holidays;
  const { sanitizeNumber } = window.Sim.state;
  const { renderDoughnutChart, renderBarChart } = window.Sim.charts;
  const { PROVINCIAS_ECUADOR } = window.Sim.locations;

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
    const personaAdicionalRecomendada = calcTarifaPersonaAdicionalRecomendada(
      tarifa.precioBase,
      state.configuracion.capacidadBase,
      state.configuracion.porcentajePersonaAdicional,
    );
    const precioMinimoRentable = calcTarifaInversa({
      utilidadDeseada: 0,
      costoFijoDiario,
      costoDirecto: costoDirectoPorReserva,
      promedioNochesPorReserva: state.simulacion.promedioNochesPorReserva,
    }).precioBase;
    const descuentoMaximo = calcDescuentoMaximo(tarifa.precioBase, precioMinimoRentable);
    const nochesMinimasRentables = calcNochesMinimasRentables(
      costoDirectoPorReserva,
      tarifa.precioBase,
      tarifa.comisionAirbnb,
      costoFijoDiario,
    );
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
    return {
      costoFijoDiario,
      costosFijosMensuales,
      costoDirectoPorReserva,
      tarifa,
      tarifaPersonaAdicional,
      tarifaFeriado,
      margenContribucion,
      puntoEquilibrio,
      personaAdicionalRecomendada,
      precioMinimoRentable,
      descuentoMaximo,
      nochesMinimasRentables,
      proyeccion,
      curvaUtilidad,
    };
  }

  function bindNumberInput(root, path, getValue, onChange) {
    const el = root.querySelector(`[data-field="${path}"]`);
    if (!el) return;
    el.value = getValue();
    el.addEventListener('input', () => onChange(sanitizeNumber(el.value)));
  }

  function renderDashboard(root, state, onStateChange) {
    const results = computeAll(state);

    root.querySelector('#kpi-tarifa-regular').textContent = fmt.format(results.tarifa.precioFinal);
    root.querySelector('#kpi-tarifa-feriado').textContent = fmt.format(results.tarifaFeriado.precioFinal);
    root.querySelector('#kpi-tarifa-persona-extra').textContent = fmt.format(results.personaAdicionalRecomendada);
    const btnUsarRecomendacion = root.querySelector('#btn-usar-recomendacion-persona');
    if (btnUsarRecomendacion && onStateChange) {
      btnUsarRecomendacion.onclick = () =>
        onStateChange({ configuracion: { costoHuespedExtra: results.personaAdicionalRecomendada } });
    }

    root.querySelector('#kpi-descuento-maximo').textContent = `${results.descuentoMaximo.toFixed(1)}%`;
    root.querySelector('#kpi-precio-minimo').textContent = fmt.format(results.precioMinimoRentable);
    root.querySelector('#kpi-noches-minimas').textContent =
      results.nochesMinimasRentables === Infinity ? 'No alcanzable con esta tarifa' : `${results.nochesMinimasRentables} noches`;

    root.querySelector('#kpi-noches-ocupadas').textContent = `${state.simulacion.nochesOcupadasMes} noches`;
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
    renderFormulas(root, state, results);

    return results;
  }

  function renderFormulas(root, state, results) {
    const { costosFijos, costosDirectos, cortesias, configuracion, estacionalidad, simulacion } = state;
    const noches = simulacion.promedioNochesPorReserva > 0 ? simulacion.promedioNochesPorReserva : 1;

    root.querySelector('#formula-costo-fijo').textContent =
      `= (${fmt.format(costosFijos.alicuota)} + ${fmt.format(costosFijos.internet)} + ${fmt.format(costosFijos.seguro)} + ` +
      `${fmt.format(costosFijos.agua)} + ${fmt.format(costosFijos.luz)} + ${fmt.format(costosFijos.otros)}) / 30 = ` +
      `${fmt.format(results.costosFijosMensuales)} / 30 = ${fmt.format(results.costoFijoDiario)}`;

    root.querySelector('#formula-costo-directo').textContent =
      `= ${fmt.format(costosDirectos.lavanderia)} + ${fmt.format(costosDirectos.limpieza)} + ${fmt.format(costosDirectos.amenities)} + ` +
      `${fmt.format(costosDirectos.suministrosCocina)} + (${fmt.format(cortesias.aguaCostoUnitario)} × ${cortesias.aguaCantidad}) + ` +
      `${fmt.format(cortesias.snacksCostoPorReserva)} = ${fmt.format(results.costoDirectoPorReserva)}`;

    root.querySelector('#formula-ingreso-neto').textContent =
      `= ${fmt.format(simulacion.utilidadDeseadaPorNoche)} + ${fmt.format(results.costoFijoDiario)} + ` +
      `(${fmt.format(results.costoDirectoPorReserva)} / ${noches}) = ${fmt.format(results.tarifa.ingresoNetoNecesario)}`;

    root.querySelector('#formula-precio-base').textContent =
      `= ${fmt.format(results.tarifa.ingresoNetoNecesario)} / (1 − 0.155) = ${fmt.format(results.tarifa.precioBase)}`;

    root.querySelector('#formula-iva').textContent =
      `= ${fmt.format(results.tarifa.precioBase)} × 0.15 = ${fmt.format(results.tarifa.montoIVA)}`;

    root.querySelector('#formula-precio-final').textContent =
      `= ${fmt.format(results.tarifa.precioBase)} + ${fmt.format(results.tarifa.montoIVA)} = ${fmt.format(results.tarifa.precioFinal)}`;

    root.querySelector('#formula-comision').textContent =
      `= ${fmt.format(results.tarifa.precioBase)} × 0.155 = ${fmt.format(results.tarifa.comisionAirbnb)}`;

    root.querySelector('#formula-feriado').textContent =
      `= ${fmt.format(results.tarifa.precioBase)} × (1 + ${estacionalidad.factorIncrementoTemporadaAlta}%) = ${fmt.format(results.tarifaFeriado.precioBase)} ` +
      `→ + IVA ${fmt.format(results.tarifaFeriado.montoIVA)} = ${fmt.format(results.tarifaFeriado.precioFinal)} al huésped`;

    root.querySelector('#formula-persona-adicional').textContent =
      simulacion.huespedesReales > configuracion.capacidadBase
        ? `= ${fmt.format(results.tarifa.precioBase)} + ((${simulacion.huespedesReales} − ${configuracion.capacidadBase}) × ${fmt.format(configuracion.costoHuespedExtra)}) = ${fmt.format(results.tarifaPersonaAdicional)}`
        : `Huéspedes reales (${simulacion.huespedesReales}) no supera la capacidad base (${configuracion.capacidadBase}) → no se aplica cargo extra.`;

    root.querySelector('#formula-margen-contribucion').textContent =
      `= ${fmt.format(results.tarifa.precioBase)} − ${fmt.format(results.tarifa.comisionAirbnb)} − (${fmt.format(results.costoDirectoPorReserva)} / ${noches}) = ${fmt.format(results.margenContribucion)}`;

    root.querySelector('#formula-break-even').textContent =
      results.puntoEquilibrio === Infinity
        ? `= ${fmt.format(results.costosFijosMensuales)} / ${fmt.format(results.margenContribucion)} → no alcanzable (el margen de contribución no es positivo)`
        : `= ${fmt.format(results.costosFijosMensuales)} / ${fmt.format(results.margenContribucion)} = ${results.puntoEquilibrio} noches/mes`;

    root.querySelector('#formula-persona-recomendada').textContent =
      `= (${fmt.format(results.tarifa.precioBase)} / ${configuracion.capacidadBase}) × (${configuracion.porcentajePersonaAdicional}% / 100) = ` +
      `${fmt.format(results.tarifa.precioBase / (configuracion.capacidadBase || 1))} × ${configuracion.porcentajePersonaAdicional}% = ${fmt.format(results.personaAdicionalRecomendada)}`;

    root.querySelector('#formula-precio-minimo').textContent =
      `Precio Mínimo Rentable = Precio Base con Utilidad Deseada = $0 = ${fmt.format(results.precioMinimoRentable)}`;

    root.querySelector('#formula-descuento-maximo').textContent =
      `= ((${fmt.format(results.tarifa.precioBase)} − ${fmt.format(results.precioMinimoRentable)}) / ${fmt.format(results.tarifa.precioBase)}) × 100 = ${results.descuentoMaximo.toFixed(1)}%`;

    root.querySelector('#formula-noches-minimas').textContent =
      `Margen por Noche (con Costo Fijo) = ${fmt.format(results.tarifa.precioBase)} − ${fmt.format(results.tarifa.comisionAirbnb)} − ${fmt.format(results.costoFijoDiario)} = ${fmt.format(results.tarifa.precioBase - results.tarifa.comisionAirbnb - results.costoFijoDiario)}\n` +
      (results.nochesMinimasRentables === Infinity
        ? '→ no alcanzable (el margen por noche no es positivo)'
        : `Noches Mínimas = ${fmt.format(results.costoDirectoPorReserva)} / ${fmt.format(results.tarifa.precioBase - results.tarifa.comisionAirbnb - results.costoFijoDiario)} = ${results.nochesMinimasRentables} noches`);
  }

  function populateCiudadSelect(root, ciudadActual) {
    const select = root.querySelector('[data-field="estacionalidad.ciudad"]');
    if (!select || select.dataset.populated === 'true') return;
    select.innerHTML = '';
    PROVINCIAS_ECUADOR.forEach(({ provincia, cantones }) => {
      const group = document.createElement('optgroup');
      group.label = provincia;
      cantones.forEach((canton) => {
        const option = document.createElement('option');
        option.value = canton;
        option.textContent = canton;
        group.appendChild(option);
      });
      select.appendChild(group);
    });
    select.dataset.populated = 'true';
  }

  function bindFormulasToggle(root) {
    const btn = root.querySelector('#btn-toggle-formulas');
    const panel = root.querySelector('#formulas-panel');
    if (!btn || !panel) return;
    btn.addEventListener('click', () => panel.classList.toggle('hidden'));
  }

  function renderFeriados(root, feriados, onChange) {
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

  function getFieldPaths(state) {
    return [
      ['costosFijos.alicuota', () => state.costosFijos.alicuota, (v) => ({ costosFijos: { alicuota: v } })],
      ['costosFijos.internet', () => state.costosFijos.internet, (v) => ({ costosFijos: { internet: v } })],
      ['costosFijos.seguro', () => state.costosFijos.seguro, (v) => ({ costosFijos: { seguro: v } })],
      ['costosFijos.agua', () => state.costosFijos.agua, (v) => ({ costosFijos: { agua: v } })],
      ['costosFijos.luz', () => state.costosFijos.luz, (v) => ({ costosFijos: { luz: v } })],
      ['costosFijos.otros', () => state.costosFijos.otros, (v) => ({ costosFijos: { otros: v } })],
      ['costosDirectos.lavanderia', () => state.costosDirectos.lavanderia, (v) => ({ costosDirectos: { lavanderia: v } })],
      ['costosDirectos.limpieza', () => state.costosDirectos.limpieza, (v) => ({ costosDirectos: { limpieza: v } })],
      ['costosDirectos.amenities', () => state.costosDirectos.amenities, (v) => ({ costosDirectos: { amenities: v } })],
      ['costosDirectos.suministrosCocina', () => state.costosDirectos.suministrosCocina, (v) => ({ costosDirectos: { suministrosCocina: v } })],
      ['cortesias.aguaCostoUnitario', () => state.cortesias.aguaCostoUnitario, (v) => ({ cortesias: { aguaCostoUnitario: v } })],
      ['cortesias.aguaCantidad', () => state.cortesias.aguaCantidad, (v) => ({ cortesias: { aguaCantidad: v } })],
      ['cortesias.snacksCostoPorReserva', () => state.cortesias.snacksCostoPorReserva, (v) => ({ cortesias: { snacksCostoPorReserva: v } })],
      ['configuracion.habitaciones', () => state.configuracion.habitaciones, (v) => ({ configuracion: { habitaciones: v } })],
      ['configuracion.banos', () => state.configuracion.banos, (v) => ({ configuracion: { banos: v } })],
      ['configuracion.capacidadBase', () => state.configuracion.capacidadBase, (v) => ({ configuracion: { capacidadBase: v } })],
      ['configuracion.capacidadMaxima', () => state.configuracion.capacidadMaxima, (v) => ({ configuracion: { capacidadMaxima: v } })],
      ['configuracion.costoHuespedExtra', () => state.configuracion.costoHuespedExtra, (v) => ({ configuracion: { costoHuespedExtra: v } })],
      ['configuracion.porcentajePersonaAdicional', () => state.configuracion.porcentajePersonaAdicional, (v) => ({ configuracion: { porcentajePersonaAdicional: v } })],
      ['estacionalidad.factorIncrementoTemporadaAlta', () => state.estacionalidad.factorIncrementoTemporadaAlta, (v) => ({ estacionalidad: { factorIncrementoTemporadaAlta: v } })],
      ['simulacion.utilidadDeseadaPorNoche', () => state.simulacion.utilidadDeseadaPorNoche, (v) => ({ simulacion: { utilidadDeseadaPorNoche: v } })],
      ['simulacion.promedioNochesPorReserva', () => state.simulacion.promedioNochesPorReserva, (v) => ({ simulacion: { promedioNochesPorReserva: v } })],
      ['simulacion.huespedesReales', () => state.simulacion.huespedesReales, (v) => ({ simulacion: { huespedesReales: v } })],
    ];
  }

  function bindStepForm(root, state, onStateChange) {
    const fields = getFieldPaths(state);
    fields.forEach(([path, getValue, toPatch]) => bindNumberInput(root, path, getValue, (v) => onStateChange(toPatch(v))));

    const ciudadSelect = root.querySelector('[data-field="estacionalidad.ciudad"]');
    if (ciudadSelect) {
      populateCiudadSelect(root, state.estacionalidad.ciudad);
      ciudadSelect.value = state.estacionalidad.ciudad;
      ciudadSelect.addEventListener('change', () => onStateChange({ estacionalidad: { ciudad: ciudadSelect.value } }));
    }

    const slider = root.querySelector('[data-field="simulacion.nochesOcupadasMes"]');
    if (slider) {
      slider.value = state.simulacion.nochesOcupadasMes;
      slider.addEventListener('input', () => onStateChange({ simulacion: { nochesOcupadasMes: sanitizeNumber(slider.value) } }));
    }
  }

  // Re-reads current values into every bound input, skipping whichever one
  // the user is actively typing in. Needed because state can change from a
  // source other than the input itself (e.g. the "usar recomendación" button).
  function syncStepForm(root, state) {
    getFieldPaths(state).forEach(([path, getValue]) => {
      const el = root.querySelector(`[data-field="${path}"]`);
      if (el && document.activeElement !== el) el.value = getValue();
    });

    const ciudadSelect = root.querySelector('[data-field="estacionalidad.ciudad"]');
    if (ciudadSelect && document.activeElement !== ciudadSelect) ciudadSelect.value = state.estacionalidad.ciudad;

    const slider = root.querySelector('[data-field="simulacion.nochesOcupadasMes"]');
    if (slider && document.activeElement !== slider) slider.value = state.simulacion.nochesOcupadasMes;
  }

  function bindStepNavigation(root) {
    const steps = Array.from(root.querySelectorAll('[data-step]'));
    const tabs = Array.from(root.querySelectorAll('[data-step-tab]'));
    function showStep(name) {
      steps.forEach((s) => s.classList.toggle('hidden', s.dataset.step !== name));
      tabs.forEach((t) => {
        const active = t.dataset.stepTab === name;
        t.classList.toggle('bg-emerald-500', active);
        t.classList.toggle('text-white', active);
        t.classList.toggle('bg-white', !active);
      });
    }
    tabs.forEach((t) => t.addEventListener('click', () => showStep(t.dataset.stepTab)));
    showStep(tabs[0]?.dataset.stepTab);
  }

  window.Sim.ui = { renderDashboard, renderFeriados, bindStepForm, syncStepForm, bindStepNavigation, bindFormulasToggle };
})();
