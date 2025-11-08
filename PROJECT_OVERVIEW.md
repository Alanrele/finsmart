# FinSmart Project Overview

This document condenses the key facts about the FinSmart project so an AI or new contributor can quickly understand what the app does, how it is built, and which tools and integrations are already in place.

## 1. Product Snapshot
- Progressive Web Application (PWA) that helps users analyse personal finances.
- Integrates with Microsoft Graph to read BCP bank notification emails and turn them into structured transactions.
- Provides AI-powered insights via OpenAI and document parsing via Azure Cognitive Services (OCR).
- Offers dashboards, charts, chat-based assistance, budgeting tools, and email sync management from a single UI.

## 2. Repository Structure
```
backend/    Node.js + Express API, business logic, integrations, MongoDB models
frontend/   React 18 + Vite SPA/PWA with Tailwind, Zustand stores, MSAL auth flows
infra/      Infrastructure-as-code, deployment artefacts
scripts/    Utility scripts (deployment checks, Railway helpers, etc.)
.azure/     Azure pipeline/config materials
```
Large Markdown files in the root (e.g. `DEPLOYMENT.md`, `RAILWAY_DIAGNOSTIC.md`) provide deployment guides, troubleshooting notes, and historical change logs.

## 3. Backend (Node.js / Express)
- Entry point: `backend/src/server.js` (Express app + Socket.IO server).
- Key responsibilities:
  - REST APIs grouped under `/api` for authentication (`authRoutes`), Microsoft Graph connectivity (`graphRoutes`), AI analysis (`aiRoutes`), and finance data (`financeRoutes`).
  - MongoDB connectivity using Mongoose models (`userModel`, `transactionModel`). Default connection string is `mongodb://localhost:27017/finsmart`, configurable via `MONGODB_URI`.
  - Authentication middleware that accepts both FinSmart JWTs and raw Microsoft access tokens, validates/refreshes them, and performs token clean-up if corruption is detected.
  - Email ingestion pipeline (`src/services/emailSyncService.js`) that pulls Outlook messages, filters BCP transactional emails, parses them (template-based + fallback parsers under `src/lib/email/bcp`), deduplicates transactions, and persists results.
  - AI analysis service (`src/services/aiAnalysisService.js`) that calls OpenAI when configured with `OPENAI_API_KEY`, with graceful fallbacks when AI is unavailable.
  - Logging via Winston (`src/config/logger.js`) with console and file transports plus HTTP request logging.
  - Security middleware: Helmet (environment-specific config), CORS whitelist via `CORS_ALLOWED_ORIGINS`, rate limiting on auth endpoints, and JSON body size limits.
  - Socket.IO channel mounted at `/api/socket.io` for real-time updates.
- Important utilities:
  - `src/utils/tokenCleanup.js` removes malformed tokens at startup and exposes helpers used by the auth middleware.
  - `src/domain/NormalizedTransaction` (Zod schema) ensures parsed transactions meet validation rules before persistence.
  - `src/services/transactionDeduper.js` (referenced by graph routes) handles duplicate suppression.
- Testing: Jest + Supertest. Current suites focus on the email parser (`backend/tests/email/bcp`). Requires Node >= 20 and npm >= 10.

### Backend Dependencies (selected)
`express`, `mongoose`, `socket.io`, `cors`, `helmet`, `express-rate-limit`, `express-validator`, `jsonwebtoken`, `bcryptjs`, `axios`, `multer`, `winston`, `zod`, Azure SDKs (`@azure/msal-node`, `@microsoft/microsoft-graph-client`, `@azure/cognitiveservices-computervision`), `openai`. Dev tooling includes `jest`, `supertest`, `nodemon`, `cross-env`.

### Environment Variables (`backend/.env.example`)
- `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `OPENAI_API_KEY`
- `AZURE_OCR_KEY`, `AZURE_OCR_ENDPOINT`
- `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`
- `FRONTEND_URL`, `PORT`, `NODE_ENV`
- Additional runtime flags used in code: `ALLOW_DEMO_MODE`, `CORS_ALLOWED_ORIGINS`, `LOG_LEVEL`, `MAX_TX_AMOUNT`, etc.

## 4. Frontend (React / Vite)
- Entry points: `frontend/src/main.jsx` (bootstraps MSAL, BrowserRouter, service worker) and `frontend/src/App.jsx` (routes, protected areas, layout).
- Authentication handled with MSAL (`@azure/msal-browser`, `@azure/msal-react`) using config in `src/config/msalConfig.js`. Redirect URIs adapt to Railway vs localhost through `src/config/railway.js`.
- State management via Zustand stores:
  - `src/stores/authStore.js`: session management, persistence, token handling.
  - `src/stores/appStore.js`: UI theme, dashboard data, AI analysis cache, notifications.
- UI stack: Tailwind CSS, Framer Motion for animations, Recharts for visualisations, React Hot Toast for notifications, Lucide icons, and a rich component set (`Dashboard`, `Transactions`, `ChatIA`, `EmailSyncControl`, `FinancialTools`, `WelcomeScreen`, etc.).
- Networking: centralized Axios client (`src/services/api.js`) that appends `/api` to backend base URL, attaches JWT tokens, handles 401 responses, and exposes helper methods for all backend routes (auth, finance, AI, Graph, sync operations).
- Real-time functions use `socket.io-client` (`src/services/socket`). PWA support via `vite-plugin-pwa` and `registerSW` hook in `main.jsx`.
- Error resilience: custom `ErrorBoundary`, extensive logging around MSAL bootstrapping, and UI notifications for sync/SSL/MS Graph status.

### Frontend Dependencies (selected)
`react`, `react-router-dom`, `axios`, `zustand`, `socket.io-client`, `framer-motion`, `recharts`, `react-hot-toast`, `lucide-react`, `@azure/msal-browser`, `@azure/msal-react`, `date-fns`, `cheerio`. Tooling: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`, `eslint` (+ React hooks & refresh plugins), `vite-plugin-pwa`.

### Build & Scripts
- `npm run dev` (Vite dev server), `npm run build` (production build), `npm run preview`, `npm run lint`, `npm run lint:fix`.
- Node >= 20 / npm >= 10 required.

## 5. Integrations & External Services
- **Microsoft Graph**: OAuth via MSAL on frontend; backend stores access tokens, validates via Graph API, and syncs Outlook mail from BCP senders. Routes for connect, verify, toggle sync, reprocess, etc.
- **Azure Cognitive Services**: OCR support for parsing attachments/images (config placeholders provided).
- **OpenAI**: Generates financial insights and chat responses. Backend gateway handles outages with deterministic fallbacks.
- **MongoDB**: Persistence for users and transactions via Mongoose schemas. Assumes Atlas or local instance.
- **Socket.IO**: Broadcast connection state, dashboard updates, or sync progress.

## 6. Data & Domain
- `User` model stores credentials, Microsoft account linkage, token metadata, preferences (theme, currency, notifications), sync flags, timestamps.
- `Transaction` model captures normalized financial data (amount, currency, type, category, merchant, channel, operation number, balance, raw email text, AI analysis). Indexes optimised for querying by user, date, category, type.
- Email parser output conforms to `NormalizedTransactionSchema` to guarantee consistent shape before persistence or AI processing.

## 7. Deployment & Ops Notes
- Multiple guides in root: `DEPLOYMENT.md`, `DESPLIEGUE_RAILWAY.md`, `RAILWAY_DIAGNOSTIC.md`, `AZURE_AD_SETUP.md`, etc.
- Dockerfiles for backend/frontend and alternative builds (`Dockerfile.debian`, `Dockerfile.simple`).
- Railway deployment scripts (`deploy-to-railway.sh`, `setup-railway-vars.sh`, `check-railway.js`, `check-services.js`).
- Azure pipeline artefacts in `.azure/` and GitHub workflow configs in `.github/`.
- Health checks: `/health` endpoint on backend, plus `/ai/health`, `/graph/status`, etc.

## 8. Testing & Quality
- Backend tests executed with `npm test` (Jest). Focus areas include BCP email parsing logic with fixtures and merge strategies.
- Logging and debug panels exist both server- and client-side (e.g. `AuthDebugPanel`, `SocketDebugPanel`, `EmailParserTester`) to support manual QA.
- ESLint enforced on frontend. Backend currently lacks lint config but uses Winston logs and structured error handling.

## 9. Getting Started (Local)
1. Install Node.js >= 20 (required for both backend and frontend) and MongoDB.
2. Copy `backend/.env.example` to `.env` and fill secrets (JWT keys, Mongo URI, Microsoft/Azure/OpenAI credentials).
3. Install dependencies in `backend/` and `frontend/` (`npm install`).
4. Run backend: `npm run dev` (uses nodemon) or `npm start`.
5. Run frontend: `npm run dev` (Vite on port 3001 by default).
6. Optional: configure MSAL redirect URIs in Azure AD app to match development and Railway URLs.

## 10. Useful Entry Points for Exploration
- Backend routing logic: `backend/src/routes/*.js`.
- Email parsing pipeline: `backend/src/lib/email/bcp/` and `backend/src/services/emailParserService.js`.
- AI analysis logic: `backend/src/services/aiAnalysisService.js` (and tests).
- Frontend dashboards and analytics: `frontend/src/components/Dashboard.jsx`, `Transactions.jsx`, `Analysis.jsx`, `EnhancedAIAssistant.jsx`.
- Auth flow UI: `frontend/src/components/LoginDialog.jsx`, `AuthCallback.jsx`, `OutlookConnect.jsx`.

Use this document as the high-level map before diving into the specialised Markdown guides included with the repository.
