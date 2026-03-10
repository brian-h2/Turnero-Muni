// Data structure for the mock database
const INITIAL_STATE = {
  areas: [
    { id: 'rentas', name: 'Rentas', prefix: 'R' },
    { id: 'transito', name: 'Tránsito', prefix: 'T' }
  ],
  boxes: [
    { id: '1', name: 'Box 1', isActive: false },
    { id: '2', name: 'Box 2', isActive: false },
    { id: '3', name: 'Box 3', isActive: false }
  ],
  turnos: [],
  counters: {
    rentas: 1,
    transito: 1
  }
};

const DB_KEY = 'turnero_db';

// Initialize the database if it doesn't exist
export function initDB() {
  if (!localStorage.getItem(DB_KEY)) {
    localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_STATE));
  }
}

// Get the full database
function getDB() {
  return JSON.parse(localStorage.getItem(DB_KEY));
}

// Save the full database
function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  // Dispatch a custom event to easily track local changes in the same tab,
  // since the 'storage' event only triggers for OTHER tabs.
  window.dispatchEvent(new Event('local-storage-update'));
}

// Get all areas
export function getAreas() {
  return getDB().areas;
}

// Get all boxes
export function getBoxes() {
  return getDB().boxes;
}

// Set box state
export function setBoxState(boxId, isActive) {
  const db = getDB();
  const box = db.boxes.find(b => b.id === boxId);
  if (box) {
    box.isActive = isActive;
    saveDB(db);
  }
}

// Get history of all turnos
export function getTurnos() {
  return getDB().turnos;
}

// Generate a new ticket for an area
export function addTurno(areaId, userData = { name: '', dni: '' }) {
  const db = getDB();
  const area = db.areas.find(a => a.id === areaId);
  if (!area) return null;

  const currentCount = db.counters[areaId];
  // Format to 3 digits (e.g., 001)
  const code = `${area.prefix}-${String(currentCount).padStart(3, '0')}`;
  
  const newTurno = {
    id: Date.now().toString(),
    code,
    area_id: areaId,
    box_id: null,
    status: 'Espera',
    createdAt: Date.now(),
    calledAt: null,
    attendedAt: null,
    finishedAt: null,
    userName: userData.name,
    userDni: userData.dni
  };

  db.turnos.push(newTurno);
  db.counters[areaId] += 1; // Increment area counter
  
  saveDB(db);
  return newTurno;
}

// Get the current queue for an area (Only "Espera")
export function getQueueByArea(areaId) {
  return getDB().turnos.filter(t => t.area_id === areaId && t.status === 'Espera');
}

// Call the next ticket in the queue for a specific area and box
export function callNext(areaId, boxId, operatorName = 'Desconocido') {
  const db = getDB();
  const queue = db.turnos.filter(t => t.area_id === areaId && t.status === 'Espera');
  
  if (queue.length === 0) return null;

  // Find the oldest ticket
  queue.sort((a, b) => a.createdAt - b.createdAt);
  const nextTurno = queue[0];

  // Update it
  nextTurno.status = 'Llamado';
  nextTurno.box_id = boxId;
  nextTurno.operatorName = operatorName;
  nextTurno.calledAt = Date.now();

  saveDB(db);
  return nextTurno;
}

// Get the active ticket for a box (Llamado or Atendiendo)
export function getActiveTurnoByBox(boxId) {
  return getDB().turnos.find(t => t.box_id === boxId && (t.status === 'Llamado' || t.status === 'Atendiendo'));
}

// Change status of a ticket
export function updateTurnoStatus(turnoId, newStatus, observation = '') {
  const db = getDB();
  const turno = db.turnos.find(t => t.id === turnoId);
  if (turno) {
    turno.status = newStatus;
    if (newStatus === 'Atendiendo') turno.attendedAt = Date.now();
    if (newStatus === 'Finalizado') {
      turno.finishedAt = Date.now();
      if (observation) {
        turno.observation = turno.observation ? turno.observation + '\n' + observation : observation;
      }
    }
    saveDB(db);
  }
}

// Derive a ticket to another area
export function deriveTurno(turnoId, newAreaId, observation = '') {
  const db = getDB();
  const turno = db.turnos.find(t => t.id === turnoId);
  if (turno) {
    turno.status = 'Derivado';
    turno.finishedAt = Date.now();
    if (observation) {
      turno.observation = turno.observation ? turno.observation + '\nDerivado: ' + observation : 'Derivado: ' + observation;
    }

    // Create a new turno in the new area with the same code
    const newTurno = {
      id: Date.now().toString() + "-D", // New ID to avoid conflicts
      code: turno.code,
      area_id: newAreaId,
      box_id: null,
      status: 'Espera',
      createdAt: Date.now(),
      calledAt: null,
      attendedAt: null,
      finishedAt: null,
      userName: turno.userName,
      userDni: turno.userDni,
      observation: turno.observation, // Carry over observation history
      isDerived: true,
      originalArea_id: turno.isDerived ? turno.originalArea_id : turno.area_id,
      derivedFrom_id: turno.area_id
    };
    
    db.turnos.push(newTurno);
    saveDB(db);
  }
}

// Get the last N called tickets for the Hall Screen
export function getLastCalled(limit = 5) {
  const db = getDB();
  const calledTurnos = db.turnos.filter(t => t.status === 'Llamado' || t.status === 'Atendiendo');
  
  // Sort descending by calledAt
  calledTurnos.sort((a, b) => b.calledAt - a.calledAt);
  
  return calledTurnos.slice(0, limit);
}
