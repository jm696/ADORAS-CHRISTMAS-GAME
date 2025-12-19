let config, found = new Set();

const board = document.getElementById("board");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");

const titleEl = document.getElementById("title");
const progressEl = document.getElementById("progress");
const targetsListEl = document.getElementById("targetsList");
const toastEl = document.getElementById("toast");

init().catch(err => {
  console.error(err);
  titleEl.textContent = "Error al cargar";
  progressEl.textContent = String(err?.message || err);
});

async function init(){
  config = await fetch("config.json", { cache: "no-store" }).then(r => r.json());

  titleEl.textContent = config.title || "Encuentra y marca";
  board.src = config.boardImage;
  await board.decode();

  renderTargets();
  resizeCanvas();
  window.addEventListener("resize", () => { resizeCanvas(); redrawMarks(); });

  board.addEventListener("click", onClickBoard);
  updateProgress();
}

function renderTargets(){
  targetsListEl.innerHTML = "";
  for (const t of config.targets){
    const row = document.createElement("div");
    row.className = "target";
    row.id = "t_" + t.id;
    row.innerHTML = `<div>${escapeHtml(t.label)}</div><div class="badge">pendiente</div>`;
    targetsListEl.appendChild(row);
  }
}

function resizeCanvas(){
  const rect = board.getBoundingClientRect();
  overlay.width = Math.round(rect.width * devicePixelRatio);
  overlay.height = Math.round(rect.height * devicePixelRatio);
  overlay.style.width = rect.width + "px";
  overlay.style.height = rect.height + "px";
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

function onClickBoard(ev){
  const rect = board.getBoundingClientRect();
  const xPct = ((ev.clientX - rect.left) / rect.width) * 100;
  const yPct = ((ev.clientY - rect.top) / rect.height) * 100;

  const candidates = config.targets.filter(t => !found.has(t.id) && isNumber(t.x) && isNumber(t.y));
  if (candidates.length === 0){
    toast("Aún no hay hotspots. Abre el editor y marca posiciones.");
    return;
  }

  const hit = candidates.find(t => inCircle(xPct, yPct, t.x, t.y, t.r ?? 2.2));

  if (hit){
    found.add(hit.id);
    markFound(hit);
    setBadge(hit.id, "encontrado");
    toast("Correcto.");
    updateProgress();
    if (found.size === candidates.length) toast("Completado.");
  } else {
    toast("No está ahí.");
  }
}

function setBadge(id, text){
  const row = document.getElementById("t_" + id);
  if (!row) return;
  row.classList.add("found");
  const badge = row.querySelector(".badge");
  if (badge) badge.textContent = text;
}

function inCircle(px, py, cx, cy, r){
  const dx = px - cx, dy = py - cy;
  return (dx*dx + dy*dy) <= (r*r);
}

function markFound(t){
  const rect = board.getBoundingClientRect();
  const xPx = (t.x / 100) * rect.width;
  const yPx = (t.y / 100) * rect.height;
  const rPx = ((t.r ?? 2.2) / 100) * rect.width;

  ctx.beginPath();
  ctx.arc(xPx, yPx, rPx, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,.92)";
  ctx.stroke();
}

function redrawMarks(){
  ctx.clearRect(0,0,overlay.width,overlay.height);
  for (const t of config.targets){
    if (found.has(t.id) && isNumber(t.x) && isNumber(t.y)) markFound(t);
  }
}

function updateProgress(){
  const configured = config.targets.filter(t => isNumber(t.x) && isNumber(t.y)).length;
  const total = config.targets.length;
  progressEl.textContent = configured < total
    ? `Hotspots configurados: ${configured}/${total}. Encontrados: ${found.size}/${configured || 0}`
    : `Encontrados: ${found.size}/${total}`;
}

let toastTimer;
function toast(msg){
  toastEl.hidden = false;
  toastEl.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.hidden = true, 1300);
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function isNumber(v){ return typeof v === "number" && Number.isFinite(v); }
