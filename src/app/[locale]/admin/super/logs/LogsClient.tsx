"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { es as dateEs, enUS } from "date-fns/locale";
import {
  FileText, LogIn, LogOut, UserX, ShieldCheck, Settings, Bookmark,
  AlertTriangle, Search, X, ChevronDown, ChevronUp, Calendar, Building2, User
} from "lucide-react";

type LogEntry = {
  id: string;
  action: string;
  tenantId: string | null;
  userId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date | null;
  tenantName: string | null;
  tenantSlug: string | null;
  userEmail: string | null;
  userName: string | null;
};

const ACTION_META: Record<string, { label: string; labelEn: string; color: string; category: string; isError?: boolean }> = {
  LOGIN_SUCCESS:                   { label: "Login exitoso",              labelEn: "Login success",            color: "text-emerald-600 dark:text-emerald-400", category: "auth" },
  LOGIN_FAILED:                    { label: "Login fallido",              labelEn: "Login failed",             color: "text-rose-600 dark:text-rose-400",       category: "auth", isError: true },
  FORGOT_PASSWORD_REQUESTED:       { label: "Contraseña solicitada",      labelEn: "Password reset requested", color: "text-amber-500 dark:text-amber-400",     category: "auth" },
  LOGOUT:                          { label: "Logout",                     labelEn: "Logout",                   color: "text-zinc-500 dark:text-zinc-400",       category: "auth" },
  TENANT_REGISTERED:               { label: "Empresa registrada",         labelEn: "Company registered",       color: "text-blue-600 dark:text-blue-400",       category: "admin" },
  TENANT_STATUS_CHANGED:           { label: "Estado de empresa",          labelEn: "Company status changed",   color: "text-amber-600 dark:text-amber-400",     category: "admin" },
  TENANT_DELETED:                  { label: "Empresa eliminada",          labelEn: "Company deleted",          color: "text-rose-600 dark:text-rose-500",       category: "admin", isError: true },
  IMPERSONATION_STARTED:           { label: "Impersonación iniciada",     labelEn: "Impersonation started",    color: "text-purple-600 dark:text-purple-400",   category: "admin" },
  IMPERSONATION_ENDED:             { label: "Impersonación terminada",    labelEn: "Impersonation ended",      color: "text-zinc-500 dark:text-zinc-400",       category: "admin" },
  SETTINGS_UPDATED:                { label: "Configuración actualizada",  labelEn: "Settings updated",         color: "text-blue-500 dark:text-blue-300",       category: "admin" },
  APPEARANCE_UPDATED:              { label: "Apariencia actualizada",     labelEn: "Appearance updated",       color: "text-blue-500 dark:text-blue-300",       category: "admin" },
  SERVICE_CREATED:                 { label: "Servicio creado",            labelEn: "Service created",          color: "text-indigo-600 dark:text-indigo-400",   category: "services" },
  SERVICE_UPDATED:                 { label: "Servicio actualizado",       labelEn: "Service updated",          color: "text-indigo-500 dark:text-indigo-300",   category: "services" },
  SERVICE_DELETED:                 { label: "Servicio eliminado",         labelEn: "Service deleted",          color: "text-rose-500 dark:text-rose-400",       category: "services" },
  SERVICE_ERROR:                   { label: "Error en servicio",          labelEn: "Service error",            color: "text-rose-600 dark:text-rose-400",       category: "services", isError: true },
  STAFF_CREATED:                   { label: "Staff creado",               labelEn: "Staff created",            color: "text-cyan-600 dark:text-cyan-400",       category: "staff" },
  STAFF_UPDATED:                   { label: "Staff actualizado",          labelEn: "Staff updated",            color: "text-cyan-500 dark:text-cyan-300",       category: "staff" },
  STAFF_DELETED:                   { label: "Staff eliminado",            labelEn: "Staff deleted",            color: "text-rose-400 dark:text-rose-300",       category: "staff" },
  STAFF_ERROR:                     { label: "Error en staff",             labelEn: "Staff error",              color: "text-rose-600 dark:text-rose-400",       category: "staff", isError: true },
  BOOKING_CREATED:                 { label: "Reserva creada",             labelEn: "Booking created",          color: "text-teal-600 dark:text-teal-400",       category: "bookings" },
  BOOKING_STATUS_CHANGED:          { label: "Estado de reserva",          labelEn: "Booking status changed",   color: "text-teal-500 dark:text-teal-300",       category: "bookings" },
  BOOKING_DELETED:                 { label: "Reserva eliminada",          labelEn: "Booking deleted",          color: "text-rose-400 dark:text-rose-300",       category: "bookings" },
  BOOKING_ERROR:                   { label: "Error en reserva",           labelEn: "Booking error",            color: "text-rose-600 dark:text-rose-400",       category: "bookings", isError: true },
  WOMPI_CREDENTIALS_UPDATED:       { label: "N1co credenciales",          labelEn: "N1co credentials updated", color: "text-amber-500",                         category: "admin" },
  CRON_REMINDERS_RUN:              { label: "Cron recordatorios",         labelEn: "Cron reminders run",       color: "text-zinc-400",                          category: "cron" },
  CRON_TRIAL_RUN:                  { label: "Cron trials",                labelEn: "Cron trial run",           color: "text-zinc-400",                          category: "cron" },
  CRON_SURVEYS_RUN:                { label: "Cron encuestas",             labelEn: "Cron surveys run",         color: "text-zinc-400",                          category: "cron" },
  ADMIN_CREATED:                   { label: "Admin creado",               labelEn: "Admin created",            color: "text-blue-500",                          category: "admin" },
  ADMIN_STATUS_CHANGED:            { label: "Estado de admin",            labelEn: "Admin status changed",     color: "text-amber-500",                         category: "admin" },
  ADMIN_DELETED:                   { label: "Admin eliminado",            labelEn: "Admin deleted",            color: "text-rose-500",                          category: "admin" },
  EMAIL_TEMPLATE_UPDATED:          { label: "Template email actualizado", labelEn: "Email template updated",   color: "text-blue-400",                          category: "admin" },
  PLAN_PRICES_UPDATED:             { label: "Precios de plan actualizados",labelEn: "Plan prices updated",     color: "text-amber-500",                         category: "admin" },
  SUPER_ADMIN_RESET_PASSWORD:      { label: "Reset contraseña (SA)",      labelEn: "Password reset (SA)",      color: "text-purple-500",                        category: "admin" },
  SUPER_ADMIN_RESEND_INVITATION:   { label: "Reinvitación enviada (SA)",  labelEn: "Invitation resent (SA)",   color: "text-purple-400",                        category: "admin" },
  SUPER_ADMIN_DEACTIVATE_USER:     { label: "Usuario desactivado (SA)",   labelEn: "User deactivated (SA)",    color: "text-rose-500",                          category: "admin" },
  SUPER_ADMIN_REACTIVATE_USER:     { label: "Usuario reactivado (SA)",    labelEn: "User reactivated (SA)",    color: "text-emerald-500",                       category: "admin" },
  PRICE_CHANGE_NOTICE_SAVED:       { label: "Aviso de precio guardado",   labelEn: "Price notice saved",       color: "text-amber-500",                         category: "admin" },
  PRICE_CHANGE_NOTICE_CLEARED:     { label: "Aviso de precio eliminado",  labelEn: "Price notice cleared",     color: "text-zinc-400",                          category: "admin" },
  PRICE_CHANGE_NOTICE_EMAILS_SENT: { label: "Emails de precio enviados",  labelEn: "Price notice emails sent", color: "text-emerald-500",                       category: "admin" },
};

const CATEGORIES = [
  { key: "all",      labelEs: "Todos",      labelEn: "All" },
  { key: "errors",   labelEs: "Errores",    labelEn: "Errors" },
  { key: "bookings", labelEs: "Reservas",   labelEn: "Bookings" },
  { key: "services", labelEs: "Servicios",  labelEn: "Services" },
  { key: "staff",    labelEs: "Staff",      labelEn: "Staff" },
  { key: "auth",     labelEs: "Acceso",     labelEn: "Auth" },
  { key: "admin",    labelEs: "Admin",      labelEn: "Admin" },
  { key: "cron",     labelEs: "Cron",       labelEn: "Cron" },
];

function DetailsView({ details }: { details: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const { level, error, op, ...rest } = details as Record<string, any>;
  const entries = Object.entries(rest).filter(([, v]) => v !== null && v !== undefined && v !== '');

  return (
    <div className="space-y-1">
      {error && (
        <div className="flex items-start gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-mono bg-rose-50 dark:bg-rose-900/20 rounded-lg px-2 py-1">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="break-all">{String(error)}</span>
        </div>
      )}
      {entries.length > 0 && (
        <div className={`flex flex-wrap gap-1 ${!expanded && entries.length > 4 ? 'max-h-8 overflow-hidden' : ''}`}>
          {entries.map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1 text-xs bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 rounded px-1.5 py-0.5">
              <span className="font-semibold text-zinc-500 dark:text-zinc-500">{k}:</span>
              <span className="truncate max-w-[160px]">{String(v)}</span>
            </span>
          ))}
        </div>
      )}
      {entries.length > 4 && (
        <button onClick={() => setExpanded(e => !e)} className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-0.5">
          {expanded ? <><ChevronUp className="w-3 h-3" />menos</> : <><ChevronDown className="w-3 h-3" />+{entries.length - 4} más</>}
        </button>
      )}
    </div>
  );
}

export default function LogsClient({ logs, locale }: { logs: LogEntry[]; locale: string }) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const dateLocale = locale === "en" ? enUS : dateEs;
  const isEn = locale === "en";

  const filtered = useMemo(() => {
    return logs.filter(log => {
      const meta = ACTION_META[log.action];
      if (category === "errors" && !meta?.isError && (log.details as any)?.level !== 'error') return false;
      if (category !== "all" && category !== "errors" && meta?.category !== category) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = [
          log.action,
          log.tenantName,
          log.tenantSlug,
          log.userEmail,
          log.userName,
          JSON.stringify(log.details),
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [logs, category, search]);

  const errorCount = useMemo(() => logs.filter(l => ACTION_META[l.action]?.isError || (l.details as any)?.level === 'error').length, [logs]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isEn ? "Search by company, user, action, error…" : "Buscar por empresa, usuario, acción, error…"}
            className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(cat => {
          const isActive = category === cat.key;
          const label = isEn ? cat.labelEn : cat.labelEs;
          const isErrors = cat.key === "errors";
          return (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? isErrors
                    ? "bg-rose-600 text-white"
                    : "bg-purple-600 text-white"
                  : isErrors && errorCount > 0
                    ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 hover:bg-rose-100"
                    : "bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10"
              }`}
            >
              {label}
              {isErrors && errorCount > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-rose-600 text-white'}`}>
                  {errorCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-zinc-400">
        {isEn ? `Showing ${filtered.length} of ${logs.length} events` : `Mostrando ${filtered.length} de ${logs.length} eventos`}
      </p>

      {/* Desktop table */}
      <div className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-3xl overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-black/20 text-xs uppercase tracking-widest">
                <th className="text-left px-5 py-3 font-bold w-44">{isEn ? "Event" : "Evento"}</th>
                <th className="text-left px-5 py-3 font-bold">{isEn ? "Company / User" : "Empresa / Usuario"}</th>
                <th className="text-left px-5 py-3 font-bold">{isEn ? "Details" : "Detalles"}</th>
                <th className="text-left px-5 py-3 font-bold w-40">{isEn ? "Date" : "Fecha"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-zinc-400 text-sm">
                    {isEn ? "No events match the current filters." : "No hay eventos que coincidan con los filtros."}
                  </td>
                </tr>
              ) : filtered.map(log => {
                const meta = ACTION_META[log.action];
                const isError = meta?.isError || (log.details as any)?.level === 'error';
                const details = log.details as Record<string, unknown> | null;
                const label = meta ? (isEn ? meta.labelEn : meta.label) : log.action;
                return (
                  <tr
                    key={log.id}
                    className={`border-b border-zinc-100 dark:border-white/5 last:border-0 transition-colors ${
                      isError
                        ? "bg-rose-50/60 dark:bg-rose-900/10 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        : "hover:bg-zinc-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 font-bold text-xs ${meta?.color ?? 'text-zinc-500'}`}>
                        {isError && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                        {label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="space-y-0.5">
                        {log.tenantName && (
                          <div className="flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            <Building2 className="w-3 h-3 text-zinc-400 shrink-0" />
                            {log.tenantName}
                          </div>
                        )}
                        {log.userEmail && (
                          <div className="flex items-center gap-1 text-xs text-zinc-400">
                            <User className="w-3 h-3 shrink-0" />
                            {log.userEmail}
                          </div>
                        )}
                        {!log.tenantName && !log.userEmail && (
                          <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      {details ? <DetailsView details={details} /> : <span className="text-zinc-300 dark:text-zinc-600 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap">
                        <Calendar className="w-3 h-3 shrink-0" />
                        {log.createdAt
                          ? format(new Date(log.createdAt), "dd MMM yyyy", { locale: dateLocale })
                          : "—"}
                      </div>
                      <div className="text-xs text-zinc-300 dark:text-zinc-600 mt-0.5 pl-4">
                        {log.createdAt ? format(new Date(log.createdAt), "HH:mm:ss") : ""}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 bg-white dark:bg-white/5 rounded-3xl border border-zinc-200 dark:border-white/5 text-sm">
            {isEn ? "No events match the current filters." : "No hay eventos que coincidan con los filtros."}
          </div>
        ) : filtered.map(log => {
          const meta = ACTION_META[log.action];
          const isError = meta?.isError || (log.details as any)?.level === 'error';
          const details = log.details as Record<string, unknown> | null;
          const label = meta ? (isEn ? meta.labelEn : meta.label) : log.action;
          return (
            <div
              key={log.id}
              className={`border rounded-2xl p-4 space-y-2 ${
                isError
                  ? "bg-rose-50/60 dark:bg-rose-900/10 border-rose-200 dark:border-rose-500/20"
                  : "bg-white dark:bg-white/5 border-zinc-200 dark:border-white/5"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 font-bold text-xs ${meta?.color ?? 'text-zinc-500'}`}>
                  {isError && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                  {label}
                </span>
                <span className="text-xs text-zinc-400 whitespace-nowrap shrink-0">
                  {log.createdAt ? format(new Date(log.createdAt), "dd MMM HH:mm", { locale: dateLocale }) : "—"}
                </span>
              </div>
              {(log.tenantName || log.userEmail) && (
                <div className="space-y-0.5">
                  {log.tenantName && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      <Building2 className="w-3 h-3 text-zinc-400" />{log.tenantName}
                    </div>
                  )}
                  {log.userEmail && (
                    <div className="flex items-center gap-1 text-xs text-zinc-400">
                      <User className="w-3 h-3" />{log.userEmail}
                    </div>
                  )}
                </div>
              )}
              {details && <DetailsView details={details} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
