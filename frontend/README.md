# Frontend - FinSmart

Cómo ejecutar en desarrollo:

```powershell
Set-Location 'D:\Proyectos Personales\finsmart\frontend'
npm install
npm run dev
```

Vite es usado como dev server. Entrypoint: `src/app/index.jsx` (después de la reorganización).

Lint:

```powershell
npm run lint
npm run lint:fix
```
# FinSmart Frontend

React 18 + Vite SPA structured with Feature-Sliced Design.

## Quick Start

```bash
npm install
npm run dev
```

The app expects the backend running on `http://localhost:5000`. Configure MSAL and API endpoints through environment variables (`.env.local`).

## Scripts

- `npm run dev` – start Vite dev server with PWA support.
- `npm run build` – production build.
- `npm run lint` / `npm run lint:fix` – ESLint checks.

## Structure Overview

- `src/app` – bootstrap, providers and global config.
- `src/pages` – route-level screens.
- `src/features` – business-specific UI logic.
- `src/widgets` – reusable composite blocks.
- `src/entities` – Zustand stores and entity models.
- `src/shared` – API client, socket layer, UI primitives, utilities.
- `src/processes` – cross-feature flows (e.g. MSAL login).
