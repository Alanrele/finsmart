import React, { useEffect, useState } from 'react'
import { Plus, Trash2, FlaskConical, Download, Upload, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getRules, createRule, deleteRule, testRule, exportRules, importRules, getRuleCategories,
} from '../../services/api'
import type { ClassificationRule, Category } from '../../types'

/*
  Reglas de clasificación (motor determinístico, sin IA).
  Crear/eliminar reglas, probarlas contra texto de ejemplo, importar/exportar JSON.
  Las reglas se evalúan por prioridad; la primera que coincide gana.
*/
const RulesManager = () => {
  const [rules, setRules] = useState<ClassificationRule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<{ category: string; matchType: string; field: string; pattern: string; priority: number | string }>({ category: '', matchType: 'keyword', field: 'all', pattern: '', priority: 100 })
  const [saving, setSaving] = useState(false)
  const [sample, setSample] = useState('')
  const [testResult, setTestResult] = useState<boolean | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const [r, c] = await Promise.all([getRules(), getRuleCategories()])
      setRules(r.rules || [])
      setCategories(c.categories || [])
      if (!form.category && c.categories?.length) setForm((f) => ({ ...f, category: c.categories[0].key }))
    } catch (e) {
      toast.error('No se pudieron cargar las reglas')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const labelOf = (key) => categories.find((c) => c.key === key)?.label || key

  const handleCreate = async () => {
    if (!form.pattern.trim() || !form.category) return
    setSaving(true)
    try {
      await createRule({ ...form, priority: Number(form.priority) || 100 })
      setForm((f) => ({ ...f, pattern: '' }))
      toast.success('Regla creada')
      load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Error al crear la regla')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try { await deleteRule(id); setRules((rs) => rs.filter((r) => r.id !== id)); toast.success('Regla eliminada') }
    catch { toast.error('Error al eliminar') }
  }

  const handleTest = async () => {
    if (!form.pattern.trim()) { toast.error('Escribe un patrón para probar'); return }
    try {
      const { matched } = await testRule({ category: form.category, matchType: form.matchType, field: form.field, pattern: form.pattern }, sample)
      setTestResult(matched)
    } catch { toast.error('Error al probar la regla') }
  }

  const handleExport = async () => {
    const data = await exportRules()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'kipu-reglas.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      const res = await importRules(parsed.rules || parsed, false)
      toast.success(`${res.imported} reglas importadas`)
      load()
    } catch { toast.error('Archivo de reglas inválido') }
    e.target.value = ''
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <span className="eyebrow">Clasificación</span>
          <h2 className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">Reglas de clasificación</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Motor determinístico, sin IA. La primera regla que coincide (por prioridad) gana.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary text-xs px-3 py-2" title="Exportar reglas">
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
          <label className="btn-secondary text-xs px-3 py-2 cursor-pointer" title="Importar reglas">
            <Upload className="w-3.5 h-3.5" /> Importar
            <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>

      {/* Formulario de nueva regla */}
      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="micro-label block mb-1.5">Rubro destino</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
              {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="micro-label block mb-1.5">Coincidencia</label>
            <select value={form.matchType} onChange={(e) => setForm({ ...form, matchType: e.target.value })} className="input-field">
              <option value="keyword">Palabra clave</option>
              <option value="regex">Expresión regular</option>
            </select>
          </div>
          <div>
            <label className="micro-label block mb-1.5">Campo</label>
            <select value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} className="input-field">
              <option value="all">Todo</option>
              <option value="description">Descripción</option>
              <option value="merchant">Comercio</option>
            </select>
          </div>
          <div>
            <label className="micro-label block mb-1.5">Prioridad</label>
            <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-field" />
          </div>
        </div>
        <div>
          <label className="micro-label block mb-1.5">Patrón</label>
          <input value={form.pattern} onChange={(e) => setForm({ ...form, pattern: e.target.value })} className="input-field" placeholder="p. ej. PRIMAX" />
        </div>
        {/* Probar */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1">
            <label className="micro-label block mb-1.5">Probar contra texto</label>
            <input value={sample} onChange={(e) => { setSample(e.target.value); setTestResult(null) }} className="input-field" placeholder="Consumo PRIMAX EST 45 Lima" />
          </div>
          <button onClick={handleTest} className="btn-secondary"><FlaskConical className="w-4 h-4" /> Probar</button>
          <button onClick={handleCreate} disabled={saving || !form.pattern.trim()} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Crear regla
          </button>
        </div>
        {testResult !== null && (
          <p className={`text-xs font-bold ${testResult ? 'text-sage-700 dark:text-sage-300' : 'text-red-500'}`}>
            {testResult ? 'La regla coincide con el texto' : 'La regla no coincide'}
          </p>
        )}
      </div>

      {/* Lista de reglas */}
      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-zinc-400 py-4 text-center">Cargando reglas…</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-zinc-400 py-4 text-center">Aún no hay reglas.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rules.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <span className="badge-info shrink-0">{r.priority}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                    <code className="text-xs bg-zinc-100 dark:bg-zinc-800 rounded px-1.5 py-0.5">{r.pattern}</code>
                    <span className="text-zinc-400 mx-1.5">→</span>
                    {labelOf(r.category)}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 uppercase tracking-wider font-bold">
                    {r.matchType === 'regex' ? 'regex' : 'palabra'} · {r.field}
                  </p>
                </div>
                <button onClick={() => handleDelete(r.id)} className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default RulesManager
