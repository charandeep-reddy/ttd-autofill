# TTD Autofill

A Chrome extension that fills pilgrim details on the TTD (Tirumala Tirupati Devasthanams) online booking forms,
so you don't retype the same names and ID numbers for every booking.

Unofficial. Not affiliated with or endorsed by TTD.

## What it does

- Keeps your saved people in named lists (for example "Family"), stored only in your browser (`chrome.storage.local`).
- On the pilgrim details form, **Auto fill** fills name, age, gender, ID type and ID number for the people you tick.
- **Continue** presses the form's Continue button. **Run all** fills, then presses Continue if everything filled.
- **Payment is never pressed.** The extension has no code path for it.
- Import and export lists as JSON. Import also reads a plain array of people (`[{ "name": "...", "aadhar": "..." }]`).
- Shortcut: Ctrl+Shift+Y (Cmd+Shift+Y on Mac) runs Run all. Change it at `chrome://extensions/shortcuts`.

## Install

1. Download or clone this repository.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and choose this folder. It needs Chrome 111 or newer.
4. Open a TTD booking page and click the extension icon to open the panel.

If a TTD tab was open before you installed or reloaded the extension, reload that tab.

## How it works

The site's text fields are React-controlled, so they are filled with `document.execCommand("insertText")`.
Its dropdowns ignore scripted events, so `bridge.js` runs in the page's own JavaScript world and calls each dropdown's
own selection handler. There are no simulated mouse clicks and no `debugger` permission.

This depends on how the TTD site is built. If TTD changes its form, a field may stop filling. The panel's status line
names the row and field that failed.

## Known limits

- Choosing **Passport** makes the site open an extra NRI details form. The extension does not fill it.
- Email, city, state, country, pincode and gotram are matched by label text on pages that show them. They have not
  been verified against the live site.
- Not published on the Chrome Web Store.

## Privacy

Everything stays on your machine. The extension makes no network requests and sends no data anywhere. Exported JSON
files contain personal details such as ID numbers, so keep them private and don't commit them.
