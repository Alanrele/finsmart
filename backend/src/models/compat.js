/*
  Capa de compatibilidad Mongoose -> Prisma (PostgreSQL).

  Los modelos User/Transaction exponen la misma API que usaban las rutas y
  servicios con Mongoose (find/findOne/findById/findByIdAndUpdate/updateMany/
  deleteMany/countDocuments/exists/aggregate + documentos con .save()/.toJSON()),
  de modo que la lógica de negocio no cambia. Solo se soportan los operadores
  que el código realmente usa: $or, $in, $gte, $gt, $lte, $lt, $ne, $exists,
  RegExp, $set (incluidas rutas punteadas a JSON), $unset.
*/

const IMPOSSIBLE_ID = '__no_match__';

// ---------- Traducción de filtros ----------

const translateValue = (value) => {
  if (value instanceof RegExp) {
    return { contains: value.source, mode: 'insensitive' };
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const cond = {};
    let hasExists = null;
    for (const [op, v] of Object.entries(value)) {
      switch (op) {
        case '$gte': cond.gte = v; break;
        case '$gt': cond.gt = v; break;
        case '$lte': cond.lte = v; break;
        case '$lt': cond.lt = v; break;
        case '$ne': cond.not = v; break;
        case '$in': cond.in = v; break;
        case '$exists': hasExists = v; break;
        default:
          throw new Error(`Operador de filtro no soportado: ${op}`);
      }
    }
    // { $exists: true, $ne: null } => NOT NULL ; { $exists: false } => NULL
    if (hasExists === true && cond.not === undefined) cond.not = null;
    if (hasExists === false) return null;
    return cond;
  }
  return value;
};

const translateFilter = (filter = {}, allowedFields) => {
  const where = {};
  for (const [key, value] of Object.entries(filter)) {
    if (key === '$or') {
      where.OR = value.map(f => translateFilter(f, allowedFields));
      continue;
    }
    const field = key === '_id' ? 'id' : key;
    if (!allowedFields.has(field)) {
      // Campo inexistente: en Mongo no matcheaba ningún documento
      where.id = { equals: IMPOSSIBLE_ID };
      continue;
    }
    where[field] = translateValue(value);
  }
  return where;
};

// ---------- Traducción de updates ----------

const setDeep = (obj, path, value) => {
  const parts = path.split('.');
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cursor[parts[i]] !== 'object' || cursor[parts[i]] === null) {
      cursor[parts[i]] = {};
    }
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = value;
};

/**
 * Devuelve { data, dottedPaths } — dottedPaths requieren leer el registro
 * actual y fusionar sobre la columna JSON (ej. 'preferences.theme').
 */
const translateUpdate = (update = {}) => {
  const data = {};
  const dotted = {};

  const applyEntry = (key, value) => {
    if (key.includes('.')) {
      dotted[key] = value;
    } else {
      data[key === '_id' ? 'id' : key] = value === undefined ? null : value;
    }
  };

  for (const [key, value] of Object.entries(update)) {
    if (key === '$set') {
      for (const [k, v] of Object.entries(value)) applyEntry(k, v);
    } else if (key === '$unset') {
      for (const k of Object.keys(value)) data[k] = null;
    } else if (key.startsWith('$')) {
      throw new Error(`Operador de update no soportado: ${key}`);
    } else {
      applyEntry(key, value);
    }
  }

  return { data, dottedPaths: dotted };
};

const mergeDottedIntoData = (currentRow, data, dottedPaths) => {
  const byRoot = {};
  for (const [path, value] of Object.entries(dottedPaths)) {
    const root = path.split('.')[0];
    if (!byRoot[root]) {
      const current = currentRow ? currentRow[root] : undefined;
      byRoot[root] = current && typeof current === 'object'
        ? JSON.parse(JSON.stringify(current))
        : {};
    }
    setDeep(byRoot[root], path.split('.').slice(1).join('.'), value);
  }
  return { ...data, ...byRoot };
};

// ---------- Query encadenable (thenable) ----------

class QueryShim {
  constructor(executor) {
    this._executor = executor;
    this._sort = undefined;
    this._skip = undefined;
    this._limit = undefined;
  }

  sort(spec) {
    this._sort = Object.entries(spec).map(([field, dir]) => ({
      [field === '_id' ? 'id' : field]: dir === 1 || dir === 'asc' ? 'asc' : 'desc'
    }));
    return this;
  }

  skip(n) { this._skip = n; return this; }
  limit(n) { this._limit = n; return this; }
  // Mongoose usaba select() para ocultar campos; toJSON() ya elimina los
  // sensibles, así que aquí es un no-op que mantiene el encadenamiento.
  select() { return this; }
  lean() { return this; }

  then(resolve, reject) {
    return this._executor({ orderBy: this._sort, skip: this._skip, take: this._limit })
      .then(resolve, reject);
  }
  catch(fn) { return this.then(undefined, fn); }
  finally(fn) { return this.then().finally(fn); }
}

// ---------- Documento compatible ----------

const buildDocumentClass = ({ delegateName, fields, jsonHidden = [], onBeforeSave }) => {
  const fieldList = [...fields];

  class CompatDocument {
    constructor(data = {}, { isNew = true } = {}) {
      for (const f of fieldList) {
        if (data[f] !== undefined) this[f] = data[f];
      }
      if (data.id !== undefined) this.id = data.id;
      Object.defineProperty(this, '$isNew', { value: isNew, writable: true, enumerable: false });
      Object.defineProperty(this, '$original', {
        value: isNew ? {} : JSON.parse(JSON.stringify(this.toObject())),
        writable: true,
        enumerable: false
      });
    }

    get _id() { return this.id; }
    set _id(v) { this.id = v; }

    isModified(field) {
      if (this.$isNew) return true;
      const current = this[field];
      const original = this.$original[field];
      return JSON.stringify(current) !== JSON.stringify(original);
    }

    toObject() {
      const out = {};
      for (const f of fieldList) {
        if (this[f] !== undefined) out[f] = this[f];
      }
      if (this.id !== undefined) {
        out.id = this.id;
        out._id = this.id;
      }
      return out;
    }

    toJSON() {
      const out = this.toObject();
      for (const hidden of jsonHidden) delete out[hidden];
      return out;
    }

    async save() {
      const prisma = require('../config/prisma').prisma;
      if (onBeforeSave) await onBeforeSave(this);

      if (this.$isNew) {
        const data = {};
        for (const f of fieldList) {
          if (this[f] !== undefined) data[f] = this[f];
        }
        const row = await prisma[delegateName].create({ data });
        Object.assign(this, row);
        this.$isNew = false;
        this.$original = JSON.parse(JSON.stringify(this.toObject()));
        return this;
      }

      const data = {};
      for (const f of fieldList) {
        const original = this.$original[f];
        const current = this[f];
        const changed = JSON.stringify(current) !== JSON.stringify(original);
        if (changed) data[f] = current === undefined ? null : current;
      }
      if (Object.keys(data).length > 0) {
        const row = await prisma[delegateName].update({ where: { id: this.id }, data });
        Object.assign(this, row);
      }
      this.$original = JSON.parse(JSON.stringify(this.toObject()));
      return this;
    }
  }

  return CompatDocument;
};

// ---------- Modelo compatible ----------

const buildModel = ({ delegateName, fields, DocumentClass }) => {
  const allowed = new Set([...fields, 'id']);
  const prismaOf = () => require('../config/prisma').prisma[delegateName];
  const wrap = (row) => (row ? new DocumentClass(row, { isNew: false }) : null);

  const model = {
    find(filter = {}) {
      const where = translateFilter(filter, allowed);
      return new QueryShim(async ({ orderBy, skip, take }) => {
        const rows = await prismaOf().findMany({ where, orderBy, skip, take });
        return rows.map(wrap);
      });
    },

    findOne(filter = {}) {
      const where = translateFilter(filter, allowed);
      return new QueryShim(async ({ orderBy }) => {
        const row = await prismaOf().findFirst({ where, orderBy });
        return wrap(row);
      });
    },

    findById(id) {
      return new QueryShim(async () => {
        if (!id || id === IMPOSSIBLE_ID) return null;
        const row = await prismaOf().findUnique({ where: { id: String(id) } });
        return wrap(row);
      });
    },

    findByIdAndUpdate(id, update) {
      return new QueryShim(async () => {
        const { data, dottedPaths } = translateUpdate(update);
        try {
          let finalData = data;
          if (Object.keys(dottedPaths).length > 0) {
            const current = await prismaOf().findUnique({ where: { id: String(id) } });
            if (!current) return null;
            finalData = mergeDottedIntoData(current, data, dottedPaths);
          }
          const row = await prismaOf().update({ where: { id: String(id) }, data: finalData });
          return wrap(row);
        } catch (error) {
          if (error.code === 'P2025') return null; // registro no encontrado
          throw error;
        }
      });
    },

    async findByIdAndDelete(id) {
      try {
        const row = await prismaOf().delete({ where: { id: String(id) } });
        return wrap(row);
      } catch (error) {
        if (error.code === 'P2025') return null;
        throw error;
      }
    },

    async updateMany(filter, update) {
      const where = translateFilter(filter, allowed);
      const { data, dottedPaths } = translateUpdate(update);
      if (Object.keys(dottedPaths).length > 0) {
        throw new Error('updateMany no soporta rutas punteadas');
      }
      const result = await prismaOf().updateMany({ where, data });
      return { modifiedCount: result.count, matchedCount: result.count };
    },

    async deleteMany(filter) {
      const where = translateFilter(filter, allowed);
      const result = await prismaOf().deleteMany({ where });
      return { deletedCount: result.count };
    },

    async countDocuments(filter = {}) {
      const where = translateFilter(filter, allowed);
      return prismaOf().count({ where });
    },

    async exists(filter = {}) {
      const where = translateFilter(filter, allowed);
      const row = await prismaOf().findFirst({ where, select: { id: true } });
      return row ? { _id: row.id } : null;
    },

    /**
     * Soporta únicamente los pipelines usados por la app:
     *   [$match, $group(_id: '$campo' | {year:{$year},month:{$month},...}), $sort]
     * con acumuladores $sum (campo o 1) y $avg. Agrupa en JS para mantener
     * exactamente la forma de salida de Mongo.
     */
    async aggregate(pipeline) {
      const match = pipeline.find(s => s.$match)?.$match || {};
      const group = pipeline.find(s => s.$group)?.$group;
      const sortSpec = pipeline.find(s => s.$sort)?.$sort;
      if (!group) throw new Error('aggregate: se requiere una etapa $group');

      const where = translateFilter(match, allowed);
      const rows = await prismaOf().findMany({ where });

      const idSpec = group._id;
      const keyOf = (row) => {
        if (typeof idSpec === 'string') {
          return row[idSpec.slice(1)];
        }
        const key = {};
        for (const [k, expr] of Object.entries(idSpec)) {
          if (typeof expr === 'string') key[k] = row[expr.slice(1)];
          else if (expr.$year) key[k] = new Date(row[expr.$year.slice(1)]).getFullYear();
          else if (expr.$month) key[k] = new Date(row[expr.$month.slice(1)]).getMonth() + 1;
          else throw new Error('aggregate: expresión de _id no soportada');
        }
        return key;
      };

      const groups = new Map();
      for (const row of rows) {
        const key = keyOf(row);
        const mapKey = JSON.stringify(key);
        if (!groups.has(mapKey)) {
          groups.set(mapKey, { _id: key, __sums: {}, __counts: {} });
        }
        const acc = groups.get(mapKey);
        for (const [outField, expr] of Object.entries(group)) {
          if (outField === '_id') continue;
          if (expr.$sum !== undefined) {
            const inc = expr.$sum === 1 ? 1 : Number(row[expr.$sum.slice(1)]) || 0;
            acc[outField] = (acc[outField] || 0) + inc;
          } else if (expr.$avg !== undefined) {
            acc.__sums[outField] = (acc.__sums[outField] || 0) + (Number(row[expr.$avg.slice(1)]) || 0);
            acc.__counts[outField] = (acc.__counts[outField] || 0) + 1;
            acc[outField] = acc.__sums[outField] / acc.__counts[outField];
          } else {
            throw new Error('aggregate: acumulador no soportado');
          }
        }
      }

      let results = [...groups.values()].map(({ __sums, __counts, ...rest }) => rest);

      if (sortSpec) {
        const entries = Object.entries(sortSpec);
        results.sort((a, b) => {
          for (const [path, dir] of entries) {
            const get = (obj) => path.split('.').reduce((o, p) => (o == null ? o : o[p]), obj);
            const av = get(a);
            const bv = get(b);
            if (av !== bv) return (av < bv ? -1 : 1) * (dir === 1 ? 1 : -1);
          }
          return 0;
        });
      }

      return results;
    }
  };

  return model;
};

module.exports = { buildDocumentClass, buildModel, translateFilter, translateUpdate };
