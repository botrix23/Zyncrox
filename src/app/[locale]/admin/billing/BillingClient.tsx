'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle, ExternalLink, XCircle, X, Lock, ShieldCheck } from 'lucide-react'
import { PLAN_FEATURES, PLAN_PRICES, PlanType } from '@/core/plans'

type DynamicPrices = Record<PlanType, number>

export type DbPlan = {
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
import {
  activateSubscriptionAction,
  cancelSubscriptionAction,
  changePlanAction,
  reactivateSubscriptionAction,
} from '@/app/actions/subscription'
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
  dbPlans?: DbPlan[]
  isOwner?: boolean
}

// Fallback constants for when DB plans are not yet loaded
const FALLBACK_PLANS: PlanType[] = ['BASIC_TEST', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE']
const FALLBACK_PLAN_NAMES: Record<string, string> = {
  BASIC_TEST: 'Básico Test', BASIC: 'Inicial', PROFESSIONAL: 'Profesional', ENTERPRISE: 'Negocio',
}
const PLAN_ORDER: Record<string, number> = { BASIC_TEST: -1, BASIC: 0, PROFESSIONAL: 1, ENTERPRISE: 2 }

const FEATURE_KEYS: Array<keyof typeof PLAN_FEATURES.BASIC> = [
  'maxBranches', 'maxStaff', 'maxServices', 'multiServiceBooking',
  'customTheme', 'customHero', 'customEmailTemplate', 'simultaneousServices',
  'serviceCategories', 'staffAccess', 'staffRotations', 'surveys',
  'nps', 'weeklyMonthlyStats', 'advancedAnalytics', 'prioritySupport',
]

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '—'
  // Render billing dates in UTC so the date shown matches the calendar date N1CO
  // sends (e.g. "2026-07-09T04:23Z" must read "9 de julio", not shift to the 8th
  // for viewers in negative-UTC timezones like es-SV / UTC-6).
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-SV', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

function featureValue(plan: PlanType, key: keyof typeof PLAN_FEATURES.BASIC): string {
  const val = PLAN_FEATURES[plan][key]
  if (typeof val === 'boolean') return val ? '✓' : '✗'
  if (val === 9999) return '∞'
  return String(val)
}

/**
 * Shown in activation/upgrade/reactivation modals instead of a card form.
 * Informs the user they'll be redirected to N1CO's secure checkout.
 */
function RedirectNotice({ planName, amount, onConfirm, onCancel, loading }: {
  planName: string
  amount: number
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const t = useTranslations('Billing')
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {t('redirect.notice')}
        </p>
      </div>
      <div className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-white/5 rounded-xl">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{planName}</span>
        <span className="text-sm font-bold">${amount}{t('perMonth')}</span>
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onCancel}
          className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
          {t('modal.cancel')}
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
          {loading
            ? <span>{t('processing')}</span>
            : <><ExternalLink className="w-4 h-4" />{t('redirect.cta')}</>
          }
        </button>
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4">
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
  if (typeof document === 'undefined') return content
  return createPortal(content, document.body)
}

export default function BillingClient({ tenantId, plan, tenantStatus, subscription, locale, planPrices: dynamicPrices, dbPlans, isOwner = true }: Props) {
  const prices: DynamicPrices = { ...PLAN_PRICES, ...dynamicPrices }
  const t = useTranslations('Billing')
  const [modal, setModal] = useState<'upgrade' | 'downgrade' | 'cancel' | 'activate' | 'reactivate' | null>(null)
  const [targetPlan, setTargetPlan] = useState<string>('PROFESSIONAL')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Helpers for DB-driven plans
  const activePlans = dbPlans ?? []
  const getPlanBySlug = (slug: string): DbPlan | undefined => activePlans.find(p => p.slug === slug)
  const KNOWN_SLUGS = ['BASIC_TEST', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE']
  const getPlanName = (slug: string): string => {
    if (KNOWN_SLUGS.includes(slug)) return t(`plans.${slug}.name` as any)
    return getPlanBySlug(slug)?.name ?? FALLBACK_PLAN_NAMES[slug] ?? slug
  }
  const getPlanDescription = (slug: string): string | null => {
    if (KNOWN_SLUGS.includes(slug)) return t(`plans.${slug}.description` as any)
    return getPlanBySlug(slug)?.description ?? null
  }
  const getPlanHighlights = (slug: string): string | null => {
    if (KNOWN_SLUGS.includes(slug)) return t(`plans.${slug}.highlights` as any)
    return getPlanBySlug(slug)?.highlights ?? null
  }
  const getPlanPrice = (slug: string): number => {
    const dbPrice = getPlanBySlug(slug)?.price
    if (dbPrice) return parseFloat(dbPrice)
    return prices[slug as PlanType] ?? 0
  }
  const getPlanOrder = (slug: string): number => getPlanBySlug(slug)?.sortOrder ?? PLAN_ORDER[slug] ?? 0
  const getPlanCycleDays = (slug: string): number => getPlanBySlug(slug)?.billingCycleDays ?? 30
  const formatCycleLabel = (slug: string): string => {
    const days = getPlanCycleDays(slug)
    if (days === 30) return t('perMonth')
    if (days === 1) return t('perDay')
    return t('perDays', { days })
  }
  const planFeatures = (slug: string) => PLAN_FEATURES[slug as PlanType] ?? PLAN_FEATURES.BASIC
  // Use DB plans if available, otherwise fall back to hardcoded slugs
  const planSlugs: string[] = activePlans.length > 0
    ? activePlans.map(p => p.slug)
    : FALLBACK_PLANS

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (modal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [modal])

  const currentPlan = (plan || 'BASIC') as PlanType
  const isSuspended = tenantStatus === 'SUSPENDED'
  const hasSubscription = !!subscription
  const subStatus = subscription?.status ?? null
  const isActive = subStatus === 'ACTIVE'
  const isPastDue = subStatus === 'PAST_DUE'
  const isCancelled = subStatus === 'CANCELLED'
  const isPendingPayment = subStatus === 'PENDING_PAYMENT'

  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(null), 5000) }
  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 4000) }

  const openPlanModal = (p: string) => {
    setTargetPlan(p)
    const currentOrder = getPlanOrder(currentPlan)
    const targetOrder = getPlanOrder(p)
    if (!hasSubscription || isSuspended || isCancelled || isPendingPayment) setModal('activate')
    else if (targetOrder > currentOrder) setModal('upgrade')
    else setModal('downgrade')
  }

  // All activation / upgrade / reactivation flows redirect to N1CO checkout
  const handleActivate = async () => {
    setLoading(true)
    const res = await activateSubscriptionAction(tenantId, targetPlan)
    setLoading(false)
    if (res.success && res.redirectUrl) {
      window.location.href = res.redirectUrl
    } else {
      showError(res.error ?? t('error.activate'))
    }
  }

  const handleReactivate = async () => {
    setLoading(true)
    const res = await reactivateSubscriptionAction(tenantId, targetPlan)
    setLoading(false)
    if (res.success && res.redirectUrl) {
      window.location.href = res.redirectUrl
    } else {
      showError(res.error ?? t('error.reactivate'))
    }
  }

  const handleChangePlan = async () => {
    setLoading(true)
    const res = await changePlanAction(tenantId, targetPlan)
    setLoading(false)
    if (res.success) {
      if (res.deferred) {
        setModal(null)
        showSuccess(t('success.planDowngradeScheduled', { plan: getPlanName(targetPlan), date: formatDate(subscription?.currentPeriodEnd ?? null, locale) }))
      } else if (res.redirectUrl) {
        window.location.href = res.redirectUrl
      } else {
        setModal(null)
        showSuccess(t('success.planUpgraded', { plan: getPlanName(targetPlan) }))
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

  const currentFeatures = planFeatures(currentPlan)
  const targetFeatures = planFeatures(targetPlan)

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
        {!isOwner && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-700 dark:text-amber-400 text-sm">
            <Lock className="w-4 h-4 shrink-0" />{t('ownerOnlyNotice')}
          </div>
        )}
        <Alerts />
        <div className={`${cardCls} border-red-200 dark:border-red-800`}>
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="w-6 h-6 text-red-500" />
            <h2 className="text-lg font-bold text-red-600 dark:text-red-400">{t('suspended.title')}</h2>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">{t('suspended.desc')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {planSlugs.map(p => (
              <div key={p} className={`rounded-2xl border p-4 cursor-pointer transition-all ${p === currentPlan ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-zinc-200 dark:border-white/10 hover:border-purple-400'}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-bold">{getPlanName(p)}</span>
                  {getPlanBySlug(p)?.isTest && <span className="px-1.5 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">TEST</span>}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{getPlanDescription(p)}</p>
                <div className="text-2xl font-black mb-1">${getPlanPrice(p)}<span className="text-sm font-normal text-zinc-500">{formatCycleLabel(p)}</span></div>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-3">{getPlanHighlights(p)}</p>
                {isOwner && (
                  <button onClick={() => { setTargetPlan(p); setModal('reactivate') }}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors">
                    {t('suspended.reactivateWith', { plan: getPlanName(p) })}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        {modal === 'reactivate' && (
          <Modal title={t('modal.reactivate.title', { plan: getPlanName(targetPlan) })} onClose={() => setModal(null)}>
            <RedirectNotice
              planName={getPlanName(targetPlan)}
              amount={getPlanPrice(targetPlan)}
              onConfirm={handleReactivate}
              onCancel={() => setModal(null)}
              loading={loading}
            />
          </Modal>
        )}
      </div>
    )
  }

  if (!hasSubscription) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        {!isOwner && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-700 dark:text-amber-400 text-sm">
            <Lock className="w-4 h-4 shrink-0" />{t('ownerOnlyNotice')}
          </div>
        )}
        <Alerts />
        <div className={cardCls}>
          <h2 className="text-lg font-bold mb-2">{t('noSub.title')}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{t('noSub.desc')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {planSlugs.map(p => (
              <div key={p} className="rounded-2xl border border-zinc-200 dark:border-white/10 p-4">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-bold">{getPlanName(p)}</span>
                  {getPlanBySlug(p)?.isTest && <span className="px-1.5 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">TEST</span>}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{getPlanDescription(p)}</p>
                <div className="text-2xl font-black mb-1">${getPlanPrice(p)}<span className="text-sm font-normal text-zinc-500">{formatCycleLabel(p)}</span></div>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-3">{getPlanHighlights(p)}</p>
                <ul className="space-y-1 mb-4">
                  {FEATURE_KEYS.slice(0, 6).map(key => (
                    <li key={key} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className={planFeatures(p)[key] ? 'text-purple-600' : 'text-zinc-300 dark:text-zinc-600'}>{featureValue(p as PlanType, key)}</span>
                      {t(`features.${key}` as any)}
                    </li>
                  ))}
                </ul>
                {isOwner && (
                  <button onClick={() => openPlanModal(p)}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors">
                    {t('noSub.activate', { plan: getPlanName(p) })}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        {modal === 'activate' && (
          <Modal title={t('modal.activate.title', { plan: getPlanName(targetPlan) })} onClose={() => setModal(null)}>
            <RedirectNotice
              planName={getPlanName(targetPlan)}
              amount={getPlanPrice(targetPlan)}
              onConfirm={handleActivate}
              onCancel={() => setModal(null)}
              loading={loading}
            />
          </Modal>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      {!isOwner && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-700 dark:text-amber-400 text-sm">
          <Lock className="w-4 h-4 shrink-0" />{t('ownerOnlyNotice')}
        </div>
      )}
      <Alerts />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className={cardCls}>
            <h2 className="text-base font-bold mb-4">{t('currentSub.title')}</h2>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full uppercase">{getPlanName(currentPlan)}</span>
              {isActive && <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">{t('currentSub.statusActive')}</span>}
              {isPastDue && <span className="px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-semibold rounded-full">{t('currentSub.statusPastDue')}</span>}
              {isCancelled && <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold rounded-full">{t('currentSub.statusCancelled')}</span>}
            </div>

            {isActive && subscription?.currentPeriodEnd && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.rich('currentSub.nextInvoice', { amount: getPlanPrice(currentPlan), date: formatDate(subscription.currentPeriodEnd, locale), strong: richStrong })}</p>
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
                    plan: getPlanName(subscription.pendingPlan),
                    date: formatDate(subscription.currentPeriodEnd, locale),
                    strong: richStrong,
                  })}
                </p>
              </div>
            )}

            {isOwner && (isActive || isPastDue) && (
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

          {isCancelled && isOwner && (
            <button onClick={() => { setTargetPlan(currentPlan); setModal('reactivate') }}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors">
              {t('reactivateBtn')}
            </button>
          )}
        </div>

        <div className={cardCls}>
          <h2 className="text-base font-bold mb-4">{t('changePlan.title')}</h2>
          <div className="space-y-3">
            {planSlugs.map(p => {
              const isCurrent = p === currentPlan
              const isUpgrade = getPlanOrder(p) > getPlanOrder(currentPlan)
              const dbP = getPlanBySlug(p)
              return (
                <div key={p} className={`rounded-2xl border p-4 transition-all ${isCurrent ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10' : 'border-zinc-200 dark:border-white/10'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{getPlanName(p)}</span>
                      {isCurrent && <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">{t('changePlan.current')}</span>}
                      {dbP?.isTest && <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">TEST</span>}
                    </div>
                    <span className="text-lg font-black">${getPlanPrice(p)}<span className="text-xs font-normal text-zinc-500">{formatCycleLabel(p)}</span></span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">{dbP?.description}</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-2">{dbP?.highlights}</p>
                  <ul className="space-y-1 mb-3">
                    {FEATURE_KEYS.slice(0, 5).map(key => (
                      <li key={key} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className={planFeatures(p)[key] && planFeatures(p)[key] !== 0 ? 'text-purple-600 font-bold' : 'text-zinc-300 dark:text-zinc-600'}>{featureValue(p as PlanType, key)}</span>
                        {t(`features.${key}` as any)}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && isOwner && (
                    <button onClick={() => openPlanModal(p)}
                      className={`w-full py-1.5 text-xs font-semibold rounded-xl transition-colors ${isUpgrade ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300'}`}>
                      {isUpgrade ? t('changePlan.upgrade', { plan: getPlanName(p) }) : t('changePlan.downgrade', { plan: getPlanName(p) })}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {modal === 'upgrade' && (
        <Modal title={t('modal.upgrade.title', { plan: getPlanName(targetPlan) })} onClose={() => setModal(null)}>
          {gainedFeatures.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{t('modal.upgrade.willGain')}</p>
              <ul className="space-y-1.5">
                {gainedFeatures.map(key => (
                  <li key={key} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <span className="text-green-500 font-bold">✓</span>
                    {t(`features.${key}` as any)}
                    {typeof targetFeatures[key] === 'number' && (
                      <span className="text-zinc-500 text-xs">({currentFeatures[key]} → {targetFeatures[key] === 9999 ? '∞' : targetFeatures[key]})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="border-t border-zinc-100 dark:border-white/10 pt-4">
            <RedirectNotice
              planName={getPlanName(targetPlan)}
              amount={getPlanPrice(targetPlan)}
              onConfirm={handleChangePlan}
              onCancel={() => setModal(null)}
              loading={loading}
            />
          </div>
        </Modal>
      )}

      {modal === 'downgrade' && (
        <Modal title={t('modal.downgrade.title', { plan: getPlanName(targetPlan) })} onClose={() => setModal(null)}>
          {lostFeatures.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{t('modal.downgrade.willLose')}</p>
              <ul className="space-y-1.5">
                {lostFeatures.map(key => (
                  <li key={key} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <span className="text-red-500 font-bold">✗</span>
                    {t(`features.${key}` as any)}
                    {typeof currentFeatures[key] === 'number' && (
                      <span className="text-zinc-500 text-xs">({currentFeatures[key] === 9999 ? '∞' : currentFeatures[key]} → {targetFeatures[key] === 9999 ? '∞' : targetFeatures[key]})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(targetFeatures.maxBranches < currentFeatures.maxBranches ||
            targetFeatures.maxStaff < currentFeatures.maxStaff ||
            targetFeatures.maxServices < currentFeatures.maxServices) && (
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

      {modal === 'activate' && (
        <Modal title={t('modal.activate.title', { plan: getPlanName(targetPlan) })} onClose={() => setModal(null)}>
          <RedirectNotice
            planName={getPlanName(targetPlan)}
            amount={getPlanPrice(targetPlan)}
            onConfirm={handleActivate}
            onCancel={() => setModal(null)}
            loading={loading}
          />
        </Modal>
      )}

      {modal === 'reactivate' && (
        <Modal title={t('modal.reactivate.title', { plan: getPlanName(targetPlan) })} onClose={() => setModal(null)}>
          <RedirectNotice
            planName={getPlanName(targetPlan)}
            amount={getPlanPrice(targetPlan)}
            onConfirm={handleReactivate}
            onCancel={() => setModal(null)}
            loading={loading}
          />
        </Modal>
      )}
    </div>
  )
}
