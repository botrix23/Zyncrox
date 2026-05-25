"use client";

import { useState } from "react";
import {
  CreditCard, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle,
  Loader2, FlaskConical, Zap, ExternalLink, ShieldCheck, Building2,
  Hash, DollarSign, MapPin, AlertTriangle, Megaphone, Calendar,
  Mail, Plus, Trash2, X,
} from "lucide-react";
import {
  saveWompiCredentialsAction,
  testWompiCredentialsAction,
  saveN1coPlanConfigAction,
  savePriceChangeNoticeAction,
  clearPriceChangeNoticeAction,
  sendPriceChangeEmailsAction,
} from "@/app/actions/wompi";
import { useTranslations } from "next-intl";

interface PlatformConfig {
  wompiAppId: string | null;
  wompiApiSecret: string | null;
  wompiIsProduction: boolean;
}

interface PlanConfig {
  planId: string;
  price: number;
}

interface N1coPlanConfig {
  locationCode: string;
  basic: PlanConfig;
  professional: PlanConfig;
  enterprise: PlanConfig;
}

interface PriceChangePlan {
  plan: string;
  currentPrice: number;
  newPrice: number;
}

interface ActiveNotice {
  effectiveDate: string;
  messageEs: string;
  messageEn: string;
  plans: PriceChangePlan[];
}

interface TestResult {
  success: boolean;
  accountName?: string;
  email?: string;
  businesses?: { id: string; name: string; isProduction: boolean }[];
  error?: string;
}

export default function PaymentsClient({
  config,
  n1coPlanConfig,
  activeNotice: initialNotice,
}: {
  config: PlatformConfig;
  n1coPlanConfig: N1coPlanConfig;
  activeNotice: ActiveNotice | null;
}) {
  const t  = useTranslations("SuperAdmin.paymentsPage");
  const tp = useTranslations("SuperAdmin.n1coPlansSection");
  const tn = useTranslations("SuperAdmin.priceChangeSection");

  // ── Credentials state ──────────────────────────────────────────────
  const [appId, setAppId] = useState(config.wompiAppId ?? "");
  const [apiSecret, setApiSecret] = useState(config.wompiApiSecret ?? "");
  const [isProduction, setIsProduction] = useState(config.wompiIsProduction);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // ── Plan config state ───────────────────────────────────────────────
  const [locationCode, setLocationCode] = useState(n1coPlanConfig.locationCode);
  const [basicId,    setBasicId]    = useState(n1coPlanConfig.basic.planId);
  const [basicPrice, setBasicPrice] = useState(String(n1coPlanConfig.basic.price));
  const [proId,      setProId]      = useState(n1coPlanConfig.professional.planId);
  const [proPrice,   setProPrice]   = useState(String(n1coPlanConfig.professional.price));
  const [entId,      setEntId]      = useState(n1coPlanConfig.enterprise.planId);
  const [entPrice,   setEntPrice]   = useState(String(n1coPlanConfig.enterprise.price));
  const [savingPlans, setSavingPlans] = useState(false);
  const [planResult,  setPlanResult]  = useState<{ success: boolean; error?: string } | null>(null);

  // ── Price change notice state ───────────────────────────────────────
  const [noticeDate,    setNoticeDate]    = useState(initialNotice?.effectiveDate ?? "");
  const [noticeMsgEs,   setNoticeMsgEs]   = useState(initialNotice?.messageEs ?? "");
  const [noticeMsgEn,   setNoticeMsgEn]   = useState(initialNotice?.messageEn ?? "");
  const [noticePlans,   setNoticePlans]   = useState<PriceChangePlan[]>(
    initialNotice?.plans ?? []
  );
  const [hasActiveNotice, setHasActiveNotice] = useState(!!initialNotice);
  const [savingNotice,  setSavingNotice]  = useState(false);
  const [clearingNotice, setClearingNotice] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [noticeResult,  setNoticeResult]  = useState<{ success: boolean; error?: string; msg?: string } | null>(null);
  const [confirmSend,   setConfirmSend]   = useState(false);

  const isConfigured = !!(config.wompiAppId && config.wompiApiSecret);

  // ── Handlers ────────────────────────────────────────────────────────
  async function handleTest() {
    if (!appId || !apiSecret) return;
    setTesting(true);
    setTestResult(null);
    const result = await testWompiCredentialsAction({ wompiAppId: appId, wompiApiSecret: apiSecret, wompiIsProduction: isProduction });
    setTestResult(result);
    setTesting(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveResult(null);
    const result = await saveWompiCredentialsAction({ wompiAppId: appId, wompiApiSecret: apiSecret, wompiIsProduction: isProduction });
    setSaveResult(result);
    setSaving(false);
    if (result.success) setTimeout(() => setSaveResult(null), 4000);
  }

  async function handleSavePlans() {
    const basic = parseFloat(basicPrice);
    const pro   = parseFloat(proPrice);
    const ent   = parseFloat(entPrice);
    if (isNaN(basic) || isNaN(pro) || isNaN(ent) || basic <= 0 || pro <= 0 || ent <= 0) {
      setPlanResult({ success: false, error: tp("errorPrice") });
      return;
    }
    setSavingPlans(true);
    setPlanResult(null);
    const result = await saveN1coPlanConfigAction({
      n1coLocationCode: locationCode,
      basic:        { planId: basicId, price: basic },
      professional: { planId: proId,   price: pro   },
      enterprise:   { planId: entId,   price: ent   },
    });
    setPlanResult(result);
    setSavingPlans(false);
    if (result.success) setTimeout(() => setPlanResult(null), 4000);
  }

  // Notice plan row helpers
  function addNoticePlan() {
    setNoticePlans(prev => [...prev, { plan: "", currentPrice: 0, newPrice: 0 }]);
  }
  function removeNoticePlan(idx: number) {
    setNoticePlans(prev => prev.filter((_, i) => i !== idx));
  }
  function updateNoticePlan(idx: number, field: keyof PriceChangePlan, value: string) {
    setNoticePlans(prev => prev.map((p, i) =>
      i === idx
        ? { ...p, [field]: field === "plan" ? value : parseFloat(value) || 0 }
        : p
    ));
  }

  async function handleSaveNotice() {
    if (!noticeDate || !noticeMsgEs.trim() || !noticeMsgEn.trim()) {
      setNoticeResult({ success: false, error: tn("errorRequired") });
      return;
    }
    if (noticePlans.length === 0) {
      setNoticeResult({ success: false, error: tn("errorNoPlans") });
      return;
    }
    setSavingNotice(true);
    setNoticeResult(null);
    const result = await savePriceChangeNoticeAction({
      effectiveDate: noticeDate,
      messageEs: noticeMsgEs,
      messageEn: noticeMsgEn,
      plans: noticePlans,
    });
    setSavingNotice(false);
    if (result.success) {
      setHasActiveNotice(true);
      setNoticeResult({ success: true, msg: tn("savedNoticeOk") });
      setTimeout(() => setNoticeResult(null), 4000);
    } else {
      setNoticeResult({ success: false, error: (result as any).error });
    }
  }

  async function handleClearNotice() {
    setClearingNotice(true);
    setNoticeResult(null);
    const result = await clearPriceChangeNoticeAction();
    setClearingNotice(false);
    if (result.success) {
      setHasActiveNotice(false);
      setNoticeDate("");
      setNoticeMsgEs("");
      setNoticeMsgEn("");
      setNoticePlans([]);
      setNoticeResult({ success: true, msg: tn("clearedNoticeOk") });
      setTimeout(() => setNoticeResult(null), 4000);
    } else {
      setNoticeResult({ success: false, error: (result as any).error });
    }
  }

  async function handleSendEmails() {
    setSendingEmails(true);
    setNoticeResult(null);
    setConfirmSend(false);
    const result = await sendPriceChangeEmailsAction();
    setSendingEmails(false);
    if (result.success) {
      setNoticeResult({
        success: true,
        msg: tn("emailsSentOk", { sent: (result as any).sent ?? 0, failed: (result as any).failed ?? 0 }),
      });
      setTimeout(() => setNoticeResult(null), 6000);
    } else {
      setNoticeResult({ success: false, error: (result as any).error });
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t("title")}</h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest font-semibold">
              {t("configSubtitle")}
            </p>
          </div>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-3 leading-relaxed">
          {t("description")}{" "}
          <a href="https://panel.n1co.com" target="_blank" rel="noopener noreferrer"
            className="text-purple-600 dark:text-purple-400 hover:text-purple-500 inline-flex items-center gap-1">
            panel.n1co.com <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>

      {/* Status banner */}
      {isConfigured ? (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{t("configuredBanner")}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500">
              {t("configuredMode", { mode: config.wompiIsProduction ? t("production") : t("sandbox") })}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-600 dark:text-amber-400">{t("notConfiguredBanner")}</p>
        </div>
      )}

      {/* Credentials form */}
      <div className="bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
            {t("sectionTitle")}
          </h2>
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-500">
          {t("sectionHint").split("panel de N1co")[0]}
          <a href="https://panel.n1co.com" target="_blank" rel="noopener noreferrer"
            className="text-purple-600 dark:text-purple-400 hover:text-purple-500">
            panel.n1co.com
          </a>
          {t("sectionHint").split("panel de N1co")[1] || " → Configuraciones generales → tu negocio."}
        </p>

        {/* Environment toggle */}
        <div className="flex items-center gap-3 p-3 bg-zinc-100 dark:bg-white/5 rounded-xl">
          <button
            type="button"
            onClick={() => setIsProduction(false)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
              !isProduction ? "bg-purple-600 text-white shadow-md" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10"
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            {t("sandbox")}
          </button>
          <button
            type="button"
            onClick={() => setIsProduction(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
              isProduction ? "bg-purple-600 text-white shadow-md" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10"
            }`}
          >
            <Zap className="w-4 h-4" />
            {t("production")}
          </button>
        </div>

        {/* App ID */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
            {t("appIdLabel")}
          </label>
          <input
            type="text"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>

        {/* API Secret */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
            {t("apiSecretLabel")}
          </label>
          <div className="relative">
            <input
              type={showSecret ? "text" : "password"}
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder={t("apiSecretPlaceholder")}
              className="w-full px-4 py-3 pr-12 rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-600 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            {t("secureNote")}
          </p>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`p-4 rounded-xl border text-sm ${
            testResult.success ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
          }`}>
            {testResult.success ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  {t("testSuccess")}
                </div>
                <p className="text-emerald-600 dark:text-emerald-500">
                  {t("testAccount")} <strong>{testResult.accountName}</strong>
                </p>
                <p className="text-emerald-600 dark:text-emerald-500">{t("testEmail")} {testResult.email}</p>
                {testResult.businesses && testResult.businesses.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase">
                      {t("testBusinesses")}
                    </p>
                    {testResult.businesses.map((b) => (
                      <div key={b.id} className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-500">
                        <Building2 className="w-3 h-3" />
                        {b.name} — {b.isProduction ? t("testProd") : t("testSandbox")}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {testResult.error}
              </div>
            )}
          </div>
        )}

        {/* Save result */}
        {saveResult && (
          <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
            saveResult.success ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-500 dark:text-red-400"
          }`}>
            {saveResult.success ? (
              <><CheckCircle2 className="w-4 h-4" />{t("savedSuccess")}</>
            ) : (
              <><AlertCircle className="w-4 h-4" />{saveResult.error}</>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={!appId || !apiSecret || testing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-white/10 text-zinc-700 dark:text-zinc-300 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-white/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
            {t("testButton")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!appId || !apiSecret || saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-md shadow-purple-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? t("saving") : t("saveButton")}
          </button>
        </div>
      </div>

      {/* ── N1co Plan Configuration ───────────────────────────────────── */}
      <div className="bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
            <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
              {tp("sectionTitle")}
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">
            {tp("sectionHint")}
          </p>
        </div>

        {/* Location Code */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
            <MapPin className="w-3 h-3" />
            {tp("locationCodeLabel")}
          </label>
          <input
            type="text"
            value={locationCode}
            onChange={(e) => setLocationCode(e.target.value)}
            placeholder={tp("locationCodePlaceholder")}
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-600">{tp("locationCodeHint")}</p>
        </div>

        {/* Plan cards — stacked on mobile, 3 cols on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            {
              key: "basic" as const,
              label: tp("planBasic"),
              id: basicId,    setId: setBasicId,
              price: basicPrice, setPrice: setBasicPrice,
              badgeCls: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300",
              borderCls: "border-zinc-200 dark:border-white/10",
            },
            {
              key: "professional" as const,
              label: tp("planProfessional"),
              id: proId,    setId: setProId,
              price: proPrice, setPrice: setProPrice,
              badgeCls: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
              borderCls: "border-purple-300 dark:border-purple-700/40",
            },
            {
              key: "enterprise" as const,
              label: tp("planEnterprise"),
              id: entId,    setId: setEntId,
              price: entPrice, setPrice: setEntPrice,
              badgeCls: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
              borderCls: "border-amber-300 dark:border-amber-700/40",
            },
          ]).map(({ label, id, setId, price, setPrice, badgeCls, borderCls }) => {
            const configured = !!id.trim();
            return (
              <div key={label} className={`rounded-2xl border-2 ${borderCls} bg-white dark:bg-zinc-900/60 p-4 space-y-3`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeCls}`}>
                    {label}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    configured
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500"
                  }`}>
                    {configured ? tp("statusConfigured") : tp("statusNotConfigured")}
                  </span>
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    <Hash className="w-3 h-3" />
                    {tp("planIdLabel")}
                  </label>
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder={tp("planIdPlaceholder")}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/20 text-zinc-900 dark:text-white text-xs placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-mono"
                  />
                  {!configured && (
                    <p className="flex items-start gap-1 text-[10px] text-amber-600 dark:text-amber-500 leading-snug">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      {tp("warningNoPlanId")}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    <DollarSign className="w-3 h-3" />
                    {tp("priceLabel")}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-semibold">$</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full pl-6 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/20 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-600 text-right">{tp("pricePerMonth")}</p>
                </div>
              </div>
            );
          })}
        </div>

        {planResult && (
          <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
            planResult.success
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 text-red-500 dark:text-red-400"
          }`}>
            {planResult.success ? (
              <><CheckCircle2 className="w-4 h-4 shrink-0" />{tp("savedOk")}</>
            ) : (
              <><AlertCircle className="w-4 h-4 shrink-0" />{planResult.error}</>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleSavePlans}
          disabled={savingPlans}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-md shadow-purple-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {savingPlans ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {savingPlans ? tp("saving") : tp("saveButton")}
        </button>
      </div>

      {/* ── Price Change Notice ───────────────────────────────────────── */}
      <div className="bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                {tn("sectionTitle")}
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed max-w-md">
              {tn("sectionHint")}
            </p>
          </div>
          {/* Active notice badge */}
          <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${
            hasActiveNotice
              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500"
          }`}>
            {hasActiveNotice ? tn("activeNotice") : tn("noNotice")}
          </span>
        </div>

        {/* Effective date */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
            <Calendar className="w-3 h-3" />
            {tn("effectiveDateLabel")}
          </label>
          <input
            type="date"
            value={noticeDate}
            onChange={(e) => setNoticeDate(e.target.value)}
            className="w-full sm:w-48 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>

        {/* Messages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
              {tn("messageEsLabel")}
            </label>
            <textarea
              rows={3}
              value={noticeMsgEs}
              onChange={(e) => setNoticeMsgEs(e.target.value)}
              placeholder={tn("messagePlaceholderEs")}
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
              {tn("messageEnLabel")}
            </label>
            <textarea
              rows={3}
              value={noticeMsgEn}
              onChange={(e) => setNoticeMsgEn(e.target.value)}
              placeholder={tn("messagePlaceholderEn")}
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition resize-none"
            />
          </div>
        </div>

        {/* Affected plans */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
              {tn("plansTitle")}
            </p>
            <button
              type="button"
              onClick={addNoticePlan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-zinc-300 dark:border-white/20 text-zinc-600 dark:text-zinc-400 text-xs font-semibold hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              {tn("addPlan")}
            </button>
          </div>

          {noticePlans.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-600 italic py-2 text-center border border-dashed border-zinc-200 dark:border-white/10 rounded-xl">
              {tn("errorNoPlans")}
            </p>
          ) : (
            <div className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_80px_80px_32px] gap-2 px-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{tn("planNameLabel")}</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{tn("currentPriceLabel")}</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{tn("newPriceLabel")}</p>
                <span />
              </div>
              {noticePlans.map((row, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_80px_32px] gap-2 items-center">
                  <input
                    type="text"
                    value={row.plan}
                    onChange={(e) => updateNoticePlan(idx, "plan", e.target.value)}
                    placeholder={tn("planNamePlaceholder")}
                    className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  />
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.currentPrice || ""}
                      onChange={(e) => updateNoticePlan(idx, "currentPrice", e.target.value)}
                      className="w-full pl-5 pr-2 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-400 text-xs font-semibold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.newPrice || ""}
                      onChange={(e) => updateNoticePlan(idx, "newPrice", e.target.value)}
                      className="w-full pl-5 pr-2 py-2 rounded-xl border border-purple-300 dark:border-purple-700/40 bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNoticePlan(idx)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    title={tn("removePlan")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Result banner */}
        {noticeResult && (
          <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
            noticeResult.success
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 text-red-500 dark:text-red-400"
          }`}>
            {noticeResult.success ? (
              <><CheckCircle2 className="w-4 h-4 shrink-0" />{noticeResult.msg}</>
            ) : (
              <><AlertCircle className="w-4 h-4 shrink-0" />{noticeResult.error}</>
            )}
          </div>
        )}

        {/* Actions row */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          {/* Save */}
          <button
            type="button"
            onClick={handleSaveNotice}
            disabled={savingNotice || clearingNotice || sendingEmails}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-md shadow-purple-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingNotice ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {savingNotice ? tn("savingNotice") : tn("saveNoticeButton")}
          </button>

          {/* Clear */}
          {hasActiveNotice && (
            <button
              type="button"
              onClick={handleClearNotice}
              disabled={savingNotice || clearingNotice || sendingEmails}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-700/40 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clearingNotice ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              {clearingNotice ? tn("clearingNotice") : tn("clearNoticeButton")}
            </button>
          )}

          {/* Send emails */}
          {hasActiveNotice && !confirmSend && (
            <button
              type="button"
              onClick={() => setConfirmSend(true)}
              disabled={savingNotice || clearingNotice || sendingEmails}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-white/10 text-zinc-700 dark:text-zinc-300 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-white/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail className="w-4 h-4" />
              {tn("sendEmailsButton")}
            </button>
          )}
        </div>

        {/* Confirm send inline */}
        {confirmSend && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl space-y-3">
            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">{tn("confirmSend")}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSendEmails}
                disabled={sendingEmails}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {sendingEmails ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {sendingEmails ? tn("sendingEmails") : tn("confirmSendYes")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmSend(false)}
                className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-white/10 text-zinc-600 dark:text-zinc-400 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-white/5 transition"
              >
                {tn("confirmSendNo")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-300">{t("howTitle")}</h3>
        <ol className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          {([1, 2, 3, 4] as const).map((n) => (
            <li key={n} className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {n}
              </span>
              {n === 1 ? (
                <span>
                  {t(`step${n}`).split("panel.n1co.com")[0]}
                  <a href="https://panel.n1co.com" target="_blank" rel="noopener noreferrer"
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-500">
                    panel.n1co.com
                  </a>
                  {t(`step${n}`).split("panel.n1co.com")[1]}
                </span>
              ) : (
                <span>{t(`step${n}` as any)}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
