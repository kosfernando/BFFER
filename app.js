/* ========================
   ESTADO GLOBAL
======================== */
const RESERVE = 30;
const LS_KEY  = 'finanzas_pro_v1';

let balance      = 0;
let savings      = 0;
let goal         = 500;
let pendingAmount     = 0;
let pendingPct        = 20;
let selectedIncomeCat = null;
let selectedSpendCat  = null;
let pendingSpend          = 0;
let pendingSavingsNeeded  = 0;

const transactions = [];

const INCOME_CATS = [
  { icon: 'ti-briefcase',    label: 'Trabajo'   },
  { icon: 'ti-building-bank',label: 'Freelance' },
  { icon: 'ti-gift',         label: 'Regalo'    },
  { icon: 'ti-chart-line',   label: 'Inversión' },
  { icon: 'ti-cash',         label: 'Venta'     },
  { icon: 'ti-dots',         label: 'Otro'      },
];

const SPEND_CATS = [
  { icon: 'ti-tools-kitchen-2', label: 'Comida'     },
  { icon: 'ti-bus',             label: 'Transporte' },
  { icon: 'ti-home',            label: 'Hogar'      },
  { icon: 'ti-device-mobile',   label: 'Servicios'  },
  { icon: 'ti-shopping-cart',   label: 'Compras'    },
  { icon: 'ti-heartbeat',       label: 'Salud'      },
  { icon: 'ti-device-gamepad',  label: 'Ocio'       },
  { icon: 'ti-book',            label: 'Educación'  },
  { icon: 'ti-dots',            label: 'Otro'       },
];

const CONFETTI_COLORS = ['#6d5dfc','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#fbbf24','#34d399'];


/* ========================
   PERSISTENCIA — localStorage
======================== */
function saveState() {
  try {
    const data = { balance, savings, goal, transactions, savedAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) { console.warn('localStorage error al guardar:', e); }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    balance = typeof data.balance === 'number' ? data.balance : 0;
    savings = typeof data.savings === 'number' ? data.savings : 0;
    goal    = typeof data.goal    === 'number' ? data.goal    : 500;
    transactions.length = 0;
    if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
    return true;
  } catch(e) { console.warn('localStorage error al cargar:', e); return false; }
}

/* Exportar datos como .json para respaldo manual */
function exportJSON() {
  const data = { balance, savings, goal, transactions, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'finanzas_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/* Importar desde .json */
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      balance = typeof data.balance === 'number' ? data.balance : 0;
      savings = typeof data.savings === 'number' ? data.savings : 0;
      goal    = typeof data.goal    === 'number' ? data.goal    : 500;
      transactions.length = 0;
      if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
      document.getElementById('goalInput').value = goal;
      updateGoal();
      saveState();
      refreshUI();
      showToast('✅ Datos importados correctamente');
    } catch { showToast('❌ Archivo JSON inválido'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}


/* ========================
   TOAST NOTIFICATION
======================== */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:100px; left:50%; transform:translateX(-50%) translateY(20px);
      background:#31344b; color:#fff; padding:10px 20px; border-radius:20px;
      font-size:14px; font-weight:600; z-index:999; opacity:0;
      transition:all 0.3s ease; white-space:nowrap; pointer-events:none;
      box-shadow:0 4px 20px rgba(0,0,0,0.25);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}


/* ========================
   NAVEGACIÓN
======================== */
function navigate(sec) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('visible'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('visible');
  document.getElementById('tab-' + sec).classList.add('active');
}

function updatePct() {
  const v = document.getElementById('savePct').value;
  document.getElementById('pctDisplay').textContent = v + '%';
  document.getElementById('pct-label').textContent  = v + '%';
}

function updateGoal() {
  goal = parseFloat(document.getElementById('goalInput').value) || 500;
  document.getElementById('goal-val').textContent = goal.toFixed(0);
  refreshSavingsBar();
  saveState();
}

function refreshSavingsBar() {
  const pct = Math.min(100, (savings / goal) * 100);
  document.getElementById('savBar').style.width = pct.toFixed(1) + '%';
  document.getElementById('goal-pct').textContent = pct.toFixed(0) + '%';
}

function refreshUI() {
  document.getElementById('balance-disp').textContent = balance.toFixed(2);
  document.getElementById('savings-disp').textContent = savings.toFixed(2);
  document.getElementById('savings-mini').textContent = savings.toFixed(2);
  document.getElementById('total-disp').textContent   = (balance + savings).toFixed(2);
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  refreshSavingsBar();
  renderTxList();
}

function stampTime() {
  const now = new Date();
  return now.toLocaleDateString('es-PE',{day:'numeric',month:'short'})
    + ' · ' + now.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
}


/* ========================
   FLUJO: INGRESO
======================== */
function startAddIncome() {
  const input = document.getElementById('incomeInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }
  pendingAmount     = amt;
  pendingPct        = parseInt(document.getElementById('savePct').value);
  selectedIncomeCat = null;
  buildCatGrid('cat-grid-income', INCOME_CATS, 'income');
  document.getElementById('overlay-income').classList.add('show');
}

function confirmIncome(cat) {
  document.getElementById('overlay-income').classList.remove('show');
  const toSave  = pendingAmount * (pendingPct / 100);
  const toSpend = pendingAmount - toSave;

  balance += toSpend;
  savings += toSave;

  const t = stampTime();
  transactions.unshift({ saving:false, spend:false, label:cat||'Ingreso', sub:t, amount:'+S/ '+toSpend.toFixed(2), cls:'pos', icon:'ti-arrow-down-circle' });
  if (toSave > 0)
    transactions.unshift({ saving:true, spend:false, label:'Ahorro ('+pendingPct+'%)', sub:t, amount:'S/ '+toSave.toFixed(2), cls:'sav', icon:'ti-piggy-bank' });

  document.getElementById('incomeInput').value = '';
  saveState();
  refreshUI();
  if (toSave > 0) animatePig();
  showToast('💰 Ingreso registrado');
}


/* ========================
   FLUJO: GASTO
======================== */
function openSpend() {
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  document.getElementById('spendInput').value = '';
  selectedSpendCat = null;
  buildCatGrid('cat-grid-spend', SPEND_CATS, 'spend');
  document.getElementById('overlay-spend').classList.add('show');
}

function confirmSpend() {
  const input = document.getElementById('spendInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }

  const cat = selectedSpendCat || 'Gasto';
  document.getElementById('overlay-spend').classList.remove('show');

  const freeBalance = balance - RESERVE;

  if (freeBalance >= amt) {
    executeSpend(amt, cat, 0);
  } else {
    const deficit = amt - freeBalance;
    if (deficit > savings) {
      showImpossibleAlert(amt, freeBalance, deficit);
    } else {
      pendingSpend         = amt;
      pendingSavingsNeeded = deficit;
      showSavingsAlert(amt, cat, freeBalance, deficit);
    }
  }
}

function executeSpend(amt, cat, fromSavings) {
  balance -= amt;
  balance += fromSavings;
  savings -= fromSavings;

  const t = stampTime();
  if (fromSavings > 0)
    transactions.unshift({ saving:true, spend:false, label:'Rescate de ahorro', sub:t, amount:'-S/ '+fromSavings.toFixed(2), cls:'res', icon:'ti-piggy-bank' });
  transactions.unshift({ saving:false, spend:true, label:cat, sub:t, amount:'-S/ '+amt.toFixed(2), cls:'neg', icon:'ti-shopping-bag' });

  saveState();
  refreshUI();
  animateCoin();
  showToast('🛍️ Gasto registrado');
}

function executeSpendWithSavings() {
  closeAlert();
  const cat = selectedSpendCat || 'Gasto';
  executeSpend(pendingSpend, cat, pendingSavingsNeeded);
}


/* ========================
   ALERTAS
======================== */
function showSavingsAlert(amt, cat, freeBalance, needed) {
  document.getElementById('alert-body').innerHTML = `
    Para cubrir este gasto de <strong>S/ ${amt.toFixed(2)}</strong>
    tu saldo libre solo alcanza <strong>S/ ${Math.max(0,freeBalance).toFixed(2)}</strong>
    (los S/ ${RESERVE} son tu reserva protegida).<br><br>
    Necesitas tomar <span class="savings-needed">S/ ${needed.toFixed(2)}</span>
    de tus ahorros para completarlo.<br><br>
    ¿Quieres continuar?
  `;
  document.getElementById('overlay-alert').classList.add('show');
}

function showImpossibleAlert(amt, freeBalance, deficit) {
  document.getElementById('alert-body').innerHTML = `
    Para pagar <strong>S/ ${amt.toFixed(2)}</strong> necesitas
    <strong>S/ ${deficit.toFixed(2)}</strong> adicionales,
    pero solo tienes <strong>S/ ${savings.toFixed(2)}</strong> en ahorro.<br><br>
    No es posible realizar este gasto sin afectar la reserva protegida.
  `;
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = 'none';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Entendido';
  cancelBtn.style.flex  = '1';
  document.getElementById('overlay-alert').classList.add('show');
}

function closeAlert() {
  document.getElementById('overlay-alert').classList.remove('show');
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = '';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.flex  = '';
}


/* ========================
   CAT GRID
======================== */
function buildCatGrid(gridId, cats, type) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = '';
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.innerHTML = `<i class="ti ${c.icon}"></i>${c.label}`;
    btn.onclick = () => {
      grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (type === 'income') selectedIncomeCat = c.label;
      else                   selectedSpendCat  = c.label;
    };
    grid.appendChild(btn);
  });
}


/* ========================
   HISTORIAL
======================== */
function renderTxList() {
  const list = document.getElementById('tx-list');
  if (transactions.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-mood-empty"></i><p>Sin movimientos aún</p></div>';
    return;
  }
  list.innerHTML = transactions.slice(0, 60).map(t => `
    <div class="tx-item">
      <div class="tx-icon ${t.saving?'saving':''} ${t.spend?'spend':''} ${t.cls==='res'?'reserve':''}">
        <i class="ti ${t.icon}"></i>
      </div>
      <div class="tx-label"><p>${t.label}</p><small>${t.sub}</small></div>
      <div class="tx-amount ${t.cls}">${t.amount}</div>
    </div>`).join('');
}


/* ========================
   ANIMACIONES
======================== */
function animatePig()  { flyEmoji('pig-anim',  'tab-cuenta', 'tab-ahorro'); }
function animateCoin() { flyEmoji('coin-anim', 'tab-cuenta', 'tab-movimientos'); }

function flyEmoji(elemId, fromTabId, toTabId) {
  const el = document.getElementById(elemId);
  const r1 = document.getElementById(fromTabId).getBoundingClientRect();
  const r2 = document.getElementById(toTabId).getBoundingClientRect();
  const sx = r1.left + r1.width/2 - 17, sy = r1.top - 20;
  const ex = r2.left + r2.width/2 - 17, ey = r2.top - 20;

  el.style.cssText = `display:block;left:${sx}px;top:${sy}px;transition:none;transform:scale(1) rotate(0deg);opacity:1;`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-out,transform 0.3s ease';
    el.style.left = ex+'px'; el.style.top = (Math.min(sy,ey)-70)+'px';
    el.style.transform = 'scale(1.15) rotate(-15deg)';
    setTimeout(() => {
      el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-in,transform 0.3s ease';
      el.style.top = ey+'px'; el.style.transform = 'scale(1.15) rotate(15deg)';
    }, 450);
    setTimeout(() => {
      el.style.transition = 'transform 0.2s ease';
      el.style.transform  = 'scale(1.6) rotate(0deg)';
      spawnConfetti(ex+17, ey+17);
      setTimeout(() => {
        el.style.transition = 'transform 0.25s ease,opacity 0.25s ease';
        el.style.transform  = 'scale(0)'; el.style.opacity = '0';
        setTimeout(() => { el.style.display='none'; el.style.opacity='1'; }, 280);
      }, 250);
    }, 900);
  }));
}

function spawnConfetti(cx, cy) {
  const wrap = document.getElementById('confetti-wrap');
  for (let i = 0; i < 22; i++) {
    const dot = document.createElement('div');
    dot.className = 'conf-dot';
    const angle = Math.random() * 2 * Math.PI, dist = 28 + Math.random() * 70;
    const sq = i % 3 === 0;
    dot.style.cssText = `left:${cx+Math.cos(angle)*dist}px;top:${cy+Math.sin(angle)*dist}px;background:${CONFETTI_COLORS[i%CONFETTI_COLORS.length]};border-radius:${sq?'2px':'50%'};width:${sq?'7px':'9px'};height:${sq?'7px':'9px'};animation-delay:${(Math.random()*0.3).toFixed(2)}s;`;
    wrap.appendChild(dot);
    setTimeout(() => dot.remove(), 1700);
  }
}


/* ========================
   CERRAR MODALES
======================== */
['overlay-income','overlay-spend'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });
});


/* ========================
   REGISTRO SERVICE WORKER
======================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registrado — app offline lista'))
      .catch(e => console.warn('SW error:', e));
  });
}


/* ========================
   ARRANQUE
======================== */
(function init() {
  const loaded = loadState();
  // Sincronizar slider y meta con estado cargado
  const pctSlider = document.getElementById('savePct');
  document.getElementById('pctDisplay').textContent = pctSlider.value + '%';
  document.getElementById('pct-label').textContent  = pctSlider.value + '%';
  document.getElementById('goalInput').value = goal;
  refreshUI();
  if (loaded) showToast('📂 Datos cargados');
})();/* ========================
   ESTADO GLOBAL
======================== */
const RESERVE = 30;
const LS_KEY  = 'finanzas_pro_v1';

let balance      = 0;
let savings      = 0;
let goal         = 500;
let pendingAmount     = 0;
let pendingPct        = 20;
let selectedIncomeCat = null;
let selectedSpendCat  = null;
let pendingSpend          = 0;
let pendingSavingsNeeded  = 0;

const transactions = [];

const INCOME_CATS = [
  { icon: 'ti-briefcase',    label: 'Trabajo'   },
  { icon: 'ti-building-bank',label: 'Freelance' },
  { icon: 'ti-gift',         label: 'Regalo'    },
  { icon: 'ti-chart-line',   label: 'Inversión' },
  { icon: 'ti-cash',         label: 'Venta'     },
  { icon: 'ti-dots',         label: 'Otro'      },
];

const SPEND_CATS = [
  { icon: 'ti-tools-kitchen-2', label: 'Comida'     },
  { icon: 'ti-bus',             label: 'Transporte' },
  { icon: 'ti-home',            label: 'Hogar'      },
  { icon: 'ti-device-mobile',   label: 'Servicios'  },
  { icon: 'ti-shopping-cart',   label: 'Compras'    },
  { icon: 'ti-heartbeat',       label: 'Salud'      },
  { icon: 'ti-device-gamepad',  label: 'Ocio'       },
  { icon: 'ti-book',            label: 'Educación'  },
  { icon: 'ti-dots',            label: 'Otro'       },
];

const CONFETTI_COLORS = ['#6d5dfc','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#fbbf24','#34d399'];


/* ========================
   PERSISTENCIA — localStorage
======================== */
function saveState() {
  try {
    const data = { balance, savings, goal, transactions, savedAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) { console.warn('localStorage error al guardar:', e); }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    balance = typeof data.balance === 'number' ? data.balance : 0;
    savings = typeof data.savings === 'number' ? data.savings : 0;
    goal    = typeof data.goal    === 'number' ? data.goal    : 500;
    transactions.length = 0;
    if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
    return true;
  } catch(e) { console.warn('localStorage error al cargar:', e); return false; }
}

/* Exportar datos como .json para respaldo manual */
function exportJSON() {
  const data = { balance, savings, goal, transactions, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'finanzas_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/* Importar desde .json */
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      balance = typeof data.balance === 'number' ? data.balance : 0;
      savings = typeof data.savings === 'number' ? data.savings : 0;
      goal    = typeof data.goal    === 'number' ? data.goal    : 500;
      transactions.length = 0;
      if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
      document.getElementById('goalInput').value = goal;
      updateGoal();
      saveState();
      refreshUI();
      showToast('✅ Datos importados correctamente');
    } catch { showToast('❌ Archivo JSON inválido'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}


/* ========================
   TOAST NOTIFICATION
======================== */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:100px; left:50%; transform:translateX(-50%) translateY(20px);
      background:#31344b; color:#fff; padding:10px 20px; border-radius:20px;
      font-size:14px; font-weight:600; z-index:999; opacity:0;
      transition:all 0.3s ease; white-space:nowrap; pointer-events:none;
      box-shadow:0 4px 20px rgba(0,0,0,0.25);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}


/* ========================
   NAVEGACIÓN
======================== */
function navigate(sec) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('visible'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('visible');
  document.getElementById('tab-' + sec).classList.add('active');
}

function updatePct() {
  const v = document.getElementById('savePct').value;
  document.getElementById('pctDisplay').textContent = v + '%';
  document.getElementById('pct-label').textContent  = v + '%';
}

function updateGoal() {
  goal = parseFloat(document.getElementById('goalInput').value) || 500;
  document.getElementById('goal-val').textContent = goal.toFixed(0);
  refreshSavingsBar();
  saveState();
}

function refreshSavingsBar() {
  const pct = Math.min(100, (savings / goal) * 100);
  document.getElementById('savBar').style.width = pct.toFixed(1) + '%';
  document.getElementById('goal-pct').textContent = pct.toFixed(0) + '%';
}

function refreshUI() {
  document.getElementById('balance-disp').textContent = balance.toFixed(2);
  document.getElementById('savings-disp').textContent = savings.toFixed(2);
  document.getElementById('savings-mini').textContent = savings.toFixed(2);
  document.getElementById('total-disp').textContent   = (balance + savings).toFixed(2);
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  refreshSavingsBar();
  renderTxList();
}

function stampTime() {
  const now = new Date();
  return now.toLocaleDateString('es-PE',{day:'numeric',month:'short'})
    + ' · ' + now.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
}


/* ========================
   FLUJO: INGRESO
======================== */
function startAddIncome() {
  const input = document.getElementById('incomeInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }
  pendingAmount     = amt;
  pendingPct        = parseInt(document.getElementById('savePct').value);
  selectedIncomeCat = null;
  buildCatGrid('cat-grid-income', INCOME_CATS, 'income');
  document.getElementById('overlay-income').classList.add('show');
}

function confirmIncome(cat) {
  document.getElementById('overlay-income').classList.remove('show');
  const toSave  = pendingAmount * (pendingPct / 100);
  const toSpend = pendingAmount - toSave;

  balance += toSpend;
  savings += toSave;

  const t = stampTime();
  transactions.unshift({ saving:false, spend:false, label:cat||'Ingreso', sub:t, amount:'+S/ '+toSpend.toFixed(2), cls:'pos', icon:'ti-arrow-down-circle' });
  if (toSave > 0)
    transactions.unshift({ saving:true, spend:false, label:'Ahorro ('+pendingPct+'%)', sub:t, amount:'S/ '+toSave.toFixed(2), cls:'sav', icon:'ti-piggy-bank' });

  document.getElementById('incomeInput').value = '';
  saveState();
  refreshUI();
  if (toSave > 0) animatePig();
  showToast('💰 Ingreso registrado');
}


/* ========================
   FLUJO: GASTO
======================== */
function openSpend() {
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  document.getElementById('spendInput').value = '';
  selectedSpendCat = null;
  buildCatGrid('cat-grid-spend', SPEND_CATS, 'spend');
  document.getElementById('overlay-spend').classList.add('show');
}

function confirmSpend() {
  const input = document.getElementById('spendInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }

  const cat = selectedSpendCat || 'Gasto';
  document.getElementById('overlay-spend').classList.remove('show');

  const freeBalance = balance - RESERVE;

  if (freeBalance >= amt) {
    executeSpend(amt, cat, 0);
  } else {
    const deficit = amt - freeBalance;
    if (deficit > savings) {
      showImpossibleAlert(amt, freeBalance, deficit);
    } else {
      pendingSpend         = amt;
      pendingSavingsNeeded = deficit;
      showSavingsAlert(amt, cat, freeBalance, deficit);
    }
  }
}

function executeSpend(amt, cat, fromSavings) {
  balance -= amt;
  balance += fromSavings;
  savings -= fromSavings;

  const t = stampTime();
  if (fromSavings > 0)
    transactions.unshift({ saving:true, spend:false, label:'Rescate de ahorro', sub:t, amount:'-S/ '+fromSavings.toFixed(2), cls:'res', icon:'ti-piggy-bank' });
  transactions.unshift({ saving:false, spend:true, label:cat, sub:t, amount:'-S/ '+amt.toFixed(2), cls:'neg', icon:'ti-shopping-bag' });

  saveState();
  refreshUI();
  animateCoin();
  showToast('🛍️ Gasto registrado');
}

function executeSpendWithSavings() {
  closeAlert();
  const cat = selectedSpendCat || 'Gasto';
  executeSpend(pendingSpend, cat, pendingSavingsNeeded);
}


/* ========================
   ALERTAS
======================== */
function showSavingsAlert(amt, cat, freeBalance, needed) {
  document.getElementById('alert-body').innerHTML = `
    Para cubrir este gasto de <strong>S/ ${amt.toFixed(2)}</strong>
    tu saldo libre solo alcanza <strong>S/ ${Math.max(0,freeBalance).toFixed(2)}</strong>
    (los S/ ${RESERVE} son tu reserva protegida).<br><br>
    Necesitas tomar <span class="savings-needed">S/ ${needed.toFixed(2)}</span>
    de tus ahorros para completarlo.<br><br>
    ¿Quieres continuar?
  `;
  document.getElementById('overlay-alert').classList.add('show');
}

function showImpossibleAlert(amt, freeBalance, deficit) {
  document.getElementById('alert-body').innerHTML = `
    Para pagar <strong>S/ ${amt.toFixed(2)}</strong> necesitas
    <strong>S/ ${deficit.toFixed(2)}</strong> adicionales,
    pero solo tienes <strong>S/ ${savings.toFixed(2)}</strong> en ahorro.<br><br>
    No es posible realizar este gasto sin afectar la reserva protegida.
  `;
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = 'none';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Entendido';
  cancelBtn.style.flex  = '1';
  document.getElementById('overlay-alert').classList.add('show');
}

function closeAlert() {
  document.getElementById('overlay-alert').classList.remove('show');
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = '';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.flex  = '';
}


/* ========================
   CAT GRID
======================== */
function buildCatGrid(gridId, cats, type) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = '';
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.innerHTML = `<i class="ti ${c.icon}"></i>${c.label}`;
    btn.onclick = () => {
      grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (type === 'income') selectedIncomeCat = c.label;
      else                   selectedSpendCat  = c.label;
    };
    grid.appendChild(btn);
  });
}


/* ========================
   HISTORIAL
======================== */
function renderTxList() {
  const list = document.getElementById('tx-list');
  if (transactions.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-mood-empty"></i><p>Sin movimientos aún</p></div>';
    return;
  }
  list.innerHTML = transactions.slice(0, 60).map(t => `
    <div class="tx-item">
      <div class="tx-icon ${t.saving?'saving':''} ${t.spend?'spend':''} ${t.cls==='res'?'reserve':''}">
        <i class="ti ${t.icon}"></i>
      </div>
      <div class="tx-label"><p>${t.label}</p><small>${t.sub}</small></div>
      <div class="tx-amount ${t.cls}">${t.amount}</div>
    </div>`).join('');
}


/* ========================
   ANIMACIONES
======================== */
function animatePig()  { flyEmoji('pig-anim',  'tab-cuenta', 'tab-ahorro'); }
function animateCoin() { flyEmoji('coin-anim', 'tab-cuenta', 'tab-movimientos'); }

function flyEmoji(elemId, fromTabId, toTabId) {
  const el = document.getElementById(elemId);
  const r1 = document.getElementById(fromTabId).getBoundingClientRect();
  const r2 = document.getElementById(toTabId).getBoundingClientRect();
  const sx = r1.left + r1.width/2 - 17, sy = r1.top - 20;
  const ex = r2.left + r2.width/2 - 17, ey = r2.top - 20;

  el.style.cssText = `display:block;left:${sx}px;top:${sy}px;transition:none;transform:scale(1) rotate(0deg);opacity:1;`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-out,transform 0.3s ease';
    el.style.left = ex+'px'; el.style.top = (Math.min(sy,ey)-70)+'px';
    el.style.transform = 'scale(1.15) rotate(-15deg)';
    setTimeout(() => {
      el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-in,transform 0.3s ease';
      el.style.top = ey+'px'; el.style.transform = 'scale(1.15) rotate(15deg)';
    }, 450);
    setTimeout(() => {
      el.style.transition = 'transform 0.2s ease';
      el.style.transform  = 'scale(1.6) rotate(0deg)';
      spawnConfetti(ex+17, ey+17);
      setTimeout(() => {
        el.style.transition = 'transform 0.25s ease,opacity 0.25s ease';
        el.style.transform  = 'scale(0)'; el.style.opacity = '0';
        setTimeout(() => { el.style.display='none'; el.style.opacity='1'; }, 280);
      }, 250);
    }, 900);
  }));
}

function spawnConfetti(cx, cy) {
  const wrap = document.getElementById('confetti-wrap');
  for (let i = 0; i < 22; i++) {
    const dot = document.createElement('div');
    dot.className = 'conf-dot';
    const angle = Math.random() * 2 * Math.PI, dist = 28 + Math.random() * 70;
    const sq = i % 3 === 0;
    dot.style.cssText = `left:${cx+Math.cos(angle)*dist}px;top:${cy+Math.sin(angle)*dist}px;background:${CONFETTI_COLORS[i%CONFETTI_COLORS.length]};border-radius:${sq?'2px':'50%'};width:${sq?'7px':'9px'};height:${sq?'7px':'9px'};animation-delay:${(Math.random()*0.3).toFixed(2)}s;`;
    wrap.appendChild(dot);
    setTimeout(() => dot.remove(), 1700);
  }
}


/* ========================
   CERRAR MODALES
======================== */
['overlay-income','overlay-spend'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });
});


/* ========================
   REGISTRO SERVICE WORKER
======================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registrado — app offline lista'))
      .catch(e => console.warn('SW error:', e));
  });
}


/* ========================
   ARRANQUE
======================== */
(function init() {
  const loaded = loadState();
  // Sincronizar slider y meta con estado cargado
  const pctSlider = document.getElementById('savePct');
  document.getElementById('pctDisplay').textContent = pctSlider.value + '%';
  document.getElementById('pct-label').textContent  = pctSlider.value + '%';
  document.getElementById('goalInput').value = goal;
  refreshUI();
  if (loaded) showToast('📂 Datos cargados');
})();/* ========================
   ESTADO GLOBAL
======================== */
const RESERVE = 30;
const LS_KEY  = 'finanzas_pro_v1';

let balance      = 0;
let savings      = 0;
let goal         = 500;
let pendingAmount     = 0;
let pendingPct        = 20;
let selectedIncomeCat = null;
let selectedSpendCat  = null;
let pendingSpend          = 0;
let pendingSavingsNeeded  = 0;

const transactions = [];

const INCOME_CATS = [
  { icon: 'ti-briefcase',    label: 'Trabajo'   },
  { icon: 'ti-building-bank',label: 'Freelance' },
  { icon: 'ti-gift',         label: 'Regalo'    },
  { icon: 'ti-chart-line',   label: 'Inversión' },
  { icon: 'ti-cash',         label: 'Venta'     },
  { icon: 'ti-dots',         label: 'Otro'      },
];

const SPEND_CATS = [
  { icon: 'ti-tools-kitchen-2', label: 'Comida'     },
  { icon: 'ti-bus',             label: 'Transporte' },
  { icon: 'ti-home',            label: 'Hogar'      },
  { icon: 'ti-device-mobile',   label: 'Servicios'  },
  { icon: 'ti-shopping-cart',   label: 'Compras'    },
  { icon: 'ti-heartbeat',       label: 'Salud'      },
  { icon: 'ti-device-gamepad',  label: 'Ocio'       },
  { icon: 'ti-book',            label: 'Educación'  },
  { icon: 'ti-dots',            label: 'Otro'       },
];

const CONFETTI_COLORS = ['#6d5dfc','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#fbbf24','#34d399'];


/* ========================
   PERSISTENCIA — localStorage
======================== */
function saveState() {
  try {
    const data = { balance, savings, goal, transactions, savedAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) { console.warn('localStorage error al guardar:', e); }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    balance = typeof data.balance === 'number' ? data.balance : 0;
    savings = typeof data.savings === 'number' ? data.savings : 0;
    goal    = typeof data.goal    === 'number' ? data.goal    : 500;
    transactions.length = 0;
    if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
    return true;
  } catch(e) { console.warn('localStorage error al cargar:', e); return false; }
}

/* Exportar datos como .json para respaldo manual */
function exportJSON() {
  const data = { balance, savings, goal, transactions, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'finanzas_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/* Importar desde .json */
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      balance = typeof data.balance === 'number' ? data.balance : 0;
      savings = typeof data.savings === 'number' ? data.savings : 0;
      goal    = typeof data.goal    === 'number' ? data.goal    : 500;
      transactions.length = 0;
      if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
      document.getElementById('goalInput').value = goal;
      updateGoal();
      saveState();
      refreshUI();
      showToast('✅ Datos importados correctamente');
    } catch { showToast('❌ Archivo JSON inválido'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}


/* ========================
   TOAST NOTIFICATION
======================== */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:100px; left:50%; transform:translateX(-50%) translateY(20px);
      background:#31344b; color:#fff; padding:10px 20px; border-radius:20px;
      font-size:14px; font-weight:600; z-index:999; opacity:0;
      transition:all 0.3s ease; white-space:nowrap; pointer-events:none;
      box-shadow:0 4px 20px rgba(0,0,0,0.25);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}


/* ========================
   NAVEGACIÓN
======================== */
function navigate(sec) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('visible'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('visible');
  document.getElementById('tab-' + sec).classList.add('active');
}

function updatePct() {
  const v = document.getElementById('savePct').value;
  document.getElementById('pctDisplay').textContent = v + '%';
  document.getElementById('pct-label').textContent  = v + '%';
}

function updateGoal() {
  goal = parseFloat(document.getElementById('goalInput').value) || 500;
  document.getElementById('goal-val').textContent = goal.toFixed(0);
  refreshSavingsBar();
  saveState();
}

function refreshSavingsBar() {
  const pct = Math.min(100, (savings / goal) * 100);
  document.getElementById('savBar').style.width = pct.toFixed(1) + '%';
  document.getElementById('goal-pct').textContent = pct.toFixed(0) + '%';
}

function refreshUI() {
  document.getElementById('balance-disp').textContent = balance.toFixed(2);
  document.getElementById('savings-disp').textContent = savings.toFixed(2);
  document.getElementById('savings-mini').textContent = savings.toFixed(2);
  document.getElementById('total-disp').textContent   = (balance + savings).toFixed(2);
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  refreshSavingsBar();
  renderTxList();
}

function stampTime() {
  const now = new Date();
  return now.toLocaleDateString('es-PE',{day:'numeric',month:'short'})
    + ' · ' + now.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
}


/* ========================
   FLUJO: INGRESO
======================== */
function startAddIncome() {
  const input = document.getElementById('incomeInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }
  pendingAmount     = amt;
  pendingPct        = parseInt(document.getElementById('savePct').value);
  selectedIncomeCat = null;
  buildCatGrid('cat-grid-income', INCOME_CATS, 'income');
  document.getElementById('overlay-income').classList.add('show');
}

function confirmIncome(cat) {
  document.getElementById('overlay-income').classList.remove('show');
  const toSave  = pendingAmount * (pendingPct / 100);
  const toSpend = pendingAmount - toSave;

  balance += toSpend;
  savings += toSave;

  const t = stampTime();
  transactions.unshift({ saving:false, spend:false, label:cat||'Ingreso', sub:t, amount:'+S/ '+toSpend.toFixed(2), cls:'pos', icon:'ti-arrow-down-circle' });
  if (toSave > 0)
    transactions.unshift({ saving:true, spend:false, label:'Ahorro ('+pendingPct+'%)', sub:t, amount:'S/ '+toSave.toFixed(2), cls:'sav', icon:'ti-piggy-bank' });

  document.getElementById('incomeInput').value = '';
  saveState();
  refreshUI();
  if (toSave > 0) animatePig();
  showToast('💰 Ingreso registrado');
}


/* ========================
   FLUJO: GASTO
======================== */
function openSpend() {
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  document.getElementById('spendInput').value = '';
  selectedSpendCat = null;
  buildCatGrid('cat-grid-spend', SPEND_CATS, 'spend');
  document.getElementById('overlay-spend').classList.add('show');
}

function confirmSpend() {
  const input = document.getElementById('spendInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }

  const cat = selectedSpendCat || 'Gasto';
  document.getElementById('overlay-spend').classList.remove('show');

  const freeBalance = balance - RESERVE;

  if (freeBalance >= amt) {
    executeSpend(amt, cat, 0);
  } else {
    const deficit = amt - freeBalance;
    if (deficit > savings) {
      showImpossibleAlert(amt, freeBalance, deficit);
    } else {
      pendingSpend         = amt;
      pendingSavingsNeeded = deficit;
      showSavingsAlert(amt, cat, freeBalance, deficit);
    }
  }
}

function executeSpend(amt, cat, fromSavings) {
  balance -= amt;
  balance += fromSavings;
  savings -= fromSavings;

  const t = stampTime();
  if (fromSavings > 0)
    transactions.unshift({ saving:true, spend:false, label:'Rescate de ahorro', sub:t, amount:'-S/ '+fromSavings.toFixed(2), cls:'res', icon:'ti-piggy-bank' });
  transactions.unshift({ saving:false, spend:true, label:cat, sub:t, amount:'-S/ '+amt.toFixed(2), cls:'neg', icon:'ti-shopping-bag' });

  saveState();
  refreshUI();
  animateCoin();
  showToast('🛍️ Gasto registrado');
}

function executeSpendWithSavings() {
  closeAlert();
  const cat = selectedSpendCat || 'Gasto';
  executeSpend(pendingSpend, cat, pendingSavingsNeeded);
}


/* ========================
   ALERTAS
======================== */
function showSavingsAlert(amt, cat, freeBalance, needed) {
  document.getElementById('alert-body').innerHTML = `
    Para cubrir este gasto de <strong>S/ ${amt.toFixed(2)}</strong>
    tu saldo libre solo alcanza <strong>S/ ${Math.max(0,freeBalance).toFixed(2)}</strong>
    (los S/ ${RESERVE} son tu reserva protegida).<br><br>
    Necesitas tomar <span class="savings-needed">S/ ${needed.toFixed(2)}</span>
    de tus ahorros para completarlo.<br><br>
    ¿Quieres continuar?
  `;
  document.getElementById('overlay-alert').classList.add('show');
}

function showImpossibleAlert(amt, freeBalance, deficit) {
  document.getElementById('alert-body').innerHTML = `
    Para pagar <strong>S/ ${amt.toFixed(2)}</strong> necesitas
    <strong>S/ ${deficit.toFixed(2)}</strong> adicionales,
    pero solo tienes <strong>S/ ${savings.toFixed(2)}</strong> en ahorro.<br><br>
    No es posible realizar este gasto sin afectar la reserva protegida.
  `;
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = 'none';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Entendido';
  cancelBtn.style.flex  = '1';
  document.getElementById('overlay-alert').classList.add('show');
}

function closeAlert() {
  document.getElementById('overlay-alert').classList.remove('show');
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = '';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.flex  = '';
}


/* ========================
   CAT GRID
======================== */
function buildCatGrid(gridId, cats, type) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = '';
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.innerHTML = `<i class="ti ${c.icon}"></i>${c.label}`;
    btn.onclick = () => {
      grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (type === 'income') selectedIncomeCat = c.label;
      else                   selectedSpendCat  = c.label;
    };
    grid.appendChild(btn);
  });
}


/* ========================
   HISTORIAL
======================== */
function renderTxList() {
  const list = document.getElementById('tx-list');
  if (transactions.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-mood-empty"></i><p>Sin movimientos aún</p></div>';
    return;
  }
  list.innerHTML = transactions.slice(0, 60).map(t => `
    <div class="tx-item">
      <div class="tx-icon ${t.saving?'saving':''} ${t.spend?'spend':''} ${t.cls==='res'?'reserve':''}">
        <i class="ti ${t.icon}"></i>
      </div>
      <div class="tx-label"><p>${t.label}</p><small>${t.sub}</small></div>
      <div class="tx-amount ${t.cls}">${t.amount}</div>
    </div>`).join('');
}


/* ========================
   ANIMACIONES
======================== */
function animatePig()  { flyEmoji('pig-anim',  'tab-cuenta', 'tab-ahorro'); }
function animateCoin() { flyEmoji('coin-anim', 'tab-cuenta', 'tab-movimientos'); }

function flyEmoji(elemId, fromTabId, toTabId) {
  const el = document.getElementById(elemId);
  const r1 = document.getElementById(fromTabId).getBoundingClientRect();
  const r2 = document.getElementById(toTabId).getBoundingClientRect();
  const sx = r1.left + r1.width/2 - 17, sy = r1.top - 20;
  const ex = r2.left + r2.width/2 - 17, ey = r2.top - 20;

  el.style.cssText = `display:block;left:${sx}px;top:${sy}px;transition:none;transform:scale(1) rotate(0deg);opacity:1;`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-out,transform 0.3s ease';
    el.style.left = ex+'px'; el.style.top = (Math.min(sy,ey)-70)+'px';
    el.style.transform = 'scale(1.15) rotate(-15deg)';
    setTimeout(() => {
      el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-in,transform 0.3s ease';
      el.style.top = ey+'px'; el.style.transform = 'scale(1.15) rotate(15deg)';
    }, 450);
    setTimeout(() => {
      el.style.transition = 'transform 0.2s ease';
      el.style.transform  = 'scale(1.6) rotate(0deg)';
      spawnConfetti(ex+17, ey+17);
      setTimeout(() => {
        el.style.transition = 'transform 0.25s ease,opacity 0.25s ease';
        el.style.transform  = 'scale(0)'; el.style.opacity = '0';
        setTimeout(() => { el.style.display='none'; el.style.opacity='1'; }, 280);
      }, 250);
    }, 900);
  }));
}

function spawnConfetti(cx, cy) {
  const wrap = document.getElementById('confetti-wrap');
  for (let i = 0; i < 22; i++) {
    const dot = document.createElement('div');
    dot.className = 'conf-dot';
    const angle = Math.random() * 2 * Math.PI, dist = 28 + Math.random() * 70;
    const sq = i % 3 === 0;
    dot.style.cssText = `left:${cx+Math.cos(angle)*dist}px;top:${cy+Math.sin(angle)*dist}px;background:${CONFETTI_COLORS[i%CONFETTI_COLORS.length]};border-radius:${sq?'2px':'50%'};width:${sq?'7px':'9px'};height:${sq?'7px':'9px'};animation-delay:${(Math.random()*0.3).toFixed(2)}s;`;
    wrap.appendChild(dot);
    setTimeout(() => dot.remove(), 1700);
  }
}


/* ========================
   CERRAR MODALES
======================== */
['overlay-income','overlay-spend'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });
});


/* ========================
   REGISTRO SERVICE WORKER
======================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registrado — app offline lista'))
      .catch(e => console.warn('SW error:', e));
  });
}


/* ========================
   ARRANQUE
======================== */
(function init() {
  const loaded = loadState();
  // Sincronizar slider y meta con estado cargado
  const pctSlider = document.getElementById('savePct');
  document.getElementById('pctDisplay').textContent = pctSlider.value + '%';
  document.getElementById('pct-label').textContent  = pctSlider.value + '%';
  document.getElementById('goalInput').value = goal;
  refreshUI();
  if (loaded) showToast('📂 Datos cargados');
})();/* ========================
   ESTADO GLOBAL
======================== */
const RESERVE = 30;
const LS_KEY  = 'finanzas_pro_v1';

let balance      = 0;
let savings      = 0;
let goal         = 500;
let pendingAmount     = 0;
let pendingPct        = 20;
let selectedIncomeCat = null;
let selectedSpendCat  = null;
let pendingSpend          = 0;
let pendingSavingsNeeded  = 0;

const transactions = [];

const INCOME_CATS = [
  { icon: 'ti-briefcase',    label: 'Trabajo'   },
  { icon: 'ti-building-bank',label: 'Freelance' },
  { icon: 'ti-gift',         label: 'Regalo'    },
  { icon: 'ti-chart-line',   label: 'Inversión' },
  { icon: 'ti-cash',         label: 'Venta'     },
  { icon: 'ti-dots',         label: 'Otro'      },
];

const SPEND_CATS = [
  { icon: 'ti-tools-kitchen-2', label: 'Comida'     },
  { icon: 'ti-bus',             label: 'Transporte' },
  { icon: 'ti-home',            label: 'Hogar'      },
  { icon: 'ti-device-mobile',   label: 'Servicios'  },
  { icon: 'ti-shopping-cart',   label: 'Compras'    },
  { icon: 'ti-heartbeat',       label: 'Salud'      },
  { icon: 'ti-device-gamepad',  label: 'Ocio'       },
  { icon: 'ti-book',            label: 'Educación'  },
  { icon: 'ti-dots',            label: 'Otro'       },
];

const CONFETTI_COLORS = ['#6d5dfc','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#fbbf24','#34d399'];


/* ========================
   PERSISTENCIA — localStorage
======================== */
function saveState() {
  try {
    const data = { balance, savings, goal, transactions, savedAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) { console.warn('localStorage error al guardar:', e); }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    balance = typeof data.balance === 'number' ? data.balance : 0;
    savings = typeof data.savings === 'number' ? data.savings : 0;
    goal    = typeof data.goal    === 'number' ? data.goal    : 500;
    transactions.length = 0;
    if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
    return true;
  } catch(e) { console.warn('localStorage error al cargar:', e); return false; }
}

/* Exportar datos como .json para respaldo manual */
function exportJSON() {
  const data = { balance, savings, goal, transactions, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'finanzas_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/* Importar desde .json */
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      balance = typeof data.balance === 'number' ? data.balance : 0;
      savings = typeof data.savings === 'number' ? data.savings : 0;
      goal    = typeof data.goal    === 'number' ? data.goal    : 500;
      transactions.length = 0;
      if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
      document.getElementById('goalInput').value = goal;
      updateGoal();
      saveState();
      refreshUI();
      showToast('✅ Datos importados correctamente');
    } catch { showToast('❌ Archivo JSON inválido'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}


/* ========================
   TOAST NOTIFICATION
======================== */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:100px; left:50%; transform:translateX(-50%) translateY(20px);
      background:#31344b; color:#fff; padding:10px 20px; border-radius:20px;
      font-size:14px; font-weight:600; z-index:999; opacity:0;
      transition:all 0.3s ease; white-space:nowrap; pointer-events:none;
      box-shadow:0 4px 20px rgba(0,0,0,0.25);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}


/* ========================
   NAVEGACIÓN
======================== */
function navigate(sec) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('visible'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('visible');
  document.getElementById('tab-' + sec).classList.add('active');
}

function updatePct() {
  const v = document.getElementById('savePct').value;
  document.getElementById('pctDisplay').textContent = v + '%';
  document.getElementById('pct-label').textContent  = v + '%';
}

function updateGoal() {
  goal = parseFloat(document.getElementById('goalInput').value) || 500;
  document.getElementById('goal-val').textContent = goal.toFixed(0);
  refreshSavingsBar();
  saveState();
}

function refreshSavingsBar() {
  const pct = Math.min(100, (savings / goal) * 100);
  document.getElementById('savBar').style.width = pct.toFixed(1) + '%';
  document.getElementById('goal-pct').textContent = pct.toFixed(0) + '%';
}

function refreshUI() {
  document.getElementById('balance-disp').textContent = balance.toFixed(2);
  document.getElementById('savings-disp').textContent = savings.toFixed(2);
  document.getElementById('savings-mini').textContent = savings.toFixed(2);
  document.getElementById('total-disp').textContent   = (balance + savings).toFixed(2);
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  refreshSavingsBar();
  renderTxList();
}

function stampTime() {
  const now = new Date();
  return now.toLocaleDateString('es-PE',{day:'numeric',month:'short'})
    + ' · ' + now.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
}


/* ========================
   FLUJO: INGRESO
======================== */
function startAddIncome() {
  const input = document.getElementById('incomeInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }
  pendingAmount     = amt;
  pendingPct        = parseInt(document.getElementById('savePct').value);
  selectedIncomeCat = null;
  buildCatGrid('cat-grid-income', INCOME_CATS, 'income');
  document.getElementById('overlay-income').classList.add('show');
}

function confirmIncome(cat) {
  document.getElementById('overlay-income').classList.remove('show');
  const toSave  = pendingAmount * (pendingPct / 100);
  const toSpend = pendingAmount - toSave;

  balance += toSpend;
  savings += toSave;

  const t = stampTime();
  transactions.unshift({ saving:false, spend:false, label:cat||'Ingreso', sub:t, amount:'+S/ '+toSpend.toFixed(2), cls:'pos', icon:'ti-arrow-down-circle' });
  if (toSave > 0)
    transactions.unshift({ saving:true, spend:false, label:'Ahorro ('+pendingPct+'%)', sub:t, amount:'S/ '+toSave.toFixed(2), cls:'sav', icon:'ti-piggy-bank' });

  document.getElementById('incomeInput').value = '';
  saveState();
  refreshUI();
  if (toSave > 0) animatePig();
  showToast('💰 Ingreso registrado');
}


/* ========================
   FLUJO: GASTO
======================== */
function openSpend() {
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  document.getElementById('spendInput').value = '';
  selectedSpendCat = null;
  buildCatGrid('cat-grid-spend', SPEND_CATS, 'spend');
  document.getElementById('overlay-spend').classList.add('show');
}

function confirmSpend() {
  const input = document.getElementById('spendInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }

  const cat = selectedSpendCat || 'Gasto';
  document.getElementById('overlay-spend').classList.remove('show');

  const freeBalance = balance - RESERVE;

  if (freeBalance >= amt) {
    executeSpend(amt, cat, 0);
  } else {
    const deficit = amt - freeBalance;
    if (deficit > savings) {
      showImpossibleAlert(amt, freeBalance, deficit);
    } else {
      pendingSpend         = amt;
      pendingSavingsNeeded = deficit;
      showSavingsAlert(amt, cat, freeBalance, deficit);
    }
  }
}

function executeSpend(amt, cat, fromSavings) {
  balance -= amt;
  balance += fromSavings;
  savings -= fromSavings;

  const t = stampTime();
  if (fromSavings > 0)
    transactions.unshift({ saving:true, spend:false, label:'Rescate de ahorro', sub:t, amount:'-S/ '+fromSavings.toFixed(2), cls:'res', icon:'ti-piggy-bank' });
  transactions.unshift({ saving:false, spend:true, label:cat, sub:t, amount:'-S/ '+amt.toFixed(2), cls:'neg', icon:'ti-shopping-bag' });

  saveState();
  refreshUI();
  animateCoin();
  showToast('🛍️ Gasto registrado');
}

function executeSpendWithSavings() {
  closeAlert();
  const cat = selectedSpendCat || 'Gasto';
  executeSpend(pendingSpend, cat, pendingSavingsNeeded);
}


/* ========================
   ALERTAS
======================== */
function showSavingsAlert(amt, cat, freeBalance, needed) {
  document.getElementById('alert-body').innerHTML = `
    Para cubrir este gasto de <strong>S/ ${amt.toFixed(2)}</strong>
    tu saldo libre solo alcanza <strong>S/ ${Math.max(0,freeBalance).toFixed(2)}</strong>
    (los S/ ${RESERVE} son tu reserva protegida).<br><br>
    Necesitas tomar <span class="savings-needed">S/ ${needed.toFixed(2)}</span>
    de tus ahorros para completarlo.<br><br>
    ¿Quieres continuar?
  `;
  document.getElementById('overlay-alert').classList.add('show');
}

function showImpossibleAlert(amt, freeBalance, deficit) {
  document.getElementById('alert-body').innerHTML = `
    Para pagar <strong>S/ ${amt.toFixed(2)}</strong> necesitas
    <strong>S/ ${deficit.toFixed(2)}</strong> adicionales,
    pero solo tienes <strong>S/ ${savings.toFixed(2)}</strong> en ahorro.<br><br>
    No es posible realizar este gasto sin afectar la reserva protegida.
  `;
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = 'none';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Entendido';
  cancelBtn.style.flex  = '1';
  document.getElementById('overlay-alert').classList.add('show');
}

function closeAlert() {
  document.getElementById('overlay-alert').classList.remove('show');
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = '';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.flex  = '';
}


/* ========================
   CAT GRID
======================== */
function buildCatGrid(gridId, cats, type) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = '';
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.innerHTML = `<i class="ti ${c.icon}"></i>${c.label}`;
    btn.onclick = () => {
      grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (type === 'income') selectedIncomeCat = c.label;
      else                   selectedSpendCat  = c.label;
    };
    grid.appendChild(btn);
  });
}


/* ========================
   HISTORIAL
======================== */
function renderTxList() {
  const list = document.getElementById('tx-list');
  if (transactions.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-mood-empty"></i><p>Sin movimientos aún</p></div>';
    return;
  }
  list.innerHTML = transactions.slice(0, 60).map(t => `
    <div class="tx-item">
      <div class="tx-icon ${t.saving?'saving':''} ${t.spend?'spend':''} ${t.cls==='res'?'reserve':''}">
        <i class="ti ${t.icon}"></i>
      </div>
      <div class="tx-label"><p>${t.label}</p><small>${t.sub}</small></div>
      <div class="tx-amount ${t.cls}">${t.amount}</div>
    </div>`).join('');
}


/* ========================
   ANIMACIONES
======================== */
function animatePig()  { flyEmoji('pig-anim',  'tab-cuenta', 'tab-ahorro'); }
function animateCoin() { flyEmoji('coin-anim', 'tab-cuenta', 'tab-movimientos'); }

function flyEmoji(elemId, fromTabId, toTabId) {
  const el = document.getElementById(elemId);
  const r1 = document.getElementById(fromTabId).getBoundingClientRect();
  const r2 = document.getElementById(toTabId).getBoundingClientRect();
  const sx = r1.left + r1.width/2 - 17, sy = r1.top - 20;
  const ex = r2.left + r2.width/2 - 17, ey = r2.top - 20;

  el.style.cssText = `display:block;left:${sx}px;top:${sy}px;transition:none;transform:scale(1) rotate(0deg);opacity:1;`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-out,transform 0.3s ease';
    el.style.left = ex+'px'; el.style.top = (Math.min(sy,ey)-70)+'px';
    el.style.transform = 'scale(1.15) rotate(-15deg)';
    setTimeout(() => {
      el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-in,transform 0.3s ease';
      el.style.top = ey+'px'; el.style.transform = 'scale(1.15) rotate(15deg)';
    }, 450);
    setTimeout(() => {
      el.style.transition = 'transform 0.2s ease';
      el.style.transform  = 'scale(1.6) rotate(0deg)';
      spawnConfetti(ex+17, ey+17);
      setTimeout(() => {
        el.style.transition = 'transform 0.25s ease,opacity 0.25s ease';
        el.style.transform  = 'scale(0)'; el.style.opacity = '0';
        setTimeout(() => { el.style.display='none'; el.style.opacity='1'; }, 280);
      }, 250);
    }, 900);
  }));
}

function spawnConfetti(cx, cy) {
  const wrap = document.getElementById('confetti-wrap');
  for (let i = 0; i < 22; i++) {
    const dot = document.createElement('div');
    dot.className = 'conf-dot';
    const angle = Math.random() * 2 * Math.PI, dist = 28 + Math.random() * 70;
    const sq = i % 3 === 0;
    dot.style.cssText = `left:${cx+Math.cos(angle)*dist}px;top:${cy+Math.sin(angle)*dist}px;background:${CONFETTI_COLORS[i%CONFETTI_COLORS.length]};border-radius:${sq?'2px':'50%'};width:${sq?'7px':'9px'};height:${sq?'7px':'9px'};animation-delay:${(Math.random()*0.3).toFixed(2)}s;`;
    wrap.appendChild(dot);
    setTimeout(() => dot.remove(), 1700);
  }
}


/* ========================
   CERRAR MODALES
======================== */
['overlay-income','overlay-spend'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });
});


/* ========================
   REGISTRO SERVICE WORKER
======================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registrado — app offline lista'))
      .catch(e => console.warn('SW error:', e));
  });
}


/* ========================
   ARRANQUE
======================== */
(function init() {
  const loaded = loadState();
  // Sincronizar slider y meta con estado cargado
  const pctSlider = document.getElementById('savePct');
  document.getElementById('pctDisplay').textContent = pctSlider.value + '%';
  document.getElementById('pct-label').textContent  = pctSlider.value + '%';
  document.getElementById('goalInput').value = goal;
  refreshUI();
  if (loaded) showToast('📂 Datos cargados');
})();/* ========================
   ESTADO GLOBAL
======================== */
const RESERVE = 30;
const LS_KEY  = 'finanzas_pro_v1';

let balance      = 0;
let savings      = 0;
let goal         = 500;
let pendingAmount     = 0;
let pendingPct        = 20;
let selectedIncomeCat = null;
let selectedSpendCat  = null;
let pendingSpend          = 0;
let pendingSavingsNeeded  = 0;

const transactions = [];

const INCOME_CATS = [
  { icon: 'ti-briefcase',    label: 'Trabajo'   },
  { icon: 'ti-building-bank',label: 'Freelance' },
  { icon: 'ti-gift',         label: 'Regalo'    },
  { icon: 'ti-chart-line',   label: 'Inversión' },
  { icon: 'ti-cash',         label: 'Venta'     },
  { icon: 'ti-dots',         label: 'Otro'      },
];

const SPEND_CATS = [
  { icon: 'ti-tools-kitchen-2', label: 'Comida'     },
  { icon: 'ti-bus',             label: 'Transporte' },
  { icon: 'ti-home',            label: 'Hogar'      },
  { icon: 'ti-device-mobile',   label: 'Servicios'  },
  { icon: 'ti-shopping-cart',   label: 'Compras'    },
  { icon: 'ti-heartbeat',       label: 'Salud'      },
  { icon: 'ti-device-gamepad',  label: 'Ocio'       },
  { icon: 'ti-book',            label: 'Educación'  },
  { icon: 'ti-dots',            label: 'Otro'       },
];

const CONFETTI_COLORS = ['#6d5dfc','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#fbbf24','#34d399'];


/* ========================
   PERSISTENCIA — localStorage
======================== */
function saveState() {
  try {
    const data = { balance, savings, goal, transactions, savedAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) { console.warn('localStorage error al guardar:', e); }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    balance = typeof data.balance === 'number' ? data.balance : 0;
    savings = typeof data.savings === 'number' ? data.savings : 0;
    goal    = typeof data.goal    === 'number' ? data.goal    : 500;
    transactions.length = 0;
    if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
    return true;
  } catch(e) { console.warn('localStorage error al cargar:', e); return false; }
}

/* Exportar datos como .json para respaldo manual */
function exportJSON() {
  const data = { balance, savings, goal, transactions, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'finanzas_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/* Importar desde .json */
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      balance = typeof data.balance === 'number' ? data.balance : 0;
      savings = typeof data.savings === 'number' ? data.savings : 0;
      goal    = typeof data.goal    === 'number' ? data.goal    : 500;
      transactions.length = 0;
      if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
      document.getElementById('goalInput').value = goal;
      updateGoal();
      saveState();
      refreshUI();
      showToast('✅ Datos importados correctamente');
    } catch { showToast('❌ Archivo JSON inválido'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}


/* ========================
   TOAST NOTIFICATION
======================== */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:100px; left:50%; transform:translateX(-50%) translateY(20px);
      background:#31344b; color:#fff; padding:10px 20px; border-radius:20px;
      font-size:14px; font-weight:600; z-index:999; opacity:0;
      transition:all 0.3s ease; white-space:nowrap; pointer-events:none;
      box-shadow:0 4px 20px rgba(0,0,0,0.25);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}


/* ========================
   NAVEGACIÓN
======================== */
function navigate(sec) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('visible'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('visible');
  document.getElementById('tab-' + sec).classList.add('active');
}

function updatePct() {
  const v = document.getElementById('savePct').value;
  document.getElementById('pctDisplay').textContent = v + '%';
  document.getElementById('pct-label').textContent  = v + '%';
}

function updateGoal() {
  goal = parseFloat(document.getElementById('goalInput').value) || 500;
  document.getElementById('goal-val').textContent = goal.toFixed(0);
  refreshSavingsBar();
  saveState();
}

function refreshSavingsBar() {
  const pct = Math.min(100, (savings / goal) * 100);
  document.getElementById('savBar').style.width = pct.toFixed(1) + '%';
  document.getElementById('goal-pct').textContent = pct.toFixed(0) + '%';
}

function refreshUI() {
  document.getElementById('balance-disp').textContent = balance.toFixed(2);
  document.getElementById('savings-disp').textContent = savings.toFixed(2);
  document.getElementById('savings-mini').textContent = savings.toFixed(2);
  document.getElementById('total-disp').textContent   = (balance + savings).toFixed(2);
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  refreshSavingsBar();
  renderTxList();
}

function stampTime() {
  const now = new Date();
  return now.toLocaleDateString('es-PE',{day:'numeric',month:'short'})
    + ' · ' + now.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
}


/* ========================
   FLUJO: INGRESO
======================== */
function startAddIncome() {
  const input = document.getElementById('incomeInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }
  pendingAmount     = amt;
  pendingPct        = parseInt(document.getElementById('savePct').value);
  selectedIncomeCat = null;
  buildCatGrid('cat-grid-income', INCOME_CATS, 'income');
  document.getElementById('overlay-income').classList.add('show');
}

function confirmIncome(cat) {
  document.getElementById('overlay-income').classList.remove('show');
  const toSave  = pendingAmount * (pendingPct / 100);
  const toSpend = pendingAmount - toSave;

  balance += toSpend;
  savings += toSave;

  const t = stampTime();
  transactions.unshift({ saving:false, spend:false, label:cat||'Ingreso', sub:t, amount:'+S/ '+toSpend.toFixed(2), cls:'pos', icon:'ti-arrow-down-circle' });
  if (toSave > 0)
    transactions.unshift({ saving:true, spend:false, label:'Ahorro ('+pendingPct+'%)', sub:t, amount:'S/ '+toSave.toFixed(2), cls:'sav', icon:'ti-piggy-bank' });

  document.getElementById('incomeInput').value = '';
  saveState();
  refreshUI();
  if (toSave > 0) animatePig();
  showToast('💰 Ingreso registrado');
}


/* ========================
   FLUJO: GASTO
======================== */
function openSpend() {
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  document.getElementById('spendInput').value = '';
  selectedSpendCat = null;
  buildCatGrid('cat-grid-spend', SPEND_CATS, 'spend');
  document.getElementById('overlay-spend').classList.add('show');
}

function confirmSpend() {
  const input = document.getElementById('spendInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }

  const cat = selectedSpendCat || 'Gasto';
  document.getElementById('overlay-spend').classList.remove('show');

  const freeBalance = balance - RESERVE;

  if (freeBalance >= amt) {
    executeSpend(amt, cat, 0);
  } else {
    const deficit = amt - freeBalance;
    if (deficit > savings) {
      showImpossibleAlert(amt, freeBalance, deficit);
    } else {
      pendingSpend         = amt;
      pendingSavingsNeeded = deficit;
      showSavingsAlert(amt, cat, freeBalance, deficit);
    }
  }
}

function executeSpend(amt, cat, fromSavings) {
  balance -= amt;
  balance += fromSavings;
  savings -= fromSavings;

  const t = stampTime();
  if (fromSavings > 0)
    transactions.unshift({ saving:true, spend:false, label:'Rescate de ahorro', sub:t, amount:'-S/ '+fromSavings.toFixed(2), cls:'res', icon:'ti-piggy-bank' });
  transactions.unshift({ saving:false, spend:true, label:cat, sub:t, amount:'-S/ '+amt.toFixed(2), cls:'neg', icon:'ti-shopping-bag' });

  saveState();
  refreshUI();
  animateCoin();
  showToast('🛍️ Gasto registrado');
}

function executeSpendWithSavings() {
  closeAlert();
  const cat = selectedSpendCat || 'Gasto';
  executeSpend(pendingSpend, cat, pendingSavingsNeeded);
}


/* ========================
   ALERTAS
======================== */
function showSavingsAlert(amt, cat, freeBalance, needed) {
  document.getElementById('alert-body').innerHTML = `
    Para cubrir este gasto de <strong>S/ ${amt.toFixed(2)}</strong>
    tu saldo libre solo alcanza <strong>S/ ${Math.max(0,freeBalance).toFixed(2)}</strong>
    (los S/ ${RESERVE} son tu reserva protegida).<br><br>
    Necesitas tomar <span class="savings-needed">S/ ${needed.toFixed(2)}</span>
    de tus ahorros para completarlo.<br><br>
    ¿Quieres continuar?
  `;
  document.getElementById('overlay-alert').classList.add('show');
}

function showImpossibleAlert(amt, freeBalance, deficit) {
  document.getElementById('alert-body').innerHTML = `
    Para pagar <strong>S/ ${amt.toFixed(2)}</strong> necesitas
    <strong>S/ ${deficit.toFixed(2)}</strong> adicionales,
    pero solo tienes <strong>S/ ${savings.toFixed(2)}</strong> en ahorro.<br><br>
    No es posible realizar este gasto sin afectar la reserva protegida.
  `;
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = 'none';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Entendido';
  cancelBtn.style.flex  = '1';
  document.getElementById('overlay-alert').classList.add('show');
}

function closeAlert() {
  document.getElementById('overlay-alert').classList.remove('show');
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = '';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.flex  = '';
}


/* ========================
   CAT GRID
======================== */
function buildCatGrid(gridId, cats, type) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = '';
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.innerHTML = `<i class="ti ${c.icon}"></i>${c.label}`;
    btn.onclick = () => {
      grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (type === 'income') selectedIncomeCat = c.label;
      else                   selectedSpendCat  = c.label;
    };
    grid.appendChild(btn);
  });
}


/* ========================
   HISTORIAL
======================== */
function renderTxList() {
  const list = document.getElementById('tx-list');
  if (transactions.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-mood-empty"></i><p>Sin movimientos aún</p></div>';
    return;
  }
  list.innerHTML = transactions.slice(0, 60).map(t => `
    <div class="tx-item">
      <div class="tx-icon ${t.saving?'saving':''} ${t.spend?'spend':''} ${t.cls==='res'?'reserve':''}">
        <i class="ti ${t.icon}"></i>
      </div>
      <div class="tx-label"><p>${t.label}</p><small>${t.sub}</small></div>
      <div class="tx-amount ${t.cls}">${t.amount}</div>
    </div>`).join('');
}


/* ========================
   ANIMACIONES
======================== */
function animatePig()  { flyEmoji('pig-anim',  'tab-cuenta', 'tab-ahorro'); }
function animateCoin() { flyEmoji('coin-anim', 'tab-cuenta', 'tab-movimientos'); }

function flyEmoji(elemId, fromTabId, toTabId) {
  const el = document.getElementById(elemId);
  const r1 = document.getElementById(fromTabId).getBoundingClientRect();
  const r2 = document.getElementById(toTabId).getBoundingClientRect();
  const sx = r1.left + r1.width/2 - 17, sy = r1.top - 20;
  const ex = r2.left + r2.width/2 - 17, ey = r2.top - 20;

  el.style.cssText = `display:block;left:${sx}px;top:${sy}px;transition:none;transform:scale(1) rotate(0deg);opacity:1;`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-out,transform 0.3s ease';
    el.style.left = ex+'px'; el.style.top = (Math.min(sy,ey)-70)+'px';
    el.style.transform = 'scale(1.15) rotate(-15deg)';
    setTimeout(() => {
      el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-in,transform 0.3s ease';
      el.style.top = ey+'px'; el.style.transform = 'scale(1.15) rotate(15deg)';
    }, 450);
    setTimeout(() => {
      el.style.transition = 'transform 0.2s ease';
      el.style.transform  = 'scale(1.6) rotate(0deg)';
      spawnConfetti(ex+17, ey+17);
      setTimeout(() => {
        el.style.transition = 'transform 0.25s ease,opacity 0.25s ease';
        el.style.transform  = 'scale(0)'; el.style.opacity = '0';
        setTimeout(() => { el.style.display='none'; el.style.opacity='1'; }, 280);
      }, 250);
    }, 900);
  }));
}

function spawnConfetti(cx, cy) {
  const wrap = document.getElementById('confetti-wrap');
  for (let i = 0; i < 22; i++) {
    const dot = document.createElement('div');
    dot.className = 'conf-dot';
    const angle = Math.random() * 2 * Math.PI, dist = 28 + Math.random() * 70;
    const sq = i % 3 === 0;
    dot.style.cssText = `left:${cx+Math.cos(angle)*dist}px;top:${cy+Math.sin(angle)*dist}px;background:${CONFETTI_COLORS[i%CONFETTI_COLORS.length]};border-radius:${sq?'2px':'50%'};width:${sq?'7px':'9px'};height:${sq?'7px':'9px'};animation-delay:${(Math.random()*0.3).toFixed(2)}s;`;
    wrap.appendChild(dot);
    setTimeout(() => dot.remove(), 1700);
  }
}


/* ========================
   CERRAR MODALES
======================== */
['overlay-income','overlay-spend'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });
});


/* ========================
   REGISTRO SERVICE WORKER
======================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registrado — app offline lista'))
      .catch(e => console.warn('SW error:', e));
  });
}


/* ========================
   ARRANQUE
======================== */
(function init() {
  const loaded = loadState();
  // Sincronizar slider y meta con estado cargado
  const pctSlider = document.getElementById('savePct');
  document.getElementById('pctDisplay').textContent = pctSlider.value + '%';
  document.getElementById('pct-label').textContent  = pctSlider.value + '%';
  document.getElementById('goalInput').value = goal;
  refreshUI();
  if (loaded) showToast('📂 Datos cargados');
})();/* ========================
   ESTADO GLOBAL
======================== */
const RESERVE = 30;
const LS_KEY  = 'finanzas_pro_v1';

let balance      = 0;
let savings      = 0;
let goal         = 500;
let pendingAmount     = 0;
let pendingPct        = 20;
let selectedIncomeCat = null;
let selectedSpendCat  = null;
let pendingSpend          = 0;
let pendingSavingsNeeded  = 0;

const transactions = [];

const INCOME_CATS = [
  { icon: 'ti-briefcase',    label: 'Trabajo'   },
  { icon: 'ti-building-bank',label: 'Freelance' },
  { icon: 'ti-gift',         label: 'Regalo'    },
  { icon: 'ti-chart-line',   label: 'Inversión' },
  { icon: 'ti-cash',         label: 'Venta'     },
  { icon: 'ti-dots',         label: 'Otro'      },
];

const SPEND_CATS = [
  { icon: 'ti-tools-kitchen-2', label: 'Comida'     },
  { icon: 'ti-bus',             label: 'Transporte' },
  { icon: 'ti-home',            label: 'Hogar'      },
  { icon: 'ti-device-mobile',   label: 'Servicios'  },
  { icon: 'ti-shopping-cart',   label: 'Compras'    },
  { icon: 'ti-heartbeat',       label: 'Salud'      },
  { icon: 'ti-device-gamepad',  label: 'Ocio'       },
  { icon: 'ti-book',            label: 'Educación'  },
  { icon: 'ti-dots',            label: 'Otro'       },
];

const CONFETTI_COLORS = ['#6d5dfc','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#fbbf24','#34d399'];


/* ========================
   PERSISTENCIA — localStorage
======================== */
function saveState() {
  try {
    const data = { balance, savings, goal, transactions, savedAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) { console.warn('localStorage error al guardar:', e); }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    balance = typeof data.balance === 'number' ? data.balance : 0;
    savings = typeof data.savings === 'number' ? data.savings : 0;
    goal    = typeof data.goal    === 'number' ? data.goal    : 500;
    transactions.length = 0;
    if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
    return true;
  } catch(e) { console.warn('localStorage error al cargar:', e); return false; }
}

/* Exportar datos como .json para respaldo manual */
function exportJSON() {
  const data = { balance, savings, goal, transactions, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'finanzas_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/* Importar desde .json */
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      balance = typeof data.balance === 'number' ? data.balance : 0;
      savings = typeof data.savings === 'number' ? data.savings : 0;
      goal    = typeof data.goal    === 'number' ? data.goal    : 500;
      transactions.length = 0;
      if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
      document.getElementById('goalInput').value = goal;
      updateGoal();
      saveState();
      refreshUI();
      showToast('✅ Datos importados correctamente');
    } catch { showToast('❌ Archivo JSON inválido'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}


/* ========================
   TOAST NOTIFICATION
======================== */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:100px; left:50%; transform:translateX(-50%) translateY(20px);
      background:#31344b; color:#fff; padding:10px 20px; border-radius:20px;
      font-size:14px; font-weight:600; z-index:999; opacity:0;
      transition:all 0.3s ease; white-space:nowrap; pointer-events:none;
      box-shadow:0 4px 20px rgba(0,0,0,0.25);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}


/* ========================
   NAVEGACIÓN
======================== */
function navigate(sec) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('visible'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('visible');
  document.getElementById('tab-' + sec).classList.add('active');
}

function updatePct() {
  const v = document.getElementById('savePct').value;
  document.getElementById('pctDisplay').textContent = v + '%';
  document.getElementById('pct-label').textContent  = v + '%';
}

function updateGoal() {
  goal = parseFloat(document.getElementById('goalInput').value) || 500;
  document.getElementById('goal-val').textContent = goal.toFixed(0);
  refreshSavingsBar();
  saveState();
}

function refreshSavingsBar() {
  const pct = Math.min(100, (savings / goal) * 100);
  document.getElementById('savBar').style.width = pct.toFixed(1) + '%';
  document.getElementById('goal-pct').textContent = pct.toFixed(0) + '%';
}

function refreshUI() {
  document.getElementById('balance-disp').textContent = balance.toFixed(2);
  document.getElementById('savings-disp').textContent = savings.toFixed(2);
  document.getElementById('savings-mini').textContent = savings.toFixed(2);
  document.getElementById('total-disp').textContent   = (balance + savings).toFixed(2);
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  refreshSavingsBar();
  renderTxList();
}

function stampTime() {
  const now = new Date();
  return now.toLocaleDateString('es-PE',{day:'numeric',month:'short'})
    + ' · ' + now.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
}


/* ========================
   FLUJO: INGRESO
======================== */
function startAddIncome() {
  const input = document.getElementById('incomeInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }
  pendingAmount     = amt;
  pendingPct        = parseInt(document.getElementById('savePct').value);
  selectedIncomeCat = null;
  buildCatGrid('cat-grid-income', INCOME_CATS, 'income');
  document.getElementById('overlay-income').classList.add('show');
}

function confirmIncome(cat) {
  document.getElementById('overlay-income').classList.remove('show');
  const toSave  = pendingAmount * (pendingPct / 100);
  const toSpend = pendingAmount - toSave;

  balance += toSpend;
  savings += toSave;

  const t = stampTime();
  transactions.unshift({ saving:false, spend:false, label:cat||'Ingreso', sub:t, amount:'+S/ '+toSpend.toFixed(2), cls:'pos', icon:'ti-arrow-down-circle' });
  if (toSave > 0)
    transactions.unshift({ saving:true, spend:false, label:'Ahorro ('+pendingPct+'%)', sub:t, amount:'S/ '+toSave.toFixed(2), cls:'sav', icon:'ti-piggy-bank' });

  document.getElementById('incomeInput').value = '';
  saveState();
  refreshUI();
  if (toSave > 0) animatePig();
  showToast('💰 Ingreso registrado');
}


/* ========================
   FLUJO: GASTO
======================== */
function openSpend() {
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  document.getElementById('spendInput').value = '';
  selectedSpendCat = null;
  buildCatGrid('cat-grid-spend', SPEND_CATS, 'spend');
  document.getElementById('overlay-spend').classList.add('show');
}

function confirmSpend() {
  const input = document.getElementById('spendInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }

  const cat = selectedSpendCat || 'Gasto';
  document.getElementById('overlay-spend').classList.remove('show');

  const freeBalance = balance - RESERVE;

  if (freeBalance >= amt) {
    executeSpend(amt, cat, 0);
  } else {
    const deficit = amt - freeBalance;
    if (deficit > savings) {
      showImpossibleAlert(amt, freeBalance, deficit);
    } else {
      pendingSpend         = amt;
      pendingSavingsNeeded = deficit;
      showSavingsAlert(amt, cat, freeBalance, deficit);
    }
  }
}

function executeSpend(amt, cat, fromSavings) {
  balance -= amt;
  balance += fromSavings;
  savings -= fromSavings;

  const t = stampTime();
  if (fromSavings > 0)
    transactions.unshift({ saving:true, spend:false, label:'Rescate de ahorro', sub:t, amount:'-S/ '+fromSavings.toFixed(2), cls:'res', icon:'ti-piggy-bank' });
  transactions.unshift({ saving:false, spend:true, label:cat, sub:t, amount:'-S/ '+amt.toFixed(2), cls:'neg', icon:'ti-shopping-bag' });

  saveState();
  refreshUI();
  animateCoin();
  showToast('🛍️ Gasto registrado');
}

function executeSpendWithSavings() {
  closeAlert();
  const cat = selectedSpendCat || 'Gasto';
  executeSpend(pendingSpend, cat, pendingSavingsNeeded);
}


/* ========================
   ALERTAS
======================== */
function showSavingsAlert(amt, cat, freeBalance, needed) {
  document.getElementById('alert-body').innerHTML = `
    Para cubrir este gasto de <strong>S/ ${amt.toFixed(2)}</strong>
    tu saldo libre solo alcanza <strong>S/ ${Math.max(0,freeBalance).toFixed(2)}</strong>
    (los S/ ${RESERVE} son tu reserva protegida).<br><br>
    Necesitas tomar <span class="savings-needed">S/ ${needed.toFixed(2)}</span>
    de tus ahorros para completarlo.<br><br>
    ¿Quieres continuar?
  `;
  document.getElementById('overlay-alert').classList.add('show');
}

function showImpossibleAlert(amt, freeBalance, deficit) {
  document.getElementById('alert-body').innerHTML = `
    Para pagar <strong>S/ ${amt.toFixed(2)}</strong> necesitas
    <strong>S/ ${deficit.toFixed(2)}</strong> adicionales,
    pero solo tienes <strong>S/ ${savings.toFixed(2)}</strong> en ahorro.<br><br>
    No es posible realizar este gasto sin afectar la reserva protegida.
  `;
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = 'none';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Entendido';
  cancelBtn.style.flex  = '1';
  document.getElementById('overlay-alert').classList.add('show');
}

function closeAlert() {
  document.getElementById('overlay-alert').classList.remove('show');
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = '';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.flex  = '';
}


/* ========================
   CAT GRID
======================== */
function buildCatGrid(gridId, cats, type) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = '';
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.innerHTML = `<i class="ti ${c.icon}"></i>${c.label}`;
    btn.onclick = () => {
      grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (type === 'income') selectedIncomeCat = c.label;
      else                   selectedSpendCat  = c.label;
    };
    grid.appendChild(btn);
  });
}


/* ========================
   HISTORIAL
======================== */
function renderTxList() {
  const list = document.getElementById('tx-list');
  if (transactions.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-mood-empty"></i><p>Sin movimientos aún</p></div>';
    return;
  }
  list.innerHTML = transactions.slice(0, 60).map(t => `
    <div class="tx-item">
      <div class="tx-icon ${t.saving?'saving':''} ${t.spend?'spend':''} ${t.cls==='res'?'reserve':''}">
        <i class="ti ${t.icon}"></i>
      </div>
      <div class="tx-label"><p>${t.label}</p><small>${t.sub}</small></div>
      <div class="tx-amount ${t.cls}">${t.amount}</div>
    </div>`).join('');
}


/* ========================
   ANIMACIONES
======================== */
function animatePig()  { flyEmoji('pig-anim',  'tab-cuenta', 'tab-ahorro'); }
function animateCoin() { flyEmoji('coin-anim', 'tab-cuenta', 'tab-movimientos'); }

function flyEmoji(elemId, fromTabId, toTabId) {
  const el = document.getElementById(elemId);
  const r1 = document.getElementById(fromTabId).getBoundingClientRect();
  const r2 = document.getElementById(toTabId).getBoundingClientRect();
  const sx = r1.left + r1.width/2 - 17, sy = r1.top - 20;
  const ex = r2.left + r2.width/2 - 17, ey = r2.top - 20;

  el.style.cssText = `display:block;left:${sx}px;top:${sy}px;transition:none;transform:scale(1) rotate(0deg);opacity:1;`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-out,transform 0.3s ease';
    el.style.left = ex+'px'; el.style.top = (Math.min(sy,ey)-70)+'px';
    el.style.transform = 'scale(1.15) rotate(-15deg)';
    setTimeout(() => {
      el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-in,transform 0.3s ease';
      el.style.top = ey+'px'; el.style.transform = 'scale(1.15) rotate(15deg)';
    }, 450);
    setTimeout(() => {
      el.style.transition = 'transform 0.2s ease';
      el.style.transform  = 'scale(1.6) rotate(0deg)';
      spawnConfetti(ex+17, ey+17);
      setTimeout(() => {
        el.style.transition = 'transform 0.25s ease,opacity 0.25s ease';
        el.style.transform  = 'scale(0)'; el.style.opacity = '0';
        setTimeout(() => { el.style.display='none'; el.style.opacity='1'; }, 280);
      }, 250);
    }, 900);
  }));
}

function spawnConfetti(cx, cy) {
  const wrap = document.getElementById('confetti-wrap');
  for (let i = 0; i < 22; i++) {
    const dot = document.createElement('div');
    dot.className = 'conf-dot';
    const angle = Math.random() * 2 * Math.PI, dist = 28 + Math.random() * 70;
    const sq = i % 3 === 0;
    dot.style.cssText = `left:${cx+Math.cos(angle)*dist}px;top:${cy+Math.sin(angle)*dist}px;background:${CONFETTI_COLORS[i%CONFETTI_COLORS.length]};border-radius:${sq?'2px':'50%'};width:${sq?'7px':'9px'};height:${sq?'7px':'9px'};animation-delay:${(Math.random()*0.3).toFixed(2)}s;`;
    wrap.appendChild(dot);
    setTimeout(() => dot.remove(), 1700);
  }
}


/* ========================
   CERRAR MODALES
======================== */
['overlay-income','overlay-spend'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });
});


/* ========================
   REGISTRO SERVICE WORKER
======================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registrado — app offline lista'))
      .catch(e => console.warn('SW error:', e));
  });
}


/* ========================
   ARRANQUE
======================== */
(function init() {
  const loaded = loadState();
  // Sincronizar slider y meta con estado cargado
  const pctSlider = document.getElementById('savePct');
  document.getElementById('pctDisplay').textContent = pctSlider.value + '%';
  document.getElementById('pct-label').textContent  = pctSlider.value + '%';
  document.getElementById('goalInput').value = goal;
  refreshUI();
  if (loaded) showToast('📂 Datos cargados');
})();/* ========================
   ESTADO GLOBAL
======================== */
const RESERVE = 30;
const LS_KEY  = 'finanzas_pro_v1';

let balance      = 0;
let savings      = 0;
let goal         = 500;
let pendingAmount     = 0;
let pendingPct        = 20;
let selectedIncomeCat = null;
let selectedSpendCat  = null;
let pendingSpend          = 0;
let pendingSavingsNeeded  = 0;

const transactions = [];

const INCOME_CATS = [
  { icon: 'ti-briefcase',    label: 'Trabajo'   },
  { icon: 'ti-building-bank',label: 'Freelance' },
  { icon: 'ti-gift',         label: 'Regalo'    },
  { icon: 'ti-chart-line',   label: 'Inversión' },
  { icon: 'ti-cash',         label: 'Venta'     },
  { icon: 'ti-dots',         label: 'Otro'      },
];

const SPEND_CATS = [
  { icon: 'ti-tools-kitchen-2', label: 'Comida'     },
  { icon: 'ti-bus',             label: 'Transporte' },
  { icon: 'ti-home',            label: 'Hogar'      },
  { icon: 'ti-device-mobile',   label: 'Servicios'  },
  { icon: 'ti-shopping-cart',   label: 'Compras'    },
  { icon: 'ti-heartbeat',       label: 'Salud'      },
  { icon: 'ti-device-gamepad',  label: 'Ocio'       },
  { icon: 'ti-book',            label: 'Educación'  },
  { icon: 'ti-dots',            label: 'Otro'       },
];

const CONFETTI_COLORS = ['#6d5dfc','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#fbbf24','#34d399'];


/* ========================
   PERSISTENCIA — localStorage
======================== */
function saveState() {
  try {
    const data = { balance, savings, goal, transactions, savedAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) { console.warn('localStorage error al guardar:', e); }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    balance = typeof data.balance === 'number' ? data.balance : 0;
    savings = typeof data.savings === 'number' ? data.savings : 0;
    goal    = typeof data.goal    === 'number' ? data.goal    : 500;
    transactions.length = 0;
    if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
    return true;
  } catch(e) { console.warn('localStorage error al cargar:', e); return false; }
}

/* Exportar datos como .json para respaldo manual */
function exportJSON() {
  const data = { balance, savings, goal, transactions, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'finanzas_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/* Importar desde .json */
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      balance = typeof data.balance === 'number' ? data.balance : 0;
      savings = typeof data.savings === 'number' ? data.savings : 0;
      goal    = typeof data.goal    === 'number' ? data.goal    : 500;
      transactions.length = 0;
      if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
      document.getElementById('goalInput').value = goal;
      updateGoal();
      saveState();
      refreshUI();
      showToast('✅ Datos importados correctamente');
    } catch { showToast('❌ Archivo JSON inválido'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}


/* ========================
   TOAST NOTIFICATION
======================== */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:100px; left:50%; transform:translateX(-50%) translateY(20px);
      background:#31344b; color:#fff; padding:10px 20px; border-radius:20px;
      font-size:14px; font-weight:600; z-index:999; opacity:0;
      transition:all 0.3s ease; white-space:nowrap; pointer-events:none;
      box-shadow:0 4px 20px rgba(0,0,0,0.25);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}


/* ========================
   NAVEGACIÓN
======================== */
function navigate(sec) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('visible'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('visible');
  document.getElementById('tab-' + sec).classList.add('active');
}

function updatePct() {
  const v = document.getElementById('savePct').value;
  document.getElementById('pctDisplay').textContent = v + '%';
  document.getElementById('pct-label').textContent  = v + '%';
}

function updateGoal() {
  goal = parseFloat(document.getElementById('goalInput').value) || 500;
  document.getElementById('goal-val').textContent = goal.toFixed(0);
  refreshSavingsBar();
  saveState();
}

function refreshSavingsBar() {
  const pct = Math.min(100, (savings / goal) * 100);
  document.getElementById('savBar').style.width = pct.toFixed(1) + '%';
  document.getElementById('goal-pct').textContent = pct.toFixed(0) + '%';
}

function refreshUI() {
  document.getElementById('balance-disp').textContent = balance.toFixed(2);
  document.getElementById('savings-disp').textContent = savings.toFixed(2);
  document.getElementById('savings-mini').textContent = savings.toFixed(2);
  document.getElementById('total-disp').textContent   = (balance + savings).toFixed(2);
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  refreshSavingsBar();
  renderTxList();
}

function stampTime() {
  const now = new Date();
  return now.toLocaleDateString('es-PE',{day:'numeric',month:'short'})
    + ' · ' + now.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
}


/* ========================
   FLUJO: INGRESO
======================== */
function startAddIncome() {
  const input = document.getElementById('incomeInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }
  pendingAmount     = amt;
  pendingPct        = parseInt(document.getElementById('savePct').value);
  selectedIncomeCat = null;
  buildCatGrid('cat-grid-income', INCOME_CATS, 'income');
  document.getElementById('overlay-income').classList.add('show');
}

function confirmIncome(cat) {
  document.getElementById('overlay-income').classList.remove('show');
  const toSave  = pendingAmount * (pendingPct / 100);
  const toSpend = pendingAmount - toSave;

  balance += toSpend;
  savings += toSave;

  const t = stampTime();
  transactions.unshift({ saving:false, spend:false, label:cat||'Ingreso', sub:t, amount:'+S/ '+toSpend.toFixed(2), cls:'pos', icon:'ti-arrow-down-circle' });
  if (toSave > 0)
    transactions.unshift({ saving:true, spend:false, label:'Ahorro ('+pendingPct+'%)', sub:t, amount:'S/ '+toSave.toFixed(2), cls:'sav', icon:'ti-piggy-bank' });

  document.getElementById('incomeInput').value = '';
  saveState();
  refreshUI();
  if (toSave > 0) animatePig();
  showToast('💰 Ingreso registrado');
}


/* ========================
   FLUJO: GASTO
======================== */
function openSpend() {
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  document.getElementById('spendInput').value = '';
  selectedSpendCat = null;
  buildCatGrid('cat-grid-spend', SPEND_CATS, 'spend');
  document.getElementById('overlay-spend').classList.add('show');
}

function confirmSpend() {
  const input = document.getElementById('spendInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }

  const cat = selectedSpendCat || 'Gasto';
  document.getElementById('overlay-spend').classList.remove('show');

  const freeBalance = balance - RESERVE;

  if (freeBalance >= amt) {
    executeSpend(amt, cat, 0);
  } else {
    const deficit = amt - freeBalance;
    if (deficit > savings) {
      showImpossibleAlert(amt, freeBalance, deficit);
    } else {
      pendingSpend         = amt;
      pendingSavingsNeeded = deficit;
      showSavingsAlert(amt, cat, freeBalance, deficit);
    }
  }
}

function executeSpend(amt, cat, fromSavings) {
  balance -= amt;
  balance += fromSavings;
  savings -= fromSavings;

  const t = stampTime();
  if (fromSavings > 0)
    transactions.unshift({ saving:true, spend:false, label:'Rescate de ahorro', sub:t, amount:'-S/ '+fromSavings.toFixed(2), cls:'res', icon:'ti-piggy-bank' });
  transactions.unshift({ saving:false, spend:true, label:cat, sub:t, amount:'-S/ '+amt.toFixed(2), cls:'neg', icon:'ti-shopping-bag' });

  saveState();
  refreshUI();
  animateCoin();
  showToast('🛍️ Gasto registrado');
}

function executeSpendWithSavings() {
  closeAlert();
  const cat = selectedSpendCat || 'Gasto';
  executeSpend(pendingSpend, cat, pendingSavingsNeeded);
}


/* ========================
   ALERTAS
======================== */
function showSavingsAlert(amt, cat, freeBalance, needed) {
  document.getElementById('alert-body').innerHTML = `
    Para cubrir este gasto de <strong>S/ ${amt.toFixed(2)}</strong>
    tu saldo libre solo alcanza <strong>S/ ${Math.max(0,freeBalance).toFixed(2)}</strong>
    (los S/ ${RESERVE} son tu reserva protegida).<br><br>
    Necesitas tomar <span class="savings-needed">S/ ${needed.toFixed(2)}</span>
    de tus ahorros para completarlo.<br><br>
    ¿Quieres continuar?
  `;
  document.getElementById('overlay-alert').classList.add('show');
}

function showImpossibleAlert(amt, freeBalance, deficit) {
  document.getElementById('alert-body').innerHTML = `
    Para pagar <strong>S/ ${amt.toFixed(2)}</strong> necesitas
    <strong>S/ ${deficit.toFixed(2)}</strong> adicionales,
    pero solo tienes <strong>S/ ${savings.toFixed(2)}</strong> en ahorro.<br><br>
    No es posible realizar este gasto sin afectar la reserva protegida.
  `;
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = 'none';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Entendido';
  cancelBtn.style.flex  = '1';
  document.getElementById('overlay-alert').classList.add('show');
}

function closeAlert() {
  document.getElementById('overlay-alert').classList.remove('show');
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = '';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.flex  = '';
}


/* ========================
   CAT GRID
======================== */
function buildCatGrid(gridId, cats, type) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = '';
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.innerHTML = `<i class="ti ${c.icon}"></i>${c.label}`;
    btn.onclick = () => {
      grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (type === 'income') selectedIncomeCat = c.label;
      else                   selectedSpendCat  = c.label;
    };
    grid.appendChild(btn);
  });
}


/* ========================
   HISTORIAL
======================== */
function renderTxList() {
  const list = document.getElementById('tx-list');
  if (transactions.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-mood-empty"></i><p>Sin movimientos aún</p></div>';
    return;
  }
  list.innerHTML = transactions.slice(0, 60).map(t => `
    <div class="tx-item">
      <div class="tx-icon ${t.saving?'saving':''} ${t.spend?'spend':''} ${t.cls==='res'?'reserve':''}">
        <i class="ti ${t.icon}"></i>
      </div>
      <div class="tx-label"><p>${t.label}</p><small>${t.sub}</small></div>
      <div class="tx-amount ${t.cls}">${t.amount}</div>
    </div>`).join('');
}


/* ========================
   ANIMACIONES
======================== */
function animatePig()  { flyEmoji('pig-anim',  'tab-cuenta', 'tab-ahorro'); }
function animateCoin() { flyEmoji('coin-anim', 'tab-cuenta', 'tab-movimientos'); }

function flyEmoji(elemId, fromTabId, toTabId) {
  const el = document.getElementById(elemId);
  const r1 = document.getElementById(fromTabId).getBoundingClientRect();
  const r2 = document.getElementById(toTabId).getBoundingClientRect();
  const sx = r1.left + r1.width/2 - 17, sy = r1.top - 20;
  const ex = r2.left + r2.width/2 - 17, ey = r2.top - 20;

  el.style.cssText = `display:block;left:${sx}px;top:${sy}px;transition:none;transform:scale(1) rotate(0deg);opacity:1;`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-out,transform 0.3s ease';
    el.style.left = ex+'px'; el.style.top = (Math.min(sy,ey)-70)+'px';
    el.style.transform = 'scale(1.15) rotate(-15deg)';
    setTimeout(() => {
      el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-in,transform 0.3s ease';
      el.style.top = ey+'px'; el.style.transform = 'scale(1.15) rotate(15deg)';
    }, 450);
    setTimeout(() => {
      el.style.transition = 'transform 0.2s ease';
      el.style.transform  = 'scale(1.6) rotate(0deg)';
      spawnConfetti(ex+17, ey+17);
      setTimeout(() => {
        el.style.transition = 'transform 0.25s ease,opacity 0.25s ease';
        el.style.transform  = 'scale(0)'; el.style.opacity = '0';
        setTimeout(() => { el.style.display='none'; el.style.opacity='1'; }, 280);
      }, 250);
    }, 900);
  }));
}

function spawnConfetti(cx, cy) {
  const wrap = document.getElementById('confetti-wrap');
  for (let i = 0; i < 22; i++) {
    const dot = document.createElement('div');
    dot.className = 'conf-dot';
    const angle = Math.random() * 2 * Math.PI, dist = 28 + Math.random() * 70;
    const sq = i % 3 === 0;
    dot.style.cssText = `left:${cx+Math.cos(angle)*dist}px;top:${cy+Math.sin(angle)*dist}px;background:${CONFETTI_COLORS[i%CONFETTI_COLORS.length]};border-radius:${sq?'2px':'50%'};width:${sq?'7px':'9px'};height:${sq?'7px':'9px'};animation-delay:${(Math.random()*0.3).toFixed(2)}s;`;
    wrap.appendChild(dot);
    setTimeout(() => dot.remove(), 1700);
  }
}


/* ========================
   CERRAR MODALES
======================== */
['overlay-income','overlay-spend'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });
});


/* ========================
   REGISTRO SERVICE WORKER
======================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registrado — app offline lista'))
      .catch(e => console.warn('SW error:', e));
  });
}


/* ========================
   ARRANQUE
======================== */
(function init() {
  const loaded = loadState();
  // Sincronizar slider y meta con estado cargado
  const pctSlider = document.getElementById('savePct');
  document.getElementById('pctDisplay').textContent = pctSlider.value + '%';
  document.getElementById('pct-label').textContent  = pctSlider.value + '%';
  document.getElementById('goalInput').value = goal;
  refreshUI();
  if (loaded) showToast('📂 Datos cargados');
})();/* ========================
   ESTADO GLOBAL
======================== */
const RESERVE = 30;
const LS_KEY  = 'finanzas_pro_v1';

let balance      = 0;
let savings      = 0;
let goal         = 500;
let pendingAmount     = 0;
let pendingPct        = 20;
let selectedIncomeCat = null;
let selectedSpendCat  = null;
let pendingSpend          = 0;
let pendingSavingsNeeded  = 0;

const transactions = [];

const INCOME_CATS = [
  { icon: 'ti-briefcase',    label: 'Trabajo'   },
  { icon: 'ti-building-bank',label: 'Freelance' },
  { icon: 'ti-gift',         label: 'Regalo'    },
  { icon: 'ti-chart-line',   label: 'Inversión' },
  { icon: 'ti-cash',         label: 'Venta'     },
  { icon: 'ti-dots',         label: 'Otro'      },
];

const SPEND_CATS = [
  { icon: 'ti-tools-kitchen-2', label: 'Comida'     },
  { icon: 'ti-bus',             label: 'Transporte' },
  { icon: 'ti-home',            label: 'Hogar'      },
  { icon: 'ti-device-mobile',   label: 'Servicios'  },
  { icon: 'ti-shopping-cart',   label: 'Compras'    },
  { icon: 'ti-heartbeat',       label: 'Salud'      },
  { icon: 'ti-device-gamepad',  label: 'Ocio'       },
  { icon: 'ti-book',            label: 'Educación'  },
  { icon: 'ti-dots',            label: 'Otro'       },
];

const CONFETTI_COLORS = ['#6d5dfc','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#fbbf24','#34d399'];


/* ========================
   PERSISTENCIA — localStorage
======================== */
function saveState() {
  try {
    const data = { balance, savings, goal, transactions, savedAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) { console.warn('localStorage error al guardar:', e); }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    balance = typeof data.balance === 'number' ? data.balance : 0;
    savings = typeof data.savings === 'number' ? data.savings : 0;
    goal    = typeof data.goal    === 'number' ? data.goal    : 500;
    transactions.length = 0;
    if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
    return true;
  } catch(e) { console.warn('localStorage error al cargar:', e); return false; }
}

/* Exportar datos como .json para respaldo manual */
function exportJSON() {
  const data = { balance, savings, goal, transactions, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'finanzas_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/* Importar desde .json */
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      balance = typeof data.balance === 'number' ? data.balance : 0;
      savings = typeof data.savings === 'number' ? data.savings : 0;
      goal    = typeof data.goal    === 'number' ? data.goal    : 500;
      transactions.length = 0;
      if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
      document.getElementById('goalInput').value = goal;
      updateGoal();
      saveState();
      refreshUI();
      showToast('✅ Datos importados correctamente');
    } catch { showToast('❌ Archivo JSON inválido'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}


/* ========================
   TOAST NOTIFICATION
======================== */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:100px; left:50%; transform:translateX(-50%) translateY(20px);
      background:#31344b; color:#fff; padding:10px 20px; border-radius:20px;
      font-size:14px; font-weight:600; z-index:999; opacity:0;
      transition:all 0.3s ease; white-space:nowrap; pointer-events:none;
      box-shadow:0 4px 20px rgba(0,0,0,0.25);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}


/* ========================
   NAVEGACIÓN
======================== */
function navigate(sec) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('visible'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('visible');
  document.getElementById('tab-' + sec).classList.add('active');
}

function updatePct() {
  const v = document.getElementById('savePct').value;
  document.getElementById('pctDisplay').textContent = v + '%';
  document.getElementById('pct-label').textContent  = v + '%';
}

function updateGoal() {
  goal = parseFloat(document.getElementById('goalInput').value) || 500;
  document.getElementById('goal-val').textContent = goal.toFixed(0);
  refreshSavingsBar();
  saveState();
}

function refreshSavingsBar() {
  const pct = Math.min(100, (savings / goal) * 100);
  document.getElementById('savBar').style.width = pct.toFixed(1) + '%';
  document.getElementById('goal-pct').textContent = pct.toFixed(0) + '%';
}

function refreshUI() {
  document.getElementById('balance-disp').textContent = balance.toFixed(2);
  document.getElementById('savings-disp').textContent = savings.toFixed(2);
  document.getElementById('savings-mini').textContent = savings.toFixed(2);
  document.getElementById('total-disp').textContent   = (balance + savings).toFixed(2);
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  refreshSavingsBar();
  renderTxList();
}

function stampTime() {
  const now = new Date();
  return now.toLocaleDateString('es-PE',{day:'numeric',month:'short'})
    + ' · ' + now.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
}


/* ========================
   FLUJO: INGRESO
======================== */
function startAddIncome() {
  const input = document.getElementById('incomeInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }
  pendingAmount     = amt;
  pendingPct        = parseInt(document.getElementById('savePct').value);
  selectedIncomeCat = null;
  buildCatGrid('cat-grid-income', INCOME_CATS, 'income');
  document.getElementById('overlay-income').classList.add('show');
}

function confirmIncome(cat) {
  document.getElementById('overlay-income').classList.remove('show');
  const toSave  = pendingAmount * (pendingPct / 100);
  const toSpend = pendingAmount - toSave;

  balance += toSpend;
  savings += toSave;

  const t = stampTime();
  transactions.unshift({ saving:false, spend:false, label:cat||'Ingreso', sub:t, amount:'+S/ '+toSpend.toFixed(2), cls:'pos', icon:'ti-arrow-down-circle' });
  if (toSave > 0)
    transactions.unshift({ saving:true, spend:false, label:'Ahorro ('+pendingPct+'%)', sub:t, amount:'S/ '+toSave.toFixed(2), cls:'sav', icon:'ti-piggy-bank' });

  document.getElementById('incomeInput').value = '';
  saveState();
  refreshUI();
  if (toSave > 0) animatePig();
  showToast('💰 Ingreso registrado');
}


/* ========================
   FLUJO: GASTO
======================== */
function openSpend() {
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  document.getElementById('spendInput').value = '';
  selectedSpendCat = null;
  buildCatGrid('cat-grid-spend', SPEND_CATS, 'spend');
  document.getElementById('overlay-spend').classList.add('show');
}

function confirmSpend() {
  const input = document.getElementById('spendInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }

  const cat = selectedSpendCat || 'Gasto';
  document.getElementById('overlay-spend').classList.remove('show');

  const freeBalance = balance - RESERVE;

  if (freeBalance >= amt) {
    executeSpend(amt, cat, 0);
  } else {
    const deficit = amt - freeBalance;
    if (deficit > savings) {
      showImpossibleAlert(amt, freeBalance, deficit);
    } else {
      pendingSpend         = amt;
      pendingSavingsNeeded = deficit;
      showSavingsAlert(amt, cat, freeBalance, deficit);
    }
  }
}

function executeSpend(amt, cat, fromSavings) {
  balance -= amt;
  balance += fromSavings;
  savings -= fromSavings;

  const t = stampTime();
  if (fromSavings > 0)
    transactions.unshift({ saving:true, spend:false, label:'Rescate de ahorro', sub:t, amount:'-S/ '+fromSavings.toFixed(2), cls:'res', icon:'ti-piggy-bank' });
  transactions.unshift({ saving:false, spend:true, label:cat, sub:t, amount:'-S/ '+amt.toFixed(2), cls:'neg', icon:'ti-shopping-bag' });

  saveState();
  refreshUI();
  animateCoin();
  showToast('🛍️ Gasto registrado');
}

function executeSpendWithSavings() {
  closeAlert();
  const cat = selectedSpendCat || 'Gasto';
  executeSpend(pendingSpend, cat, pendingSavingsNeeded);
}


/* ========================
   ALERTAS
======================== */
function showSavingsAlert(amt, cat, freeBalance, needed) {
  document.getElementById('alert-body').innerHTML = `
    Para cubrir este gasto de <strong>S/ ${amt.toFixed(2)}</strong>
    tu saldo libre solo alcanza <strong>S/ ${Math.max(0,freeBalance).toFixed(2)}</strong>
    (los S/ ${RESERVE} son tu reserva protegida).<br><br>
    Necesitas tomar <span class="savings-needed">S/ ${needed.toFixed(2)}</span>
    de tus ahorros para completarlo.<br><br>
    ¿Quieres continuar?
  `;
  document.getElementById('overlay-alert').classList.add('show');
}

function showImpossibleAlert(amt, freeBalance, deficit) {
  document.getElementById('alert-body').innerHTML = `
    Para pagar <strong>S/ ${amt.toFixed(2)}</strong> necesitas
    <strong>S/ ${deficit.toFixed(2)}</strong> adicionales,
    pero solo tienes <strong>S/ ${savings.toFixed(2)}</strong> en ahorro.<br><br>
    No es posible realizar este gasto sin afectar la reserva protegida.
  `;
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = 'none';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Entendido';
  cancelBtn.style.flex  = '1';
  document.getElementById('overlay-alert').classList.add('show');
}

function closeAlert() {
  document.getElementById('overlay-alert').classList.remove('show');
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = '';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.flex  = '';
}


/* ========================
   CAT GRID
======================== */
function buildCatGrid(gridId, cats, type) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = '';
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.innerHTML = `<i class="ti ${c.icon}"></i>${c.label}`;
    btn.onclick = () => {
      grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (type === 'income') selectedIncomeCat = c.label;
      else                   selectedSpendCat  = c.label;
    };
    grid.appendChild(btn);
  });
}


/* ========================
   HISTORIAL
======================== */
function renderTxList() {
  const list = document.getElementById('tx-list');
  if (transactions.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-mood-empty"></i><p>Sin movimientos aún</p></div>';
    return;
  }
  list.innerHTML = transactions.slice(0, 60).map(t => `
    <div class="tx-item">
      <div class="tx-icon ${t.saving?'saving':''} ${t.spend?'spend':''} ${t.cls==='res'?'reserve':''}">
        <i class="ti ${t.icon}"></i>
      </div>
      <div class="tx-label"><p>${t.label}</p><small>${t.sub}</small></div>
      <div class="tx-amount ${t.cls}">${t.amount}</div>
    </div>`).join('');
}


/* ========================
   ANIMACIONES
======================== */
function animatePig()  { flyEmoji('pig-anim',  'tab-cuenta', 'tab-ahorro'); }
function animateCoin() { flyEmoji('coin-anim', 'tab-cuenta', 'tab-movimientos'); }

function flyEmoji(elemId, fromTabId, toTabId) {
  const el = document.getElementById(elemId);
  const r1 = document.getElementById(fromTabId).getBoundingClientRect();
  const r2 = document.getElementById(toTabId).getBoundingClientRect();
  const sx = r1.left + r1.width/2 - 17, sy = r1.top - 20;
  const ex = r2.left + r2.width/2 - 17, ey = r2.top - 20;

  el.style.cssText = `display:block;left:${sx}px;top:${sy}px;transition:none;transform:scale(1) rotate(0deg);opacity:1;`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-out,transform 0.3s ease';
    el.style.left = ex+'px'; el.style.top = (Math.min(sy,ey)-70)+'px';
    el.style.transform = 'scale(1.15) rotate(-15deg)';
    setTimeout(() => {
      el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-in,transform 0.3s ease';
      el.style.top = ey+'px'; el.style.transform = 'scale(1.15) rotate(15deg)';
    }, 450);
    setTimeout(() => {
      el.style.transition = 'transform 0.2s ease';
      el.style.transform  = 'scale(1.6) rotate(0deg)';
      spawnConfetti(ex+17, ey+17);
      setTimeout(() => {
        el.style.transition = 'transform 0.25s ease,opacity 0.25s ease';
        el.style.transform  = 'scale(0)'; el.style.opacity = '0';
        setTimeout(() => { el.style.display='none'; el.style.opacity='1'; }, 280);
      }, 250);
    }, 900);
  }));
}

function spawnConfetti(cx, cy) {
  const wrap = document.getElementById('confetti-wrap');
  for (let i = 0; i < 22; i++) {
    const dot = document.createElement('div');
    dot.className = 'conf-dot';
    const angle = Math.random() * 2 * Math.PI, dist = 28 + Math.random() * 70;
    const sq = i % 3 === 0;
    dot.style.cssText = `left:${cx+Math.cos(angle)*dist}px;top:${cy+Math.sin(angle)*dist}px;background:${CONFETTI_COLORS[i%CONFETTI_COLORS.length]};border-radius:${sq?'2px':'50%'};width:${sq?'7px':'9px'};height:${sq?'7px':'9px'};animation-delay:${(Math.random()*0.3).toFixed(2)}s;`;
    wrap.appendChild(dot);
    setTimeout(() => dot.remove(), 1700);
  }
}


/* ========================
   CERRAR MODALES
======================== */
['overlay-income','overlay-spend'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });
});


/* ========================
   REGISTRO SERVICE WORKER
======================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registrado — app offline lista'))
      .catch(e => console.warn('SW error:', e));
  });
}


/* ========================
   ARRANQUE
======================== */
(function init() {
  const loaded = loadState();
  // Sincronizar slider y meta con estado cargado
  const pctSlider = document.getElementById('savePct');
  document.getElementById('pctDisplay').textContent = pctSlider.value + '%';
  document.getElementById('pct-label').textContent  = pctSlider.value + '%';
  document.getElementById('goalInput').value = goal;
  refreshUI();
  if (loaded) showToast('📂 Datos cargados');
})();/* ========================
   ESTADO GLOBAL
======================== */
const RESERVE = 30;
const LS_KEY  = 'finanzas_pro_v1';

let balance      = 0;
let savings      = 0;
let goal         = 500;
let pendingAmount     = 0;
let pendingPct        = 20;
let selectedIncomeCat = null;
let selectedSpendCat  = null;
let pendingSpend          = 0;
let pendingSavingsNeeded  = 0;

const transactions = [];

const INCOME_CATS = [
  { icon: 'ti-briefcase',    label: 'Trabajo'   },
  { icon: 'ti-building-bank',label: 'Freelance' },
  { icon: 'ti-gift',         label: 'Regalo'    },
  { icon: 'ti-chart-line',   label: 'Inversión' },
  { icon: 'ti-cash',         label: 'Venta'     },
  { icon: 'ti-dots',         label: 'Otro'      },
];

const SPEND_CATS = [
  { icon: 'ti-tools-kitchen-2', label: 'Comida'     },
  { icon: 'ti-bus',             label: 'Transporte' },
  { icon: 'ti-home',            label: 'Hogar'      },
  { icon: 'ti-device-mobile',   label: 'Servicios'  },
  { icon: 'ti-shopping-cart',   label: 'Compras'    },
  { icon: 'ti-heartbeat',       label: 'Salud'      },
  { icon: 'ti-device-gamepad',  label: 'Ocio'       },
  { icon: 'ti-book',            label: 'Educación'  },
  { icon: 'ti-dots',            label: 'Otro'       },
];

const CONFETTI_COLORS = ['#6d5dfc','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#fbbf24','#34d399'];


/* ========================
   PERSISTENCIA — localStorage
======================== */
function saveState() {
  try {
    const data = { balance, savings, goal, transactions, savedAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) { console.warn('localStorage error al guardar:', e); }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    balance = typeof data.balance === 'number' ? data.balance : 0;
    savings = typeof data.savings === 'number' ? data.savings : 0;
    goal    = typeof data.goal    === 'number' ? data.goal    : 500;
    transactions.length = 0;
    if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
    return true;
  } catch(e) { console.warn('localStorage error al cargar:', e); return false; }
}

/* Exportar datos como .json para respaldo manual */
function exportJSON() {
  const data = { balance, savings, goal, transactions, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'finanzas_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/* Importar desde .json */
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      balance = typeof data.balance === 'number' ? data.balance : 0;
      savings = typeof data.savings === 'number' ? data.savings : 0;
      goal    = typeof data.goal    === 'number' ? data.goal    : 500;
      transactions.length = 0;
      if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
      document.getElementById('goalInput').value = goal;
      updateGoal();
      saveState();
      refreshUI();
      showToast('✅ Datos importados correctamente');
    } catch { showToast('❌ Archivo JSON inválido'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}


/* ========================
   TOAST NOTIFICATION
======================== */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:100px; left:50%; transform:translateX(-50%) translateY(20px);
      background:#31344b; color:#fff; padding:10px 20px; border-radius:20px;
      font-size:14px; font-weight:600; z-index:999; opacity:0;
      transition:all 0.3s ease; white-space:nowrap; pointer-events:none;
      box-shadow:0 4px 20px rgba(0,0,0,0.25);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}


/* ========================
   NAVEGACIÓN
======================== */
function navigate(sec) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('visible'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('visible');
  document.getElementById('tab-' + sec).classList.add('active');
}

function updatePct() {
  const v = document.getElementById('savePct').value;
  document.getElementById('pctDisplay').textContent = v + '%';
  document.getElementById('pct-label').textContent  = v + '%';
}

function updateGoal() {
  goal = parseFloat(document.getElementById('goalInput').value) || 500;
  document.getElementById('goal-val').textContent = goal.toFixed(0);
  refreshSavingsBar();
  saveState();
}

function refreshSavingsBar() {
  const pct = Math.min(100, (savings / goal) * 100);
  document.getElementById('savBar').style.width = pct.toFixed(1) + '%';
  document.getElementById('goal-pct').textContent = pct.toFixed(0) + '%';
}

function refreshUI() {
  document.getElementById('balance-disp').textContent = balance.toFixed(2);
  document.getElementById('savings-disp').textContent = savings.toFixed(2);
  document.getElementById('savings-mini').textContent = savings.toFixed(2);
  document.getElementById('total-disp').textContent   = (balance + savings).toFixed(2);
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  refreshSavingsBar();
  renderTxList();
}

function stampTime() {
  const now = new Date();
  return now.toLocaleDateString('es-PE',{day:'numeric',month:'short'})
    + ' · ' + now.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
}


/* ========================
   FLUJO: INGRESO
======================== */
function startAddIncome() {
  const input = document.getElementById('incomeInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }
  pendingAmount     = amt;
  pendingPct        = parseInt(document.getElementById('savePct').value);
  selectedIncomeCat = null;
  buildCatGrid('cat-grid-income', INCOME_CATS, 'income');
  document.getElementById('overlay-income').classList.add('show');
}

function confirmIncome(cat) {
  document.getElementById('overlay-income').classList.remove('show');
  const toSave  = pendingAmount * (pendingPct / 100);
  const toSpend = pendingAmount - toSave;

  balance += toSpend;
  savings += toSave;

  const t = stampTime();
  transactions.unshift({ saving:false, spend:false, label:cat||'Ingreso', sub:t, amount:'+S/ '+toSpend.toFixed(2), cls:'pos', icon:'ti-arrow-down-circle' });
  if (toSave > 0)
    transactions.unshift({ saving:true, spend:false, label:'Ahorro ('+pendingPct+'%)', sub:t, amount:'S/ '+toSave.toFixed(2), cls:'sav', icon:'ti-piggy-bank' });

  document.getElementById('incomeInput').value = '';
  saveState();
  refreshUI();
  if (toSave > 0) animatePig();
  showToast('💰 Ingreso registrado');
}


/* ========================
   FLUJO: GASTO
======================== */
function openSpend() {
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  document.getElementById('spendInput').value = '';
  selectedSpendCat = null;
  buildCatGrid('cat-grid-spend', SPEND_CATS, 'spend');
  document.getElementById('overlay-spend').classList.add('show');
}

function confirmSpend() {
  const input = document.getElementById('spendInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }

  const cat = selectedSpendCat || 'Gasto';
  document.getElementById('overlay-spend').classList.remove('show');

  const freeBalance = balance - RESERVE;

  if (freeBalance >= amt) {
    executeSpend(amt, cat, 0);
  } else {
    const deficit = amt - freeBalance;
    if (deficit > savings) {
      showImpossibleAlert(amt, freeBalance, deficit);
    } else {
      pendingSpend         = amt;
      pendingSavingsNeeded = deficit;
      showSavingsAlert(amt, cat, freeBalance, deficit);
    }
  }
}

function executeSpend(amt, cat, fromSavings) {
  balance -= amt;
  balance += fromSavings;
  savings -= fromSavings;

  const t = stampTime();
  if (fromSavings > 0)
    transactions.unshift({ saving:true, spend:false, label:'Rescate de ahorro', sub:t, amount:'-S/ '+fromSavings.toFixed(2), cls:'res', icon:'ti-piggy-bank' });
  transactions.unshift({ saving:false, spend:true, label:cat, sub:t, amount:'-S/ '+amt.toFixed(2), cls:'neg', icon:'ti-shopping-bag' });

  saveState();
  refreshUI();
  animateCoin();
  showToast('🛍️ Gasto registrado');
}

function executeSpendWithSavings() {
  closeAlert();
  const cat = selectedSpendCat || 'Gasto';
  executeSpend(pendingSpend, cat, pendingSavingsNeeded);
}


/* ========================
   ALERTAS
======================== */
function showSavingsAlert(amt, cat, freeBalance, needed) {
  document.getElementById('alert-body').innerHTML = `
    Para cubrir este gasto de <strong>S/ ${amt.toFixed(2)}</strong>
    tu saldo libre solo alcanza <strong>S/ ${Math.max(0,freeBalance).toFixed(2)}</strong>
    (los S/ ${RESERVE} son tu reserva protegida).<br><br>
    Necesitas tomar <span class="savings-needed">S/ ${needed.toFixed(2)}</span>
    de tus ahorros para completarlo.<br><br>
    ¿Quieres continuar?
  `;
  document.getElementById('overlay-alert').classList.add('show');
}

function showImpossibleAlert(amt, freeBalance, deficit) {
  document.getElementById('alert-body').innerHTML = `
    Para pagar <strong>S/ ${amt.toFixed(2)}</strong> necesitas
    <strong>S/ ${deficit.toFixed(2)}</strong> adicionales,
    pero solo tienes <strong>S/ ${savings.toFixed(2)}</strong> en ahorro.<br><br>
    No es posible realizar este gasto sin afectar la reserva protegida.
  `;
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = 'none';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Entendido';
  cancelBtn.style.flex  = '1';
  document.getElementById('overlay-alert').classList.add('show');
}

function closeAlert() {
  document.getElementById('overlay-alert').classList.remove('show');
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = '';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.flex  = '';
}


/* ========================
   CAT GRID
======================== */
function buildCatGrid(gridId, cats, type) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = '';
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.innerHTML = `<i class="ti ${c.icon}"></i>${c.label}`;
    btn.onclick = () => {
      grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (type === 'income') selectedIncomeCat = c.label;
      else                   selectedSpendCat  = c.label;
    };
    grid.appendChild(btn);
  });
}


/* ========================
   HISTORIAL
======================== */
function renderTxList() {
  const list = document.getElementById('tx-list');
  if (transactions.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-mood-empty"></i><p>Sin movimientos aún</p></div>';
    return;
  }
  list.innerHTML = transactions.slice(0, 60).map(t => `
    <div class="tx-item">
      <div class="tx-icon ${t.saving?'saving':''} ${t.spend?'spend':''} ${t.cls==='res'?'reserve':''}">
        <i class="ti ${t.icon}"></i>
      </div>
      <div class="tx-label"><p>${t.label}</p><small>${t.sub}</small></div>
      <div class="tx-amount ${t.cls}">${t.amount}</div>
    </div>`).join('');
}


/* ========================
   ANIMACIONES
======================== */
function animatePig()  { flyEmoji('pig-anim',  'tab-cuenta', 'tab-ahorro'); }
function animateCoin() { flyEmoji('coin-anim', 'tab-cuenta', 'tab-movimientos'); }

function flyEmoji(elemId, fromTabId, toTabId) {
  const el = document.getElementById(elemId);
  const r1 = document.getElementById(fromTabId).getBoundingClientRect();
  const r2 = document.getElementById(toTabId).getBoundingClientRect();
  const sx = r1.left + r1.width/2 - 17, sy = r1.top - 20;
  const ex = r2.left + r2.width/2 - 17, ey = r2.top - 20;

  el.style.cssText = `display:block;left:${sx}px;top:${sy}px;transition:none;transform:scale(1) rotate(0deg);opacity:1;`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-out,transform 0.3s ease';
    el.style.left = ex+'px'; el.style.top = (Math.min(sy,ey)-70)+'px';
    el.style.transform = 'scale(1.15) rotate(-15deg)';
    setTimeout(() => {
      el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-in,transform 0.3s ease';
      el.style.top = ey+'px'; el.style.transform = 'scale(1.15) rotate(15deg)';
    }, 450);
    setTimeout(() => {
      el.style.transition = 'transform 0.2s ease';
      el.style.transform  = 'scale(1.6) rotate(0deg)';
      spawnConfetti(ex+17, ey+17);
      setTimeout(() => {
        el.style.transition = 'transform 0.25s ease,opacity 0.25s ease';
        el.style.transform  = 'scale(0)'; el.style.opacity = '0';
        setTimeout(() => { el.style.display='none'; el.style.opacity='1'; }, 280);
      }, 250);
    }, 900);
  }));
}

function spawnConfetti(cx, cy) {
  const wrap = document.getElementById('confetti-wrap');
  for (let i = 0; i < 22; i++) {
    const dot = document.createElement('div');
    dot.className = 'conf-dot';
    const angle = Math.random() * 2 * Math.PI, dist = 28 + Math.random() * 70;
    const sq = i % 3 === 0;
    dot.style.cssText = `left:${cx+Math.cos(angle)*dist}px;top:${cy+Math.sin(angle)*dist}px;background:${CONFETTI_COLORS[i%CONFETTI_COLORS.length]};border-radius:${sq?'2px':'50%'};width:${sq?'7px':'9px'};height:${sq?'7px':'9px'};animation-delay:${(Math.random()*0.3).toFixed(2)}s;`;
    wrap.appendChild(dot);
    setTimeout(() => dot.remove(), 1700);
  }
}


/* ========================
   CERRAR MODALES
======================== */
['overlay-income','overlay-spend'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });
});


/* ========================
   REGISTRO SERVICE WORKER
======================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registrado — app offline lista'))
      .catch(e => console.warn('SW error:', e));
  });
}


/* ========================
   ARRANQUE
======================== */
(function init() {
  const loaded = loadState();
  // Sincronizar slider y meta con estado cargado
  const pctSlider = document.getElementById('savePct');
  document.getElementById('pctDisplay').textContent = pctSlider.value + '%';
  document.getElementById('pct-label').textContent  = pctSlider.value + '%';
  document.getElementById('goalInput').value = goal;
  refreshUI();
  if (loaded) showToast('📂 Datos cargados');
})();/* ========================
   ESTADO GLOBAL
======================== */
const RESERVE = 30;
const LS_KEY  = 'finanzas_pro_v1';

let balance      = 0;
let savings      = 0;
let goal         = 500;
let pendingAmount     = 0;
let pendingPct        = 20;
let selectedIncomeCat = null;
let selectedSpendCat  = null;
let pendingSpend          = 0;
let pendingSavingsNeeded  = 0;

const transactions = [];

const INCOME_CATS = [
  { icon: 'ti-briefcase',    label: 'Trabajo'   },
  { icon: 'ti-building-bank',label: 'Freelance' },
  { icon: 'ti-gift',         label: 'Regalo'    },
  { icon: 'ti-chart-line',   label: 'Inversión' },
  { icon: 'ti-cash',         label: 'Venta'     },
  { icon: 'ti-dots',         label: 'Otro'      },
];

const SPEND_CATS = [
  { icon: 'ti-tools-kitchen-2', label: 'Comida'     },
  { icon: 'ti-bus',             label: 'Transporte' },
  { icon: 'ti-home',            label: 'Hogar'      },
  { icon: 'ti-device-mobile',   label: 'Servicios'  },
  { icon: 'ti-shopping-cart',   label: 'Compras'    },
  { icon: 'ti-heartbeat',       label: 'Salud'      },
  { icon: 'ti-device-gamepad',  label: 'Ocio'       },
  { icon: 'ti-book',            label: 'Educación'  },
  { icon: 'ti-dots',            label: 'Otro'       },
];

const CONFETTI_COLORS = ['#6d5dfc','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#fbbf24','#34d399'];


/* ========================
   PERSISTENCIA — localStorage
======================== */
function saveState() {
  try {
    const data = { balance, savings, goal, transactions, savedAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) { console.warn('localStorage error al guardar:', e); }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    balance = typeof data.balance === 'number' ? data.balance : 0;
    savings = typeof data.savings === 'number' ? data.savings : 0;
    goal    = typeof data.goal    === 'number' ? data.goal    : 500;
    transactions.length = 0;
    if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
    return true;
  } catch(e) { console.warn('localStorage error al cargar:', e); return false; }
}

/* Exportar datos como .json para respaldo manual */
function exportJSON() {
  const data = { balance, savings, goal, transactions, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'finanzas_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/* Importar desde .json */
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      balance = typeof data.balance === 'number' ? data.balance : 0;
      savings = typeof data.savings === 'number' ? data.savings : 0;
      goal    = typeof data.goal    === 'number' ? data.goal    : 500;
      transactions.length = 0;
      if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
      document.getElementById('goalInput').value = goal;
      updateGoal();
      saveState();
      refreshUI();
      showToast('✅ Datos importados correctamente');
    } catch { showToast('❌ Archivo JSON inválido'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}


/* ========================
   TOAST NOTIFICATION
======================== */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:100px; left:50%; transform:translateX(-50%) translateY(20px);
      background:#31344b; color:#fff; padding:10px 20px; border-radius:20px;
      font-size:14px; font-weight:600; z-index:999; opacity:0;
      transition:all 0.3s ease; white-space:nowrap; pointer-events:none;
      box-shadow:0 4px 20px rgba(0,0,0,0.25);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}


/* ========================
   NAVEGACIÓN
======================== */
function navigate(sec) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('visible'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('visible');
  document.getElementById('tab-' + sec).classList.add('active');
}

function updatePct() {
  const v = document.getElementById('savePct').value;
  document.getElementById('pctDisplay').textContent = v + '%';
  document.getElementById('pct-label').textContent  = v + '%';
}

function updateGoal() {
  goal = parseFloat(document.getElementById('goalInput').value) || 500;
  document.getElementById('goal-val').textContent = goal.toFixed(0);
  refreshSavingsBar();
  saveState();
}

function refreshSavingsBar() {
  const pct = Math.min(100, (savings / goal) * 100);
  document.getElementById('savBar').style.width = pct.toFixed(1) + '%';
  document.getElementById('goal-pct').textContent = pct.toFixed(0) + '%';
}

function refreshUI() {
  document.getElementById('balance-disp').textContent = balance.toFixed(2);
  document.getElementById('savings-disp').textContent = savings.toFixed(2);
  document.getElementById('savings-mini').textContent = savings.toFixed(2);
  document.getElementById('total-disp').textContent   = (balance + savings).toFixed(2);
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  refreshSavingsBar();
  renderTxList();
}

function stampTime() {
  const now = new Date();
  return now.toLocaleDateString('es-PE',{day:'numeric',month:'short'})
    + ' · ' + now.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
}


/* ========================
   FLUJO: INGRESO
======================== */
function startAddIncome() {
  const input = document.getElementById('incomeInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }
  pendingAmount     = amt;
  pendingPct        = parseInt(document.getElementById('savePct').value);
  selectedIncomeCat = null;
  buildCatGrid('cat-grid-income', INCOME_CATS, 'income');
  document.getElementById('overlay-income').classList.add('show');
}

function confirmIncome(cat) {
  document.getElementById('overlay-income').classList.remove('show');
  const toSave  = pendingAmount * (pendingPct / 100);
  const toSpend = pendingAmount - toSave;

  balance += toSpend;
  savings += toSave;

  const t = stampTime();
  transactions.unshift({ saving:false, spend:false, label:cat||'Ingreso', sub:t, amount:'+S/ '+toSpend.toFixed(2), cls:'pos', icon:'ti-arrow-down-circle' });
  if (toSave > 0)
    transactions.unshift({ saving:true, spend:false, label:'Ahorro ('+pendingPct+'%)', sub:t, amount:'S/ '+toSave.toFixed(2), cls:'sav', icon:'ti-piggy-bank' });

  document.getElementById('incomeInput').value = '';
  saveState();
  refreshUI();
  if (toSave > 0) animatePig();
  showToast('💰 Ingreso registrado');
}


/* ========================
   FLUJO: GASTO
======================== */
function openSpend() {
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  document.getElementById('spendInput').value = '';
  selectedSpendCat = null;
  buildCatGrid('cat-grid-spend', SPEND_CATS, 'spend');
  document.getElementById('overlay-spend').classList.add('show');
}

function confirmSpend() {
  const input = document.getElementById('spendInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }

  const cat = selectedSpendCat || 'Gasto';
  document.getElementById('overlay-spend').classList.remove('show');

  const freeBalance = balance - RESERVE;

  if (freeBalance >= amt) {
    executeSpend(amt, cat, 0);
  } else {
    const deficit = amt - freeBalance;
    if (deficit > savings) {
      showImpossibleAlert(amt, freeBalance, deficit);
    } else {
      pendingSpend         = amt;
      pendingSavingsNeeded = deficit;
      showSavingsAlert(amt, cat, freeBalance, deficit);
    }
  }
}

function executeSpend(amt, cat, fromSavings) {
  balance -= amt;
  balance += fromSavings;
  savings -= fromSavings;

  const t = stampTime();
  if (fromSavings > 0)
    transactions.unshift({ saving:true, spend:false, label:'Rescate de ahorro', sub:t, amount:'-S/ '+fromSavings.toFixed(2), cls:'res', icon:'ti-piggy-bank' });
  transactions.unshift({ saving:false, spend:true, label:cat, sub:t, amount:'-S/ '+amt.toFixed(2), cls:'neg', icon:'ti-shopping-bag' });

  saveState();
  refreshUI();
  animateCoin();
  showToast('🛍️ Gasto registrado');
}

function executeSpendWithSavings() {
  closeAlert();
  const cat = selectedSpendCat || 'Gasto';
  executeSpend(pendingSpend, cat, pendingSavingsNeeded);
}


/* ========================
   ALERTAS
======================== */
function showSavingsAlert(amt, cat, freeBalance, needed) {
  document.getElementById('alert-body').innerHTML = `
    Para cubrir este gasto de <strong>S/ ${amt.toFixed(2)}</strong>
    tu saldo libre solo alcanza <strong>S/ ${Math.max(0,freeBalance).toFixed(2)}</strong>
    (los S/ ${RESERVE} son tu reserva protegida).<br><br>
    Necesitas tomar <span class="savings-needed">S/ ${needed.toFixed(2)}</span>
    de tus ahorros para completarlo.<br><br>
    ¿Quieres continuar?
  `;
  document.getElementById('overlay-alert').classList.add('show');
}

function showImpossibleAlert(amt, freeBalance, deficit) {
  document.getElementById('alert-body').innerHTML = `
    Para pagar <strong>S/ ${amt.toFixed(2)}</strong> necesitas
    <strong>S/ ${deficit.toFixed(2)}</strong> adicionales,
    pero solo tienes <strong>S/ ${savings.toFixed(2)}</strong> en ahorro.<br><br>
    No es posible realizar este gasto sin afectar la reserva protegida.
  `;
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = 'none';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Entendido';
  cancelBtn.style.flex  = '1';
  document.getElementById('overlay-alert').classList.add('show');
}

function closeAlert() {
  document.getElementById('overlay-alert').classList.remove('show');
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = '';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.flex  = '';
}


/* ========================
   CAT GRID
======================== */
function buildCatGrid(gridId, cats, type) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = '';
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.innerHTML = `<i class="ti ${c.icon}"></i>${c.label}`;
    btn.onclick = () => {
      grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (type === 'income') selectedIncomeCat = c.label;
      else                   selectedSpendCat  = c.label;
    };
    grid.appendChild(btn);
  });
}


/* ========================
   HISTORIAL
======================== */
function renderTxList() {
  const list = document.getElementById('tx-list');
  if (transactions.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-mood-empty"></i><p>Sin movimientos aún</p></div>';
    return;
  }
  list.innerHTML = transactions.slice(0, 60).map(t => `
    <div class="tx-item">
      <div class="tx-icon ${t.saving?'saving':''} ${t.spend?'spend':''} ${t.cls==='res'?'reserve':''}">
        <i class="ti ${t.icon}"></i>
      </div>
      <div class="tx-label"><p>${t.label}</p><small>${t.sub}</small></div>
      <div class="tx-amount ${t.cls}">${t.amount}</div>
    </div>`).join('');
}


/* ========================
   ANIMACIONES
======================== */
function animatePig()  { flyEmoji('pig-anim',  'tab-cuenta', 'tab-ahorro'); }
function animateCoin() { flyEmoji('coin-anim', 'tab-cuenta', 'tab-movimientos'); }

function flyEmoji(elemId, fromTabId, toTabId) {
  const el = document.getElementById(elemId);
  const r1 = document.getElementById(fromTabId).getBoundingClientRect();
  const r2 = document.getElementById(toTabId).getBoundingClientRect();
  const sx = r1.left + r1.width/2 - 17, sy = r1.top - 20;
  const ex = r2.left + r2.width/2 - 17, ey = r2.top - 20;

  el.style.cssText = `display:block;left:${sx}px;top:${sy}px;transition:none;transform:scale(1) rotate(0deg);opacity:1;`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-out,transform 0.3s ease';
    el.style.left = ex+'px'; el.style.top = (Math.min(sy,ey)-70)+'px';
    el.style.transform = 'scale(1.15) rotate(-15deg)';
    setTimeout(() => {
      el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-in,transform 0.3s ease';
      el.style.top = ey+'px'; el.style.transform = 'scale(1.15) rotate(15deg)';
    }, 450);
    setTimeout(() => {
      el.style.transition = 'transform 0.2s ease';
      el.style.transform  = 'scale(1.6) rotate(0deg)';
      spawnConfetti(ex+17, ey+17);
      setTimeout(() => {
        el.style.transition = 'transform 0.25s ease,opacity 0.25s ease';
        el.style.transform  = 'scale(0)'; el.style.opacity = '0';
        setTimeout(() => { el.style.display='none'; el.style.opacity='1'; }, 280);
      }, 250);
    }, 900);
  }));
}

function spawnConfetti(cx, cy) {
  const wrap = document.getElementById('confetti-wrap');
  for (let i = 0; i < 22; i++) {
    const dot = document.createElement('div');
    dot.className = 'conf-dot';
    const angle = Math.random() * 2 * Math.PI, dist = 28 + Math.random() * 70;
    const sq = i % 3 === 0;
    dot.style.cssText = `left:${cx+Math.cos(angle)*dist}px;top:${cy+Math.sin(angle)*dist}px;background:${CONFETTI_COLORS[i%CONFETTI_COLORS.length]};border-radius:${sq?'2px':'50%'};width:${sq?'7px':'9px'};height:${sq?'7px':'9px'};animation-delay:${(Math.random()*0.3).toFixed(2)}s;`;
    wrap.appendChild(dot);
    setTimeout(() => dot.remove(), 1700);
  }
}


/* ========================
   CERRAR MODALES
======================== */
['overlay-income','overlay-spend'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });
});


/* ========================
   REGISTRO SERVICE WORKER
======================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registrado — app offline lista'))
      .catch(e => console.warn('SW error:', e));
  });
}


/* ========================
   ARRANQUE
======================== */
(function init() {
  const loaded = loadState();
  // Sincronizar slider y meta con estado cargado
  const pctSlider = document.getElementById('savePct');
  document.getElementById('pctDisplay').textContent = pctSlider.value + '%';
  document.getElementById('pct-label').textContent  = pctSlider.value + '%';
  document.getElementById('goalInput').value = goal;
  refreshUI();
  if (loaded) showToast('📂 Datos cargados');
})();/* ========================
   ESTADO GLOBAL
======================== */
const RESERVE = 30;
const LS_KEY  = 'finanzas_pro_v1';

let balance      = 0;
let savings      = 0;
let goal         = 500;
let pendingAmount     = 0;
let pendingPct        = 20;
let selectedIncomeCat = null;
let selectedSpendCat  = null;
let pendingSpend          = 0;
let pendingSavingsNeeded  = 0;

const transactions = [];

const INCOME_CATS = [
  { icon: 'ti-briefcase',    label: 'Trabajo'   },
  { icon: 'ti-building-bank',label: 'Freelance' },
  { icon: 'ti-gift',         label: 'Regalo'    },
  { icon: 'ti-chart-line',   label: 'Inversión' },
  { icon: 'ti-cash',         label: 'Venta'     },
  { icon: 'ti-dots',         label: 'Otro'      },
];

const SPEND_CATS = [
  { icon: 'ti-tools-kitchen-2', label: 'Comida'     },
  { icon: 'ti-bus',             label: 'Transporte' },
  { icon: 'ti-home',            label: 'Hogar'      },
  { icon: 'ti-device-mobile',   label: 'Servicios'  },
  { icon: 'ti-shopping-cart',   label: 'Compras'    },
  { icon: 'ti-heartbeat',       label: 'Salud'      },
  { icon: 'ti-device-gamepad',  label: 'Ocio'       },
  { icon: 'ti-book',            label: 'Educación'  },
  { icon: 'ti-dots',            label: 'Otro'       },
];

const CONFETTI_COLORS = ['#6d5dfc','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#fbbf24','#34d399'];


/* ========================
   PERSISTENCIA — localStorage
======================== */
function saveState() {
  try {
    const data = { balance, savings, goal, transactions, savedAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) { console.warn('localStorage error al guardar:', e); }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    balance = typeof data.balance === 'number' ? data.balance : 0;
    savings = typeof data.savings === 'number' ? data.savings : 0;
    goal    = typeof data.goal    === 'number' ? data.goal    : 500;
    transactions.length = 0;
    if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
    return true;
  } catch(e) { console.warn('localStorage error al cargar:', e); return false; }
}

/* Exportar datos como .json para respaldo manual */
function exportJSON() {
  const data = { balance, savings, goal, transactions, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'finanzas_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/* Importar desde .json */
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      balance = typeof data.balance === 'number' ? data.balance : 0;
      savings = typeof data.savings === 'number' ? data.savings : 0;
      goal    = typeof data.goal    === 'number' ? data.goal    : 500;
      transactions.length = 0;
      if (Array.isArray(data.transactions)) data.transactions.forEach(t => transactions.push(t));
      document.getElementById('goalInput').value = goal;
      updateGoal();
      saveState();
      refreshUI();
      showToast('✅ Datos importados correctamente');
    } catch { showToast('❌ Archivo JSON inválido'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}


/* ========================
   TOAST NOTIFICATION
======================== */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:100px; left:50%; transform:translateX(-50%) translateY(20px);
      background:#31344b; color:#fff; padding:10px 20px; border-radius:20px;
      font-size:14px; font-weight:600; z-index:999; opacity:0;
      transition:all 0.3s ease; white-space:nowrap; pointer-events:none;
      box-shadow:0 4px 20px rgba(0,0,0,0.25);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}


/* ========================
   NAVEGACIÓN
======================== */
function navigate(sec) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('visible'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('visible');
  document.getElementById('tab-' + sec).classList.add('active');
}

function updatePct() {
  const v = document.getElementById('savePct').value;
  document.getElementById('pctDisplay').textContent = v + '%';
  document.getElementById('pct-label').textContent  = v + '%';
}

function updateGoal() {
  goal = parseFloat(document.getElementById('goalInput').value) || 500;
  document.getElementById('goal-val').textContent = goal.toFixed(0);
  refreshSavingsBar();
  saveState();
}

function refreshSavingsBar() {
  const pct = Math.min(100, (savings / goal) * 100);
  document.getElementById('savBar').style.width = pct.toFixed(1) + '%';
  document.getElementById('goal-pct').textContent = pct.toFixed(0) + '%';
}

function refreshUI() {
  document.getElementById('balance-disp').textContent = balance.toFixed(2);
  document.getElementById('savings-disp').textContent = savings.toFixed(2);
  document.getElementById('savings-mini').textContent = savings.toFixed(2);
  document.getElementById('total-disp').textContent   = (balance + savings).toFixed(2);
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  refreshSavingsBar();
  renderTxList();
}

function stampTime() {
  const now = new Date();
  return now.toLocaleDateString('es-PE',{day:'numeric',month:'short'})
    + ' · ' + now.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
}


/* ========================
   FLUJO: INGRESO
======================== */
function startAddIncome() {
  const input = document.getElementById('incomeInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }
  pendingAmount     = amt;
  pendingPct        = parseInt(document.getElementById('savePct').value);
  selectedIncomeCat = null;
  buildCatGrid('cat-grid-income', INCOME_CATS, 'income');
  document.getElementById('overlay-income').classList.add('show');
}

function confirmIncome(cat) {
  document.getElementById('overlay-income').classList.remove('show');
  const toSave  = pendingAmount * (pendingPct / 100);
  const toSpend = pendingAmount - toSave;

  balance += toSpend;
  savings += toSave;

  const t = stampTime();
  transactions.unshift({ saving:false, spend:false, label:cat||'Ingreso', sub:t, amount:'+S/ '+toSpend.toFixed(2), cls:'pos', icon:'ti-arrow-down-circle' });
  if (toSave > 0)
    transactions.unshift({ saving:true, spend:false, label:'Ahorro ('+pendingPct+'%)', sub:t, amount:'S/ '+toSave.toFixed(2), cls:'sav', icon:'ti-piggy-bank' });

  document.getElementById('incomeInput').value = '';
  saveState();
  refreshUI();
  if (toSave > 0) animatePig();
  showToast('💰 Ingreso registrado');
}


/* ========================
   FLUJO: GASTO
======================== */
function openSpend() {
  document.getElementById('free-balance').textContent = Math.max(0, balance - RESERVE).toFixed(2);
  document.getElementById('spendInput').value = '';
  selectedSpendCat = null;
  buildCatGrid('cat-grid-spend', SPEND_CATS, 'spend');
  document.getElementById('overlay-spend').classList.add('show');
}

function confirmSpend() {
  const input = document.getElementById('spendInput');
  const amt   = parseFloat(input.value);
  if (isNaN(amt) || amt <= 0) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 800);
    return;
  }

  const cat = selectedSpendCat || 'Gasto';
  document.getElementById('overlay-spend').classList.remove('show');

  const freeBalance = balance - RESERVE;

  if (freeBalance >= amt) {
    executeSpend(amt, cat, 0);
  } else {
    const deficit = amt - freeBalance;
    if (deficit > savings) {
      showImpossibleAlert(amt, freeBalance, deficit);
    } else {
      pendingSpend         = amt;
      pendingSavingsNeeded = deficit;
      showSavingsAlert(amt, cat, freeBalance, deficit);
    }
  }
}

function executeSpend(amt, cat, fromSavings) {
  balance -= amt;
  balance += fromSavings;
  savings -= fromSavings;

  const t = stampTime();
  if (fromSavings > 0)
    transactions.unshift({ saving:true, spend:false, label:'Rescate de ahorro', sub:t, amount:'-S/ '+fromSavings.toFixed(2), cls:'res', icon:'ti-piggy-bank' });
  transactions.unshift({ saving:false, spend:true, label:cat, sub:t, amount:'-S/ '+amt.toFixed(2), cls:'neg', icon:'ti-shopping-bag' });

  saveState();
  refreshUI();
  animateCoin();
  showToast('🛍️ Gasto registrado');
}

function executeSpendWithSavings() {
  closeAlert();
  const cat = selectedSpendCat || 'Gasto';
  executeSpend(pendingSpend, cat, pendingSavingsNeeded);
}


/* ========================
   ALERTAS
======================== */
function showSavingsAlert(amt, cat, freeBalance, needed) {
  document.getElementById('alert-body').innerHTML = `
    Para cubrir este gasto de <strong>S/ ${amt.toFixed(2)}</strong>
    tu saldo libre solo alcanza <strong>S/ ${Math.max(0,freeBalance).toFixed(2)}</strong>
    (los S/ ${RESERVE} son tu reserva protegida).<br><br>
    Necesitas tomar <span class="savings-needed">S/ ${needed.toFixed(2)}</span>
    de tus ahorros para completarlo.<br><br>
    ¿Quieres continuar?
  `;
  document.getElementById('overlay-alert').classList.add('show');
}

function showImpossibleAlert(amt, freeBalance, deficit) {
  document.getElementById('alert-body').innerHTML = `
    Para pagar <strong>S/ ${amt.toFixed(2)}</strong> necesitas
    <strong>S/ ${deficit.toFixed(2)}</strong> adicionales,
    pero solo tienes <strong>S/ ${savings.toFixed(2)}</strong> en ahorro.<br><br>
    No es posible realizar este gasto sin afectar la reserva protegida.
  `;
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = 'none';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Entendido';
  cancelBtn.style.flex  = '1';
  document.getElementById('overlay-alert').classList.add('show');
}

function closeAlert() {
  document.getElementById('overlay-alert').classList.remove('show');
  document.querySelector('#overlay-alert .btn-alert-confirm').style.display = '';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.flex  = '';
}


/* ========================
   CAT GRID
======================== */
function buildCatGrid(gridId, cats, type) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = '';
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.innerHTML = `<i class="ti ${c.icon}"></i>${c.label}`;
    btn.onclick = () => {
      grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (type === 'income') selectedIncomeCat = c.label;
      else                   selectedSpendCat  = c.label;
    };
    grid.appendChild(btn);
  });
}


/* ========================
   HISTORIAL
======================== */
function renderTxList() {
  const list = document.getElementById('tx-list');
  if (transactions.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-mood-empty"></i><p>Sin movimientos aún</p></div>';
    return;
  }
  list.innerHTML = transactions.slice(0, 60).map(t => `
    <div class="tx-item">
      <div class="tx-icon ${t.saving?'saving':''} ${t.spend?'spend':''} ${t.cls==='res'?'reserve':''}">
        <i class="ti ${t.icon}"></i>
      </div>
      <div class="tx-label"><p>${t.label}</p><small>${t.sub}</small></div>
      <div class="tx-amount ${t.cls}">${t.amount}</div>
    </div>`).join('');
}


/* ========================
   ANIMACIONES
======================== */
function animatePig()  { flyEmoji('pig-anim',  'tab-cuenta', 'tab-ahorro'); }
function animateCoin() { flyEmoji('coin-anim', 'tab-cuenta', 'tab-movimientos'); }

function flyEmoji(elemId, fromTabId, toTabId) {
  const el = document.getElementById(elemId);
  const r1 = document.getElementById(fromTabId).getBoundingClientRect();
  const r2 = document.getElementById(toTabId).getBoundingClientRect();
  const sx = r1.left + r1.width/2 - 17, sy = r1.top - 20;
  const ex = r2.left + r2.width/2 - 17, ey = r2.top - 20;

  el.style.cssText = `display:block;left:${sx}px;top:${sy}px;transition:none;transform:scale(1) rotate(0deg);opacity:1;`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-out,transform 0.3s ease';
    el.style.left = ex+'px'; el.style.top = (Math.min(sy,ey)-70)+'px';
    el.style.transform = 'scale(1.15) rotate(-15deg)';
    setTimeout(() => {
      el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-in,transform 0.3s ease';
      el.style.top = ey+'px'; el.style.transform = 'scale(1.15) rotate(15deg)';
    }, 450);
    setTimeout(() => {
      el.style.transition = 'transform 0.2s ease';
      el.style.transform  = 'scale(1.6) rotate(0deg)';
      spawnConfetti(ex+17, ey+17);
      setTimeout(() => {
        el.style.transition = 'transform 0.25s ease,opacity 0.25s ease';
        el.style.transform  = 'scale(0)'; el.style.opacity = '0';
        setTimeout(() => { el.style.display='none'; el.style.opacity='1'; }, 280);
      }, 250);
    }, 900);
  }));
}

function spawnConfetti(cx, cy) {
  const wrap = document.getElementById('confetti-wrap');
  for (let i = 0; i < 22; i++) {
    const dot = document.createElement('div');
    dot.className = 'conf-dot';
    const angle = Math.random() * 2 * Math.PI, dist = 28 + Math.random() * 70;
    const sq = i % 3 === 0;
    dot.style.cssText = `left:${cx+Math.cos(angle)*dist}px;top:${cy+Math.sin(angle)*dist}px;background:${CONFETTI_COLORS[i%CONFETTI_COLORS.length]};border-radius:${sq?'2px':'50%'};width:${sq?'7px':'9px'};height:${sq?'7px':'9px'};animation-delay:${(Math.random()*0.3).toFixed(2)}s;`;
    wrap.appendChild(dot);
    setTimeout(() => dot.remove(), 1700);
  }
}


/* ========================
   CERRAR MODALES
======================== */
['overlay-income','overlay-spend'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });
});


/* ========================
   REGISTRO SERVICE WORKER
======================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registrado — app offline lista'))
      .catch(e => console.warn('SW error:', e));
  });
}


/* ========================
   ARRANQUE
======================== */
(function init() {
  const loaded = loadState();
  // Sincronizar slider y meta con estado cargado
  const pctSlider = document.getElementById('savePct');
  document.getElementById('pctDisplay').textContent = pctSlider.value + '%';
  document.getElementById('pct-label').textContent  = pctSlider.value + '%';
  document.getElementById('goalInput').value = goal;
  refreshUI();
  if (loaded) showToast('📂 Datos cargados');
})();
