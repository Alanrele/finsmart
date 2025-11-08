# FinSmart Architecture Overview

```
                   ┌────────────────────────────────────┐
                   │            Frontend SPA            │
                   │ (React 18 + Vite · Feature Slices) │
                   └──────────────┬─────────────────────┘
                                  │
        ┌──────────────┬──────────┼──────────┬──────────────┐
        │              │          │          │              │
     app/bootstrap   pages     features    widgets       shared
        │              │          │          │           (api/io/ui/lib)
        │              │          │          │
        └───────depends on entities (Zustand stores) and processes (MSAL/login flows)

                                  ↓ HTTP / WebSocket

┌────────────────────────────────────────────────────────────────────────┐
│                        Backend (Hexagonal)                              │
│                                                                        │
│  domain ──► app/use-cases ──► ports ──► adapters ──► infrastructure    │
│    │               │              │            │             │        │
│    │               │              │            │             ├─ config│
│    │               │              │            │             ├─ logging│
│    │               │              │            │             └─ security│
│    │               │              │            │                       │
│  Normalized   Transaction    AIAnalyzer    HTTP routes       Winston logger │
│  Transaction  Deduper        EmailIngestion   DB (Mongoose)  Env loader     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Key Flows

- **Email ingestion**: `EmailSyncService` (adapter) implements `EmailIngestionPort`, pulling Outlook messages, normalising them through parser services, and storing via the Mongoose transaction repository.
- **AI analysis**: `OpenAIAnalyzer` (adapter) implements `AIAnalyzerPort`. Application use-cases wrap it (`createAIAnalysisUseCases`) and expose functionality to HTTP routes.
- **Frontend authentication**: `useMicrosoftAuth` process handles MSAL interactions, shares state via `entities/session/model/authStore`, and features/widgets consume the stores through aliases.

## Environment

Backend expects the variables enumerated in `backend/.env.example`:

- `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `OPENAI_API_KEY`
- `AZURE_OCR_KEY`, `AZURE_OCR_ENDPOINT`
- `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`
- `FRONTEND_URL`, `PORT`, `NODE_ENV`
- Optional flags: `ALLOW_DEMO_MODE`, `CORS_ALLOWED_ORIGINS`, `LOG_LEVEL`, `ENABLE_EMAIL_SYNC`

Frontend relies on:

- `VITE_API_URL` – base API URL (without `/api` suffix)
- `VITE_GRAPH_CLIENT_ID`, `VITE_GRAPH_TENANT_ID`
- `VITE_DISABLE_SOCKET` (optional switch)

## Tooling Scripts

- `scripts/reorg-finsmart.js` – reproducible migration into the current layout.
- `scripts/check-refs.js` – static guard against legacy import paths.
- `scripts/verify-services.js` – pings `/health`, `/api/ai/health`, `/api/graph/status`.

## Testing

- Backend: Jest + Supertest (email parsers under `backend/tests/adapters/msgraph/email`).
- Frontend: linting scaffold (`npm run lint`). Component/unit test harness can be added under `src/features` using the existing structure.

## Reorganization plan (resumen)

Objetivo: reorganizar el código para seguir Arquitectura Hexagonal en el backend y Feature‑Sliced Design (FSD) en el frontend, manteniendo rutas públicas y contratos existentes.

Árbol lógico objetivo (ASCII):

```
finsmart/
├─ backend/
│  ├─ src/
│  │  ├─ domain/
│  │  │  └─ transaction/NormalizedTransaction.js
   │  │  ├─ app/
   │  │  │  ├─ services/transactionDeduper.js
   │  │  │  └─ use-cases/analyzeTransaction.js
   │  │  ├─ ports/
   │  │  │  ├─ ai/AIAnalyzerPort.js
   │  │  │  └─ mail/EmailIngestionPort.js
   │  │  ├─ adapters/
   │  │  │  ├─ http/server.js
   │  │  │  ├─ http/routes/*.js
   │  │  │  ├─ msgraph/emailSyncService.js
   │  │  │  ├─ ai/openaiClient.js
   │  │  │  └─ db/mongoose/models/*.js
   │  │  └─ infrastructure/
   │  │     ├─ config/env.js
   │  │     └─ logging/logger.js
   └─ tests/

├─ frontend/
│  ├─ src/
│  │  ├─ app/index.jsx
│  │  ├─ app/app.jsx
│  │  ├─ pages/dashboard/
│  │  ├─ features/transactions/
│  │  ├─ entities/session/model/authStore.js
│  │  └─ shared/api/base.js
│  └─ public/

├─ scripts/
│  ├─ reorg-finsmart.js
│  ├─ check-refs.js
│  └─ verify-services.js

```

Notas clave:
- Mantener los endpoints HTTP públicos sin cambios. Los adaptadores HTTP se colocan en `backend/src/adapters/http/*` pero conservan las rutas y handlers.
- El núcleo (domain + app + ports) no debe depender de Express, Mongoose u otros adaptadores.

## 12‑Factor / configuración

- Centralizar la lectura de variables de entorno en `backend/src/infrastructure/config/env.js`.
- No comprometer credenciales en el repo. Actualizar `backend/.env.example` y documentar variables requeridas.

## Scripts generados

- `scripts/reorg-finsmart.js` — ejecuta un dry-run por defecto; `--apply` para mover archivos y reescribir imports (heurístico).
- `scripts/check-refs.js` — escanea import patterns obsoletos.
- `scripts/verify-services.js` — ping de endpoints dev.

## How to run (rápido)

1. Revisión (dry-run):

```powershell
node scripts/reorg-finsmart.js
node scripts/check-refs.js
```

2. Aplicar cambios (si todo está bien):

```powershell
node scripts/reorg-finsmart.js --apply
node scripts/check-refs.js
```

3. Levantar servicios:

```powershell
npm --workspace backend install
npm --workspace frontend install
npm --workspace backend run dev
npm --workspace frontend run dev
```

## Seguimiento

Después de ejecutar la reorganización automatizada revisa manualmente imports no triviales (dinámicos, templates, require con variables). Añade notas a la tabla de mapeo si algo quedó fuera.

