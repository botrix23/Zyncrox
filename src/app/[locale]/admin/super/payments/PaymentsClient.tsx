"use client";

import { useState } from "react";
import {
  CreditCard, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle,
  Loader2, FlaskConical, Zap, ExternalLink, ShieldCheck, Building2,
  DollarSign,
} from "lucide-react";
import {
  saveWompiCredentialsAction,
  testWompiCredentialsAction,
  savePlanPricesAction,
} from "@/app/actions/wompi";
import { useTranslations } from "next-intl";

interface PlatformConfig {
  wompiAppId: string | null;
  wompiApiSecret: string | null;
  wompiIsProduction: boolean;
}

interface PlanPrices {
  BASIC: number;
  PROFESSIONAL: number;
  ENTERPRISE: number;
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
  planPrices,
}: {
  config: PlatformConfig;
  planPrices: PlanPrices;
}) {
  const t = useTranslations("SuperAdmin.paymentsPage");

  // Wompi state
  const [appId, setAppId] = useState(config.wompiAppId ?? "");
  const [apiSecret, setApiSecret] = useState(config.wompiApiSecret ?? "");
  const [isProduction, setIsProduction] = useState(config.wompiIsProduction);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Plan prices state
  const [priceBasic, setPriceBasic] = useState(String(planPrices.BASIC));
  const [pricePro, setPricePro] = useState(String(planPrices.PROFESSIONAL));
  const [priceEnt, setPriceEnt] = useState(String(planPrices.ENTERPRISE));
  const [savingPrices, setSavingPrices] = useState(false);
  const [priceResult, setPriceResult] = useState<{ success: boolean; error?: string } | null>(null);

  const isConfigured = !!(config.wompiAppId && config.wompiApiSecret);

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

  async function handleSavePrices() {
    const basic = parseFloat(priceBasic);
    const pro   = parseFloat(pricePro);
    const ent   = parseFloat(priceEnt);
    if (isNaN(basic) || isNaN(pro) || isNaN(ent) || basic <= 0 || pro <= 0 || ent <= 0) {
      setPriceResult({ success: false, error: "Todos los precios deben ser mayores que 0" });
      return;
    }
    setSavingPrices(true);
    setPriceResult(null);
    const result = await savePlanPricesAction({
      planPriceBasic:        basic,
      planPriceProfessional: pro,
      planPriceEnterprise:   ent,
    });
    setPriceResult(result);
    setSavingPrices(false);
    if (result.success) setTimeout(() => setPriceResult(null), 4000);
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

      {/* ── Plan Price Editor ─────────────────────────────────────────── */}
      <div className="bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
            Precios de planes
          </h2>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-500">
          Estos valores se usan en la pantalla de pago que ven los tenants. Cámbielos y guarda para que el nuevo precio aplique inmediatamente.
        </p>

        <div className="grid grid-cols-3 gap-4">
          {(
            [
              { label: "Basic", value: priceBasic, set: setPriceBasic, color: "zinc" },
              { label: "Professional", value: pricePro, set: setPricePro, color: "purple" },
              { label: "Enterprise", value: priceEnt, set: setPriceEnt, color: "amber" },
            ] as const
          ).map(({ label, value, set }) => (
            <div key={label} className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
                {label}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 text-sm font-semibold">
                  $
                </span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full pl-7 pr-3 py-3 rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-600 text-right">USD / mes</p>
            </div>
          ))}
        </div>

        {/* Price save result */}
        {priceResult && (
          <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
            priceResult.success
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 text-red-500 dark:text-red-400"
          }`}>
            {priceResult.success ? (
              <><CheckCircle2 className="w-4 h-4" />Precios guardados correctamente.</>
            ) : (
              <><AlertCircle className="w-4 h-4" />{priceResult.error}</>
            )}
          </div>
        )}

        <div className="pt-1">
          <button
            type="button"
            onClick={handleSavePrices}
            disabled={savingPrices}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-md shadow-purple-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingPrices ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {savingPrices ? "Guardando..." : "Guardar precios"}
          </button>
        </div>
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
