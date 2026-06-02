'use client'

import React, { useState } from 'react'
import { CreditCard, AlertTriangle, CheckCircle, XCircle, X } from 'lucide-react'
import { PLAN_FEATURES, PLAN_PRICES, PlanType } from '@/core/plans'

type DynamicPrices = Record<PlanType, number>
import {
  activateSubscriptionAction,
  cancelSubscriptionAction,
  changePlanAction,
  reactivateSubscriptionAction,
  updateCardAction,
} from '@/app/actions/subscription'
import { N1coCardData } from '@/lib/n1co'
import { useTranslations } from 'next-intl'

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
  pendingPlan: string | null
}

type Props = {
  tenantId: string
  plan: string
  tenantStatus: string
  subscription: SubscriptionData | null
  locale: string
  planPrices?: DynamicPrices
}

const PLANS: PlanType[] = ['BASIC', 'PROFESSIONAL', 'ENTERPRISE']
const PLAN_NAMES: Record<PlanType, string> = {
  BASIC: 'Basic',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Business',
}
const PLAN_ORDER: Record<string, number> = { BASIC: 0, PROFESSIONAL: 1, ENTERPRISE: 2 }

const PLAN_SUBTITLES: Record<PlanType, { en: string; es: string }> = {
  BASIC:        { en: 'For independent professionals', es: 'Para profesionales independientes' },
  PROFESSIONAL: { en: 'For mid-size salons',           es: 'Para salones medianos' },
  ENTERPRISE:   { en: 'For chains & clinics',          es: 'Para cadenas y clínicas' },
}

const PLAN_HIGHLIGHTS: Record<PlanType, { en: string; es: string }> = {
  BASIC:        { en: '1 location · 2 specialists · 20 services', es: '1 sucursal · 2 especialistas · 20 servicios' },
  PROFESSIONAL: { en: '3 locations · 15 specialists · 50 services', es: '3 sucursales · 15 especialistas · 50 servicios' },
  ENTERPRISE:   { en: 'Unlimited everything',                       es: 'Todo ilimitado' },
}

const FEATURE_KEYS: Array<keyof typeof PLAN_FEATURES.BASIC> = [
  'maxBranches', 'maxStaff', 'maxServices', 'multiServiceBooking',
  'customTheme', 'customHero', 'customEmailTemplate', 'simultaneousServices',
  'serviceCategories', 'staffAccess', 'staffRotations', 'surveys',
  'nps', 'weeklyMonthlyStats', 'advancedAnalytics', 'prioritySupport',
]

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-SV', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function featureValue(plan: PlanType, key: keyof typeof PLAN_FEATURES.BASIC): string {
  const val = PLAN_FEATURES[plan][key]
  if (typeof val === 'boolean') return val ? '✓' : '✗'
  if (val === 9999) return '∞'
  return String(val)
}

function CardForm({
  onSubmit, loading, submitLabel,
}: {
  onSubmit: (data: N1coCardData) => void
  loading: boolean
  submitLabel: string
}) {
  const t = useTranslations('Billing')
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('card.number')}</label>
        <input className={inputCls} placeholder="4242 4242 4242 4242" value={number}
          onChange={e => setNumber(e.target.value)} maxLength={19} required />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('card.holder')}</label>
        <input className={inputCls} placeholder="Juan García" value={holderName}
          onChange={e => setHolderName(e.target.value)} required />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('card.expiry')}</label>
          <input className={inputCls} placeholder="12/27"
            value={`${expMonth}${expMonth.length === 2 ? '/' : ''}${expYear}`}
            onChange={e => {
              const raw = e.target.value.replace(/\D/g, '')
              setExpMonth(raw.slice(0, 2))
              setExpYear(raw.slice(2, 4))
            }} maxLength={5} required />
        </div>
        <div className="w-24">
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('card.cvv')}</label>
          <input className={inputCls} placeholder="123" value={cvv}
            onChange={e => setCvv(e.target.value.replace(/\D/g, ''))} maxLength={4} required />
        </div>
      </div>
      <button type="submit" disabled={loading}
        className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
        {loading ? <span>...</span> : submitLabel}
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

export default function BillingClient({ tenantId, plan, tenantStatus, subscription, locale, planPrices: dynamicPrices }: Props) {
  // Use dynamic prices from platform_config if provided, fallback to hardcoded
  const prices: DynamicPrices = dynamicPrices ?? PLAN_PRICES
  const t = useTranslations('Billing')
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

  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(null), 5000) }
  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 4000) }

  const openPlanModal = (p: PlanType) => {
    setTargetPlan(p)
    const currentOrder = PLAN_ORDER[currentPlan] ?? 0
    const targetOrder = PLAN_ORDER[p] ?? 0
    if (!hasSubscription || isSuspended || isCancelled) setModal('activate')
    else if (targetOrder > currentOrder) setModal('upgrade')
    else setModal('downgrade')
  }

  const handleActivate = async (cardData: N1coCardData) => {
    setLoading(true)
    const res = await activateSubscriptionAction(tenantId, targetPlan, cardData)
    setLoading(false)
    if (res.success) { setModal(null); showSuccess(t('success.activated')) }
    else showError(res.error ?? t('error.activate'))
  }

  const handleReactivate = async (cardData?: N1coCardData) => {
    setLoading(true)
    const res = await reactivateSubscriptionAction(tenantId, targetPlan, cardData)
    setLoading(false)
    if (res.success) { setModal(null); showSuccess(t('success.reactivated')) }
    else showError(res.error ?? t('error.reactivate'))
  }

  const handleChangePlan = async () => {
    setLoading(true)
    const res = await changePlanAction(tenantId, targetPlan)
    setLoading(false)
    if (res.success) {
      setModal(null)
      if (res.deferred) {
        showSuccess(t('success.planDowngradeScheduled', { plan: PLAN_NAMES[targetPlan], date: formatDate(subscription?.currentPeriodEnd ?? null, locale) }))
      } else {
        showSuccess(t('success.planUpgraded', { plan: PLAN_NAMES[targetPlan] }))
      }
    } else {
      showError(res.error ?? t('error.changePlan'))
    }
  }

  const handleCancel = async () => {
    setLoading(true)
    const res = await cancelSubscriptionAction(tenantId)
    setLoading(false)
    if (res.success) { setModal(null); showSuccess(t('success.cancelled')) }
    else showError(res.error ?? t('error.cancel'))
  }

  const handleUpdateCard = async (cardData: N1coCardData) => {
    setLoading(true)
    const res = await updateCardAction(tenantId, cardData)
    setLoading(false)
    if (res.success) { setModal(null); showSuccess(t('success.cardUpdated')) }
    else showError(res.error ?? t('error.updateCard'))
  }

  const currentFeatures = PLAN_FEATURES[currentPlan]
  const targetFeatures = PLAN_FEATURES[targetPlan]

  const gainedFeatures = FEATURE_KEYS.filter(key => {
    const cur = currentFeatures[key]; const tgt = targetFeatures[key]
    if (typeof cur === 'boolean' && typeof tgt === 'boolean') return !cur && tgt
    if (typeof cur === 'number' && typeof tgt === 'number') return tgt > cur
    return false
  })

  const lostFeatures = FEATURE_KEYS.filter(key => {
    const cur = currentFeatures[key]; const tgt = targetFeatures[key]
    if (typeof cur === 'boolean' && typeof tgt === 'boolean') return cur && !tgt
    if (typeof cur === 'number' && typeof tgt === 'number') return tgt < cur
    return false
  })

  const cardCls = 'bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-3xl p-6'

  const Alerts = () => (
    <>
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
    </>
  )

  const richStrong = (chunks: React.ReactNode) => <strong>{chunks}</strong>

  if (isSuspended) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Alerts />
        <div className={`${cardCls} border-red-200 dark:border-red-800`}>
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="w-6 h-6 text-red-500" />
            <h2 className="text-lg font-bold text-red-600 dark:text-red-400">{t('suspended.title')}</h2>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">{t('suspended.desc')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map(p => (
              <div key={p} className={`rounded-2xl border p-4 cursor-pointer transition-all ${p === currentPlan ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-zinc-200 dark:border-white/10 hover:border-purple-400'}`}>
                <div className="text-sm font-bold mb-0.5">{PLAN_NAMES[p]}</div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{PLAN_SUBTITLES[p][locale as 'en' | 'es'] ?? PLAN_SUBTITLES[p].en}</p>
                <div className="text-2xl font-black mb-1">${prices[p]}<span className="text-sm font-normal text-zinc-500">{t('perMonth')}</span></div>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-3">{PLAN_HIGHLIGHTS[p][locale as 'en' | 'es'] ?? PLAN_HIGHLIGHTS[p].en}</p>
                <button onClick={() => { setTargetPlan(p); setModal('reactivate') }}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors">
                  {t('suspended.reactivateWith', { plan: PLAN_NAMES[p] })}
                </button>
              </div>
            ))}
          </div>
        </div>
        {modal === 'reactivate' && (
          <Modal title={t('modal.reactivate.title', { plan: PLAN_NAMES[targetPlan] })} onClose={() => setModal(null)}>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{t.rich('modal.reactivate.charge', { amount: PLAN_PRICES[targetPlan], strong: richStrong })}</p>
            <CardForm onSubmit={data => handleReactivate(data)} loading={loading} submitLabel={t('modal.confirmReactivate', { amount: PLAN_PRICES[targetPlan] })} />
          </Modal>
        )}
      </div>
    )
  }

  if (!hasSubscription) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Alerts />
        <div className={cardCls}>
          <h2 className="text-lg font-bold mb-2">{t('noSub.title')}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{t('noSub.desc')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map(p => (
              <div key={p} className="rounded-2xl border border-zinc-200 dark:border-white/10 p-4">
                <div className="text-sm font-bold mb-0.5">{PLAN_NAMES[p]}</div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{PLAN_SUBTITLES[p][locale as 'en' | 'es'] ?? PLAN_SUBTITLES[p].en}</p>
                <div className="text-2xl font-black mb-1">${prices[p]}<span className="text-sm font-normal text-zinc-500">{t('perMonth')}</span></div>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-3">{PLAN_HIGHLIGHTS[p][locale as 'en' | 'es'] ?? PLAN_HIGHLIGHTS[p].en}</p>
                <ul className="space-y-1 mb-4">
                  {FEATURE_KEYS.slice(0, 6).map(key => (
                    <li key={key} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className={PLAN_FEATURES[p][key] ? 'text-purple-600' : 'text-zinc-300 dark:text-zinc-600'}>{featureValue(p, key)}</span>
                      {t(`features.${key}` as any)}
                    </li>
                  ))}
                </ul>
                <button onClick={() => openPlanModal(p)}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors">
                  {t('noSub.activate', { plan: PLAN_NAMES[p] })}
                </button>
              </div>
            ))}
          </div>
        </div>
        {modal === 'activate' && (
          <Modal title={t('modal.activate.title', { plan: PLAN_NAMES[targetPlan] })} onClose={() => setModal(null)}>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{t.rich('modal.activate.charge', { amount: PLAN_PRICES[targetPlan], strong: richStrong })}</p>
            <CardForm onSubmit={handleActivate} loading={loading} submitLabel={t('modal.confirmActivate', { amount: PLAN_PRICES[targetPlan] })} />
          </Modal>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <Alerts />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className={cardCls}>
            <h2 className="text-base font-bold mb-4">{t('currentSub.title')}</h2>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full uppercase">{PLAN_NAMES[currentPlan]}</span>
              {isActive && <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">{t('currentSub.statusActive')}</span>}
              {isPastDue && <span className="px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-semibold rounded-full">{t('currentSub.statusPastDue')}</span>}
              {isCancelled && <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold rounded-full">{t('currentSub.statusCancelled')}</span>}
            </div>

            {isActive && subscription?.currentPeriodEnd && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.rich('currentSub.nextInvoice', { amount: prices[currentPlan], date: formatDate(subscription.currentPeriodEnd, locale), strong: richStrong })}</p>
            )}
            {isCancelled && subscription?.currentPeriodEnd && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.rich('currentSub.accessUntil', { date: formatDate(subscription.currentPeriodEnd, locale), strong: richStrong })}</p>
            )}
            {isPastDue && subscription?.gracePeriodEndsAt && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-400">{t.rich('currentSub.paymentFailed', { date: formatDate(subscription.gracePeriodEndsAt, locale), strong: richStrong })}</p>
              </div>
            )}

            {isActive && subscription?.pendingPlan && (
              <div className="flex items-start gap-2 p-3 mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {t.rich('currentSub.pendingDowngrade', {
                    plan: PLAN_NAMES[subscription.pendingPlan as PlanType] ?? subscription.pendingPlan,
                    date: formatDate(subscription.currentPeriodEnd, locale),
                    strong: richStrong,
                  })}
                </p>
              </div>
            )}

            {/* Cancel button — visible inside the card */}
            {(isActive || isPastDue) && (
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-white/10">
                <button
                  onClick={() => setModal('cancel')}
                  className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium transition-colors group"
                >
                  <XCircle className="w-4 h-4" />
                  {t('cancelLink')}
                </button>
              </div>
            )}
          </div>

          {(isActive || isPastDue) && subscription?.cardLast4 && (
            <div className={cardCls}>
              <h2 className="text-base font-bold mb-4">{t('payment.title')}</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-8 bg-zinc-100 dark:bg-white/10 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{subscription.cardBrand ?? t('payment.card')} •••• {subscription.cardLast4}</p>
                    {subscription.cardExpMonth && subscription.cardExpYear && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('payment.expires', { month: subscription.cardExpMonth, year: subscription.cardExpYear })}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setModal('card')} className="text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors">{t('payment.update')}</button>
              </div>
            </div>
          )}

          {isCancelled && (
            <button onClick={() => { setTargetPlan(currentPlan); setModal('reactivate') }}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors">
              {t('reactivateBtn')}
            </button>
          )}
        </div>

        <div className={cardCls}>
          <h2 className="text-base font-bold mb-4">{t('changePlan.title')}</h2>
          <div className="space-y-3">
            {PLANS.map(p => {
              const isCurrent = p === currentPlan
              const isUpgrade = PLAN_ORDER[p] > PLAN_ORDER[currentPlan]
              return (
                <div key={p} className={`rounded-2xl border p-4 transition-all ${isCurrent ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10' : 'border-zinc-200 dark:border-white/10'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{PLAN_NAMES[p]}</span>
                      {isCurrent && <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">{t('changePlan.current')}</span>}
                    </div>
                    <span className="text-lg font-black">${prices[p]}<span className="text-xs font-normal text-zinc-500">{t('perMonth')}</span></span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">{PLAN_SUBTITLES[p][locale as 'en' | 'es'] ?? PLAN_SUBTITLES[p].en}</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-2">{PLAN_HIGHLIGHTS[p][locale as 'en' | 'es'] ?? PLAN_HIGHLIGHTS[p].en}</p>
                  <ul className="space-y-1 mb-3">
                    {FEATURE_KEYS.slice(0, 5).map(key => (
                      <li key={key} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className={PLAN_FEATURES[p][key] && PLAN_FEATURES[p][key] !== 0 ? 'text-purple-600 font-bold' : 'text-zinc-300 dark:text-zinc-600'}>{featureValue(p, key)}</span>
                        {t(`features.${key}` as any)}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <button onClick={() => openPlanModal(p)}
                      className={`w-full py-1.5 text-xs font-semibold rounded-xl transition-colors ${isUpgrade ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300'}`}>
                      {isUpgrade ? t('changePlan.upgrade', { plan: PLAN_NAMES[p] }) : t('changePlan.downgrade', { plan: PLAN_NAMES[p] })}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {modal === 'upgrade' && (
        <Modal title={t('modal.upgrade.title', { plan: PLAN_NAMES[targetPlan] })} onClose={() => setModal(null)}>
          {gainedFeatures.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{t('modal.upgrade.willGain')}</p>
              <ul className="space-y-1.5">
                {gainedFeatures.map(key => (
                  <li key={key} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <span className="text-green-500 font-bold">✓</span>
                    {t(`features.${key}` as any)}
                    {typeof PLAN_FEATURES[targetPlan][key] === 'number' && (
                      <span className="text-zinc-500 text-xs">({PLAN_FEATURES[currentPlan][key]} → {PLAN_FEATURES[targetPlan][key] === 9999 ? '∞' : PLAN_FEATURES[targetPlan][key]})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5 py-3 border-t border-zinc-100 dark:border-white/10">{t.rich('modal.upgrade.charge', { amount: PLAN_PRICES[targetPlan], strong: richStrong })}</p>
          <div className="flex gap-3">
            <button onClick={() => setModal(null)} className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">{t('modal.cancel')}</button>
            <button onClick={handleChangePlan} disabled={loading} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
              {loading ? t('processing') : t('modal.confirm', { amount: PLAN_PRICES[targetPlan] })}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'downgrade' && (
        <Modal title={t('modal.downgrade.title', { plan: PLAN_NAMES[targetPlan] })} onClose={() => setModal(null)}>
          {lostFeatures.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{t('modal.downgrade.willLose')}</p>
              <ul className="space-y-1.5">
                {lostFeatures.map(key => (
                  <li key={key} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <span className="text-red-500 font-bold">✗</span>
                    {t(`features.${key}` as any)}
                    {typeof PLAN_FEATURES[currentPlan][key] === 'number' && (
                      <span className="text-zinc-500 text-xs">({PLAN_FEATURES[currentPlan][key] === 9999 ? '∞' : PLAN_FEATURES[currentPlan][key]} → {PLAN_FEATURES[targetPlan][key] === 9999 ? '∞' : PLAN_FEATURES[targetPlan][key]})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(PLAN_FEATURES[targetPlan].maxBranches < PLAN_FEATURES[currentPlan].maxBranches ||
            PLAN_FEATURES[targetPlan].maxStaff < PLAN_FEATURES[currentPlan].maxStaff ||
            PLAN_FEATURES[targetPlan].maxServices < PLAN_FEATURES[currentPlan].maxServices) && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl mb-4">
              <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">{t('modal.downgrade.limitWarning')}</p>
            </div>
          )}
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5 py-3 border-t border-zinc-100 dark:border-white/10">
            {t.rich('modal.downgrade.charge', { date: formatDate(subscription?.currentPeriodEnd ?? null, locale), strong: richStrong })}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setModal(null)} className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">{t('modal.cancel')}</button>
            <button onClick={handleChangePlan} disabled={loading} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
              {loading ? t('processing') : t('modal.confirmDowngrade')}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'cancel' && (
        <Modal title={t('modal.cancelSub.title')} onClose={() => setModal(null)}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{t.rich('modal.cancelSub.desc', { date: formatDate(subscription?.currentPeriodEnd ?? null, locale), strong: richStrong })}</p>
          <p className="text-sm text-zinc-500 mb-6">{t('modal.cancelSub.noMoreCharges')}</p>
          <div className="flex gap-3">
            <button onClick={() => setModal(null)} className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">{t('modal.cancelSub.keep')}</button>
            <button onClick={handleCancel} disabled={loading} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
              {loading ? t('modal.cancelling') : t('modal.cancelSub.confirm')}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'card' && (
        <Modal title={t('modal.updateCard.title')} onClose={() => setModal(null)}>
          <CardForm onSubmit={handleUpdateCard} loading={loading} submitLabel={t('modal.updateCard.save')} />
        </Modal>
      )}

      {modal === 'activate' && (
        <Modal title={t('modal.activate.title', { plan: PLAN_NAMES[targetPlan] })} onClose={() => setModal(null)}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4" dangerouslySetInnerHTML={{ __html: t('modal.activate.charge', { amount: PLAN_PRICES[targetPlan] }) }} />
          <CardForm onSubmit={handleActivate} loading={loading} submitLabel={t('modal.confirmActivate', { amount: PLAN_PRICES[targetPlan] })} />
        </Modal>
      )}

      {modal === 'reactivate' && (
        <Modal title={t('modal.reactivate.title', { plan: PLAN_NAMES[targetPlan] })} onClose={() => setModal(null)}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{t.rich('modal.reactivate.charge', { amount: PLAN_PRICES[targetPlan], strong: richStrong })}</p>
          {subscription?.cardLast4 ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-white/5 rounded-xl mb-4">
                <CreditCard className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{subscription.cardBrand ?? t('payment.card')} •••• {subscription.cardLast4}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">{t('modal.cancel')}</button>
                <button onClick={() => handleReactivate()} disabled={loading} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
                  {loading ? t('processing') : t('modal.confirmReactivate', { amount: PLAN_PRICES[targetPlan] })}
                </button>
              </div>
            </>
          ) : (
            <CardForm onSubmit={data => handleReactivate(data)} loading={loading} submitLabel={t('modal.confirmReactivate', { amount: PLAN_PRICES[targetPlan] })} />
          )}
        </Modal>
      )}
    </div>
  )
}
