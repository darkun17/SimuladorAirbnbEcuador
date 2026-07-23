// js/holidays.js
(function (root) {
  const CIUDADES_ECUADOR = [
    'Quito',
    'Guayaquil',
    'Cuenca',
    'Loja',
    'Salinas',
    'Manta',
    'Ambato',
    'Ibarra',
    'Riobamba',
    'Otra',
  ];

  // Fechas oficiales de feriados nacionales de Ecuador para 2026.
  // El usuario puede editar/agregar/eliminar estas fechas desde la UI.
  const FERIADOS_NACIONALES_2026 = [
    { nombre: 'Año Nuevo', fecha: '2026-01-01', esNacional: true },
    { nombre: 'Carnaval (Lunes)', fecha: '2026-02-16', esNacional: true },
    { nombre: 'Carnaval (Martes)', fecha: '2026-02-17', esNacional: true },
    { nombre: 'Viernes Santo', fecha: '2026-04-03', esNacional: true },
    { nombre: 'Día del Trabajo', fecha: '2026-05-01', esNacional: true },
    { nombre: 'Batalla de Pichincha', fecha: '2026-05-24', esNacional: true },
    { nombre: 'Primer Grito de la Independencia', fecha: '2026-08-10', esNacional: true },
    { nombre: 'Independencia de Guayaquil', fecha: '2026-10-09', esNacional: true },
    { nombre: 'Día de los Difuntos', fecha: '2026-11-02', esNacional: true },
    { nombre: 'Independencia de Cuenca', fecha: '2026-11-03', esNacional: true },
    { nombre: 'Navidad', fecha: '2026-12-25', esNacional: true },
  ];

  function getFeriadosNacionales2026() {
    return FERIADOS_NACIONALES_2026.map((f) => ({ ...f }));
  }

  function crearFeriadoLocal(nombre, fecha) {
    return { nombre, fecha, esNacional: false };
  }

  const api = { CIUDADES_ECUADOR, getFeriadosNacionales2026, crearFeriadoLocal };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Sim = root.Sim || {};
    root.Sim.holidays = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
