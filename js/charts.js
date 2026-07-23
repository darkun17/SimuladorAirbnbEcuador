// js/charts.js
// Chart.js se carga como script global desde index.html (window.Chart).

let doughnutChart = null;
let barChart = null;

const COLORS = {
  fijos: '#0F172A',
  directos: '#64748B',
  comision: '#EF4444',
  iva: '#F97316',
  utilidad: '#10B981',
};

export function renderDoughnutChart(canvas, proyeccion) {
  const data = {
    labels: ['Costos Fijos', 'Costos Directos', 'Comisión Airbnb', 'IVA', 'Utilidad Neta'],
    datasets: [
      {
        data: [
          Math.max(proyeccion.gastosFijosTotales, 0),
          Math.max(proyeccion.gastosDirectosTotales, 0),
          Math.max(proyeccion.comisionTotal, 0),
          Math.max(proyeccion.ivaTotal, 0),
          Math.max(proyeccion.utilidadNeta, 0),
        ],
        backgroundColor: [COLORS.fijos, COLORS.directos, COLORS.comision, COLORS.iva, COLORS.utilidad],
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
    options: { plugins: { legend: { position: 'bottom' } } },
  });
  return doughnutChart;
}

export function renderBarChart(canvas, puntos) {
  // puntos: [{ noches, utilidad }, ...]
  const data = {
    labels: puntos.map((p) => `${p.noches}`),
    datasets: [
      {
        label: 'Utilidad Neta ($)',
        data: puntos.map((p) => p.utilidad),
        backgroundColor: COLORS.utilidad,
        borderRadius: 6,
      },
    ],
  };
  if (barChart) {
    barChart.data = data;
    barChart.update();
    return barChart;
  }
  barChart = new window.Chart(canvas, {
    type: 'bar',
    data,
    options: {
      scales: { x: { title: { display: true, text: 'Noches Ocupadas al Mes' } } },
      plugins: { legend: { display: false } },
    },
  });
  return barChart;
}
