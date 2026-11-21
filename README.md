<div align="center">

<img src="public/icon.svg" alt="Cloudpad" width="96">

# Cloudpad

A minimal offline-first Markdown notepad that runs entirely in your browser.

[![Live](https://img.shields.io/badge/live-cloudpad.hackerslash.dev-555?style=flat-square)](https://cloudpad.hackerslash.dev)
![React 18](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-offline-5A0FC8?style=flat-square&logo=pwa&logoColor=white)

</div>

---

No account, no cloud: notes are stored in your browser's IndexedDB and the app keeps working offline as an installable PWA. Use it at [cloudpad.hackerslash.dev](https://cloudpad.hackerslash.dev).

## Features

- Multiple tabs, pinned notes, rename and search
- Live Markdown preview
- Export a note as `.md` or a rendered PDF
- Workspace backup and restore as JSON; open or drag-and-drop `.md`/`.txt` files
- Keyboard shortcuts: `⌘/Ctrl` + `N` new, `O` open, `W` close tab, `K` search, `P` preview, `E` export, `D` dark mode, `/` shortcut list
- Adjustable theme, typography, sidebar position, density, tab style, width and accent color
- Guided tour on first run

## Quick start

```bash
npm install
npm run dev        # dev server
npm run build      # production build to dist/
npm run preview    # serve the build
```

## Tech stack

React 18, Vite, `vite-plugin-pwa` (Workbox), IndexedDB, `@react-pdf/renderer` for PDF export.
