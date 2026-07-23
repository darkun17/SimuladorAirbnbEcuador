// js/charts.js
// Chart.js se carga como script global desde index.html (window.Chart).
window.Sim = window.Sim || {};

(function () {
  let doughnutChart = null;
  let barChart = null;

  const COLORS = {
    comision: '#EF4444',
    iva: '#F97316',
    gastos: '#64748B',
    utilidad: '#10B981',
  };

  // Dibuja una línea vertical punteada en el punto de equilibrio, con una
  // pequeña etiqueta encima, sin depender de un plugin externo de Chart.js.
  const breakEvenLinePlugin = {
    id: 'breakEvenLine',
    afterDatasetsDraw(chart) {
      const cfg = chart.options.plugins && chart.options.plugins.breakEvenLine;
      if (!cfg || !Number.isFinite(cfg.index)) return;
      const { ctx, chartArea, scales } = chart;
      const x = scales.x.getPixelForValue(cfg.index);
      if (x < chartArea.left || x > chartArea.right) return;

      ctx.save();
      ctx.strokeStyle = '#64748B';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      const label = cfg.label || '';
      ctx.font = '11px sans-serif';
      const textWidth = ctx.measureText(label).width;
      const boxWidth = textWidth + 16;
      const boxX = Math.min(Math.max(x - boxWidth / 2, chartArea.left), chartArea.right - boxWidth);
      const boxY = chartArea.top + 6;

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(boxX, boxY, boxWidth, 20, 6) : ctx.rect(boxX, boxY, boxWidth, 20);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, boxX + boxWidth / 2, boxY + 10);
      ctx.restore();
    },
  };
  window.Chart.register(breakEvenLinePlugin);

  function renderDoughnutChart(canvas, proyeccion) {
    const data = {
      labels: ['Comisión Airbnb', 'IVA', 'Gastos Operativos', 'Utilidad Neta'],
      datasets: [
        {
          data: [
            Math.max(proyeccion.comisionTotal, 0),
            Math.max(proyeccion.ivaTotal, 0),
            Math.max(proyeccion.gastosOperativosTotales, 0),
            Math.max(proyeccion.utilidadNeta, 0),
          ],
          backgroundColor: [COLORS.comision, COLORS.iva, COLORS.gastos, COLORS.utilidad],
          borderWidth: 0,
        },
      ],
    };
    if (doughnutChart) {
      doughnutChart.data = data;
      doughnutChart.update();
      return doughnutChart;
    }
    doughnutChart = new window.Chart(canvas, {
      type: 'doughnut',
      data,
      options: { cutout: '68%', maintainAspectRatio: false, plugins: { legend: { display: false } } },
    });
    return doughnutChart;
  }

  function renderBarChart(canvas, puntos, puntoEquilibrio) {
    // puntos: [{ noches, utilidad }, ...]
    const breakEvenIndex = Number.isFinite(puntoEquilibrio) ? puntos.findIndex((p) => p.noches === puntoEquilibrio) : -1;
    const data = {
      labels: puntos.map((p) => `${p.noches}`),
      datasets: [
        {
          label: 'Utilidad Neta ($)',
          data: puntos.map((p) => p.utilidad),
          borderColor: COLORS.utilidad,
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    };
    const breakEvenLineConfig =
      breakEvenIndex >= 0 ? { index: breakEvenIndex, label: `${puntoEquilibrio} noches · Punto de equilibrio` } : null;

    if (barChart) {
      barChart.data = data;
      barChart.options.plugins.breakEvenLine = breakEvenLineConfig;
      barChart.update();
      return barChart;
    }
    barChart = new window.Chart(canvas, {
      type: 'line',
      data,
      options: {
        maintainAspectRatio: false,
        scales: { x: { title: { display: true, text: 'Noches Ocupadas al Mes' } } },
        plugins: { legend: { display: false }, breakEvenLine: breakEvenLineConfig },
      },
    });
    return barChart;
  }

  window.Sim.charts = { renderDoughnutChart, renderBarChart };
})();
