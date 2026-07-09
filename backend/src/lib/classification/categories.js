/*
  Catálogo de rubros/categorías por defecto (editable por el usuario en BD).
  `key` es estable y se guarda en la transacción; `label` es el texto visible.
  `kind`: 'expense' | 'income' | 'both'. UNCLASSIFIED es el destino cuando
  ninguna regla coincide — NUNCA se adivina.
*/
const UNCLASSIFIED = 'unclassified';

const DEFAULT_CATEGORIES = [
  { key: 'income',        label: 'Sueldo / Ingresos', kind: 'income',  color: '#658876', sortOrder: 0 },
  { key: 'food',          label: 'Alimentación',      kind: 'expense', color: '#3F7079', sortOrder: 1 },
  { key: 'transport',     label: 'Transporte',        kind: 'expense', color: '#A6C0B4', sortOrder: 2 },
  { key: 'utilities',     label: 'Servicios',         kind: 'expense', color: '#A79E82', sortOrder: 3 },
  { key: 'healthcare',    label: 'Salud',             kind: 'expense', color: '#8C8368', sortOrder: 4 },
  { key: 'shopping',      label: 'Compras',           kind: 'expense', color: '#D4CBB0', sortOrder: 5 },
  { key: 'entertainment', label: 'Entretenimiento',   kind: 'expense', color: '#63929B', sortOrder: 6 },
  { key: 'education',     label: 'Educación',         kind: 'expense', color: '#2B4D54', sortOrder: 7 },
  { key: 'travel',        label: 'Viajes',            kind: 'expense', color: '#84A595', sortOrder: 8 },
  { key: 'investment',    label: 'Inversiones',       kind: 'both',    color: '#355F67', sortOrder: 9 },
  { key: 'yape',          label: 'Yape',              kind: 'both',    color: '#84A595', sortOrder: 10 },
  { key: 'transfer',      label: 'Transferencias',    kind: 'both',    color: '#C2BBA5', sortOrder: 11 },
  { key: 'other',         label: 'Otros',             kind: 'expense', color: '#71717A', sortOrder: 12 },
  { key: UNCLASSIFIED,    label: 'Sin clasificar',    kind: 'both',    color: '#F59E0B', sortOrder: 99 },
];

module.exports = { DEFAULT_CATEGORIES, UNCLASSIFIED };
