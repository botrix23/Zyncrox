'use client'

import { useState } from 'react'
import { CreditCard, AlertTriangle, CheckCircle, XCircle, X } from 'lucide-react'
import { PLAN_FEATURES, PLAN_PRICES, PlanType } from '@/core/plans'
import {
  activateSubscriptionAction,
  cancelSubscriptionAction,
  changePlanAction,
  reactivateSubscriptionAction,
  updateCardAction,
} from '@/app/actions/subscription'
import { N1coCardData } from '@/lib/n1co'

type SubscriptionData = {
  id: string
  plan: string
  status: string
  cardLast4: string | null
  cardBrand: string | null
  cardExpMonth: string | null
  cardExpYear: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelledAt: string | null
  gracePeriodEndsAt: string | null
  lastPaymentAt: string | null
  lastPaymentAmount: string | null
}

type Props = {
  tenantId: string
  plan: string
  tenantStatus: string
  subscription: SubscriptionData | null
}

const PLANS: PlanType[] = ['BASIC', 'PROFESSIONAL', 'ENTERPRISE']
const PLAN_NAMES: Record<PlanType, string> = {
  BASIC: 'Basic',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
}
const PLAN_ORDER: Record<string, number> = { BASIC: 0, PROFESSIONAL: 1, ENTERPRISE: 2 }

const FEATURE_LABELS: Array<{ key: keyof typeof PLAN_FEATURES.BASIC; label: string }> = [
  { key: 'maxBranches', label: 'Sucursales' },
  { key: 'maxStaff', label: 'Staff' },
  { key: 'maxServices', label: 'Servicios' },
  { key: 'multiServiceBooking', label: 'Reserva multi-servicio' },
  { key: 'customTheme', label: 'Tema personalizado' },
  { key: 'customHero', label: 'Hero personalizable' },
  { key: 'customEmailTemplate', label: 'Template de email' },
  { key: 'simultaneousServices', label: 'Servicios simultáneos' },
  { key: 'serviceCategories', label: 'Categorías de servicios' },
  { key: 'staffAccess', label: 'Acceso del staff' },
  { key: 'staffRotations', label: 'Rotaciones de staff' },
  { key: 'surveys', label: 'Encuestas' },
  { key: 'nps', label: 'NPS' },
  { key: 'weeklyMonthlyStats', label: 'Estadísticas' },
  { key: 'advancedAnalytics', label: 'Analítica avanzada' },
  { key: 'prioritySupport', label: 'Soporte prioritario' },
]

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' })
}

function featureValue(plan: PlanType, key: keyof typeof PLAN_FEATURES.BASIC): string {
  const val = PLAN_FEATURES[plan][key]
  if (typeof val === 'boolean') return val ? '✓' : '✗'
  if (val === 9999) return '∞'
  return String(val)
}

function CardForm({
  onSubmit,
  loading,
  submitLabel,
}: {
  onSubmit: (data: N1coCardData) => void
  loading: boolean
  submitLabel: string
}) {
  const [number, setNumber] = useState('')
  const [holderName, setHolderName] = useState('')
  const [expMonth, setExpMonth] = useState('')
  const [expYear, setExpYear] = useState('')
  const [cvv, setCvv] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ number, holderName, expMonth, expYear, cvv })
  }

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'

  return (
    /* TODO: Replace with n1co's hosted fields or JS SDK for PCI compliance */
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Número de tarjeta</label>
        <input
          className={inputCls}
          placeholder="4242 4242 4242 4242"
          value={number}
          onChange={e => setNumber(e.target.value)}
          maxLength={19}
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Nombre en tarjeta</label>
        <input
          className={inputCls}
          placeholder="Juan García"
          value={holderName}
          onChange={e => setHolderName(e.target.value)}
          required
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">MM/AA</label>
          <input
            className={inputCls}
            placeholder="12/27"
            value={`${expMonth}${expMonth.length === 2 ? '/' : ''}${expYear}`}
            onChange={e => {
              const raw = e.target.value.replace(/\D/g, '')
              setExpMonth(raw.slice(0, 2))
              setExpYear(raw.slice(2, 4))
            }}
            maxLength={5}
            required
          />
        </div>
        <div className="w-24">
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">CVV</label>
          <input
            className={inputCls}
            placeholder="123"
            value={cvv}
            onChange={e => setCvv(e.target.value.replace(/\D/g, ''))}
            maxLength={4}
            required
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
      >
        {loading ? 'Procesando...' : submitLabel}
      </button>
    </form>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-white/10">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export default function BillingClient({ tenantId, plan, tenantStatus, subscription }: Props) {
  const [modal, setModal] = useState<'upgrade' | 'downgrade' | 'cancel' | 'card' | 'activate' | 'reactivate' | null>(null)
  const [targetPlan, setTargetPlan] = useState<PlanType>('PROFESSIONAL')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const currentPlan = (plan || 'BASIC') as PlanType
  const isSuspended = tenantStatus === 'SUSPENDED'
  const hasSubscription = !!subscription
  const subStatus = subscription?.status ?? null
  const isActive = subStatus === 'ACTIVE'
  const isPastDue = subStatus === 'PAST_DUE'
  const isCancelled = subStatus === 'CANCELLED'

  const showError = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(null), 5000)
  }
  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 4000)
  }

  const openPlanModal = (p: PlanType) => {
    setTargetPlan(p)
    const currentOrder = PLAN_ORDER[currentPlan] ?? 0
    const targetOrder = PLAN_ORDER[p] ?? 0
    if (!hasSubscription || isSuspended || isCancelled) {
      setModal('activate')
    } else if (targetOrder > currentOrder) {
      setModal('upgrade')
    } else {
      setModal('downgrade')
    }
  }

  const handleActivate = async (cardData: N1coCardData) => {
    setLoading(true)
    const res = await activateSubscriptionAction(tenantId, targetPlan, cardData)
    setLoading(false)
    if (res.success) {
      setModal(null)
      showSuccess('Suscripción activada correctamente')
    } else {
      showError(res.error ?? 'Error al activar la suscripción')
    }
  }

  const handleReactivate = async (cardData?: N1coCardData) => {
    setLoading(true)
    const res = await reactivateSubscriptionAction(tenantId, targetPlan, cardData)
    setLoading(false)
    if (res.success) {
      setModal(null)
      showSuccess('Cuenta reactivada correctamente')
    } else {
      showError(res.error ?? 'Error al reactivar')
    }
  }

  const handleChangePlan = async () => {
    setLoading(true)
    const res = await changePlanAction(tenantId, targetPlan)
    setLoading(false)
    if (res.success) {
      setModal(null)
      showSuccess('Plan actualizado correctamente')
    } else {
      showError(res.error ?? 'Error al cambiar el plan')
    }
  }

  const handleCancel = async () => {
    setLoading(true)
    const res = await cancelSubscriptionAction(tenantId)
    setLoading(false)
    if (res.success) {
      setModal(null)
      showSuccess('Suscripción cancelada')
    } else {
      showError(res.error ?? 'Error al cancelar')
    }
  }

  const handleUpdateCard = async (cardData: N1coCardData) => {
    setLoading(true)
    const res = await updateCardAction(tenantId, cardData)
    setLoading(false)
    if (res.success) {
      setModal(null)
      showSuccess('Tarjeta actualizada correctamente')
    } else {
      showError(res.error ?? 'Error al actualizar la tarjeta')
    }
  }

  const currentFeatures = PLAN_FEATURES[currentPlan]
  const targetFeatures = PLAN_FEATURES[targetPlan]

  const gainedFeatures = FEATURE_LABELS.filter(f => {
    const cur = currentFeatures[f.key]
    const tgt = targetFeatures[f.key]
    if (typeof cur === 'boolean' && typeof tgt === 'boolean') return !cur && tgt
    if (typeof cur === 'number' && typeof tgt === 'number') return tgt > cur
    return false
  })

  const lostFeatures = FEATURE_LABELS.filter(f => {
    const cur = currentFeatures[f.key]
    const tgt = targetFeatures[f.key]
    if (typeof cur === 'boolean' && typeof tgt === 'boolean') return cur && !tgt
    if (typeof cur === 'number' && typeof tgt === 'number') return tgt < cur
    return false
  })

  const cardCls = 'bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-3xl p-6'

  if (isSuspended) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Facturación</h1>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-400 text-sm">
            <XCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl text-green-700 dark:text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        <div className={`${cardCls} border-red-200 dark:border-red-800`}>
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="w-6 h-6 text-red-500" />
            <h2 className="text-lg font-bold text-red-600 dark:text-red-400">Tu cuenta está suspendida</h2>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
            Reactiva tu suscripción para recuperar el acceso a todas las funciones.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map(p => (
              <div
                key={p}
                className={`rounded-2xl border p-4 cursor-pointer transition-all ${p === currentPlan
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-zinc-200 dark:border-white/10 hover:border-purple-400'}`}
              >
                <div className="text-sm font-bold mb-1">{PLAN_NAMES[p]}</div>
                <div className="text-2xl font-black mb-3">${PLAN_PRICES[p]}<span className="text-sm font-normal text-zinc-500">/mes</span></div>
                <button
                  onClick={() => { setTargetPlan(p); setModal('reactivate') }}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Reactivar con {PLAN_NAMES[p]}
                </button>
              </div>
            ))}
          </div>
        </div>

        {modal === 'reactivate' && (
          <Modal title={`Reactivar con plan ${PLAN_NAMES[targetPlan]}`} onClose={() => setModal(null)}>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Se te cobrará <strong>${PLAN_PRICES[targetPlan]}</strong> hoy. Tu nueva fecha de facturación será <strong>hoy</strong>.
            </p>
            <CardForm
              onSubmit={data => handleReactivate(data)}
              loading={loading}
              submitLabel={`Reactivar — $${PLAN_PRICES[targetPlan]}`}
            />
          </Modal>
        )}
      </div>
    )
  }

  if (!hasSubscription) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Facturación</h1>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-400 text-sm">
            <XCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl text-green-700 dark:text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        <div className={cardCls}>
          <h2 className="text-lg font-bold mb-2">Elige tu plan</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Selecciona el plan que mejor se adapte a tu negocio para activar tu cuenta.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map(p => (
              <div key={p} className="rounded-2xl border border-zinc-200 dark:border-white/10 p-4">
                <div className="text-sm font-bold mb-1">{PLAN_NAMES[p]}</div>
                <div className="text-2xl font-black mb-3">${PLAN_PRICES[p]}<span className="text-sm font-normal text-zinc-500">/mes</span></div>
                <ul className="space-y-1 mb-4">
                  {FEATURE_LABELS.slice(0, 6).map(f => (
                    <li key={f.key} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className={PLAN_FEATURES[p][f.key] ? 'text-purple-600' : 'text-zinc-300 dark:text-zinc-600'}>
                        {featureValue(p, f.key)}
                      </span>
                      {f.label}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => openPlanModal(p)}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Activar {PLAN_NAMES[p]}
                </button>
              </div>
            ))}
          </div>
        </div>

        {modal === 'activate' && (
          <Modal title={`Activar plan ${PLAN_NAMES[targetPlan]}`} onClose={() => setModal(null)}>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Se te cobrará <strong>${PLAN_PRICES[targetPlan]}</strong> hoy. Tu ciclo de facturación será cada 30 días.
            </p>
            <CardForm onSubmit={handleActivate} loading={loading} submitLabel={`Activar — $${PLAN_PRICES[targetPlan]}`} />
          </Modal>
        )}
      </div>
    )
  }

  const today = new Date().toISOString()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Facturación</h1>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-400 text-sm">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className={cardCls}>
            <h2 className="text-base font-bold mb-4">Tu suscripción</h2>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full uppercase">
                {PLAN_NAMES[currentPlan]}
              </span>
              {isActive && (
                <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
                  Activo
                </span>
              )}
              {isPastDue && (
                <span className="px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-semibold rounded-full">
                  Vencido
                </span>
              )}
              {isCancelled && (
                <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold rounded-full">
                  Cancelado
                </span>
              )}
            </div>

            {isActive && subscription?.currentPeriodEnd && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Próxima factura: <strong>${PLAN_PRICES[currentPlan]}</strong> el{' '}
                <strong>{formatDate(subscription.currentPeriodEnd)}</strong>
              </p>
            )}

            {isCancelled && subscription?.currentPeriodEnd && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Acceso hasta: <strong>{formatDate(subscription.currentPeriodEnd)}</strong>. Después tu cuenta quedará suspendida.
              </p>
            )}

            {isPastDue && subscription?.gracePeriodEndsAt && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Tu pago falló. Tienes hasta el <strong>{formatDate(subscription.gracePeriodEndsAt)}</strong> para actualizar tu tarjeta antes de que tu cuenta sea suspendida.
                </p>
              </div>
            )}
          </div>

          {(isActive || isPastDue) && subscription?.cardLast4 && (
            <div className={cardCls}>
              <h2 className="text-base font-bold mb-4">Método de pago</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-8 bg-zinc-100 dark:bg-white/10 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {subscription.cardBrand ?? 'Tarjeta'} •••• {subscription.cardLast4}
                    </p>
                    {subscription.cardExpMonth && subscription.cardExpYear && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Vence {subscription.cardExpMonth}/{subscription.cardExpYear}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setModal('card')}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors"
                >
                  Actualizar
                </button>
              </div>
            </div>
          )}

          {(isActive || isPastDue) && (
            <button
              onClick={() => setModal('cancel')}
              className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
            >
              Cancelar suscripción
            </button>
          )}

          {isCancelled && (
            <button
              onClick={() => { setTargetPlan(currentPlan); setModal('reactivate') }}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Reactivar suscripción
            </button>
          )}
        </div>

        <div className={cardCls}>
          <h2 className="text-base font-bold mb-4">Cambiar plan</h2>
          <div className="space-y-3">
            {PLANS.map(p => {
              const isCurrent = p === currentPlan
              const isUpgrade = PLAN_ORDER[p] > PLAN_ORDER[currentPlan]
              return (
                <div
                  key={p}
                  className={`rounded-2xl border p-4 transition-all ${isCurrent
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10'
                    : 'border-zinc-200 dark:border-white/10'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{PLAN_NAMES[p]}</span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">Plan actual</span>
                      )}
                    </div>
                    <span className="text-lg font-black">${PLAN_PRICES[p]}<span className="text-xs font-normal text-zinc-500">/mes</span></span>
                  </div>

                  <ul className="space-y-1 mb-3">
                    {FEATURE_LABELS.slice(0, 5).map(f => (
                      <li key={f.key} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className={PLAN_FEATURES[p][f.key] && PLAN_FEATURES[p][f.key] !== false ? 'text-purple-600 font-bold' : 'text-zinc-300 dark:text-zinc-600'}>
                          {featureValue(p, f.key)}
                        </span>
                        {f.label}
                      </li>
                    ))}
                  </ul>

                  {!isCurrent && (
                    <button
                      onClick={() => openPlanModal(p)}
                      className={`w-full py-1.5 text-xs font-semibold rounded-xl transition-colors ${isUpgrade
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300'}`}
                    >
                      {isUpgrade ? `Subir a ${PLAN_NAMES[p]}` : `Bajar a ${PLAN_NAMES[p]}`}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {modal === 'upgrade' && (
        <Modal title={`Subir a ${PLAN_NAMES[targetPlan]}`} onClose={() => setModal(null)}>
          {gainedFeatures.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Lo que ganarás</p>
              <ul className="space-y-1.5">
                {gainedFeatures.map(f => (
                  <li key={f.key} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <span className="text-green-500 font-bold">✓</span>
                    {f.label}
                    {typeof PLAN_FEATURES[targetPlan][f.key] === 'number' && (
                      <span className="text-zinc-500 text-xs">
                        ({PLAN_FEATURES[currentPlan][f.key]} → {PLAN_FEATURES[targetPlan][f.key] === 9999 ? '∞' : PLAN_FEATURES[targetPlan][f.key]})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5 py-3 border-t border-zinc-100 dark:border-white/10">
            Se te cobrará <strong>${PLAN_PRICES[targetPlan]}</strong> hoy. Tu nueva fecha de facturación será <strong>hoy</strong>.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setModal(null)}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleChangePlan}
              disabled={loading}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? 'Procesando...' : `Confirmar — $${PLAN_PRICES[targetPlan]}`}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'downgrade' && (
        <Modal title={`Bajar a ${PLAN_NAMES[targetPlan]}`} onClose={() => setModal(null)}>
          {lostFeatures.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Lo que perderás</p>
              <ul className="space-y-1.5">
                {lostFeatures.map(f => (
                  <li key={f.key} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <span className="text-red-500 font-bold">✗</span>
                    {f.label}
                    {typeof PLAN_FEATURES[currentPlan][f.key] === 'number' && (
                      <span className="text-zinc-500 text-xs">
                        ({PLAN_FEATURES[currentPlan][f.key] === 9999 ? '∞' : PLAN_FEATURES[currentPlan][f.key]} → {PLAN_FEATURES[targetPlan][f.key] === 9999 ? '∞' : PLAN_FEATURES[targetPlan][f.key]})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {targetPlan === 'BASIC' && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl mb-4">
              <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Solo tu empleado más antiguo quedará activo. El resto será desactivado.
              </p>
            </div>
          )}
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5 py-3 border-t border-zinc-100 dark:border-white/10">
            Se te cobrará <strong>${PLAN_PRICES[targetPlan]}</strong> hoy. Tu nueva fecha de facturación será <strong>hoy</strong>.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setModal(null)}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleChangePlan}
              disabled={loading}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? 'Procesando...' : `Confirmar bajada — $${PLAN_PRICES[targetPlan]}`}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'cancel' && (
        <Modal title="Cancelar suscripción" onClose={() => setModal(null)}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
            Tu acceso continuará hasta{' '}
            <strong>{formatDate(subscription?.currentPeriodEnd ?? null)}</strong>.
            Después, tu cuenta quedará suspendida.
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-6">
            No se realizarán más cobros.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setModal(null)}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
            >
              Mantener suscripción
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? 'Cancelando...' : 'Confirmar cancelación'}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'card' && (
        <Modal title="Actualizar tarjeta" onClose={() => setModal(null)}>
          <CardForm onSubmit={handleUpdateCard} loading={loading} submitLabel="Guardar tarjeta" />
        </Modal>
      )}

      {modal === 'activate' && (
        <Modal title={`Activar plan ${PLAN_NAMES[targetPlan]}`} onClose={() => setModal(null)}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Se te cobrará <strong>${PLAN_PRICES[targetPlan]}</strong> hoy. Tu ciclo de facturación será cada 30 días.
          </p>
          <CardForm onSubmit={handleActivate} loading={loading} submitLabel={`Activar — $${PLAN_PRICES[targetPlan]}`} />
        </Modal>
      )}

      {modal === 'reactivate' && (
        <Modal title={`Reactivar con plan ${PLAN_NAMES[targetPlan]}`} onClose={() => setModal(null)}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Se te cobrará <strong>${PLAN_PRICES[targetPlan]}</strong> hoy. Tu nueva fecha de facturación será <strong>hoy</strong>.
          </p>
          {subscription?.cardLast4 ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-white/5 rounded-xl mb-4">
                <CreditCard className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {subscription.cardBrand ?? 'Tarjeta'} •••• {subscription.cardLast4}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleReactivate()}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
                >
                  {loading ? 'Procesando...' : `Reactivar — $${PLAN_PRICES[targetPlan]}`}
                </button>
              </div>
            </>
          ) : (
            <CardForm onSubmit={data => handleReactivate(data)} loading={loading} submitLabel={`Reactivar — $${PLAN_PRICES[targetPlan]}`} />
          )}
        </Modal>
      )}
    </div>
  )
}
