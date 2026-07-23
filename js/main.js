// js/main.js
(function () {
  const { createDefaultState, mergeState } = window.Sim.state;
  const {
    bindStepForm,
    syncStepForm,
    bindAccordions,
    bindFeriadosModal,
    renderDashboard,
    renderFeriados,
    bindFormulasToggle,
  } = window.Sim.ui;
  const {
    isFileSystemAccessSupported,
    createNewFile,
    openExistingFile,
    tryResumeStoredHandle,
    resumeAfterGesture,
    loadState,
    saveState,
    getCurrentDb,
  } = window.Sim.db;

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

  function showToast(message) {
    const el = document.getElementById('toast-guardado');
    el.textContent = message;
    el.classList.remove('hidden');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => el.classList.add('hidden'), 2000);
  }

  function bindManualModal() {
    const modal = document.getElementById('modal-manual');
    document.getElementById('btn-manual').addEventListener('click', () => modal.classList.remove('hidden'));
    document.getElementById('btn-cerrar-manual').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.classList.add('hidden');
    });
  }

  function bindHeaderActions() {
    document.getElementById('btn-guardar').addEventListener('click', async () => {
      clearTimeout(saveTimer);
      try {
        await saveState(state);
        showToast('Guardado ✓');
      } catch (err) {
        showError(err.message);
      }
    });
    document.getElementById('btn-exportar-pdf').addEventListener('click', () => window.print());
  }

  function showApp() {
    document.getElementById('intro-info').classList.add('hidden');
    document.getElementById('btn-manual').classList.remove('hidden');
    document.getElementById('btn-guardar').classList.remove('hidden');
    document.getElementById('btn-exportar-pdf').classList.remove('hidden');
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('resume-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    const root = document.getElementById('app-screen');
    bindAccordions(root);
    bindFeriadosModal(root);
    bindFormulasToggle(root);

    function onStateChange(patch) {
      state = mergeState(state, patch);
      render();
      scheduleSave();
    }

    function render() {
      syncStepForm(root, state);
      renderDashboard(root, state, onStateChange);
      renderFeriados(root, state.estacionalidad.feriados, (feriados) => onStateChange({ estacionalidad: { feriados } }));
    }

    bindStepForm(root, state, onStateChange);
    render();
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
    bindManualModal();
    bindHeaderActions();

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
})();
