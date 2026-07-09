# Branding Kipu

## Nombre

**Elegido: Kipu** — grafía fonética de *quipu*, el sistema andino de cuerdas anudadas
con el que se llevaban las cuentas en el Perú prehispánico. Es exactamente lo que hace
la app (registrar movimientos financieros a partir de correos del BCP), es peruano como
el banco que integra, tiene 2 sílabas y se pronuncia igual que se escribe.

### Alternativas documentadas

| Nombre | Idea | Por qué no fue el elegido |
|---|---|---|
| **Chaski** | El mensajero inca — la app "corre" a leer tus correos | Alude al transporte del dato, no al registro financiero |
| **Tambo** | Almacén inca de valor y provisiones | Más "guardar" que "entender"; existe cadena comercial homónima en Perú |
| **Yapa** | "La yapa": lo extra que te ganas — ahorro | Simpático pero suena a app de cashback |
| **Soles** | La moneda peruana, directo | Genérico, difícil de buscar, sin personalidad |

> Nota: existe un software español de facturación llamado "Quipu" (con Q). La grafía
> **Kipu** diferencia la marca; para uso comercial convendría verificar registro en INDECOPI.

## Logo

**Concepto**: una cuerda madre con tres hebras colgantes anudadas a distintas alturas.
Se lee a la vez como **quipu** (identidad) y como **gráfico de barras** (función).
Nudos en arena y salvia sobre el petróleo primario.

- Fuente SVG: `frontend/src/assets/brand/kipu-icon.svg` (símbolo) y `kipu-logo.svg` (horizontal)
- Componente React: `frontend/src/components/common/BrandLogo.jsx` (`<KipuIcon />` y `<BrandLogo />`)
- Assets generados: `frontend/public/favicon.svg`, `favicon-16x16.png`, `favicon-32x32.png`,
  `apple-touch-icon.png` (180), `android-chrome-192x192.png`, `android-chrome-512x512.png`
- Regenerar PNGs: `scratchpad/make-kipu-icons.ps1` (GDI+) o cualquier rasterizador SVG

## Personalidad visual

Evolución de `GUIA_DE_ESTILO.md` ("app de campo con acabado iOS"), ahora con capa de marca:

- **Tipografía**: `Bricolage Grotesque` (display: títulos h1/h2, cifras protagonistas,
  wordmark — con carácter, ligeramente condensada en tamaños grandes) + `Inter` (cuerpo,
  UI, datos con `tabular-nums`). Ambas vía Google Fonts.
- **Paleta** (sin cambios, tokens en `tailwind.config.js` y `:root`):
  petróleo `#3F7079` (primario/CTA), salvia `#A6C0B4` (positivo), arena `#D4CBB0`
  (superficies teñidas), taupe `#A79E82` (secundario cálido), páginas `#F2F2F7`/`#09090C`.
- **Radios**: decididamente redondeados — `rounded-xl` inputs, `rounded-2xl` tarjetas,
  `rounded-3xl` héroes. Nunca radios tímidos.
- **Profundidad**: UN sistema — flat con bordes finos (`border-zinc-100/800`) y fondos
  teñidos `color/10`; la sombra se reserva para el CTA primario (`shadow-primary/15`)
  y elementos flotantes (bottom bar, modales).
- **Elemento gráfico recurrente (firma)**: el **cordón anudado** —
  - `.eyebrow`: cejillas de sección precedidas por un nudo (punto primario)
  - hebras con nudos como ilustración en login y estados vacíos
  - el propio logo
- **Voz**: español directo, verbos activos, minúsculas de marca ("kipu" en el wordmark),
  sin tecnicismos bancarios.

## Tagline

**"Tus movimientos del BCP, anudados y en orden."**
