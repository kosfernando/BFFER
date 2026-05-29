/* ========================
   ESTADO GLOBAL
======================== */
const RESERVE = 30; // S/ que nunca se tocan

let balance      = 0;
let savings      = 0;
let goal         = 500;
let pendingAmount  = 0;
let pendingPct     = 20;
let selectedIncomeCat = null;
let selectedSpendCat  = null;
let pendingSpend   = 0;      // monto del gasto pendiente de confirmar
let pendingSavingsNeeded = 0; // cuánto hay que sacar del ahorro

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
  { icon: 'ti-tools-kitchen-2', label: 'Comida'      },
  { icon: 'ti-bus',             label: 'Transporte'  },
  { icon: 'ti-home',            label: 'Hogar'       },
  { icon: 'ti-device-mobile',   label: 'Servicios'   },
  { icon: 'ti-shopping-cart',   label: 'Compras'     },
  { icon: 'ti-heartbeat',       label: 'Salud'       },
  { icon: 'ti-device-gamepad',  label: 'Ocio'        },
  { icon: 'ti-book',            label: 'Educación'   },
  { icon: 'ti-dots',            label: 'Otro'        },
];

const CONFETTI_COLORS = ['#6d5dfc','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#fbbf24','#34d399'];


/* ========================
   UTILIDADES UI
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
  transactions.unshift({ saving:false, spend:false, label: cat || 'Ingreso', sub:t, amount:'+S/ '+toSpend.toFixed(2), cls:'pos', icon:'ti-arrow-down-circle' });
  if (toSave > 0)
    transactions.unshift({ saving:true, spend:false, label:'Ahorro ('+pendingPct+'%)', sub:t, amount:'S/ '+toSave.toFixed(2), cls:'sav', icon:'ti-piggy-bank' });

  document.getElementById('incomeInput').value = '';
  refreshUI();
  if (toSave > 0) animatePig();
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

  // Saldo libre (por encima de la reserva)
  const freeBalance = balance - RESERVE;

  if (freeBalance >= amt) {
    // Gasto normal, sin tocar reserva ni ahorro
    executeSpend(amt, cat, 0);
  } else {
    // Necesita más plata
    const deficit = amt - freeBalance;

    if (deficit > savings) {
      // No alcanza ni con los ahorros
      showImpossibleAlert(amt, freeBalance, deficit);
    } else {
      // Puede cubrirlo tomando del ahorro
      pendingSpend         = amt;
      pendingSavingsNeeded = deficit;
      showSavingsAlert(amt, cat, freeBalance, deficit);
    }
  }
}

function executeSpend(amt, cat, fromSavings) {
  balance  -= amt;
  balance  += fromSavings;   // devuelve lo sacado del ahorro al balance
  savings  -= fromSavings;

  const t = stampTime();

  if (fromSavings > 0) {
    transactions.unshift({ saving:true, spend:false, label:'Rescate de ahorro', sub:t, amount:'-S/ '+fromSavings.toFixed(2), cls:'res', icon:'ti-piggy-bank' });
  }

  transactions.unshift({ saving:false, spend:true, label: cat, sub:t, amount:'-S/ '+amt.toFixed(2), cls:'neg', icon:'ti-shopping-bag' });

  refreshUI();
  animateCoin();
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
  const body = document.getElementById('alert-body');
  body.innerHTML = `
    Para cubrir este gasto de <strong>S/ ${amt.toFixed(2)}</strong>
    tu saldo libre solo alcanza <strong>S/ ${freeBalance.toFixed(2)}</strong>
    (los S/ 30 son tu reserva protegida).<br><br>
    Necesitas tomar <span class="savings-needed">S/ ${needed.toFixed(2)}</span>
    de tus ahorros para completarlo.<br><br>
    ¿Quieres continuar?
  `;
  document.getElementById('overlay-alert').classList.add('show');
}

function showImpossibleAlert(amt, freeBalance, deficit) {
  const body = document.getElementById('alert-body');
  body.innerHTML = `
    Para pagar <strong>S/ ${amt.toFixed(2)}</strong> necesitas
    <strong>S/ ${deficit.toFixed(2)}</strong> adicionales,
    pero solo tienes <strong>S/ ${savings.toFixed(2)}</strong> en ahorro.<br><br>
    No es posible realizar este gasto sin afectar la reserva protegida.
  `;
  // Ocultar botón de confirmar y cambiar cancel a Entendido
  const confirmBtn = document.querySelector('#overlay-alert .btn-alert-confirm');
  confirmBtn.style.display = 'none';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Entendido';
  cancelBtn.style.flex  = '1';
  document.getElementById('overlay-alert').classList.add('show');
}

function closeAlert() {
  document.getElementById('overlay-alert').classList.remove('show');
  // Restaurar botones por si fueron modificados
  const confirmBtn = document.querySelector('#overlay-alert .btn-alert-confirm');
  confirmBtn.style.display = '';
  const cancelBtn = document.querySelector('#overlay-alert .btn-alert-cancel');
  cancelBtn.textContent = 'Cancelar';
}


/* ========================
   CAT GRID GENÉRICO
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
  list.innerHTML = transactions.slice(0, 40).map(t => `
    <div class="tx-item">
      <div class="tx-icon ${t.saving ? 'saving' : ''} ${t.spend ? 'spend' : ''} ${t.cls === 'res' ? 'reserve' : ''}">
        <i class="ti ${t.icon}"></i>
      </div>
      <div class="tx-label"><p>${t.label}</p><small>${t.sub}</small></div>
      <div class="tx-amount ${t.cls}">${t.amount}</div>
    </div>`).join('');
}


/* ========================
   ANIMACIÓN CERDITO 🐷
======================== */
function animatePig() {
  flyEmoji('pig-anim', 'tab-cuenta', 'tab-ahorro');
}

function animateCoin() {
  flyEmoji('coin-anim', 'tab-cuenta', 'tab-movimientos');
}

function flyEmoji(elemId, fromTabId, toTabId) {
  const el    = document.getElementById(elemId);
  const r1    = document.getElementById(fromTabId).getBoundingClientRect();
  const r2    = document.getElementById(toTabId).getBoundingClientRect();
  const startX = r1.left + r1.width/2 - 17;
  const startY = r1.top - 20;
  const endX   = r2.left + r2.width/2 - 17;
  const endY   = r2.top - 20;

  el.style.cssText = `display:block;left:${startX}px;top:${startY}px;transition:none;transform:scale(1) rotate(0deg);opacity:1;`;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-out,transform 0.3s ease';
    el.style.left       = endX + 'px';
    el.style.top        = (Math.min(startY,endY) - 70) + 'px';
    el.style.transform  = 'scale(1.15) rotate(-15deg)';

    setTimeout(() => {
      el.style.transition = 'left 0.9s cubic-bezier(.34,1.56,.64,1),top 0.45s ease-in,transform 0.3s ease';
      el.style.top        = endY + 'px';
      el.style.transform  = 'scale(1.15) rotate(15deg)';
    }, 450);

    setTimeout(() => {
      el.style.transition = 'transform 0.2s ease';
      el.style.transform  = 'scale(1.6) rotate(0deg)';
      spawnConfetti(endX + 17, endY + 17);
      setTimeout(() => {
        el.style.transition = 'transform 0.25s ease,opacity 0.25s ease';
        el.style.transform  = 'scale(0)';
        el.style.opacity    = '0';
        setTimeout(() => { el.style.display='none'; el.style.opacity='1'; }, 280);
      }, 250);
    }, 900);
  }));
}


/* ========================
   CONFETTI
======================== */
function spawnConfetti(cx, cy) {
  const wrap = document.getElementById('confetti-wrap');
  for (let i = 0; i < 22; i++) {
    const dot = document.createElement('div');
    dot.className = 'conf-dot';
    const angle = Math.random() * 2 * Math.PI;
    const dist  = 28 + Math.random() * 70;
    const isSquare = i % 3 === 0;
    dot.style.cssText = `
      left:${cx + Math.cos(angle)*dist}px;top:${cy + Math.sin(angle)*dist}px;
      background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};
      border-radius:${isSquare?'2px':'50%'};
      width:${isSquare?'7px':'9px'};height:${isSquare?'7px':'9px'};
      animation-delay:${(Math.random()*0.3).toFixed(2)}s;
    `;
    wrap.appendChild(dot);
    setTimeout(() => dot.remove(), 1700);
  }
}


/* ========================
   CERRAR MODALES AL TOCAR FONDO
======================== */
['overlay-income','overlay-spend'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });
});