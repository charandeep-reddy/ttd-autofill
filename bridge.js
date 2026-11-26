// Runs in the PAGE's own JavaScript world (manifest "world": "MAIN"), because the site's dropdowns are React
// components and only page-world code can reach them. Receives a request from content.js, calls the dropdown's own
// selectedItem() with the matching option, and replies. No mouse clicks, no debugger permission.
document.addEventListener("ttd-pick", e => {
  let ok = false, id = null;
  try {
    const req = JSON.parse(e.detail); id = req.id;
    const el = document.querySelector(`[data-ttd-target="${req.mark}"]`);
    const key = el && Object.keys(el).find(k => k.startsWith("__reactFiber"));
    let f = key && el[key];
    while (f && !(f.memoizedProps && "dropdown" in f.memoizedProps && typeof f.memoizedProps.selectedItem === "function")) f = f.return;
    if (f) {
      const item = (f.memoizedProps.list || []).find(o => String(o.title).toLowerCase() === String(req.title).toLowerCase());
      if (item) { f.memoizedProps.selectedItem(item); ok = true; }
    }
  } catch (_) { /* reported as ok:false; content.js falls back to reporting the field */ }
  document.dispatchEvent(new CustomEvent("ttd-pick-done", { detail: JSON.stringify({ id, ok }) }));
});
