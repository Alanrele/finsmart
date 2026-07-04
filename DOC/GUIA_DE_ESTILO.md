# Guía de Estilo (UI Kit)

> **Addendum Kipu (2026-07)** — esta guía sigue siendo la base del sistema; la capa de
> marca vive en `BRANDING.md`. Cambios que la evolucionan:
> - **Tipografía**: se suma `Bricolage Grotesque` como fuente display (títulos `h1/h2`,
>   cifras protagonistas y wordmark). `Inter` sigue siendo la única fuente de cuerpo/UI.
> - **Firma visual**: el "cordón anudado" del quipu — clase `.eyebrow` (cejilla con nudo),
>   ilustraciones de hebras en login/estados vacíos, y el logo (`BrandLogo.jsx`).
> - **Paleta aplicada**: petróleo `#3F7079` (primario), salvia `#A6C0B4`, arena `#D4CBB0`,
>   taupe `#A79E82` — tokens en `tailwind.config.js` y `:root`.


Sistema visual de la app, extraído del código real. Sirve para replicar el estilo
en otra aplicación (React + Tailwind). La paleta de colores es intercambiable:
lo que define el estilo es la **tipografía pesada, las formas redondeadas, los
bordes finos y los fondos teñidos translúcidos**.

## 1. Personalidad

"App de campo con acabado iOS": legible bajo el sol, botones grandes para dedos
con guantes, jerarquía tipográfica agresiva (negritas fuertes, etiquetas
diminutas en mayúsculas), tarjetas blancas suaves sobre fondo gris claro,
cristal esmerilado en barras y hojas modales. Sin emojis; iconos de línea.

## 2. Tipografía

- **Fuente única**: Inter (400–800), fallback `system-ui`. Nada de serifas.
- La jerarquía se logra con PESO y TAMAÑO extremos, no con fuentes distintas:

| Rol | Clases Tailwind |
|---|---|
| Título de página | `text-[32px] font-bold tracking-tight leading-tight` |
| Cejilla de sección (encima del título) | `text-[13px] uppercase tracking-wider font-semibold text-zinc-400` |
| Título de tarjeta | `text-[15px] font-bold leading-tight` |
| Micro-etiqueta (labels, cabeceras de dato) | `text-[10px] font-extrabold uppercase tracking-wider text-zinc-400` |
| Cuerpo | `text-sm font-medium` / secundario `text-xs text-zinc-500` |
| Número protagonista | `text-[28px] font-extrabold tracking-tight tabular-nums` |
| Datos/cifras alineadas | `font-mono` o `tabular-nums` |

Regla: cualquier texto de apoyo baja a 10–11px pero sube a `font-bold`;
nunca texto gris grande.

## 3. Formas y superficies

- Radios generosos y consistentes: `rounded-lg` (chips internos) →
  `rounded-xl` (inputs, botones) → `rounded-2xl` (tarjetas) →
  `rounded-3xl` (contenedores hero) → `rounded-full` (pills/badges).
- Tarjeta base:
  ```html
  <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-4">
  ```
- Bordes SIEMPRE finos y casi invisibles (`border-zinc-100` /
  `dark:border-zinc-800`); la separación la dan el fondo gris de la página
  (`bg-[#F2F2F7]` claro, `bg-[#09090C]` oscuro) y sombras suaves (`shadow-sm`).
- Bloques internos de una tarjeta: `bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-3`.
- Cristal (headers, hojas modales): `bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md`.

## 4. Botones (las 6 variantes)

```html
<!-- 1. Primario (acción principal, 1 por vista) -->
<button class="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
               text-sm font-black text-white shadow-lg shadow-emerald-500/15 transition
               flex items-center justify-center gap-2">

<!-- 2. Teñido (estilo iOS: fondo del color al 10%, texto del color) -->
<button class="px-3 py-2 rounded-xl bg-[#007AFF]/10 hover:bg-[#007AFF]/20
               text-xs font-semibold text-[#007AFF] transition">

<!-- 3. Neutro / secundario -->
<button class="px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100
               border border-zinc-200/50 dark:border-zinc-800/50
               text-xs font-black text-zinc-500 dark:text-zinc-400 transition">

<!-- 4. Icono (cuadrado, área táctil >= 34px) -->
<button class="h-8 w-8 flex items-center justify-center rounded-xl
               text-zinc-400 hover:text-[#007AFF] hover:bg-[#007AFF]/10 transition">

<!-- 5. Destructivo sutil (nunca rojo sólido salvo confirmación) -->
<button class="text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30
               h-8 w-8 rounded-lg flex items-center justify-center transition">

<!-- 6. Control segmentado (tabs internos) -->
<div class="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl">
  <button class="px-3.5 py-1.5 rounded-lg text-xs font-black transition
                 bg-white dark:bg-zinc-800 text-[#007AFF] shadow-sm">Activo</button>
  <button class="px-3.5 py-1.5 rounded-lg text-xs font-black text-zinc-400 hover:text-zinc-600">Inactivo</button>
</div>
```

Reglas: todo botón lleva `transition`, icono lucide de `h-3.5/h-4 w-*` +
texto `font-black`/`font-bold`; área táctil mínima 40–44px en móvil
(`min-h-[44px]` en la bottom bar); estados `disabled:opacity-40..60`.

## 5. Pills, badges y chips de estado

```html
<span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase
             bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20">Stock Bajo</span>
```
Fórmula: `color/10` de fondo + `color/20` de borde + texto del color pleno +
mayúsculas diminutas. El color es semántico (verde ok, ámbar aviso, rojo
peligro, azul info) y va acompañado de icono o texto, nunca color solo.

## 6. Inputs y formularios

```html
<label class="text-[11px] font-black uppercase tracking-wider text-zinc-400">Usuario</label>
<input class="w-full px-3.5 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-950
              border border-zinc-100 dark:border-zinc-800 text-sm font-semibold
              text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400
              focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 transition" />
```
- Label SIEMPRE micro-mayúscula encima, no placeholder como label.
- Iconos dentro del input: `absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400` + `pl-10`.
- Deslizadores: `<input type="range" class="flex-1 accent-[#007AFF] h-1.5 cursor-pointer">`.

## 7. Iconografía

- Librería: **lucide-react** exclusivamente. `strokeWidth` 2–2.5.
- Tamaños: 3.5 (12–14px) junto a texto pequeño, 4–5 en botones, 10–12 en
  estados vacíos (con `stroke-1` y color `text-zinc-300`).
- Icono con "ficha": caja `h-8 w-8 rounded-lg bg-<color>/10` con el icono
  del color dentro.

## 8. Modo oscuro

- Por clase `dark` en `<html>` (variant Tailwind
  `@variant dark (&:where(.dark, .dark *))`), NUNCA por media query, para
  poder alternarlo con botón. `color-scheme` acompaña.
- Mapeo mecánico: blanco→`zinc-900`, `zinc-50`→`zinc-800/40..950`,
  `zinc-100` (bordes)→`zinc-800`, texto `zinc-900`→`zinc-50..100`.
  Los colores de acento apenas cambian (los fondos /10 funcionan en ambos).

## 9. Movimiento

- Librería: `motion/react` (framer-motion). Poco y con propósito:
  - Entradas de paso/vista: fade + slide 16–24px, 0.3s.
  - Hojas modales (BottomSheet): spring `damping 25, stiffness 220` desde abajo,
    con backdrop `bg-black/40 backdrop-blur-sm`.
  - Acentos: `animate-pulse` en indicadores vivos; siempre con
    `motion-reduce:animate-none`.
- Todo hover/estado con `transition` de Tailwind (150ms por defecto).

## 10. Layout

- Contenedor: `max-w-5xl xl:max-w-6xl mx-auto px-4 md:px-6`.
- Secciones separadas con `space-y-6`; dentro de tarjetas `space-y-3/4`.
- Móvil primero: bottom tab bar fija con `backdrop-blur-xl` y
  `pb [env(safe-area-inset-bottom)]`; en `md:` la navegación sube al header.
- Nada de overflow horizontal: listas largas colapsan tras un botón
  "Ver X (N)" y se paginan ("Ver todos"), los chips usan `flex-wrap`.

## 11. Prompt listo para replicar el estilo con Claude

> Usa este sistema visual (estilo "app de campo con acabado iOS", React +
> Tailwind 4 + lucide-react + motion/react, SIN emojis):
> tipografía Inter con jerarquía por peso (títulos `font-bold tracking-tight`
> de 32px, cejillas y labels en `text-[10-13px] uppercase tracking-wider
> font-extrabold text-zinc-400`, números protagonistas `text-[28px]
> font-extrabold tabular-nums`); tarjetas `bg-white dark:bg-zinc-900
> rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm` sobre
> página `#F2F2F7`/`#09090C`; botón primario sólido `rounded-2xl py-3.5
> font-black shadow-lg shadow-<acento>/15`, botones secundarios "teñidos"
> con `bg-<color>/10 text-<color> hover:bg-<color>/20`, controles segmentados
> `bg-zinc-100 p-1 rounded-xl` con opción activa blanca `shadow-sm`; badges
> pill `rounded-full text-[9px] font-extrabold uppercase bg-<color>/10
> border-<color>/20`; inputs `rounded-xl bg-zinc-50 dark:bg-zinc-950` con
> label micro-mayúscula encima y `focus:ring-2 ring-<acento>/20`; iconos
> lucide `strokeWidth 2-2.5`; modo oscuro por clase `dark` en `<html>`;
> modales tipo bottom-sheet con spring y backdrop difuminado; animaciones
> sutiles de 0.3s con `motion-reduce` respetado; área táctil mínima 44px;
> listas largas colapsadas tras "Ver más (N)". Aplica MI paleta: [aquí tus
> colores].
