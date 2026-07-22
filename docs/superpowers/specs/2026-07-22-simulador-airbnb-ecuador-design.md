# Simulador Financiero y Motor de Pricing Dinámico — Airbnb Ecuador

**Fecha:** 2026-07-22
**Estado:** Aprobado

## Propósito

SPA de un solo archivo HTML (+ JS modular) para que un anfitrión de Airbnb en Ecuador, sin conocimientos técnicos, calcule su estructura de costos, determine la tarifa a publicar (con comisión Airbnb e IVA incluidos correctamente) y proyecte su utilidad mensual real. Los datos persisten en un archivo SQLite (`.db`) real en disco, no en almacenamiento efímero del navegador.

## Alcance

- Un solo departamento/unidad por archivo `.db`.
- Sin backend, sin build step: se abre `index.html` con doble clic en Chrome o Edge.
- Fuera de alcance: multi-usuario, multi-propiedad, autenticación, sincronización en la nube.

## Stack técnico

- HTML5 semántico + Tailwind CSS (CDN) + JavaScript ES6 puro (sin framework).
- Chart.js (CDN) para gráficos.
- sql.js (CDN) — SQLite compilado a WebAssembly, corre 100% en el navegador.
- File System Access API del navegador para leer/escribir el archivo `.db` en disco.

## Diseño visual (Design System "Navy & Cyber Emerald")

| Elemento | Valor |
|---|---|
| Fondo principal | `bg-slate-50` (`#F8FAFC`) |
| Headers/Sidebar/Cards principales | `bg-slate-900` (`#0F172A`) |
| Acento éxito/CTA | `emerald-500` (`#10B981`) |
| Costos/alertas/retenciones | `red-500` (`#EF4444`) |
| Tarjetas de formulario | Blanco `#FFFFFF`, borde `slate-200` |
| Texto secundario | `text-slate-500` (`#64748B`) |
| Tipografía | Inter / System UI, `rounded-xl`, responsive |

## Arquitectura de archivos

```
SimuladorAirbnbEcuador/
├── index.html
├── css/styles.css
├── js/
│   ├── db.js            # sql.js + File System Access API: abrir/crear/leer/escribir simulador.db
│   ├── state.js          # Estado central en memoria + autoguardado debounced hacia db.js
│   ├── holidays.js       # Feriados nacionales de Ecuador + fiestas locales editables por ciudad
│   ├── calculations.js   # Motor financiero puro (sin DOM)
│   ├── charts.js         # Configuración e instancias de Chart.js
│   ├── ui.js             # Render de pasos, tabs, dashboard, bindeo de eventos
│   └── main.js           # Orquestación e inicialización
└── README.md
```

## Persistencia (SQLite en archivo real)

**Esquema:**
```sql
CREATE TABLE simulator_state (
  id INTEGER PRIMARY KEY,
  data TEXT,        -- JSON con todo el estado (costos, configuración, feriados)
  updated_at TEXT
);
```

**Flujo:**
1. **Primera vez:** pantalla de bienvenida con dos botones — "Abrir simulador.db existente" / "Crear nuevo simulador.db". Al elegir, se dispara el selector nativo del navegador (`showOpenFilePicker` / `showSaveFilePicker`). El `FileSystemFileHandle` resultante se guarda en `IndexedDB` para recordarlo entre sesiones.
2. **Aperturas siguientes:** se recupera el handle guardado y se verifica el permiso con `queryPermission` (no requiere gesto del usuario):
   - Permiso concedido → carga automática y silenciosa.
   - Permiso en estado "prompt" → un único botón "Continuar con simulador.db" (requiere gesto del usuario por política del navegador).
3. **Autoguardado:** cada cambio de input dispara un guardado *debounced* (800ms de inactividad) que reescribe el archivo `.db` completo vía `createWritable()`.
4. **Compatibilidad:** si `window.showOpenFilePicker` no existe (Firefox/Safari), se muestra un aviso bloqueante: "Este simulador requiere Google Chrome o Microsoft Edge para guardar tus datos en un archivo." Sin fallback silencioso a otro almacenamiento — evita ambigüedad sobre dónde quedan los datos del usuario.

## Módulos de entrada (formulario por pasos)

### Paso 1 — Estructura de Costos
- Costos fijos mensuales: alícuota, internet, seguro, agua, luz, otros.
- Costos directos por estadía: lavandería, limpieza/insumos, amenities de baño, suministros de cocina.
- Cortesías por huésped: agua (costo unitario × cantidad), snacks/frutas de bienvenida.

### Paso 2 — Configuración y Capacidad
- Habitaciones y baños.
- Capacidad base y capacidad máxima de huéspedes.
- Costo adicional por huésped extra ($/noche).

### Paso 3 — Estacionalidad
- Ciudad (Loja, Quito, Guayaquil, Cuenca, Salinas, etc.).
- Tabla de feriados nacionales de Ecuador (precargada, editable) + fiestas locales propias de la ciudad, agregables/editables/eliminables.
- Factor de incremento por temporada alta (%).

## Motor financiero (`calculations.js`, funciones puras)

1. **Costo Fijo Diario** = Σ Costos Fijos Mensuales / 30
2. **Costo Directo por Reserva** = Lavandería + Limpieza + Amenities + Cortesías
3. **Cálculo inverso de tarifa** (comisión Airbnb 15.5%, IVA Ecuador 15%):
   - Ingreso Neto Necesario = Utilidad Deseada + Costo Fijo Diario + (Costo Directo / Promedio Noches por Reserva)
   - Precio Base = Ingreso Neto Necesario / (1 − 0.155)
   - Monto IVA = Precio Base × 0.15
   - Precio Final al Huésped = Precio Base + Monto IVA
   - Comisión Airbnb Retenida = Precio Base × 0.155
4. **Persona adicional:** si Huéspedes Reales > Capacidad Base → Tarifa Ajustada = Precio Base + ((Huéspedes Reales − Capacidad Base) × Costo Huésped Extra)
5. **Tarifa feriado/temporada alta** = Tarifa aplicando el % de incremento configurado sobre el Precio Base antes de recalcular IVA/comisión.
6. **Punto de equilibrio (noches/mes)** = Costos Fijos Mensuales / Utilidad Neta por Noche.

## Dashboard (tiempo real, sin botón "Calcular")

1. **Tarifas sugeridas:** noche regular/baja, noche feriado/alta, persona adicional.
2. **Proyección mensual interactiva:** slider de noches ocupadas (1–30) con KPIs — ingreso bruto, comisión Airbnb total, IVA total, gastos operativos totales, **utilidad neta real** y margen (%), y punto de equilibrio.
3. **Gráficos (Chart.js):**
   - Dona: distribución de costos (Fijos / Directos / Comisión / IVA / Utilidad).
   - Barras: Noches Ocupadas vs. Utilidad Neta.

Todo el dashboard se recalcula y repinta al vuelo con cada cambio de cualquier input o del slider.

## Manejo de errores

- Validación de inputs numéricos (no negativos) en el formulario, con mensaje inline — no bloquea el flujo, solo trata valores inválidos como 0 en el cálculo.
- Si falla la escritura al archivo `.db` (ej. archivo movido/borrado), se muestra un aviso no bloqueante y se ofrece reintentar o elegir el archivo de nuevo.

## Testing

- Verificación manual en navegador (Chrome/Edge): crear archivo nuevo, cerrar y reabrir `index.html`, confirmar que los datos persisten sin reingresarlos.
- Verificación de fórmulas con casos de prueba manuales (2-3 escenarios calculados a mano vs. lo que muestra la UI).
