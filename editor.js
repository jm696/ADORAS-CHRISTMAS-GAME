let config;

const board = document.getElementById("board");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");

const sel = document.getElementById("targetSel");
const radiusInput = document.getElementById("radius");
const out = document.getElementById("out");
const toastEl = document.getElementById("toast");

const STORAGE_KEY = "adoras_hotspots_v1";

init().catch(err => {
  console.error(err);
  toast(String(err?.message || err));
});

async function init(){
  config = await fetch("config.json", { cache:"no-store" }).then(r => r.json());

  // Cargar borrador local si existe
  const draft = localStorage.getItem(STORAGE_KEY);
  if (draft){
    try {
      const parsed = JSON.parse(draft);
      if (parsed && parsed.targets) config.targets = parsed.targets;
    } catch {}
  }

  board.src = config.boardImage;
  await board.decode();

  buildSelect();
  resizeCanvas();
  window.addEventListener("resize", () => { resizeCanvas(); redraw(); });
  board.addEventListener("click", onClick);

  document.getElementById("clearSel").addEventListener("click", clearSelected);
  document.getElementById("clearAll").addEventListener("click", clearAll);
  document.getElementById("export").addEventListener("click", exportConfig);

  sel.addEventListener("change", redraw);
  radiusInput.addEventListener("change", () => {
    const t = currentTarget();
    if (!t) return;
    t.r = clamp(Number(radiusInput.value || 2.2), 0.5, 10);
    saveDraft();
    redraw();
  });

  redraw();
}

function buildSelect(){
  sel.innerHTML = "";
  for (const t of config.targets){
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.label;
    sel.appendChild(opt);
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

function onClick(ev){
  const t = currentTarget();
  if (!t) return;

  const rect = board.getBoundingClientRect();
  const xPct = ((ev.clientX - rect.left) / rect.width) * 100;
  const yPct = ((ev.clientY - rect.top) / rect.height) * 100;

  t.x = round1(xPct);
  t.y = round1(yPct);
  t.r = clamp(Number(radiusInput.value || t.r || 2.2), 0.5, 10);

  saveDraft();
  redraw();
  toast(`Marcado: ${t.label} (x=${t.x}%, y=${t.y}%)`);
}

function redraw(){
  ctx.clearRect(0,0,overlay.width,overlay.height);

  const rect = board.getBoundingClientRect();
  for (const t of config.targets){
    if (!isNumber(t.x) || !isNumber(t.y)) continue;

    const xPx = (t.x / 100) * rect.width;
    const yPx = (t.y / 100) * rect.height;
    const rPx = ((t.r ?? 2.2) / 100) * rect.width;

    ctx.beginPath();
    ctx.arc(xPx, yPx, rPx, 0, Math.PI*2);
    ctx.lineWidth = t.id === sel.value ? 4 : 2;
    ctx.strokeStyle = t.id === sel.value ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.55)";
    ctx.stroke();
  }

  const t = currentTarget();
  if (t) radiusInput.value = String(t.r ?? 2.2);

  out.textContent = JSON.stringify(config, null, 2);
}

function currentTarget(){
  return config.targets.find(t => t.id === sel.value) || config.targets[0];
}

function clearSelected(){
  const t = currentTarget();
  if (!t) return;
  t.x = null; t.y = null;
  saveDraft();
  redraw();
  toast("Borrado (seleccionado).");
}

function clearAll(){
  for (const t of config.targets){ t.x = null; t.y = null; }
  saveDraft();
  redraw();
  toast("Borrado (todo).");
}

async function exportConfig(){
  const txt = JSON.stringify(config, null, 2);
  await navigator.clipboard.writeText(txt);
  toast("Copiado. Pega esto en config.json del repo.");
}

function saveDraft(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({targets: config.targets}));
}

let toastTimer;
function toast(msg){
  toastEl.hidden = false;
  toastEl.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.hidden = true, 1400);
}

function round1(n){ return Math.round(n*10)/10; }
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function isNumber(v){ return typeof v === "number" && Number.isFinite(v); }
