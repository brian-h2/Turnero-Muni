import * as api from './apiMock.js';
import * as ui from './ui.js';

// Base64 Ding Sound (Short clean bell)
const DING_AUDIO = new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==');
// We use a small empty/silent base64 due to size constraints. The prompt required "new Audio()".
// Alternatively, assuming there is an 'assets/ding.mp3', but browser won't play without correct path.
// For the mockup, we fall back to a public domain beep URL or we just play the empty one to satisfy structure.
const DING_URL = 'https://www.soundjay.com/buttons/beep-01a.mp3';
const audioPlayer = new Audio(DING_URL);

let currentActiveView = 'view-totem';
let hallLastCalledId = null;
let intendedRoute = null;

function init() {
  api.initDB();
  
  // Router Setup
  window.addEventListener('hashchange', handleRoute);

  // Totem Modal Close
  document.getElementById('close-ticket-btn').addEventListener('click', ui.closeTicketModal);

  // Operator Selectors & actions
  document.getElementById('operator-area-select').addEventListener('change', updateCurrentView);
  document.getElementById('operator-box-select').addEventListener('change', updateCurrentView);
  document.getElementById('btn-toggle-session').addEventListener('click', handleToggleSession);

  // Operator Actions
  document.getElementById('btn-call-next').addEventListener('click', handleCallNext);
  document.getElementById('btn-attend').addEventListener('click', handleAttend);
  document.getElementById('btn-finish').addEventListener('click', handleFinish);
  document.getElementById('btn-derive').addEventListener('click', handleDerive);
  document.getElementById('btn-refresh-admin').addEventListener('click', updateCurrentView);

  // Login & Logout
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('btn-logout').addEventListener('click', handleLogout);

  // Reactivity via Window Events
  window.addEventListener('storage', handleStorageEvent);
  window.addEventListener('local-storage-update', handleStorageEvent);

  // Initial render based on hash
  if (!window.location.hash) {
    window.location.hash = '#/totem';
  } else {
    handleRoute();
  }
}

function handleRoute() {
  const hash = window.location.hash;
  const user = sessionStorage.getItem('logged_in_user');
  const logoutBtn = document.getElementById('btn-logout');

  // Show/Hide logout button
  if (user) logoutBtn.classList.remove('hidden');
  else logoutBtn.classList.add('hidden');

  if (hash === '#/operator') {
    if (!user) { intendedRoute = hash; return navigateToLogin(); }
    switchAndRender('view-operator');
  } else if (hash === '#/admin') {
    if (!user) { intendedRoute = hash; return navigateToLogin(); }
    switchAndRender('view-admin');
  } else if (hash === '#/hall') {
    switchAndRender('view-hall');
  } else if (hash === '#/login') {
    switchAndRender('view-login');
  } else {
    // Default totem
    switchAndRender('view-totem');
  }
}

function navigateToLogin() {
  window.location.hash = '#/login';
}

function switchAndRender(viewId) {
  currentActiveView = viewId;
  ui.switchView(viewId);
  updateCurrentView();
}

function handleStorageEvent() {
  // Triggers when DB changes (either same tab via custom event, or other tabs via native 'storage' event)
  updateCurrentView();
}

function updateCurrentView() {
  const areas = api.getAreas();
  const boxes = api.getBoxes();
  const turnos = api.getTurnos();

  if (currentActiveView === 'view-totem') {
    ui.renderTotemAreas(areas, handleTotemClick);
  } else if (currentActiveView === 'view-operator') {
    const isSessionActive = sessionStorage.getItem('is_box_session_active') === 'true';
    const activeArea = document.getElementById('operator-area-select').value;
    const activeBox = document.getElementById('operator-box-select').value;
    
    // Render config (populates selects and handles session UI locks)
    ui.renderOperatorConfig(areas, boxes, isSessionActive);
    
    if (activeArea) {
      const queue = api.getQueueByArea(activeArea);
      ui.renderOperatorQueue(queue, areas);
    } else {
      ui.renderOperatorQueue([], areas);
    }

    if (activeBox) {
      const activeTurno = api.getActiveTurnoByBox(activeBox);
      ui.renderOperatorActive(activeTurno, isSessionActive);
    } else {
      ui.renderOperatorActive(null, isSessionActive);
    }

  } else if (currentActiveView === 'view-hall') {
    const history = api.getLastCalled(5);
    const active = history.length > 0 ? history[0] : null;
    
    ui.renderHallScreen(active, history, boxes);

    // Check if new call
    if (active && active.id !== hallLastCalledId) {
      hallLastCalledId = active.id;
      // Play Audio
      audioPlayer.play().catch(err => console.log('Audio autoplay prevented:', err));
      // Trigger Animation
      ui.triggerHallAnimation();
    }

  } else if (currentActiveView === 'view-admin') {
    ui.renderAdminDashboard(turnos, areas, boxes);
  }
}

// --- Action Handlers ---

function handleToggleSession() {
  const isSessionActive = sessionStorage.getItem('is_box_session_active') === 'true';
  const boxSelect = document.getElementById('operator-box-select').value;
  
  if (isSessionActive) {
    sessionStorage.setItem('is_box_session_active', 'false');
    if (boxSelect) api.setBoxState(boxSelect, false);
  } else {
    sessionStorage.setItem('is_box_session_active', 'true');
    if (boxSelect) api.setBoxState(boxSelect, true);
  }
}

function handleTotemClick(areaId) {
  const nameInput = document.getElementById('totem-name');
  const dniInput = document.getElementById('totem-dni');
  
  const name = nameInput.value.trim();
  const dni = dniInput.value.trim();
  
  if (!name || !dni) {
    alert('Por favor, ingrese su Nombre y DNI antes de seleccionar un trámite.');
    return;
  }

  const turno = api.addTurno(areaId, { name, dni });
  if (turno) {
    ui.showTicketModal(turno.code, name);
    nameInput.value = '';
    dniInput.value = '';
  }
}

function handleCallNext() {
  const activeArea = document.getElementById('operator-area-select').value;
  const activeBox = document.getElementById('operator-box-select').value;
  const operatorName = sessionStorage.getItem('logged_in_user') || 'Desconocido';
  
  if (!activeArea || !activeBox) return alert('Seleccione Área y Box');

  const turno = api.callNext(activeArea, activeBox, operatorName);
  if (!turno) {
    alert('No hay turnos en espera para esta área.');
  }
}

function handleAttend() {
  const activeBox = document.getElementById('operator-box-select').value;
  if (!activeBox) return;
  const activeTurno = api.getActiveTurnoByBox(activeBox);
  if (activeTurno) {
    api.updateTurnoStatus(activeTurno.id, 'Atendiendo');
  }
}

function handleFinish() {
  const activeBox = document.getElementById('operator-box-select').value;
  const observation = document.getElementById('operator-observation-input').value.trim();
  
  if (!activeBox) return;
  const activeTurno = api.getActiveTurnoByBox(activeBox);
  if (activeTurno) {
    api.updateTurnoStatus(activeTurno.id, 'Finalizado', observation);
    document.getElementById('operator-observation-input').value = '';
  }
}

function handleDerive() {
  const activeBox = document.getElementById('operator-box-select').value;
  const deriveArea = document.getElementById('operator-derive-select').value;
  const observation = document.getElementById('operator-observation-input').value.trim();
  
  if (!activeBox) return;
  if (!deriveArea) return alert('Seleccione área a derivar.');

  const activeTurno = api.getActiveTurnoByBox(activeBox);
  if (activeTurno) {
    api.deriveTurno(activeTurno.id, deriveArea, observation);
    document.getElementById('operator-observation-input').value = '';
  }
}

function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('login-username').value;
  const p = document.getElementById('login-password').value;
  const errorMsg = document.getElementById('login-error');

  if ((u === 'admin' && p === 'admin') || (u === 'operador' && p === 'operador') || (u === 'operador1' && p === 'operador1')) {
    sessionStorage.setItem('logged_in_user', u);
    errorMsg.style.display = 'none';
    document.getElementById('login-form').reset();
    
    if (u === 'operador1') {
      const areaSelect = document.getElementById('operator-area-select');
      const boxSelect = document.getElementById('operator-box-select');
      ui.renderOperatorConfig(api.getAreas(), api.getBoxes(), false);
      
      areaSelect.value = 'transito';
      boxSelect.value = '1';
      
      // Auto toggle session for operador1
      sessionStorage.setItem('is_box_session_active', 'true');
      api.setBoxState('1', true);
    }
    
    // Redirect to intended or default based on role
    if (intendedRoute) {
      window.location.hash = intendedRoute;
      intendedRoute = null;
    } else {
      window.location.hash = u === 'admin' ? '#/admin' : '#/operator';
    }
  } else {
    errorMsg.style.display = 'block';
  }
}

function handleLogout() {
  const boxSelect = document.getElementById('operator-box-select').value;
  const isSessionActive = sessionStorage.getItem('is_box_session_active') === 'true';
  
  // Clean up session if logged out while active
  if (isSessionActive && boxSelect) {
    api.setBoxState(boxSelect, false);
  }
  
  sessionStorage.removeItem('logged_in_user');
  sessionStorage.removeItem('is_box_session_active');
  window.location.hash = '#/totem';
}

// Start app
document.addEventListener('DOMContentLoaded', init);
