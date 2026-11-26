// Toolbar icon opens/closes the on-page panel (overlay.js); the keyboard shortcut runs "Run all".
chrome.commands.onCommand.addListener(async cmd => {
  if (cmd !== "autofill") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) chrome.tabs.sendMessage(tab.id, { type: "runall" }).catch(() => {});
});

// If the tab was open before the extension was (re)loaded it has no content script yet, so inject it and retry
// instead of failing silently.
chrome.action.onClicked.addListener(async tab => {
  const ping = () => chrome.tabs.sendMessage(tab.id, { type: "toggle" });
  try { await ping(); return; } catch (e) { /* no content script in this tab */ }
  try {
    const target = { tabId: tab.id };
    await chrome.scripting.executeScript({ target, files: ["bridge.js"], world: "MAIN" });
    await chrome.scripting.executeScript({ target, files: ["content.js", "overlay.js"] });
    await new Promise(r => setTimeout(r, 200));
    await ping();
  } catch (e) { // not a TTD page (or blocked): show a badge so the click isn't silent
    chrome.action.setBadgeBackgroundColor({ color: "#c62828" });
    chrome.action.setBadgeText({ text: "!", tabId: tab.id });
    setTimeout(() => chrome.action.setBadgeText({ text: "", tabId: tab.id }), 3000);
  }
});
