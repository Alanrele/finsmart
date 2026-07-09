# Plan: Modernización de Herramientas + Gating de membresía Platinum

Fecha: 2026-07-08 · Autor: auditoría automática (Claude) · Estado: aprobado para implementación

## 1. Inventario de herramientas existentes (`frontend/src/pages/FinancialTools.tsx`)

La sección actual es una sola página con 4 pestañas. Toda la lógica es **client-side**
(no hay endpoints de herramientas en el backend).

| # | Herramienta | Qué hace | Estado real | Veredicto |
|---|-------------|----------|-------------|-----------|
| 1 | **Salud Financiera** | Score 0–100 a partir de ingresos, gastos, ahorros, deudas y fondo de emergencia (4 sub-ratios ponderados 25 pts c/u) | Funciona. Validación pobre (solo "ingresa tus ingresos"), sin formato de moneda en inputs, resultado no copiable | **Mejorar** |
| 2 | **Presupuesto** | Muestra 4 presupuestos por categoría con barra de avance | **ROTA/INÚTIL**: presupuestos hardcodeados (S/1000, 500, 300, 400), `spent: 0` fijo — nunca muestra datos reales; no se puede editar nada. `getBudgets()` del frontend apunta a `/finance/budgets`, endpoint que NO existe en el backend | **Reparar** (ver §3) |
| 3 | **Metas de Ahorro** | Progreso hacia una meta: % avance, meses restantes, fecha estimada | Funciona. Sin validación (meta 0 → división), fecha estimada con meses de 30 días, resultado no copiable | **Mejorar** |
| 4 | **Pago de Deudas** | Meses para saldar una deuda con amortización francesa; interés total y % adicional | Funciona y es la más útil. Validación mínima, sin desglose por escenarios | **Mejorar** |

Problemas transversales detectados:
- Inputs `type="number"` sin prefijo de moneda, sin validación en vivo, con clases ad-hoc en lugar de `input-field` (token Kipu).
- Colores fuera de la paleta oficial (rosa/púrpura/amarillo/verde Tailwind genéricos).
- Sin buscador ni catálogo: pestañas horizontales que no escalan.
- Sin estados de carga/vacío/error.
- Resultados no exportables ni copiables.

## 2. Rediseño de la sección (catálogo)

- **Catálogo tipo grid** de cards Kipu (`SectionCard`/`card`, `micro-label`, `badge-*`):
  ícono en chip `rounded-2xl`, nombre, descripción de una línea, categoría y estado
  (Disponible / Platinum / En trial).
- **Buscador** por nombre/descripción + **filtro por categoría** (Diagnóstico, Planificación, Deudas, Premium).
- Card → abre la herramienta en vista de detalle (misma ruta, con "volver al catálogo").
- Premium: badge `PLATINUM`, candado y tratamiento atenuado; visibles pero no ejecutables sin permiso.
- Skeletons al cargar estado de membresía; estados vacíos y de error con diseño Kipu.

### Mejoras de usabilidad por herramienta (sin tocar la lógica de cálculo)
- Campo de moneda unificado con prefijo `S/`, validación en vivo con mensajes concretos y `aria-invalid`.
- Resultados en panel Kipu con botón **Copiar resumen** (portapapeles).
- Menos clics: Enter calcula; los resultados se recalculan al corregir un campo inválido.

### Reparación de "Presupuesto" (documentada, no es cambio de lógica de negocio)
- El **gasto real por categoría** se lee del endpoint existente `/finance/dashboard`
  (mes en curso) — deja de estar clavado en 0.
- Los **montos de presupuesto** son editables; se persisten en `localStorage`
  (preferencia de UI, sin implicaciones de seguridad). El endpoint `/finance/budgets`
  al que apuntaba el frontend no existe en el backend; crear persistencia server-side
  queda como pendiente propuesto (ver §6).

### Herramientas nuevas (categoría **Herramientas+**, Platinum)
- **Proyección de patrimonio**: interés compuesto con aportes mensuales (client-side).
- **Plan acelerado de deudas**: comparación bola de nieve vs. avalancha con varias deudas (client-side).

Ninguna herramienta existente se elimina.

## 3. Gating Platinum (validación en backend)

### Modelo de datos (PostgreSQL / Prisma, tabla `users`)
- `es_platinum boolean NOT NULL DEFAULT false`
- `trial_usado boolean NOT NULL DEFAULT false`
- `trial_iniciado_en timestamp NULL`
Migración: `backend/prisma/migrations/*_membresia_platinum/` con `ADD COLUMN IF NOT EXISTS`
(idempotente). Además `connectDb()` garantiza las columnas al arrancar (el flujo de dev
local no ejecuta `migrate deploy`).

### Regla de acceso (reloj del SERVIDOR)
`PLATINUM` si `es_platinum` · `TRIAL_ACTIVO` si `trial_usado && ahora < trial_iniciado_en + 168h`
· si no, `BLOQUEADO` (motivo: `sin_trial` o `trial_expirado`).

### Backend
- `middleware/membership.js`: `computeMembership(user, now)` (función pura, testeable)
  + `requierePlatinum` (403 con `code: 'PLATINUM_REQUERIDO'` y estado, SIN ejecutar el handler).
- Rutas protegidas: **todo `/api/ai/*` excepto `/ai/health`**. Decisión: la página
  "Análisis" consume los mismos endpoints OpenAI que el Asistente IA+, así que queda
  dentro del alcance premium — de lo contrario un usuario bloqueado podría consumir
  tokens de pago por esa vía (regla "cero tokens" no negociable).
- `routes/membershipRoutes.js` montado en `/api/membresia` (tras `authMiddleware`):
  - `GET /estado` → `{ estado, motivo?, trialUsado, msRestantes?, diasRestantes?, expiraEn? }`
  - `POST /trial` → activa el trial UNA sola vez (`trial_usado=true`, `trial_iniciado_en=NOW()` del servidor). Si ya se usó: 409. Si es Platinum: no-op informativo.

### Frontend
- `services/api.ts`: `getMembershipStatus()`, `activateTrial()`.
- Store `membershipStore` (zustand, **sin persist**: el backend es la única verdad).
- `PremiumGate`: envuelve Chat IA, Asistente IA+ y Análisis; overlay Kipu con
  CTA "Probar 7 días gratis" (si nunca usó trial) / "Tu prueba de 7 días terminó" (si expiró).
- Indicador de trial activo con días restantes; ámbar prominente el último día.
- 403 `PLATINUM_REQUERIDO` → refresca el estado y muestra el bloqueo, no un error genérico.
- Herramientas Platinum del catálogo: mismas reglas visuales, mismo CTA.

## 4. Pruebas
`backend/src/middleware/__tests__/membership.test.js`:
- platinum → acceso; trial activo (día 6) → acceso; trial expirado (día 8, reloj de servidor) → 403;
  trial ya usado → no reactivable (409 en `/trial`); usuario sin trial → 403 con motivo `sin_trial`;
- integración: handler con spy de servicio IA — usuario bloqueado recibe 403 y el spy **no** se invoca.

## 5. Orden de commits
1. `fix: importación PDF + historial` (trabajo previo pendiente en el árbol)
2. `rediseno-herramientas`
3. `migracion-membresia`
4. `middleware-gating-backend`
5. `gating-frontend`
6. `trial-7dias`

## 6. Pendientes / propuestas (no incluidos)
- Endpoint real `/finance/budgets` para persistir presupuestos en BD (hoy el frontend
  tenía llamadas a un endpoint inexistente; se documenta y el tool usa localStorage).
- Pantalla de compra/checkout de Platinum (el CTA "Conocer Platinum" abre un modal informativo;
  no hay pasarela de pago).
- Panel admin para otorgar `es_platinum` (hoy: SQL manual).
