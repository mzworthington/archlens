# `@archlens/designer` - Visual Systems Architecture Canvas App

This is the front-end web application client for **ArchLens Canvas**. It is built using **Vite**, **React**, **React Flow**, and **Zustand**.

It functions as a local-first, interactive diagramming canvas where designers can compose, navigate, and structure C4 architecture diagrams.

---

## 🎨 Key Features

- **Bi-directional Sync:** Edit diagrams graphically on the canvas, or edit the underlying declarative YAML configuration directly in the side-by-side text code viewer.
- **C4 Architecture Navigation:** Double-click boundary nodes (e.g. system containers) to drill down into components, and press `Escape` to zoom back out to higher-level views.
- **Local-first Sync:** Open a local `blueprints/` folder for read/write via the File System Access API, or open the **Golden Paths** sample workspace shipped in the build (`samples/golden-paths/`).
- **Bundled demo:** **Open demo blueprints** loads the full checked-in `blueprints/` tree (all peer context diagrams) read-only. **Open folder** uses the File System Access API for a writable workspace. Deep links like `/workspace/backstage` auto-load the bundled demo.
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
pnpm --filter @archlens/designer build
```

To preview the compiled production build locally:

```bash
pnpm --filter @archlens/designer preview
```

---

## 🎭 E2E Testing (Playwright)

We use Playwright for complete browser-level integration testing (verifying panel expansion, URL parameters syncing, and visual C4 navigation zoom-in/out journeys).

To execute the E2E tests, run from the `/app` directory:

```bash
pnpm --filter @archlens/designer test:e2e
```

When E2E tests are run, Playwright attaches a screenshot per test to the HTML report, and records a WebM video on failure (`test-results/`, uploaded in CI).

Record product-guide GIFs (opt-in; `ffmpeg` from `mise install`):

```bash
mise install
pnpm record:docs-media
```

Writes `docs/screenshots/chaoslens.gif`, `tracelens.gif`, and `canvas-tour.gif`. Static PNGs for dense UI (chooser, Mermaid merge) remain in `docs/screenshots/` and are referenced from [canvas.md](../../../docs/guide/canvas.md).

---

## 🧪 Unit Testing

To run the front-end unit test suite (using Vitest + JSDOM), run from the `/app` directory:

```bash
pnpm --filter @archlens/designer test
```
