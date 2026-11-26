// On-page panel: spreadsheet of saved people + action buttons. Opened by the toolbar icon.
(() => {
  const COLS = [ // key, header, width, kind
    ["name", "Name", 150, "text", "As on ID"], ["age", "Age", 60, "number", "12–120"], ["gender", "Gender", 104, ["Male", "Female", "Transgender"]],
    ["idType", "ID type", 124, ["Aadhaar Card", "Passport"]], ["idNumber", "ID number", 140, "text", "Number"], ["email", "Email", 200, "text", "name@example.com"],
    ["city", "City", 96], ["state", "State", 132], ["country", "Country", 92], ["pincode", "Pincode", 84], ["gotram", "Gotram", 88],
  ];
  const blank = () => ({ name: "", age: "", gender: "Male", idType: "Aadhaar Card", idNumber: "", email: "", city: "", state: "", country: "", pincode: "", gotram: "", use: false });
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  let S = null, host, root, minimized = false;

  const css = `
  :host{all:initial;
    --bg:#fff;--head:#f5f6fa;--line:#dde0ea;--text:#1a2030;--muted:#505a6e;--hover:#f1f2f9;
    --accent:#3a3fa6;--accent-ink:#fff;--tint:#e8e9f8;--tint-ink:#2a2e80;--sel:#eef0fc;
    --ok:#13693a;--ok-bg:#e4f4ea;--err:#b3261e;--err-bg:#fce8e6;--ring:#3a3fa6;
    --shadow:0 1px 2px rgba(20,24,50,.10),0 14px 36px rgba(20,24,50,.24)}
  *{box-sizing:border-box}
  .panel{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;width:min(1440px,98vw);
    background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);
    font:13px/1.45 ui-sans-serif,system-ui,-apple-system,"SF Pro Text","Segoe UI",Roboto,sans-serif;
    font-feature-settings:"tnum" 1;animation:in .16s ease-out}
  @keyframes in{from{opacity:0;transform:translate(-50%,-6px)}}
  @media (prefers-reduced-motion:reduce){.panel{animation:none}}
  button,select,input{font:inherit;color:inherit}
  :focus-visible{outline:2px solid var(--ring);outline-offset:2px}
  .head{display:flex;justify-content:space-between;align-items:center;padding:14px 16px 10px}
  h1{margin:0;font-size:16px;font-weight:650;letter-spacing:-.005em}
  .status{display:inline-flex;align-items:center;gap:7px;margin-top:3px;font-size:12.5px;color:var(--muted)}
  .status:before{content:"";width:7px;height:7px;border-radius:50%;background:var(--ok)}
  .status.err{color:var(--err)}.status.err:before{background:var(--err)}.status.busy:before{background:var(--accent)}
  .win{display:flex;gap:4px}
  .ic{width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:var(--muted);cursor:pointer;font-size:15px}
  .ic:hover{background:var(--hover);color:var(--text)}
  .bar{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;justify-content:space-between;padding:4px 16px 12px;border-bottom:1px solid var(--line)}
  .lists,.acts{display:flex;gap:4px;align-items:center;flex-wrap:wrap}
  .acts{gap:8px}
  select{height:32px;padding:0 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg)}
  #lsel{min-width:140px;font-weight:600;margin-right:4px}
  .t{height:32px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--muted);font-weight:550;cursor:pointer}
  .t:hover{background:var(--hover);color:var(--text)}.t.del:hover{background:var(--err-bg);color:var(--err)}
  .b{height:36px;padding:0 16px;border:1px solid transparent;border-radius:9px;font-weight:600;cursor:pointer;transition:background .12s}
  .b.tonal{background:var(--tint);color:var(--tint-ink)}.b.tonal:hover{filter:brightness(.96)}
  .b.main{background:var(--accent);color:var(--accent-ink)}.b.main:hover{filter:brightness(1.08)}
  .b.ghost{border-color:var(--line);background:var(--bg)}.b.ghost:hover{background:var(--hover)}
  .wrap{overflow:auto;max-height:46vh}
  table{border-collapse:separate;border-spacing:0;table-layout:fixed}
  th{position:sticky;top:0;z-index:1;text-align:left;padding:9px 12px;background:var(--head);color:var(--muted);font-size:12px;font-weight:600;border-bottom:1px solid var(--line)}
  th:first-child,td:first-child{padding-left:16px;padding-right:0}
  td{padding:4px 4px;border-bottom:1px solid var(--line);vertical-align:middle}
  tbody tr{cursor:pointer}tbody tr:hover td{background:var(--hover)}
  tbody tr.sel td{background:var(--sel)}tbody tr.sel td:first-child{box-shadow:inset 3px 0 0 var(--accent)}
  td input[type=number]{-moz-appearance:textfield}td input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  td input[type=checkbox]{width:17px;height:17px;accent-color:var(--accent);cursor:pointer;margin:0}
  td input:not([type=checkbox]),td select{width:100%;height:32px;padding:0 8px;border:1px solid transparent;border-radius:6px;background:transparent}
  td input:not([type=checkbox])::placeholder{color:var(--muted);opacity:.6}
  td input:not([type=checkbox]):hover,td select:hover{border-color:var(--line)}
  td input:not([type=checkbox]):focus,td select:focus{border-color:var(--accent);background:var(--bg);outline:none;box-shadow:0 0 0 2px var(--tint)}
  .row-act{white-space:nowrap;text-align:right;padding-right:12px}
  .row-act button{width:28px;height:28px;border:0;border-radius:7px;background:transparent;color:var(--muted);cursor:pointer}
  .row-act button:hover{background:var(--tint);color:var(--tint-ink)}.row-act .x:hover{background:var(--err-bg);color:var(--err)}
  .empty{padding:28px 16px;text-align:center;color:var(--muted)}
  .foot{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 16px;color:var(--muted);font-size:12px}
  .min .body{display:none}.min .head{padding-bottom:14px}`;

  const storage = () => chrome.storage.local.set({ lists: S.lists, active: S.active });
  const people = () => S.lists[S.active];

  async function load() {
    const d = await chrome.storage.local.get(["lists", "active", "pilgrims"]);
    let lists = d.lists || { Default: d.pilgrims && d.pilgrims.length ? d.pilgrims : [{ ...blank(), use: true }] }; // migrate older data
    for (const k in lists) lists[k] = lists[k].map(p => ({ ...blank(), ...p }));
    const active = lists[d.active] ? d.active : Object.keys(lists)[0];
    if (!lists[active].some(p => p.use)) lists[active][0].use = true;
    S = { lists, active };
  }

  const $ = id => root.getElementById(id);
  function say(t, err, busy) { const s = $("status"); s.textContent = t; s.className = "status" + (err ? " err" : busy ? " busy" : ""); }

  function render() {
    $("lsel").innerHTML = Object.keys(S.lists).map(n => `<option${n === S.active ? " selected" : ""}>${esc(n)}</option>`).join("");
    $("tbody").innerHTML = people().length ? people().map((p, i) => `<tr data-i="${i}" class="${p.use ? "sel" : ""}">` +
      `<td><input type="checkbox" data-use aria-label="Use ${esc(p.name || "person " + (i + 1))} for this booking"${p.use ? " checked" : ""}></td>` +
      COLS.map(([k, label, w, kind, ph]) => Array.isArray(kind)
        ? `<td><select data-k="${k}" aria-label="${label}">${kind.map(o => `<option${o === p[k] ? " selected" : ""}>${o}</option>`).join("")}</select></td>`
        : `<td><input data-k="${k}" aria-label="${label}" placeholder="${ph || ""}" ${kind === "number" ? 'type="number" min="12" max="120" inputmode="numeric"' : ""} value="${esc(p[k])}"></td>`).join("") +
      `<td class="row-act"><button data-a="up" aria-label="Move up" title="Move up">↑</button><button data-a="down" aria-label="Move down" title="Move down">↓</button>` +
      `<button data-a="dup" aria-label="Duplicate" title="Duplicate">⧉</button><button data-a="rm" class="x" aria-label="Remove" title="Remove">✕</button></td></tr>`).join("")
      : `<tr><td class="empty" colspan="13">No one saved in this list yet. Add a person to fill bookings in one click.</td></tr>`;
    const n = people().filter(p => p.use).length;
    say(n ? `Ready · ${n} selected` : "Select at least one person to fill", !n);
  }

  function build() {
    host = document.createElement("div"); host.id = "ttd-autofill-host";
    root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${css}</style><div class="panel" id="panel" role="dialog" aria-label="TTD Autofill">
      <div class="head"><div><h1>TTD Autofill</h1><div class="status" id="status" role="status" aria-live="polite"></div></div>
        <div class="win"><button class="ic" id="min" aria-label="Minimize" title="Minimize">–</button><button class="ic" id="close" aria-label="Close" title="Close">✕</button></div></div>
      <div class="body">
        <div class="bar">
          <div class="lists"><select id="lsel" aria-label="Saved list"></select>
            <button class="t" id="add">Add person</button><button class="t" id="new">New list</button><button class="t" id="ren">Rename</button>
            <button class="t del" id="del">Delete list</button><button class="t" id="exp">Export</button><button class="t" id="imp">Import</button>
            <input type="file" id="file" accept=".json" hidden></div>
          <div class="acts"><button class="b ghost" id="save">Save</button><button class="b tonal" id="fill">Auto fill</button>
            <button class="b tonal" id="cont">Continue</button><button class="b main" id="all">Run all</button></div></div>
        <div class="wrap"><table id="tbl"><colgroup id="cols"></colgroup><thead><tr><th></th>${COLS.map(c => `<th>${c[1]}</th>`).join("")}<th></th></tr></thead><tbody id="tbody"></tbody></table></div>
        <div class="foot"><span>Click a row to select it. Run all fills the form, then presses Continue.</span><span>Payment is never pressed.</span></div>
      </div></div>`;
    host.style.display = "none"; // toggle() shows it
    document.documentElement.appendChild(host);
    const widths = [44, ...COLS.map(c => c[2]), 112];
    $("cols").innerHTML = widths.map(w => `<col style="width:${w}px">`).join("");
    $("tbl").style.width = widths.reduce((a, b) => a + b, 0) + "px";
    const tb = $("tbody");

    tb.addEventListener("input", e => { const tr = e.target.closest("tr"), k = e.target.dataset.k; if (tr && k) { people()[tr.dataset.i][k] = e.target.value; storage(); } });
    tb.addEventListener("click", e => {
      const tr = e.target.closest("tr[data-i]"); if (!tr) return;
      const i = +tr.dataset.i, a = people(), act = e.target.dataset.a;
      if (act) {
        if (act === "up" && i > 0) [a[i - 1], a[i]] = [a[i], a[i - 1]];
        if (act === "down" && i < a.length - 1) [a[i + 1], a[i]] = [a[i], a[i + 1]];
        if (act === "dup") a.splice(i + 1, 0, { ...a[i] });
        if (act === "rm") a.splice(i, 1);
      } else if (e.target.dataset.use !== undefined) a[i].use = e.target.checked;
      else if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return; // editing, not selecting
      else a[i].use = !a[i].use;
      storage(); render();
    });

    $("lsel").onchange = e => { S.active = e.target.value; storage(); render(); };
    $("add").onclick = () => { people().push(blank()); storage(); render(); };
    $("new").onclick = () => { const n = (prompt("Name for the new list (e.g. Family)") || "").trim(); if (!n || S.lists[n]) return; S.lists[n] = [{ ...blank(), use: true }]; S.active = n; storage(); render(); };
    $("ren").onclick = () => {
      const n = (prompt("Rename list", S.active) || "").trim(); if (!n || n === S.active || S.lists[n]) return;
      S.lists = Object.fromEntries(Object.entries(S.lists).map(([k, v]) => [k === S.active ? n : k, v])); S.active = n; storage(); render();
    };
    $("del").onclick = () => {
      if (Object.keys(S.lists).length < 2) return say("A list is required. Create another before deleting this one.", true);
      if (!confirm(`Delete list "${S.active}"?`)) return;
      delete S.lists[S.active]; S.active = Object.keys(S.lists)[0]; storage(); render();
    };
    $("exp").onclick = () => { // plain JSON with personal details: keep the file private
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(S.lists, null, 2)], { type: "application/json" }));
      a.download = "ttd-autofill-lists.json"; a.click();
    };
    $("imp").onclick = () => $("file").click();
    // Accepts our own export ({listName: [people]}) and the plain array other TTD tools export ([{name, aadhar, ...}]).
    const KEYS = ["name", "age", "gender", "idType", "idNumber", "email", "city", "state", "country", "pincode", "gotram", "use"];
    const person = p => {
      const q = { ...blank() };
      for (const k of KEYS) if (p[k] !== undefined && p[k] !== null) q[k] = typeof p[k] === "boolean" ? p[k] : String(p[k]).trim();
      if (!q.idNumber && p.aadhar) q.idNumber = String(p.aadhar).replace(/\s+/g, ""); // "aadhar" -> ID number
      if (p.aadhar && !p.idType) q.idType = "Aadhaar Card";
      if (!["Male", "Female", "Transgender"].includes(q.gender)) q.gender = blank().gender;
      return q;
    };
    $("file").onchange = async e => {
      const f = e.target.files[0];
      try {
        const data = JSON.parse(await f.text());
        const groups = Array.isArray(data) ? { [f.name.replace(/\.json$/i, "") || "Imported"]: data } : data;
        let last = null, count = 0;
        for (const [n, arr] of Object.entries(groups)) {
          if (!Array.isArray(arr) || !arr.every(x => x && typeof x === "object")) continue;
          const name = S.lists[n] ? n + " (imported)" : n;
          S.lists[name] = arr.map(person);
          if (Array.isArray(data) && S.lists[name].length) S.lists[name][0].use = true; // plain arrays carry no selection
          last = name; count += arr.length;
        }
        if (!last) throw new Error("no people found");
        S.active = last; storage(); render(); say(`Imported ${count} ${count === 1 ? "person" : "people"} into "${last}".`);
      } catch { say("That file isn't a TTD Autofill export or a list of people.", true); }
      e.target.value = "";
    };
    $("save").onclick = () => { storage(); say("Saved"); };
    $("min").onclick = () => { minimized = !minimized; $("panel").classList.toggle("min", minimized); };
    $("close").onclick = () => { host.style.display = "none"; };

    const run = type => async () => {
      const chosen = people().filter(p => p.use);
      if (type !== "continue") {
        if (!chosen.length) return say("Select at least one person first.", true);
        const bad = chosen.find(p => !p.name.trim() || !(p.age >= 12 && p.age <= 120) || !String(p.idNumber).trim());
        if (bad) return say(`${bad.name || "A selected person"} needs a name, an age from 12 to 120, and an ID number.`, true);
      }
      storage(); say("Filling…", false, true);
      const r = await handle(type);
      if (r.missed.length) return say("Check: " + r.missed.join("; "), true);
      say(type === "continue" ? (r.continued ? "Continue pressed." : "No Continue button on this page.")
        : r.continued ? "Filled, Continue pressed." : "Filled. Review, then press Continue.");
    };
    $("fill").onclick = run("autofill"); $("cont").onclick = run("continue"); $("all").onclick = run("runall");
  }

  async function toggle() {
    await load();
    if (!host) build();
    host.style.display = host.style.display === "none" ? "block" : "none";
    if (host.style.display === "block") render();
  }
  chrome.runtime.onMessage.addListener(m => { if (m.type === "toggle") toggle(); });
})();
