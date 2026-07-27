# `@blueprint/designer` — Visual Systems Architecture Canvas App

This is the front-end web application client for Blueprint. It is built using **Vite**, **React**, **React Flow**, and **Zustand**.

It functions as a local-first, interactive diagramming canvas where designers can compose, navigate, and structure C4 architecture diagrams.

---

## 🎨 Key Features

- **Bi-directional Sync:** Edit diagrams graphically on the canvas, or edit the underlying declarative YAML configuration directly in the side-by-side text code viewer.
- **C4 Architecture Navigation:** Double-click boundary nodes (e.g. system containers) to drill down into components, and press `Escape` to zoom back out to higher-level views.
- **Local-first Sync:** Open a local `blueprints/` folder for read/write via the File System Access API, or use the **bundled sandbox** demo shipped in the build.
- **Sandbox reset:** **Load sandbox** (startup chooser) clears IndexedDB drafts, session layout cache, and undo history, then reloads bundled diagrams fresh. The app does not auto-load the sandbox on startup.
- **Offline / PWA:** Production builds register a service worker that precaches the app shell so returning visits work offline; local IndexedDB and File System Access continue without a network. Installable via the browser “Install app” / Add to Home Screen prompt.
- **Design System Showcase:** Includes a built-in Design System Showcase page (`/design-system`) demonstrating all atomic component states, buttons, property panel attributes, and visual styles.
- **ChaosLens:** Toggle **Resilience** in the bottom toolbar to model fault injection and blast-radius impact on the active diagram (see [ChaosLens](../../../docs/guide/chaoslens.md)).

---

## 🚀 Running the Web App

### Dev Server

To start the React development server during local development:

```bash
pnpm dev
```

### Production Build

To compile the production assets (placed in `app/packages/designer/dist/`), run from the `/app` directory:

```bash
pnpm --filter @blueprint/designer build
```

To preview the compiled production build locally:

```bash
pnpm --filter @blueprint/designer preview
```

---

## 🎭 E2E Testing (Playwright)

We use Playwright for complete browser-level integration testing (verifying panel expansion, URL parameters syncing, and visual C4 navigation zoom-in/out journeys).

To execute the E2E tests, run from the `/app` directory:

```bash
pnpm --filter @blueprint/designer test:e2e
```

When E2E tests are run, they refresh PNGs under `docs/screenshots/` (product guide / journeys). Playwright also attaches a screenshot per test to the HTML report, and records a WebM video on failure (`test-results/`, uploaded in CI).

---

## 🧪 Unit Testing

To run the front-end unit test suite (using Vitest + JSDOM), run from the `/app` directory:

```bash
pnpm --filter @blueprint/designer test
```
