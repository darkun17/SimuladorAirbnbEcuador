# Simulador Financiero Airbnb Ecuador Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page, buildless HTML/JS simulator that computes Airbnb Ecuador pricing (commission + IVA reverse calculation) and monthly profitability projections, persisting all data to a real SQLite file on disk via sql.js + the File System Access API.

**Architecture:** Pure ES6 modules loaded directly by `index.html` (no bundler). `calculations.js` and the pure parts of `holidays.js`/`state.js` are unit-tested with Node's built-in test runner. `db.js`, `charts.js`, `ui.js`, `main.js` are DOM/File-System-API-dependent and are verified manually in Chrome/Edge per the spec's testing section.

**Tech Stack:** HTML5, Tailwind CSS (CDN), Chart.js (CDN), sql.js (CDN, SQLite via WebAssembly), File System Access API, vanilla ES6 modules, Node.js `node:test` for unit tests (dev-only, not needed to run the app).

---

## File Structure

```
SimuladorAirbnbEcuador/
├── index.html
├── README.md
├── package.json                 # dev-only, for `node --test`
├── css/
│   └── styles.css
└── js/
    ├── calculations.js          # pure financial engine
    ├── calculations.test.js
    ├── holidays.js               # Ecuador holiday seed data + helpers
    ├── holidays.test.js
    ├── state.js                  # default state + pure validation/merge helpers + state manager
    ├── state.test.js
    ├── db.js                     # sql.js + File System Access API wrapper
    ├── charts.js                  # Chart.js doughnut + bar setup
    ├── ui.js                      # step form + dashboard rendering, event wiring
    └── main.js                    # app bootstrap
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Create `package.json`** (dev-only, enables `node --test`; the app itself needs no install)

```json
{
  "name": "simulador-airbnb-ecuador",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Simulador financiero y motor de pricing dinamico para rentas cortas en Ecuador",
  "scripts": {
    "test": "node --test js/"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
*.db
.DS_Store
```

- [ ] **Step 3: Create `README.md`**

```markdown
# Simulador Financiero Airbnb Ecuador

Calculadora de tarifas y proyeccion de utilidades para anfitriones de Airbnb en Ecuador.

## Como usarlo

1. Abre `index.html` haciendo doble clic (usa **Google Chrome** o **Microsoft Edge** — otros
   navegadores no pueden guardar el archivo de datos).
2. La primera vez, elige "Crear nuevo simulador.db" y guarda el archivo en la carpeta que quieras
   (recomendado: la misma carpeta de este proyecto).
3. Completa los 3 pasos del formulario. Todo se guarda automaticamente en ese archivo `.db` mientras
   escribes — no hay boton "Guardar".
4. La proxima vez que abras `index.html`, tus datos se cargan solos desde el mismo archivo.

## Desarrollo

Los calculos financieros tienen pruebas automatizadas (no requeridas para usar la app):

```bash
npm test
```
```

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore README.md
git commit -m "chore: scaffold project files"
```

---

### Task 2: Financial engine (`calculations.js`) — TDD

**Files:**
- Create: `js/calculations.test.js`
- Create: `js/calculations.js`

- [ ] **Step 1: Write the failing tests**

```javascript
// js/calculations.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
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
} from './calculations.js';

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
  // total = 100 -> 100 / 30
  assert.equal(calcCostoFijoDiario(costosFijos), 100 / 30);
});

test('calcCostoDirectoPorReserva sums direct costs and per-guest courtesies', () => {
  const costosDirectos = { lavanderia: 5, limpieza: 15, amenities: 3, suministrosCocina: 2 };
  const cortesias = { aguaCostoUnitario: 0.5, aguaCantidad: 4, snacksCostoPorReserva: 3 };
  // directos = 25, cortesias = 0.5*4 + 3 = 5 -> total 30
  assert.equal(calcCostoDirectoPorReserva(costosDirectos, cortesias), 30);
});

test('calcTarifaInversa applies the Ecuador reverse pricing formula', () => {
  const result = calcTarifaInversa({
    utilidadDeseada: 20,
    costoFijoDiario: 10,
    costoDirecto: 20,
    promedioNochesPorReserva: 2,
  });
  // ingresoNetoNecesario = 20 + 10 + 20/2 = 40
  assert.equal(result.ingresoNetoNecesario, 40);
  // precioBase = 40 / (1 - 0.155) = 47.337278...
  assert.ok(Math.abs(result.precioBase - 40 / 0.845) < 1e-9);
  assert.ok(Math.abs(result.montoIVA - result.precioBase * 0.15) < 1e-9);
  assert.ok(Math.abs(result.precioFinal - (result.precioBase + result.montoIVA)) < 1e-9);
  assert.ok(Math.abs(result.comisionAirbnb - result.precioBase * 0.155) < 1e-9);
});

test('calcTarifaInversa guards against promedioNochesPorReserva of 0', () => {
  const result = calcTarifaInversa({
    utilidadDeseada: 0,
    costoFijoDiario: 0,
    costoDirecto: 30,
    promedioNochesPorReserva: 0,
  });
  // treated as 1 night, not divide-by-zero
  assert.equal(result.ingresoNetoNecesario, 30);
});

test('calcTarifaPersonaAdicional returns base price when within base capacity', () => {
  assert.equal(calcTarifaPersonaAdicional(100, 3, 3, 15), 100);
  assert.equal(calcTarifaPersonaAdicional(100, 2, 3, 15), 100);
});

test('calcTarifaPersonaAdicional adds extra-guest cost above base capacity', () => {
  // 5 guests, base 3, extra cost 15 -> +2*15 = 30
  assert.equal(calcTarifaPersonaAdicional(100, 5, 3, 15), 130);
});

test('calcTarifaFeriado increases base price by the seasonal factor before re-taxing', () => {
  const result = calcTarifaFeriado(100, 30);
  assert.equal(result.precioBase, 130);
  assert.ok(Math.abs(result.montoIVA - 19.5) < 1e-9);
  assert.ok(Math.abs(result.precioFinal - 149.5) < 1e-9);
  assert.ok(Math.abs(result.comisionAirbnb - 130 * 0.155) < 1e-9);
});

test('calcMargenContribucionPorNoche subtracts commission and per-night direct cost', () => {
  const value = calcMargenContribucionPorNoche({
    precioBase: 100,
    comisionAirbnb: 15.5,
    costoDirectoPorReserva: 20,
    promedioNochesPorReserva: 2,
  });
  // 100 - 15.5 - (20/2) = 74.5
  assert.equal(value, 74.5);
});

test('calcProyeccionMensual computes monthly KPIs for a given occupancy', () => {
  const result = calcProyeccionMensual(
    {
      precioBase: 100,
      costoDirectoPorReserva: 20,
      promedioNochesPorReserva: 2,
      costosFijosMensuales: 300,
    },
    10, // noches ocupadas
  );
  // ingresoBrutoBase = 100 * 10 = 1000
  assert.equal(result.ingresoBrutoRecaudado, 1000 + 1000 * 0.15);
  assert.equal(result.comisionTotal, 1000 * 0.155);
  assert.equal(result.ivaTotal, 1000 * 0.15);
  // reservas = 10 / 2 = 5 -> gastosDirectosTotales = 5 * 20 = 100
  assert.equal(result.gastosDirectosTotales, 100);
  assert.equal(result.gastosFijosTotales, 300);
  assert.equal(result.gastosOperativosTotales, 400);
  // utilidadNeta = 1000 - 155 - 400 = 445
  assert.equal(result.utilidadNeta, 445);
  assert.ok(Math.abs(result.margen - 44.5) < 1e-9);
});

test('calcProyeccionMensual returns zeros when zero nights are occupied', () => {
  const result = calcProyeccionMensual(
    { precioBase: 100, costoDirectoPorReserva: 20, promedioNochesPorReserva: 2, costosFijosMensuales: 300 },
    0,
  );
  assert.equal(result.ingresoBrutoRecaudado, 0);
  assert.equal(result.utilidadNeta, -300);
  assert.equal(result.margen, 0);
});

test('calcPuntoEquilibrio returns nights needed to cover fixed costs', () => {
  assert.equal(calcPuntoEquilibrio(300, 74.5), Math.ceil(300 / 74.5));
});

test('calcPuntoEquilibrio returns Infinity when contribution margin is not positive', () => {
  assert.equal(calcPuntoEquilibrio(300, 0), Infinity);
  assert.equal(calcPuntoEquilibrio(300, -5), Infinity);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './calculations.js'` (file doesn't exist yet)

- [ ] **Step 3: Write the implementation**

```javascript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests in `js/calculations.test.js` green

- [ ] **Step 5: Commit**

```bash
git add js/calculations.js js/calculations.test.js
git commit -m "feat: add financial engine with reverse Airbnb Ecuador pricing"
```

---

### Task 3: Ecuador holidays (`holidays.js`) — TDD

**Files:**
- Create: `js/holidays.test.js`
- Create: `js/holidays.js`

- [ ] **Step 1: Write the failing tests**

```javascript
// js/holidays.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CIUDADES_ECUADOR, getFeriadosNacionales2026, crearFeriadoLocal } from './holidays.js';

test('CIUDADES_ECUADOR includes the main host cities', () => {
  for (const ciudad of ['Loja', 'Quito', 'Guayaquil', 'Cuenca', 'Salinas']) {
    assert.ok(CIUDADES_ECUADOR.includes(ciudad), `esperaba encontrar ${ciudad}`);
  }
});

test('getFeriadosNacionales2026 returns a fresh, non-empty array of holidays', () => {
  const feriados = getFeriadosNacionales2026();
  assert.ok(Array.isArray(feriados));
  assert.ok(feriados.length >= 10);
  for (const f of feriados) {
    assert.equal(typeof f.nombre, 'string');
    assert.match(f.fecha, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(typeof f.esNacional, 'boolean');
  }
  // mutating the returned array must not affect the next call (fresh copy)
  feriados.push({ nombre: 'x', fecha: '2026-01-01', esNacional: true });
  assert.notEqual(getFeriadosNacionales2026().length, feriados.length);
});

test('getFeriadosNacionales2026 includes Navidad on 2026-12-25', () => {
  const feriados = getFeriadosNacionales2026();
  assert.ok(feriados.some((f) => f.nombre === 'Navidad' && f.fecha === '2026-12-25'));
});

test('crearFeriadoLocal builds a non-national holiday entry', () => {
  const f = crearFeriadoLocal('Feria de Loja', '2026-09-08');
  assert.deepEqual(f, { nombre: 'Feria de Loja', fecha: '2026-09-08', esNacional: false });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './holidays.js'`

- [ ] **Step 3: Write the implementation**

```javascript
// js/holidays.js

export const CIUDADES_ECUADOR = [
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

export function getFeriadosNacionales2026() {
  return FERIADOS_NACIONALES_2026.map((f) => ({ ...f }));
}

export function crearFeriadoLocal(nombre, fecha) {
  return { nombre, fecha, esNacional: false };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests in `js/holidays.test.js` green

- [ ] **Step 5: Commit**

```bash
git add js/holidays.js js/holidays.test.js
git commit -m "feat: add Ecuador 2026 national holidays seed data"
```

---

### Task 4: Default state and pure helpers (`state.js`) — TDD for pure parts

**Files:**
- Create: `js/state.test.js`
- Create: `js/state.js`

- [ ] **Step 1: Write the failing tests**

```javascript
// js/state.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, sanitizeNumber, mergeState } from './state.js';

test('createDefaultState returns a fresh object with all required sections', () => {
  const state = createDefaultState();
  for (const key of ['costosFijos', 'costosDirectos', 'cortesias', 'configuracion', 'estacionalidad', 'simulacion']) {
    assert.ok(key in state, `falta la seccion ${key}`);
  }
  assert.ok(Array.isArray(state.estacionalidad.feriados));
  assert.ok(state.estacionalidad.feriados.length > 0);
  // must be a fresh copy each call
  const other = createDefaultState();
  state.configuracion.capacidadBase = 999;
  assert.notEqual(other.configuracion.capacidadBase, 999);
});

test('sanitizeNumber clamps negatives and invalid input to 0', () => {
  assert.equal(sanitizeNumber(-5), 0);
  assert.equal(sanitizeNumber('abc'), 0);
  assert.equal(sanitizeNumber(''), 0);
  assert.equal(sanitizeNumber(null), 0);
  assert.equal(sanitizeNumber(undefined), 0);
});

test('sanitizeNumber passes through valid non-negative numbers', () => {
  assert.equal(sanitizeNumber(12.5), 12.5);
  assert.equal(sanitizeNumber('42'), 42);
  assert.equal(sanitizeNumber(0), 0);
});

test('mergeState deep-merges a partial patch into the current state without mutating it', () => {
  const current = createDefaultState();
  const patch = { costosFijos: { alicuota: 45 }, configuracion: { capacidadBase: 4 } };
  const next = mergeState(current, patch);
  assert.equal(next.costosFijos.alicuota, 45);
  assert.equal(next.configuracion.capacidadBase, 4);
  // untouched sibling fields survive
  assert.equal(next.costosFijos.internet, current.costosFijos.internet);
  assert.equal(next.configuracion.capacidadMaxima, current.configuracion.capacidadMaxima);
  // original object is untouched
  assert.equal(current.costosFijos.alicuota, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './state.js'`

- [ ] **Step 3: Write the implementation**

```javascript
// js/state.js
import { getFeriadosNacionales2026 } from './holidays.js';

export function createDefaultState() {
  return {
    costosFijos: { alicuota: 0, internet: 0, seguro: 0, agua: 0, luz: 0, otros: 0 },
    costosDirectos: { lavanderia: 0, limpieza: 0, amenities: 0, suministrosCocina: 0 },
    cortesias: { aguaCostoUnitario: 0, aguaCantidad: 0, snacksCostoPorReserva: 0 },
    configuracion: { habitaciones: 1, banos: 1, capacidadBase: 3, capacidadMaxima: 6, costoHuespedExtra: 0 },
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

export function sanitizeNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function mergeState(current, patch) {
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests in `js/state.test.js` green (and `calculations.test.js`, `holidays.test.js` still green)

- [ ] **Step 5: Commit**

```bash
git add js/state.js js/state.test.js
git commit -m "feat: add default state shape and pure state helpers"
```

---

### Task 5: SQLite persistence (`db.js`) — File System Access API + sql.js

Browser/File-System-API dependent — no Node unit tests possible (verified manually in Task 8).

**Files:**
- Create: `js/db.js`

- [ ] **Step 1: Write the module**

```javascript
// js/db.js
// Envuelve sql.js (SQLite via WebAssembly) + File System Access API.
// sql.js se carga como script global desde index.html (window.initSqlJs).

const DB_HANDLE_STORE = 'simulador-airbnb-handles';
const DB_HANDLE_KEY = 'simulador.db';

let SQL = null;
let currentDb = null;
let currentHandle = null;

async function getSql() {
  if (!SQL) {
    SQL = await window.initSqlJs({
      locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`,
    });
  }
  return SQL;
}

function openHandleDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_HANDLE_STORE, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('handles');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storeHandle(handle) {
  const idb = await openHandleDb();
  await new Promise((resolve, reject) => {
    const tx = idb.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, DB_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStoredHandle() {
  const idb = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction('handles', 'readonly');
    const req = tx.objectStore('handles').get(DB_HANDLE_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function verifyPermission(handle) {
  const opts = { mode: 'readwrite' };
  if ((await handle.queryPermission(opts)) === 'granted') return 'granted';
  return handle.queryPermission(opts);
}

export async function requestPermission(handle) {
  return handle.requestPermission({ mode: 'readwrite' });
}

export function isFileSystemAccessSupported() {
  return typeof window.showOpenFilePicker === 'function' && typeof window.showSaveFilePicker === 'function';
}

function ensureSchema(db) {
  db.run(`CREATE TABLE IF NOT EXISTS simulator_state (
    id INTEGER PRIMARY KEY,
    data TEXT,
    updated_at TEXT
  )`);
}

export async function createNewFile() {
  const handle = await window.showSaveFilePicker({
    suggestedName: 'simulador.db',
    types: [{ description: 'Base de datos SQLite', accept: { 'application/x-sqlite3': ['.db'] } }],
  });
  const sql = await getSql();
  const db = new sql.Database();
  ensureSchema(db);
  await storeHandle(handle);
  currentHandle = handle;
  currentDb = db;
  return db;
}

export async function openExistingFile() {
  const [handle] = await window.showOpenFilePicker({
    types: [{ description: 'Base de datos SQLite', accept: { 'application/x-sqlite3': ['.db'] } }],
  });
  const db = await loadDbFromHandle(handle);
  await storeHandle(handle);
  currentHandle = handle;
  currentDb = db;
  return db;
}

async function loadDbFromHandle(handle) {
  const sql = await getSql();
  const file = await handle.getFile();
  const buffer = new Uint8Array(await file.arrayBuffer());
  const db = buffer.length > 0 ? new sql.Database(buffer) : new sql.Database();
  ensureSchema(db);
  return db;
}

export async function tryResumeStoredHandle() {
  const handle = await getStoredHandle();
  if (!handle) return null;
  const permission = await verifyPermission(handle);
  if (permission !== 'granted') return { handle, needsUserGesture: true };
  const db = await loadDbFromHandle(handle);
  currentHandle = handle;
  currentDb = db;
  return { handle, db, needsUserGesture: false };
}

export async function resumeAfterGesture(handle) {
  const permission = await requestPermission(handle);
  if (permission !== 'granted') throw new Error('Permiso denegado para acceder al archivo.');
  const db = await loadDbFromHandle(handle);
  currentHandle = handle;
  currentDb = db;
  return db;
}

export function loadState(db) {
  const res = db.exec('SELECT data FROM simulator_state ORDER BY id DESC LIMIT 1');
  if (!res.length || !res[0].values.length) return null;
  return JSON.parse(res[0].values[0][0]);
}

export async function saveState(state) {
  if (!currentDb || !currentHandle) throw new Error('No hay archivo abierto para guardar.');
  currentDb.run('DELETE FROM simulator_state');
  currentDb.run('INSERT INTO simulator_state (data, updated_at) VALUES (?, ?)', [
    JSON.stringify(state),
    new Date().toISOString(),
  ]);
  const bytes = currentDb.export();
  const writable = await currentHandle.createWritable();
  await writable.write(bytes);
  await writable.close();
}

export function getCurrentDb() {
  return currentDb;
}
```

- [ ] **Step 2: Commit**

```bash
git add js/db.js
git commit -m "feat: add sql.js + File System Access API persistence layer"
```

---

### Task 6: Charts (`charts.js`)

**Files:**
- Create: `js/charts.js`

- [ ] **Step 1: Write the module**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add js/charts.js
git commit -m "feat: add doughnut and bar chart rendering"
```

---

### Task 7: UI rendering and event wiring (`ui.js`)

**Files:**
- Create: `js/ui.js`

- [ ] **Step 1: Write the module**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add js/ui.js
git commit -m "feat: add dashboard rendering and step-form event wiring"
```

---

### Task 8: App bootstrap, HTML shell and styles

**Files:**
- Create: `css/styles.css`
- Create: `index.html`
- Create: `js/main.js`

- [ ] **Step 1: Write `css/styles.css`**

```css
/* Ajustes finos que Tailwind CDN no cubre */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-thumb {
  background-color: #64748B;
  border-radius: 9999px;
}
input[type='range'] {
  accent-color: #10B981;
}
.transition-panel {
  transition: opacity 150ms ease-in-out;
}
```

- [ ] **Step 2: Write `js/main.js`**

```javascript
// js/main.js
import { createDefaultState, mergeState } from './state.js';
import { bindStepForm, bindStepNavigation, renderDashboard } from './ui.js';
import {
  isFileSystemAccessSupported,
  createNewFile,
  openExistingFile,
  tryResumeStoredHandle,
  resumeAfterGesture,
  loadState,
  saveState,
  getCurrentDb,
} from './db.js';

let state = createDefaultState();
let saveTimer = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveState(state).catch((err) => showError(err.message));
  }, 800);
}

function showError(message) {
  const el = document.getElementById('error-banner');
  el.textContent = message;
  el.classList.remove('hidden');
}

function showApp() {
  document.getElementById('welcome-screen').classList.add('hidden');
  document.getElementById('resume-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  const root = document.getElementById('app-screen');
  bindStepNavigation(root);
  bindStepForm(root, state, (patch) => {
    state = mergeState(state, patch);
    renderDashboard(root, state);
    scheduleSave();
  });
  renderDashboard(root, state);
}

function loadSavedStateIfPresent() {
  const db = getCurrentDb();
  const saved = loadState(db);
  if (saved) state = mergeState(createDefaultState(), saved);
}

async function handleCreateNew() {
  try {
    await createNewFile();
    await saveState(state);
    showApp();
  } catch (err) {
    if (err.name !== 'AbortError') showError(err.message);
  }
}

async function handleOpenExisting() {
  try {
    await openExistingFile();
    loadSavedStateIfPresent();
    showApp();
  } catch (err) {
    if (err.name !== 'AbortError') showError(err.message);
  }
}

async function init() {
  if (!isFileSystemAccessSupported()) {
    document.getElementById('unsupported-screen').classList.remove('hidden');
    return;
  }

  document.getElementById('btn-crear-nuevo').addEventListener('click', handleCreateNew);
  document.getElementById('btn-abrir-existente').addEventListener('click', handleOpenExisting);

  const resumed = await tryResumeStoredHandle();
  if (resumed && resumed.db) {
    loadSavedStateIfPresent();
    showApp();
    return;
  }
  if (resumed && resumed.needsUserGesture) {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('resume-screen').classList.remove('hidden');
    document.getElementById('btn-continuar').addEventListener('click', async () => {
      try {
        await resumeAfterGesture(resumed.handle);
        loadSavedStateIfPresent();
        showApp();
      } catch (err) {
        showError(err.message);
      }
    });
    return;
  }
  document.getElementById('welcome-screen').classList.remove('hidden');
}

init();
```

- [ ] **Step 3: Write `index.html`**

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Simulador Financiero Airbnb Ecuador</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen">
  <header class="bg-slate-900 text-white px-6 py-4">
    <h1 class="text-xl font-semibold">Simulador Financiero — Airbnb Ecuador</h1>
  </header>

  <div id="error-banner" class="hidden bg-red-500 text-white px-6 py-3"></div>

  <main class="max-w-6xl mx-auto p-6">
    <section id="unsupported-screen" class="hidden bg-white border border-slate-200 rounded-xl p-8 text-center">
      <p class="text-red-500 font-semibold">Este simulador requiere Google Chrome o Microsoft Edge para guardar tus datos en un archivo.</p>
    </section>

    <section id="welcome-screen" class="hidden bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
      <p class="text-slate-500">Elige cómo empezar:</p>
      <div class="flex justify-center gap-4">
        <button id="btn-crear-nuevo" class="bg-emerald-500 text-white rounded-xl px-5 py-3 font-medium">✨ Crear nuevo simulador.db</button>
        <button id="btn-abrir-existente" class="bg-slate-900 text-white rounded-xl px-5 py-3 font-medium">📂 Abrir simulador.db existente</button>
      </div>
    </section>

    <section id="resume-screen" class="hidden bg-white border border-slate-200 rounded-xl p-8 text-center">
      <button id="btn-continuar" class="bg-emerald-500 text-white rounded-xl px-5 py-3 font-medium">▶ Continuar con simulador.db</button>
    </section>

    <section id="app-screen" class="hidden space-y-6">
      <nav class="flex gap-2">
        <button data-step-tab="costos" class="rounded-xl px-4 py-2 font-medium bg-white border border-slate-200">1. Costos</button>
        <button data-step-tab="configuracion" class="rounded-xl px-4 py-2 font-medium bg-white border border-slate-200">2. Configuración</button>
        <button data-step-tab="estacionalidad" class="rounded-xl px-4 py-2 font-medium bg-white border border-slate-200">3. Estacionalidad</button>
      </nav>

      <div data-step="costos" class="grid md:grid-cols-3 gap-4">
        <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <h2 class="font-semibold">Costos Fijos Mensuales ($)</h2>
          <label class="block text-sm text-slate-500">Alícuota / Condominio</label>
          <input data-field="costosFijos.alicuota" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
          <label class="block text-sm text-slate-500">Internet / Fibra</label>
          <input data-field="costosFijos.internet" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
          <label class="block text-sm text-slate-500">Seguro del inmueble</label>
          <input data-field="costosFijos.seguro" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
          <label class="block text-sm text-slate-500">Agua (básico fijo)</label>
          <input data-field="costosFijos.agua" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
          <label class="block text-sm text-slate-500">Luz / Energía eléctrica</label>
          <input data-field="costosFijos.luz" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
          <label class="block text-sm text-slate-500">Otros fijos</label>
          <input data-field="costosFijos.otros" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <h2 class="font-semibold">Costos Directos por Estadía ($)</h2>
          <label class="block text-sm text-slate-500">Lavado de sábanas y toallas</label>
          <input data-field="costosDirectos.lavanderia" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
          <label class="block text-sm text-slate-500">Limpieza / Insumos de limpieza</label>
          <input data-field="costosDirectos.limpieza" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
          <label class="block text-sm text-slate-500">Amenities de baño</label>
          <input data-field="costosDirectos.amenities" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
          <label class="block text-sm text-slate-500">Suministros de cocina</label>
          <input data-field="costosDirectos.suministrosCocina" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <h2 class="font-semibold">Cortesías por Huésped ($)</h2>
          <label class="block text-sm text-slate-500">Costo unitario de agua embotellada</label>
          <input data-field="cortesias.aguaCostoUnitario" type="number" min="0" step="0.01" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
          <label class="block text-sm text-slate-500">Botellas de agua por reserva</label>
          <input data-field="cortesias.aguaCantidad" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
          <label class="block text-sm text-slate-500">Snacks / frutas de bienvenida (por reserva)</label>
          <input data-field="cortesias.snacksCostoPorReserva" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
        </div>
      </div>

      <div data-step="configuracion" class="hidden grid md:grid-cols-2 gap-4">
        <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <h2 class="font-semibold">Capacidad del Departamento</h2>
          <label class="block text-sm text-slate-500">Habitaciones</label>
          <input data-field="configuracion.habitaciones" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
          <label class="block text-sm text-slate-500">Baños</label>
          <input data-field="configuracion.banos" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
          <label class="block text-sm text-slate-500">Capacidad base (huéspedes incluidos)</label>
          <input data-field="configuracion.capacidadBase" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
          <label class="block text-sm text-slate-500">Capacidad máxima</label>
          <input data-field="configuracion.capacidadMaxima" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <h2 class="font-semibold">Persona Adicional</h2>
          <label class="block text-sm text-slate-500">Costo adicional por huésped extra ($/noche)</label>
          <input data-field="configuracion.costoHuespedExtra" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
          <label class="block text-sm text-slate-500">Huéspedes reales en la simulación</label>
          <input data-field="simulacion.huespedesReales" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-2 md:col-span-2">
          <h2 class="font-semibold">Objetivo de Rentabilidad</h2>
          <label class="block text-sm text-slate-500">Utilidad neta deseada por noche ($)</label>
          <input data-field="simulacion.utilidadDeseadaPorNoche" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
          <label class="block text-sm text-slate-500">Promedio de noches por reserva</label>
          <input data-field="simulacion.promedioNochesPorReserva" type="number" min="1" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
        </div>
      </div>

      <div data-step="estacionalidad" class="hidden grid md:grid-cols-2 gap-4">
        <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <h2 class="font-semibold">Ciudad y Temporada Alta</h2>
          <label class="block text-sm text-slate-500">Ciudad</label>
          <select data-field="estacionalidad.ciudad" class="w-full rounded-lg border-slate-200 border px-2 py-1">
            <option>Quito</option>
            <option>Guayaquil</option>
            <option>Cuenca</option>
            <option>Loja</option>
            <option>Salinas</option>
            <option>Manta</option>
            <option>Ambato</option>
            <option>Ibarra</option>
            <option>Riobamba</option>
            <option>Otra</option>
          </select>
          <label class="block text-sm text-slate-500">Factor de incremento temporada alta (%)</label>
          <input data-field="estacionalidad.factorIncrementoTemporadaAlta" type="number" min="0" class="w-full rounded-lg border-slate-200 border px-2 py-1" />
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <h2 class="font-semibold">Feriados y Fiestas Locales</h2>
          <table id="tabla-feriados" class="w-full text-sm">
            <thead>
              <tr class="text-slate-500 text-left">
                <th class="px-3 py-2">Nombre</th>
                <th class="px-3 py-2">Fecha</th>
                <th class="px-3 py-2">Tipo</th>
                <th class="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
          <button id="btn-agregar-feriado" type="button" class="text-emerald-500 font-medium">+ Agregar fiesta local</button>
        </div>
      </div>

      <div class="bg-slate-900 text-white rounded-xl p-4 space-y-2">
        <h2 class="font-semibold">Tarifas Sugeridas</h2>
        <div class="grid md:grid-cols-3 gap-4 text-sm">
          <div><p class="text-slate-400">Noche regular / temporada baja</p><p id="kpi-tarifa-regular" class="text-2xl font-bold text-emerald-400"></p></div>
          <div><p class="text-slate-400">Noche feriado / temporada alta</p><p id="kpi-tarifa-feriado" class="text-2xl font-bold text-emerald-400"></p></div>
          <div><p class="text-slate-400">Persona adicional recomendada</p><p id="kpi-tarifa-persona-extra" class="text-2xl font-bold text-emerald-400"></p></div>
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <h2 class="font-semibold">Proyección Mensual</h2>
        <label class="block text-sm text-slate-500">Noches ocupadas al mes</label>
        <input data-field="simulacion.nochesOcupadasMes" type="range" min="1" max="30" class="w-full" />
        <div class="grid md:grid-cols-3 gap-4 text-sm">
          <div><p class="text-slate-500">Ingreso Bruto Recaudado</p><p id="kpi-ingreso-bruto" class="text-lg font-semibold"></p></div>
          <div><p class="text-slate-500">Comisión Airbnb (15.5%)</p><p id="kpi-comision" class="text-lg font-semibold text-red-500"></p></div>
          <div><p class="text-slate-500">IVA (15%)</p><p id="kpi-iva" class="text-lg font-semibold text-red-500"></p></div>
          <div><p class="text-slate-500">Gastos Operativos Totales</p><p id="kpi-gastos" class="text-lg font-semibold text-red-500"></p></div>
          <div><p class="text-slate-500">Utilidad Neta Real</p><p id="kpi-utilidad" class="text-lg font-semibold text-emerald-500"></p></div>
          <div><p class="text-slate-500">Margen de Ganancia</p><p id="kpi-margen" class="text-lg font-semibold text-emerald-500"></p></div>
          <div><p class="text-slate-500">Punto de Equilibrio</p><p id="kpi-break-even" class="text-lg font-semibold"></p></div>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-4">
        <div class="bg-white border border-slate-200 rounded-xl p-4">
          <h2 class="font-semibold mb-2">Distribución de Costos</h2>
          <canvas id="chart-doughnut"></canvas>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4">
          <h2 class="font-semibold mb-2">Noches Ocupadas vs. Utilidad Neta</h2>
          <canvas id="chart-bar"></canvas>
        </div>
      </div>
    </section>
  </main>

  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add index.html js/main.js css/styles.css
git commit -m "feat: wire full app shell, bootstrap and file-open flows"
```

---

### Task 9: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run the automated test suite one last time**

Run: `npm test`
Expected: PASS — all tests across `calculations.test.js`, `holidays.test.js`, `state.test.js` green

- [ ] **Step 2: Open the app in Chrome or Edge**

Open `index.html` directly (double-click, or `start index.html` from the project folder). Confirm the welcome screen appears with "Crear nuevo simulador.db" / "Abrir simulador.db existente".

- [ ] **Step 3: Create a new file and enter test data**

Click "Crear nuevo simulador.db", save it inside the project folder. Fill in Paso 1 with: alícuota 30, internet 25, seguro 10, agua 8, luz 12, otros 15 (costos fijos = 100); lavandería 5, limpieza 15, amenities 3, suministros 2 (directos = 25); agua costo unitario 0.5, cantidad 4, snacks 3 (cortesías = 5). Set utilidad deseada por noche to 20 and promedio noches por reserva to 2 (fields available under Paso 2 huéspedes reales / simulación area).

Expected: Tarifa noche regular shows a value consistent with the hand-computed Task 2 example (`precioBase ≈ 47.34`, `precioFinal ≈ 54.44`).

- [ ] **Step 4: Verify the slider updates the dashboard live**

Drag "Noches ocupadas al mes" from 1 to 30. Expected: KPIs (ingreso bruto, comisión, IVA, gastos, utilidad, margen) and both charts update immediately without a page reload or "Calcular" button.

- [ ] **Step 5: Verify holiday table editing**

Go to Paso 3, change a holiday's date, click "+ Agregar fiesta local", add a custom entry (e.g. "Feria de Loja", 2026-09-08), then delete one entry. Expected: table reflects all edits immediately.

- [ ] **Step 6: Verify persistence across reloads**

Close the browser tab entirely. Reopen `index.html`. Expected: the app loads directly into the dashboard (no welcome screen, or at most one "Continuar" click) with all previously entered data intact, including the custom holiday.

- [ ] **Step 7: Verify the SQLite file is a real, valid file**

Inspect the `simulador.db` file's size on disk (should be non-zero, several KB). Optionally open it with a SQLite viewer (e.g. "DB Browser for SQLite") and confirm the `simulator_state` table contains one row with a JSON `data` column matching what was entered.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "docs: mark manual verification complete" --allow-empty
```
