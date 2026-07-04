# Plan de Refactor — Modernización visual y reorganización

> Generado a partir de `DOC/GUIA_DE_ESTILO.md` y el mapeo del proyecto (frontend React + Vite + Tailwind 3).
> Fuente de verdad visual: GUIA_DE_ESTILO ("app de campo con acabado iOS") + paleta oficial:
>
> | Token | Hex | Rol |
> |---|---|---|
> | `sand` | `#D4CBB0` | Beige claro / arena — fondos teñidos, superficies suaves |
> | `taupe` | `#A79E82` | Taupe / beige oscuro — texto secundario sobre claro, bordes con tinte |
> | `sage` | `#A6C0B4` | Verde salvia — éxito / positivo / acentos suaves |
> | `primary` (teal) | `#3F7079` | Azul petróleo — CTA, enlaces, elementos primarios (AA sobre blanco: 4.9:1) |

## Estado actual (mapeo)

- `frontend/src/components/` — 35 componentes planos (páginas, layout, debug y comunes mezclados).
- `frontend/src/{config,hooks,services,stores,utils}` — ya existen y están bien delimitados.
- Paleta antigua duplicada en 3 sitios: `tailwind.config.js` (tokens `dark-*`/`light-*` dorados), `src/index.css` (`--color-fondo`, `--color-principal`, …) e `index.html` (estilos inline del loader con `#C6A664`/`#0D0D0D`).
- Colores hex sueltos en componentes: `EnhancedCharts` (30), `EnhancedAIAssistant` (15), `LoginDialog`, `FinancialTools`, `Dashboard`, `DebugMSAL`.
- Build base verificado OK (`vite build`, 12.6 s).

## FASE 2 — Modernización visual (archivos a modificar)

1. **Tokens centralizados**
   - `tailwind.config.js`: nueva paleta `primary/sand/sage/taupe` con escalas de apoyo; se eliminan `dark-*`/`light-*` dorados. `darkMode: 'class'` se mantiene.
   - `src/index.css` → (Fase 3: `src/styles/index.css`): variables `:root` nuevas (`--color-primary: #3F7079`, etc.), clases compartidas (`.card`, `.btn-primary`, `.input-field`, `.badge`) reescritas según la guía: tarjetas `rounded-2xl border-zinc-100 shadow-sm`, botón primario `rounded-2xl py-3.5 font-black shadow-lg shadow-primary/15`, inputs `rounded-xl bg-zinc-50 focus:ring-primary/20`, labels micro-mayúscula.
   - `index.html`: loader/tema PWA con la nueva paleta, fuente solo Inter (400–800, se quita Poppins según guía), `theme-color #3F7079`.
2. **Migración de colores** en: `App.jsx`, `Layout.jsx`, `Navbar.jsx`, `Sidebar.jsx`, `Login.jsx`, `LoginDialog.jsx`, `WelcomeScreen.jsx`, `Dashboard.jsx`, `EnhancedCharts.jsx`, `EnhancedAIAssistant.jsx`, `FinancialTools.jsx`, `LoadingScreen.jsx`, `LoadingCard.jsx`, `MSALInitializing.jsx`, `Analysis.jsx`, `ChatIA.jsx`, `Settings.jsx`, `TransactionDetailModal.jsx`, `Transactions.jsx` — todo `dark-primary`/`light-bg`/hex dorados pasa a tokens (`primary`, `sand`, `sage`, `taupe`) o zinc neutro de la guía.
3. **Lineamientos de la guía aplicados**: fondo de página `#F2F2F7` claro / `#09090C` oscuro, jerarquía tipográfica por peso (títulos 32px bold tracking-tight, micro-etiquetas uppercase), pills `color/10 + borde color/20`, botones con `transition` y área táctil ≥ 44px en la barra inferior móvil.
4. Sin cambios de lógica: solo clases y estilos. Verificación: `npm run build`.

## FASE 3 — Reorganización (archivos a mover)

Nueva estructura de `frontend/src`:

```
src/
├── pages/            Dashboard, Transactions, Analysis, ChatIA, EnhancedAIAssistant,
│                     FinancialTools, OutlookConnect, Settings, Login, WelcomeScreen
├── components/
│   ├── layout/       Layout, Navbar, Sidebar, NotificationPanel
│   ├── auth/         AuthCallback, LoginDialog, MSALInitializing
│   ├── common/       ErrorBoundary, LoadingCard, LoadingScreen,
│   │                 ConnectivityStatus, SSLErrorNotification
│   ├── dashboard/    EnhancedCharts, EmailSyncControl
│   ├── transactions/ TransactionDetailModal
│   └── debug/        DebugAuth, DebugMSAL, AuthDebugPanel, AuthStorageDebug,
│                     SocketDebugPanel, EmailParserTester
├── config/           msalConfig, railway (sin cambios de ubicación)
├── hooks/            useMicrosoftAuth
├── services/         api, socket
├── stores/           appStore, authStore
├── styles/           index.css (movido desde src/)
└── utils/            formatters
```

- Se actualizan todos los imports afectados (App.jsx, main.jsx e imports cruzados entre componentes).
- Documentación suelta de la raíz (≈35 archivos `*.md` de deploy/fixes históricos) se mueve a `DOC/historial/` para dejar la raíz limpia (se conservan `README.md` y `LICENSE`).

## Archivos a eliminar (verificado sin referencias)

| Archivo | Motivo |
|---|---|
| `frontend/src/components/AuthDebugger.jsx` | Sin ningún import en el proyecto (verificado con búsqueda global). |

## Candidatos a eliminar (NO se eliminan — requieren confirmación)

| Archivo | Duda |
|---|---|
| `frontend/public/clear-auth.js` y `public/diagnostic.js` | No referenciados desde `index.html` ni el código, pero podrían usarse manualmente desde consola/soporte. |
| Raíz: `diagnostic-white-screen.html`, `fix-404-tool.html`, `socket-test.html` | Herramientas de diagnóstico manuales; sin referencias en código. |
| `frontend/create-icons.js`, `generate-icons.cjs`, `generate-ssl.cjs`, `generate-simple-ssl.cjs` | Scripts one-shot de setup; sin referencias en package.json. |
| Raíz: `Dockerfile.debian`, `Dockerfile.simple`, `railway.yml` (coexiste con `railway.json`) | Posibles configuraciones alternativas de despliegue aún en uso. |

## Credenciales encontradas (NO se borran)

- `frontend/src/config/msalConfig.js`: `clientId` de Azure AD hardcodeado → se mueve a `VITE_AZURE_CLIENT_ID` con el valor actual como fallback para no romper nada.
- `CLAVES_REALES.md` (raíz) y `RAILWAY_DEPLOYMENT.md:123` (URI de MongoDB con contraseña) — documentación con valores sensibles; se dejan intactos y se reportan al final. `SECURITY_ALERT.md` ya documenta la rotación pendiente.
- Archivos `.env*` (raíz, `frontend/`, `backend/`): intactos.

## Verificación por fase

- Tras cada fase: `npm run build` en `frontend/` sin errores (no hay typecheck: proyecto JS).
- Commits atómicos: uno por fase, sin incluir el cambio preexistente de `backend/src/services/emailSyncService.js` (ajeno a este trabajo).
