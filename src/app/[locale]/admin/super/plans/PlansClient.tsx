'use client'

import React, { useState } from 'react'
import { Plus, Pencil, Trash2, CheckCircle, XCircle, ExternalLink, FlaskConical } from 'lucide-react'
import {
  createSubscriptionPlanAction,
  updateSubscriptionPlanAction,
  deleteSubscriptionPlanAction,
} from '@/app/actions/plans'

type Plan = {
  id: string
  slug: string
  name: string
  description: string | null
  highlights: string | null
  nameEn: string | null
  descriptionEn: string | null
  highlightsEn: string | null
  price: string
  billingCycleDays: number
  n1coLink: string | null
  isActive: boolean
  isTest: boolean
  sortOrder: number
}

type FormData = {
  slug: string
  name: string
  description: string
  highlights: string
  nameEn: string
  descriptionEn: string
  highlightsEn: string
  price: string
  billingCycleDays: string
  n1coLink: string
  isActive: boolean
  isTest: boolean
  sortOrder: string
}

const emptyForm: FormData = {
  slug: '',
  name: '',
  description: '',
  highlights: '',
  nameEn: '',
  descriptionEn: '',
  highlightsEn: '',
  price: '',
  billingCycleDays: '30',
  n1coLink: '',
  isActive: true,
  isTest: false,
  sortOrder: '0',
}

export default function PlansClient({ plans: initialPlans }: { plans: Plan[] }) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const showErr = (msg: string) => { setError(msg); setTimeout(() => setError(null), 5000) }
  const showOk  = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 4000) }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (plan: Plan) => {
    setEditingId(plan.id)
    setForm({
      slug:             plan.slug,
      name:             plan.name,
      description:      plan.description ?? '',
      highlights:       plan.highlights ?? '',
      nameEn:           plan.nameEn ?? '',
      descriptionEn:    plan.descriptionEn ?? '',
      highlightsEn:     plan.highlightsEn ?? '',
      price:            plan.price,
      billingCycleDays: String(plan.billingCycleDays),
      n1coLink:         plan.n1coLink ?? '',
      isActive:         plan.isActive,
      isTest:           plan.isTest,
      sortOrder:        String(plan.sortOrder),
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const payload = {
      slug:             form.slug,
      name:             form.name,
      description:      form.description,
      highlights:       form.highlights,
      nameEn:           form.nameEn,
      descriptionEn:    form.descriptionEn,
      highlightsEn:     form.highlightsEn,
      price:            parseFloat(form.price),
      billingCycleDays: parseInt(form.billingCycleDays),
      n1coLink:         form.n1coLink,
      isActive:         form.isActive,
      isTest:           form.isTest,
      sortOrder:        parseInt(form.sortOrder),
    }

    let res
    if (editingId) {
      res = await updateSubscriptionPlanAction(editingId, payload)
    } else {
      res = await createSubscriptionPlanAction(payload)
    }

    setLoading(false)
    if (res.success) {
      showOk(editingId ? 'Plan actualizado' : 'Plan creado')
      setShowForm(false)
      // Refresh list
      window.location.reload()
    } else {
      showErr(res.error ?? 'Error')
    }
  }

  const handleDelete = async (id: string) => {
    setLoading(true)
    const res = await deleteSubscriptionPlanAction(id)
    setLoading(false)
    if (res.success) {
      setPlans(prev => prev.filter(p => p.id !== id))
      setDeleteConfirm(null)
      showOk('Plan eliminado')
    } else {
      showErr(res.error ?? 'Error al eliminar')
    }
  }

  const formatCycle = (days: number) => {
    if (days === 30) return '/mes'
    if (days === 1) return '/día'
    return `/${days} días`
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Planes de Suscripción</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gestiona los planes que ven los clientes en su panel de facturación.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo plan
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-400 text-sm">
          <XCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />{success}
        </div>
      )}

      {/* Plans list */}
      <div className="space-y-3">
        {plans.map(plan => (
          <div
            key={plan.id}
            className={`bg-white dark:bg-white/5 border rounded-2xl p-5 flex items-center gap-4 ${
              plan.isActive ? 'border-zinc-200 dark:border-white/10' : 'border-zinc-200 dark:border-white/5 opacity-50'
            }`}
          >
            {/* Sort order badge */}
            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-zinc-500 shrink-0">
              {plan.sortOrder}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">{plan.name}</span>
                <span className="text-xs text-zinc-400 font-mono bg-zinc-100 dark:bg-white/10 px-1.5 py-0.5 rounded">
                  {plan.slug}
                </span>
                {plan.isTest && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                    <FlaskConical className="w-3 h-3" />TEST
                  </span>
                )}
                {!plan.isActive && (
                  <span className="px-2 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-500 text-xs rounded-full">Inactivo</span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{plan.description}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">{plan.highlights}</p>
              {plan.n1coLink && (
                <a
                  href={plan.n1coLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 mt-1 truncate max-w-xs"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  {plan.n1coLink}
                </a>
              )}
            </div>

            <div className="text-right shrink-0">
              <div className="text-xl font-black">${plan.price}</div>
              <div className="text-xs text-zinc-500">{formatCycle(plan.billingCycleDays)}</div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => openEdit(plan)}
                className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                title="Editar"
              >
                <Pencil className="w-4 h-4" />
              </button>
              {deleteConfirm === plan.id ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(plan.id)}
                    disabled={loading}
                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-2 py-1 text-xs bg-zinc-200 dark:bg-white/10 rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(plan.id)}
                  className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-zinc-400 hover:text-red-500"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {plans.length === 0 && (
          <div className="text-center py-12 text-zinc-400 dark:text-zinc-600">
            No hay planes. Crea el primero.
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-white/10">
              <h2 className="text-lg font-bold">{editingId ? 'Editar plan' : 'Nuevo plan'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Slug *</label>
                  <input
                    required
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                    disabled={!!editingId}
                    placeholder="BASIC, PROFESSIONAL…"
                    className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-white/10 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Nombre *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Inicial, Profesional…"
                    className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-white/10 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="pt-1 pb-0.5">
                <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">🇪🇸 Español</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Descripción (ES)</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Para profesionales independientes"
                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-white/10 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Highlights (ES)</label>
                <input
                  value={form.highlights}
                  onChange={e => setForm(f => ({ ...f, highlights: e.target.value }))}
                  placeholder="1 sucursal · 3 especialistas · 20 servicios"
                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-white/10 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-1 pb-0.5">
                <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">🇺🇸 English</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Name (EN)</label>
                  <input
                    value={form.nameEn}
                    onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
                    placeholder="Starter, Professional…"
                    className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-white/10 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Highlights (EN)</label>
                  <input
                    value={form.highlightsEn}
                    onChange={e => setForm(f => ({ ...f, highlightsEn: e.target.value }))}
                    placeholder="1 branch · 3 specialists · 20 services"
                    className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-white/10 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Description (EN)</label>
                <input
                  value={form.descriptionEn}
                  onChange={e => setForm(f => ({ ...f, descriptionEn: e.target.value }))}
                  placeholder="For independent professionals"
                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-white/10 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Precio (USD) *</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="25.00"
                    className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-white/10 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Ciclo (días) *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.billingCycleDays}
                    onChange={e => setForm(f => ({ ...f, billingCycleDays: e.target.value }))}
                    placeholder="30"
                    className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-white/10 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Link de N1CO</label>
                <input
                  type="url"
                  value={form.n1coLink}
                  onChange={e => setForm(f => ({ ...f, n1coLink: e.target.value }))}
                  placeholder="https://pay.n1co.shop/pl/…"
                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-white/10 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Orden (sort)</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-white/10 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex flex-col gap-3 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                      className="w-4 h-4 rounded accent-purple-600"
                    />
                    <span className="text-sm font-medium">Activo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isTest}
                      onChange={e => setForm(f => ({ ...f, isTest: e.target.checked }))}
                      className="w-4 h-4 rounded accent-amber-500"
                    />
                    <span className="text-sm font-medium">Plan de prueba (badge TEST)</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
                  {loading ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
