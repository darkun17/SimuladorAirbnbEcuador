// js/db.js
// Envuelve sql.js (SQLite via WebAssembly) + File System Access API.
// Script clasico (no ES module) para evitar el bloqueo CORS de Chrome al
// cargar modulos via file://. sql.js se carga como script global desde
// index.html (window.initSqlJs).
window.Sim = window.Sim || {};

(function () {
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

  async function storeHandle(handle) {
    const idb = await openHandleDb();
    await new Promise((resolve, reject) => {
      const tx = idb.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(handle, DB_HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getStoredHandle() {
    const idb = await openHandleDb();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction('handles', 'readonly');
      const req = tx.objectStore('handles').get(DB_HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function verifyPermission(handle) {
    const opts = { mode: 'readwrite' };
    if ((await handle.queryPermission(opts)) === 'granted') return 'granted';
    return handle.queryPermission(opts);
  }

  async function requestPermission(handle) {
    return handle.requestPermission({ mode: 'readwrite' });
  }

  function isFileSystemAccessSupported() {
    return typeof window.showOpenFilePicker === 'function' && typeof window.showSaveFilePicker === 'function';
  }

  function ensureSchema(db) {
    db.run(`CREATE TABLE IF NOT EXISTS simulator_state (
      id INTEGER PRIMARY KEY,
      data TEXT,
      updated_at TEXT
    )`);
  }

  async function createNewFile() {
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

  async function openExistingFile() {
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

  async function tryResumeStoredHandle() {
    const handle = await getStoredHandle();
    if (!handle) return null;
    const permission = await verifyPermission(handle);
    if (permission !== 'granted') return { handle, needsUserGesture: true };
    const db = await loadDbFromHandle(handle);
    currentHandle = handle;
    currentDb = db;
    return { handle, db, needsUserGesture: false };
  }

  async function resumeAfterGesture(handle) {
    const permission = await requestPermission(handle);
    if (permission !== 'granted') throw new Error('Permiso denegado para acceder al archivo.');
    const db = await loadDbFromHandle(handle);
    currentHandle = handle;
    currentDb = db;
    return db;
  }

  function loadState(db) {
    const res = db.exec('SELECT data FROM simulator_state ORDER BY id DESC LIMIT 1');
    if (!res.length || !res[0].values.length) return null;
    return JSON.parse(res[0].values[0][0]);
  }

  async function saveState(state) {
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

  function getCurrentDb() {
    return currentDb;
  }

  window.Sim.db = {
    isFileSystemAccessSupported,
    createNewFile,
    openExistingFile,
    tryResumeStoredHandle,
    resumeAfterGesture,
    loadState,
    saveState,
    getCurrentDb,
  };
})();
