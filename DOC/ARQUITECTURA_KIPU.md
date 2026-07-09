# Arquitectura de UI de la plantilla Kipu (análisis + plan de refactor estructural)

> La migración previa copió **estilos/tokens** de Kipu pero conservó la **estructura/DOM**
> antiguos. Este documento captura la ARQUITECTURA real de Kipu y el plan para adoptarla.

## 1. Estructura y organización

- Plantilla: React + TS, un archivo por vista en `src/components/*View.tsx`.
- **NO tiene una carpeta de componentes base reutilizables**: repite los mismos
  patrones de composición inline en cada vista. Es decir, su "sistema" es un
  conjunto de **patrones de markup consistentes**, no un catálogo de `<Button/>`.
- Nuestra adopción: extraeremos esos patrones a un **catálogo `src/components/ui/`**
  (PageHeader, StatCard, SectionCard, Segmented, Field/Input/Select, Modal, Chip,
  EmptyState) y reconstruiremos cada página con ellos — replicando el DOM de Kipu
  pero de forma reutilizable en nuestro stack.

## 2. App shell (ya adoptado en migración previa — se conserva)

Sidebar beige `w-72` fija + header glass móvil + bottom-nav flotante + drawer.
Contenido `max-w-7xl mx-auto p-4 sm:p-10`. Esto ya coincide con Kipu (`App.tsx`).

## 3. Patrones de composición de Kipu (esto es lo que se ignoró)

### 3.1 PageHeader (encabezado de toda vista)
```
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
  <div>
    <h1 className="text-3xl font-extrabold font-display tracking-tight text-main">Título</h1>
    <p className="text-sm text-muted mt-1">Subtítulo</p>
  </div>
  {/* acción primaria opcional a la derecha (botón pill) */}
</div>
```
- Título **Outfit 3xl extrabold** en `text-main`; subtítulo `text-muted`.
- **NO usa cejilla/eyebrow con nudo.** (Nuestro `.eyebrow` era invención propia.)

### 3.2 Encabezado de sección dentro de card
`<h2 className="text-lg font-serif italic text-main">Título</h2>`
→ **serif itálica** (rasgo distintivo de Kipu que faltaba por completo).

### 3.3 StatCard (fila de KPIs)
Grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`. Cada tarjeta:
`bg-card/75 backdrop-blur-md p-6 rounded-[2rem] border border-subtle relative overflow-hidden flex flex-col justify-between h-36 shadow-xl`
+ **glow ambiental** `absolute -right-6 -top-6 w-24 h-24 bg-<color>/15 rounded-full blur-2xl`
+ label `text-[10px] font-extrabold text-muted uppercase tracking-widest`
+ cifra `text-2xl md:text-3xl font-extrabold font-display text-main`
+ caja de icono `p-2.5 bg-<color>/10 text-<color> border border-<color>/20 rounded-2xl`
+ pie mono `text-[10px] font-mono tracking-wider`.

### 3.4 SectionCard (card de contenido)
`bg-card p-8 rounded-[2.5rem] border border-subtle shadow-xl` (radio mayor, p-8).

### 3.5 Grid principal partido
`grid grid-cols-1 lg:grid-cols-12 gap-6` con `lg:col-span-5` / `lg:col-span-7`.

### 3.6 Lista de ítems
`divide-y divide-subtle`; fila `flex items-center justify-between py-3.5 group hover:bg-base/40 px-2.5 rounded-2xl`; caja de icono + título + meta (fecha `font-mono` + chip de categoría).

### 3.7 Tabla responsive (patrón dual)
- Móvil: `block md:hidden divide-y divide-subtle` como lista de cards.
- Escritorio: `hidden md:block overflow-x-auto` con `<table>`:
  `<thead>` `bg-base/40 text-[10px] font-bold text-muted uppercase tracking-widest`,
  `<tbody className="divide-y divide-subtle">`, filas `hover:bg-base/40 group`.

### 3.8 FilterBar
`bg-card p-5 rounded-[2rem] border border-subtle shadow-xl flex flex-col md:flex-row gap-4 items-center` (búsqueda + segmented + select inline).

### 3.9 Segmented control
`flex bg-base/60 p-1 rounded-xl border border-subtle`; activo `bg-brand-primary text-white dark:text-brand-dark shadow-sm`.

### 3.10 Inputs y labels
Input `bg-base/50 border border-subtle rounded-xl ... focus:border-brand-primary focus:bg-base`.
Label `text-[10px] font-bold text-muted uppercase tracking-widest font-mono`.

### 3.11 Modal
`fixed inset-0 z-50 flex items-center justify-center p-4`; backdrop `bg-black/70 backdrop-blur-md`; cuerpo `bg-card w-full max-w-md p-8 rounded-[2.5rem] border border-subtle shadow-2xl`. Header: caja de icono + `h3 font-display` + X. Form `space-y-4`.

### 3.12 Botón primario
`bg-brand-primary hover:opacity-90 text-white dark:text-brand-dark px-5 py-2.5 rounded-full font-bold text-xs tracking-wide uppercase shadow-lg active:scale-95`.

### 3.13 EmptyState
Centrado; icono en círculo `w-12 h-12 bg-brand-primary/10 text-brand-primary border rounded-full`; `h3 text-sm font-bold`; `p text-xs text-muted`.

### 3.14 Chip/Tag
`bg-brand-primary/10 text-brand-primary border border-brand-primary/15 rounded-lg text-[10px] font-bold uppercase tracking-wider` (+ icono Tag).

## 4. Brecha: app actual vs. Kipu

| Aspecto | App actual (previo) | Kipu (objetivo) |
|---|---|---|
| Encabezado de página | `h1 text-2xl font-bold` + `text-zinc-500`, con `.eyebrow` (nudo) | `h1 text-3xl font-display extrabold text-main` + `text-muted`, sin eyebrow |
| Encabezado de sección | `.eyebrow` mono con nudo | `h2 text-lg font-serif italic` |
| KPIs | `.card` genérica | StatCard con glow, `h-36`, estructura fija |
| Tablas | no hay `<table>`; filas motion | tabla desktop + card-list móvil |
| Tokens de color | mezcla `zinc-*`, `text-zinc-900 dark:text-white` | semánticos `text-main/text-muted/bg-base/border-subtle` |
| Grid | grids simples | `lg:grid-cols-12` con col-spans |
| Modales/filtros/segmented | ad-hoc | patrones fijos de Kipu |

## 5. Plan de refactor (orden de ejecución)

1. **Catálogo `components/ui/`** (base reutilizable estilo Kipu): `PageHeader`,
   `StatCard`, `SectionCard`, `Segmented`, `Field`+`TextInput`+`SelectInput`,
   `Modal`, `Chip`, `EmptyState`, `PrimaryButton`, `DataTable` (responsive).
2. **Dashboard** → reconstruir DOM con StatCard row + grid-12 + SectionCard
   (serif-italic) + lista de ítems Kipu, conservando data/handlers.
3. **Transactions** → FilterBar + DataTable responsive (tabla desktop / cards móvil)
   + Modal, conservando filtros/paginación/lógica.
4. **Analysis, ChatIA, Asistente IA+, Herramientas, Outlook, Settings** →
   PageHeader + SectionCard + Field/Segmented/tokens semánticos.
5. **Login/Welcome** → adoptar PageHeader/tipografía/tokens en presentación,
   sin tocar lógica ni campos.
6. Eliminar markup antiguo y `.eyebrow`/nudo donde se reemplace.

## 6. Restricciones
Solo cambia el envoltorio estructural: data, handlers, estado, llamadas API,
rutas, auth y contratos NO se tocan. Verificación por módulo: build + typecheck
+ consola limpia + responsive 360/768/1024/1440.
