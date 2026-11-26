// TTD Autofill content script. Fills forms and presses Continue on request. Never touches payment.
// overlay.js shares this scope (same isolated world): it calls handle() and wait().
const wait = ms => new Promise(r => setTimeout(r, ms));
// Poll a condition every 10ms (up to maxMs) instead of sleeping a fixed time: returns as soon as it's true.
async function until(cond, maxMs = 600) {
  for (let t = 0; t < maxMs; t += 10) { if (cond()) return true; await wait(10); }
  return cond();
}
const same = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

// Text inputs are React-controlled and reject plain .value writes; execCommand fires real input events.
// Verified and retried: the site sometimes re-renders a field right after it is filled.
async function setText(el, value) {
  value = String(value);
  for (let t = 0; t < 3; t++) {
    if (el.value === value) return true;
    el.focus(); el.select();
    document.execCommand("insertText", false, value);
    if (await until(() => el.value === value, 120)) return true;
  }
  return el.value === value;
}

// Dropdowns are React components that ignore scripted clicks. bridge.js (page world) selects the option through the
// component's own handler; we ask it with a DOM event and wait for the answer.
let seq = 0;
function askBridge(el, title) {
  return new Promise(res => {
    const id = ++seq, mark = "m" + id;
    el.setAttribute("data-ttd-target", mark);
    const done = ok => { document.removeEventListener("ttd-pick-done", on); el.removeAttribute("data-ttd-target"); clearTimeout(timer); res(ok); };
    const on = e => { try { const d = JSON.parse(e.detail); if (d.id === id) done(d.ok); } catch (_) { /* not ours */ } };
    const timer = setTimeout(() => done(false), 2000); // bridge not loaded (e.g. tab opened before install)
    document.addEventListener("ttd-pick-done", on);
    document.dispatchEvent(new CustomEvent("ttd-pick", { detail: JSON.stringify({ id, mark, title }) }));
  });
}

async function pick(input, text) { // choose a dropdown option, verify the input shows it
  for (let t = 0; t < 3; t++) {
    if (same(input.value, text)) return true;
    await askBridge(input, text);
    if (await until(() => same(input.value, text), 500)) return true; // returns as soon as the site re-renders
  }
  return same(input.value, text);
}

// Extra fields (email, city, ...) are matched by label/name text, since only the pilgrim rows are mapped exactly.
const EXTRA = { email: /e-?mail/i, city: /city|town/i, state: /state/i, country: /country/i, pincode: /pin\s*code|zip|postal/i, gotram: /gotr/i };
const PILGRIM_NAMES = new Set(["fname", "age", "gender", "photoIdType", "idProofNumber"]);
const labelOf = el => [el.name, el.id, el.placeholder, el.getAttribute("aria-label"), el.parentElement?.innerText?.slice(0, 40)].join(" ");

async function fillExtras(p, missed) {
  for (const [key, re] of Object.entries(EXTRA)) {
    if (!p[key]) continue;
    const el = [...document.querySelectorAll("input,textarea")]
      .find(e => !PILGRIM_NAMES.has(e.name) && e.type !== "hidden" && !e.disabled && re.test(labelOf(e)));
    if (!el || el.value) continue; // not on this page, or already filled
    const ok = el.readOnly ? await pick(el, p[key]) : await setText(el, p[key]);
    if (!ok) missed.push(`${key} "${p[key]}"`);
  }
}

const rowsOf = n => [...document.querySelectorAll(`input[name="${n}"]`)]; // one per ticket, DOM order

// Fill one row. Safe to repeat: every step is skipped when the field already holds the right value.
async function fillRow(i, p) {
  const who = `row ${i + 1}`, bad = [];
  // Re-query each field every time: the form can re-render between steps.
  if (!await setText(rowsOf("fname")[i], p.name)) bad.push(`${who}: name`);
  if (!await setText(rowsOf("age")[i], p.age)) bad.push(`${who}: age`);
  if (!await pick(rowsOf("gender")[i], p.gender)) bad.push(`${who}: gender "${p.gender}"`);
  if (!await pick(rowsOf("photoIdType")[i], p.idType)) bad.push(`${who}: ID type "${p.idType}"`);
  const idEl = rowsOf("idProofNumber")[i]; // stays disabled until an ID type is chosen
  await until(() => !idEl.disabled, 1000);
  if (!await setText(idEl, p.idNumber)) bad.push(`${who}: ID number`);
  return bad;
}

async function fill() {
  const d = await chrome.storage.local.get(["lists", "active"]);
  const pilgrims = ((d.lists || {})[d.active] || []).filter(p => p.use); // only the ones ticked in the panel
  const count = rowsOf("fname").length;
  const missed = [];
  if (count && pilgrims.length !== count) missed.push(`${pilgrims.length} selected but form has ${count} row(s)`);
  // Two passes. The site's dropdown handlers work from a snapshot of the form, so setting one row can in theory
  // overwrite another; the second pass re-checks every field and repairs anything that didn't stick.
  let bad = [];
  for (let pass = 0; pass < 2; pass++) {
    bad = [];
    for (let i = 0; i < count; i++) {
      if (!pilgrims[i]) { if (pass === 1) bad.push(`row ${i + 1}: no saved pilgrim`); continue; }
      bad.push(...await fillRow(i, pilgrims[i]));
    }
  }
  missed.push(...bad);
  if (pilgrims[0]) await fillExtras(pilgrims[0], missed); // contact details come from the first selected person
  return { missed, filled: count };
}

function pressContinue() { // refuses anything that looks like payment
  const btn = [...document.querySelectorAll("button")].find(b => /^continue$/i.test(b.innerText.trim()));
  if (!btn || /pay/i.test(btn.innerText)) return false;
  btn.click();
  return true;
}

async function handle(type) {
  if (type === "continue") return { missed: [], filled: 0, continued: pressContinue() };
  const r = await fill();
  if (type === "runall" && !r.missed.length) r.continued = pressContinue();
  return r;
}

chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (!["autofill", "continue", "runall"].includes(msg.type)) return;
  handle(msg.type).then(reply);
  return true;
});
