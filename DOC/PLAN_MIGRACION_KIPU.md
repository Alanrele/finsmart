# Plan de migración a la plantilla Kipu

## Paso 0 — Análisis

### Stack de la plantilla `Kipu/` vs. proyecto actual

| | Plantilla Kipu | Proyecto actual |
|---|---|---|
| Framework | React **19** | React **18** |
| Lenguaje | **TypeScript** (.tsx) | **JavaScript** (.jsx) |
| Estilos | **Tailwind CSS v4** (`@tailwindcss/vite`, `@theme`) | **Tailwind CSS v3** (`tailwind.config.js`) |
| Build | Vite 6 + Express (server.ts, datos mock + Gemini) | Vite 5 + backend real (Express + Prisma/Postgres) |
| Animación | `motion` v12 | `framer-motion` v10 |
| Iconos | lucide-react | lucide-react |
| Estado/routing | `useState` local, sin router | zustand + react-router-dom |

**Incompatibilidad de stack (decisión):** la plantilla usa React 19 + TS + Tailwind v4, y sus vistas son un demo autónomo con datos mock y Gemini AI. Según las reglas de la tarea, **NO se cambia el stack del proyecto**: se **adaptan los tokens, el estilo visual y la estructura de componentes** de Kipu a nuestro React 18 + JS + Tailwind v3, conservando toda la lógica de negocio real (servicios, hooks, API, zustand, router, auth). No se importa el código de las vistas de la plantilla (traen su propia lógica mock); se replica su **capa visual**.

### Tokens de diseño de Kipu (a adoptar)

- **Colores (claro):** base `#F8F6F1` (arena-blanco cálido), card `#FFFFFF`, sidebar/header `#EBE6DA` (beige), texto `#2D2B24` / muted `#6E6857`, borde `rgba(167,158,130,.25)`, **primario petróleo `#3F7079`**.
- **Colores (oscuro):** base `#0F1314`, card `#161B1C`, sidebar `#0B0E0E`, texto `#F5F3ED` / muted `#A79E82`, **primario salvia `#A6C0B4`**.
- **Marca fija:** sand `#D4CBB0`, taupe `#A79E82`, sage `#A6C0B4`, petrol `#3F7079` (idénticos a los actuales — continuidad total).
- **Tipografía:** **Outfit** (display, títulos/marca), **Inter** (cuerpo), **JetBrains Mono** (micro-etiquetas en mayúsculas, tracking ancho).
- **Formas:** radios squircle grandes — tarjetas `rounded-[2rem]`/`[2.5rem]` (32–40px), `.ios-rounded` 20px, pills/badges `rounded-full`, nav `rounded-2xl`.
- **Superficies:** glassmorphism `.ios-glass` (blur 24px), bordes translúcidos `border-subtle`, sombras suaves `shadow-xl`.
- **Movimiento:** transición global `cubic-bezier(0.16,1,0.3,1)` 300ms.
- **Layout:** sidebar fija beige `w-72` (logo squircle + nav pills + tarjeta "Platinum" al pie); en móvil header glass + barra inferior flotante `rounded-3xl` glass + drawer lateral.

### Mapa de la app actual

- **Layout:** `components/layout/{Layout, Navbar, Sidebar, NotificationPanel}`
- **Páginas:** `pages/{Dashboard, Transactions, Analysis, ChatIA, EnhancedAIAssistant, FinancialTools, OutlookConnect, Settings, Login, WelcomeScreen}`
- **Comunes:** `components/common/{BrandLogo, ConfirmDialog, EmptyState, LoadingScreen, LoadingCard, ErrorBoundary, ConnectivityStatus, SSLErrorNotification}`
- **Tokens:** `styles/index.css` (`:root`/`.dark` + clases `.card/.btn-primary/.btn-secondary/.input-field/.eyebrow/.micro-label/.badge*`) y `tailwind.config.js`.

## Estrategia de ejecución

La app usa clases compartidas centralizadas (`.card`, `.btn-*`, `.input-field`, `.eyebrow`, `.badge*`) y tokens (`bg-page`, `primary`, `sand`, …) en casi todas las páginas. Migrando **los tokens y esas clases** el look de Kipu se propaga a toda la app sin reescribir la lógica de cada página. Luego se reconstruye el **layout** (sidebar/header/bottom-nav) al estilo Kipu. Así se adopta la identidad de la plantilla adaptada a nuestro stack.

## Tabla de mapeo (antiguo → nuevo)

| Elemento actual | Acción | Equivalente Kipu |
|---|---|---|
| Tokens `:root`/`.dark` (`#F2F2F7`…) | **Reemplazar** | Variables Kipu (base cálida, card, sidebar, brand) |
| Fuentes Inter + Bricolage Grotesque | **Reemplazar** display | Outfit (display) + Inter + JetBrains Mono |
| `.card`, `.btn-*`, `.input-field`, `.eyebrow`, `.badge*` | **Reestilizar** | Glass/squircle/mono de Kipu |
| `tailwind.config.js` tokens | **Ampliar** | Tokens semánticos `base/card/sidebar/main/muted/subtle/brand-*` |
| `layout/Sidebar` | **Reemplazar** | Sidebar beige w-72 con pills + footer Platinum |
| `layout/Navbar` | **Reemplazar** | Header glass móvil + barra inferior flotante + drawer |
| `layout/Layout` | **Ajustar** | Frame `lg:pl-72`, `max-w-7xl` |
| `common/BrandLogo` (ícono quipu) | **Conservar** | Se mantiene el ícono quipu (es la marca "Kipu"); se enmarca al estilo de la plantilla |
| Páginas (Dashboard, Transactions, …) | **Conservar lógica**, heredan estilo | Vistas homónimas de la plantilla (solo referencia visual) |
| **Login / WelcomeScreen** | **Conservar 100% la lógica**, reestilizar leve por tokens | (no se reemplaza) |
| `index.html` (fuentes/tema) | **Ajustar** | Carga Outfit + JetBrains Mono, base cálida |

### Lo que se CREA
- Utilidades `.ios-glass`, `.ios-rounded*`, `.mono-label` (equivalentes Tailwind v3 de las de la plantilla).

### Candidatos a eliminar (tras verificar sin referencias)
- Fuente Bricolage Grotesque en `index.html`/config (se sustituye por Outfit).
- La carpeta `Kipu/` es la plantilla fuente: **no se elimina** salvo que se indique (queda como referencia).

## Verificación por fase
- `npm run build` sin errores tras cada módulo.
- Responsive 360/768/1024/1440 sin overflow ni solapamiento.
- **Login funcional e intacto** tras cada fase.
