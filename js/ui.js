// Pure DOM Manipulation

// --- VIEWS MANAGEMENT ---
export function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.remove('hidden');
    // small delay for css animation
    setTimeout(() => target.classList.add('active'), 10);
  }

  // Update nav buttons
  document.querySelectorAll('.app-nav a.nav-link').forEach(b => {
    if (b.dataset.target === viewId) b.classList.add('active-nav');
    else b.classList.remove('active-nav');
  });
}

// --- TOTEM ---
export function renderTotemAreas(areas, onAreaClick) {
  const container = document.getElementById('totem-areas-container');
  container.innerHTML = '';
  
  areas.forEach(area => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = area.name;
    btn.onclick = () => onAreaClick(area.id);
    container.appendChild(btn);
  });
}

export function showTicketModal(ticketCode, userName = '') {
  document.getElementById('ticket-number-display').textContent = ticketCode;
  document.getElementById('ticket-user-display').textContent = userName ? `Turno de: ${userName}` : '';
  document.getElementById('ticket-modal').classList.remove('hidden');
}

export function closeTicketModal() {
  document.getElementById('ticket-modal').classList.add('hidden');
}

// --- OPERATOR PANEL ---
export function renderOperatorConfig(areas, boxes, isSessionActive) {
  const areaSelect = document.getElementById('operator-area-select');
  const boxSelect = document.getElementById('operator-box-select');
  const deriveSelect = document.getElementById('operator-derive-select');
  const toggleBtn = document.getElementById('btn-toggle-session');
  const statusBadge = document.getElementById('operator-box-status');

  // Preserve selected values if any
  const currentArea = areaSelect.value;
  const currentBox = boxSelect.value;
  const currentDerive = deriveSelect.value;

  areaSelect.innerHTML = '<option value="">Seleccione Área...</option>';
  deriveSelect.innerHTML = '<option value="">Seleccione Área...</option>';
  areas.forEach(a => {
    areaSelect.innerHTML += `<option value="${a.id}">${a.name}</option>`;
    deriveSelect.innerHTML += `<option value="${a.id}">${a.name}</option>`;
  });

  boxSelect.innerHTML = '<option value="">Seleccione Box...</option>';
  boxes.forEach(b => {
    boxSelect.innerHTML += `<option value="${b.id}">${b.name}</option>`;
  });

  areaSelect.value = currentArea;
  boxSelect.value = currentBox;
  deriveSelect.value = currentDerive;

  // Session locks
  areaSelect.disabled = isSessionActive;
  boxSelect.disabled = isSessionActive;
  if(toggleBtn) toggleBtn.disabled = !areaSelect.value || !boxSelect.value;
  
  if (isSessionActive && statusBadge) {
    if(toggleBtn) {
      toggleBtn.textContent = 'Finalizar Jornada';
      toggleBtn.className = 'btn btn-danger';
    }
    statusBadge.textContent = 'ACTIVO';
    statusBadge.style.backgroundColor = 'var(--success-color)';
  } else if (statusBadge) {
    if(toggleBtn) {
      toggleBtn.textContent = 'Iniciar Jornada';
      toggleBtn.className = 'btn btn-success';
    }
    statusBadge.textContent = 'INACTIVO';
    statusBadge.style.backgroundColor = 'var(--danger-color)';
  }
}

export function renderOperatorQueue(queue, areas = []) {
  const list = document.getElementById('operator-queue-list');
  const countSpan = document.getElementById('queue-count');
  
  countSpan.textContent = queue.length;
  list.innerHTML = '';

  if (queue.length === 0) {
    list.innerHTML = '<li>No hay turnos en espera.</li>';
    return;
  }

  queue.forEach(turno => {
    const li = document.createElement('li');
    let derivedInfo = '';
    if (turno.isDerived) {
      const prevAreaName = areas.find(a => a.id === turno.derivedFrom_id)?.name || 'Otra Área';
      derivedInfo = `<span style="display: inline-block; background: var(--secondary-color); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-top: 5px;">Derivado de: ${prevAreaName}</span>`;
    }

    li.innerHTML = `
      <div>
        <span style="display: block; font-size: 1.2rem;"><strong>${turno.code}</strong></span>
        ${turno.userName ? `<span class="text-muted" style="font-size: 0.9rem;">${turno.userName} (DNI: ${turno.userDni})</span><br>` : ''}
        ${derivedInfo}
      </div>
      <span class="text-muted">${new Date(turno.createdAt).toLocaleTimeString()}</span>
    `;
    list.appendChild(li);
  });
}

export function renderOperatorActive(turno, isSessionActive) {
  const display = document.getElementById('operator-active-ticket');
  const btnCall = document.getElementById('btn-call-next');
  const btnAttend = document.getElementById('btn-attend');
  const btnFinish = document.getElementById('btn-finish');
  const btnDerive = document.getElementById('btn-derive');
  const textarea = document.getElementById('operator-observation-input');
  
  const prevObsContainer = document.getElementById('operator-previous-observation');
  const prevObsText = document.getElementById('operator-previous-observation-text');
  
  const areaSelect = document.getElementById('operator-area-select').value;
  const boxSelect = document.getElementById('operator-box-select').value;

  const isActiveBox = areaSelect && boxSelect && isSessionActive;

  if (!turno) {
    display.textContent = '--';
    display.style.color = 'var(--secondary-color)';
    btnCall.disabled = !isActiveBox; // can call next if box is active and no current ticket
    btnAttend.disabled = true;
    btnFinish.disabled = true;
    btnDerive.disabled = true;
    textarea.disabled = true;
    textarea.value = '';
    if (prevObsContainer) prevObsContainer.style.display = 'none';
    return;
  }

  // If there's a ticket but it's not the same as the one we were looking at, clear textarea
  if (!textarea.dataset.currentTurno || textarea.dataset.currentTurno !== turno.id) {
    textarea.value = '';
    textarea.dataset.currentTurno = turno.id;
  }

  display.textContent = turno.code;
  display.style.color = 'var(--primary-color)';

  if (turno.observation && prevObsContainer) {
    prevObsContainer.style.display = 'block';
    prevObsText.innerHTML = turno.observation.replace(/\n/g, '<br>');
  } else if (prevObsContainer) {
    prevObsContainer.style.display = 'none';
  }

  btnCall.disabled = true; // wait until current is finished or derived
  
  if (turno.status === 'Llamado') {
    btnAttend.disabled = false;
    btnFinish.disabled = true;
    btnDerive.disabled = true;
    textarea.disabled = true;
  } else if (turno.status === 'Atendiendo') {
    btnAttend.disabled = true;
    btnFinish.disabled = false;
    btnDerive.disabled = false;
    textarea.disabled = false; // allow to write observations
  }
}

// --- HALL SCREEN ---
export function renderHallScreen(activeTurno, history, boxes) {
  const currentDisplay = document.getElementById('hall-current-ticket');
  const boxDisplay = document.getElementById('hall-current-box');
  const historyList = document.getElementById('hall-history-list');

  // Update Main Display
  if (activeTurno) {
    currentDisplay.textContent = activeTurno.code;
    const box = boxes.find(b => b.id === activeTurno.box_id);
    boxDisplay.textContent = box ? box.name : '--';
  } else {
    currentDisplay.textContent = '--';
    boxDisplay.textContent = '--';
  }

  // Update History
  historyList.innerHTML = '';
  history.forEach(turno => {
    const li = document.createElement('li');
    const boxName = boxes.find(b => b.id === turno.box_id)?.name || '--';
    li.innerHTML = `<span>${turno.code}</span> <span class="box">${boxName}</span>`;
    historyList.appendChild(li);
  });
}

export function triggerHallAnimation() {
  const mainDisplay = document.getElementById('hall-main-display');
  mainDisplay.classList.remove('blink-bg');
  // Trigger reflow to restart animation
  void mainDisplay.offsetWidth;
  mainDisplay.classList.add('blink-bg');
}

// --- ADMIN DASHBOARD ---
export function renderAdminDashboard(turnos, areas, boxes) {
  // Stats
  const todayTurnos = turnos.filter(t => new Date(t.createdAt).toDateString() === new Date().toDateString());
  document.getElementById('admin-total-turnos').textContent = todayTurnos.length;

  // Wait time (Espera -> Llamado)
  const attended = todayTurnos.filter(t => t.calledAt);
  const totalWait = attended.reduce((acc, t) => acc + (t.calledAt - t.createdAt), 0);
  const avgWait = attended.length ? (totalWait / attended.length) / 60000 : 0; // in minutes
  document.getElementById('admin-avg-wait').textContent = `${avgWait.toFixed(1)} min`;

  // Attend time (Atendiendo -> Finalizado/Derivado)
  const finished = todayTurnos.filter(t => t.attendedAt && t.finishedAt);
  const totalAttend = finished.reduce((acc, t) => acc + (t.finishedAt - t.attendedAt), 0);
  const avgAttend = finished.length ? (totalAttend / finished.length) / 60000 : 0;
  document.getElementById('admin-avg-attend').textContent = `${avgAttend.toFixed(1)} min`;

  // Render Bar charts (css dynamic width)
  const barsContainer = document.getElementById('admin-area-bars');
  barsContainer.innerHTML = '';
  
  areas.forEach(area => {
    const count = todayTurnos.filter(t => t.area_id === area.id).length;
    const percentage = todayTurnos.length ? (count / todayTurnos.length) * 100 : 0;
    
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="bar-label">${area.name}</div>
      <div class="bar-wrapper">
        <div class="bar-fill" style="width: ${percentage}%;">
          <span class="bar-value">${count}</span>
        </div>
      </div>
    `;
    barsContainer.appendChild(row);
  });

  // Render Box Status
  const boxStatusContainer = document.getElementById('admin-box-status');
  boxStatusContainer.innerHTML = '';
  boxes.forEach(box => {
    const isAct = box.isActive;
    const badgeColor = isAct ? 'var(--success-color)' : 'var(--danger-color)';
    const text = isAct ? 'En Sesión (Activo)' : 'Inactivo';
    boxStatusContainer.innerHTML += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-color); border-radius: var(--border-radius);">
        <span style="font-weight: 600;">${box.name}</span>
        <span style="background: ${badgeColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">${text}</span>
      </div>
    `;
  });

  // Render Operator Metrics
  const opMetricsBody = document.getElementById('admin-operator-metrics-body');
  opMetricsBody.innerHTML = '';
  const opStats = {};

  attended.forEach(t => {
    const op = t.operatorName || 'Desconocido';
    const bName = boxes.find(b => b.id === t.box_id)?.name || 'Box ?';
    const key = `${op} | ${bName}`;
    
    if (!opStats[key]) {
      opStats[key] = { count: 0, waitSum: 0, attendSum: 0, attendCount: 0 };
    }
    
    opStats[key].count += 1;
    opStats[key].waitSum += (t.calledAt - t.createdAt);
    
    if (t.attendedAt && t.finishedAt) {
      opStats[key].attendSum += (t.finishedAt - t.attendedAt);
      opStats[key].attendCount += 1;
    }
  });

  Object.keys(opStats).forEach(key => {
    const stat = opStats[key];
    const wAvg = (stat.waitSum / stat.count) / 60000;
    const aAvg = stat.attendCount > 0 ? (stat.attendSum / stat.attendCount) / 60000 : 0;
    
    opMetricsBody.innerHTML += `
      <tr>
        <td><strong>${key}</strong></td>
        <td>${stat.count}</td>
        <td>${wAvg.toFixed(1)} min</td>
        <td>${aAvg.toFixed(1)} min</td>
      </tr>
    `;
  });

  // Table
  const tbody = document.getElementById('admin-table-body');
  tbody.innerHTML = '';
  // Show last 20 limit
  const recent = [...todayTurnos].sort((a,b) => b.createdAt - a.createdAt).slice(0, 20);
  recent.forEach(t => {
    const areaName = areas.find(a => a.id === t.area_id)?.name || t.area_id;
    const callTime = t.calledAt ? new Date(t.calledAt).toLocaleTimeString() : '-';
    
    let derivadoTag = '';
    if (t.isDerived) {
      const prevAreaName = areas.find(a => a.id === t.derivedFrom_id)?.name || 'Anterior';
      derivadoTag = `<br><span style="font-size: 0.75rem; color: var(--secondary-color); font-weight: normal;">(Desde: ${prevAreaName})</span>`;
    }

    tbody.innerHTML += `
      <tr>
        <td><strong>${t.code}</strong>${derivadoTag}</td>
        <td>${areaName}</td>
        <td>${t.box_id || '-'}</td>
        <td><span class="badge ${t.status.toLowerCase()}">${t.status}</span></td>
        <td>${new Date(t.createdAt).toLocaleTimeString()}</td>
        <td>${callTime}</td>
      </tr>
    `;
  });
}
