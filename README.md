# Interior Design

A static web app for interior design: multi-project floor plans (upload or draw/drag rooms), furniture placement (image, note, or link), and per-project budgeting. Data is stored in the browser (IndexedDB) and autosaves.

## Features

- **Projects** – Create and open multiple projects.
- **Floor plan** – Upload a floor plan image or build one by drawing rectangles or dragging room blocks (with dimensions and square footage). Multi-floor support.
- **Furniture** – Add items by image upload, typed note, or website link; place and drag them on the canvas. Each item can be linked to a budget line.
- **Budget** – Per-project budget tab with line items, manual price entry, and subtotal. Lines can be added manually or created when you add furniture.
- **Apple-like UI** – Clean layout, system fonts, light grey background, and minimal chrome.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Deploy to GitHub Pages

1. Push the repo to GitHub (e.g. `github.com/yourusername/interior-design`).
2. In the repo go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main` (or `master`); the workflow will build and deploy.

The app will be at **https://yourusername.github.io/interior-design/**.

To build locally: `npm run build` (output in `dist/`).

## Tech

- Vite + vanilla JS
- IndexedDB via [idb](https://www.npmjs.com/package/idb)
- No backend; optional serverless “fetch price from link” can be added later.
