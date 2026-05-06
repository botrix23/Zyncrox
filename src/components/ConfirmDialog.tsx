"use client";

import { AlertTriangle, Info, HelpCircle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig = {
  danger:  { icon: AlertTriangle, iconBg: "bg-rose-500/10",   iconColor: "text-rose-400",   btn: "bg-rose-500 hover:bg-rose-400" },
  warning: { icon: AlertTriangle, iconBg: "bg-amber-500/10",  iconColor: "text-amber-400",  btn: "bg-amber-500 hover:bg-amber-400" },
  info:    { icon: Info,          iconBg: "bg-purple-500/10", iconColor: "text-purple-400", btn: "bg-purple-600 hover:bg-purple-500" },
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const cfg = variantConfig[variant];
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className={`flex items-center justify-center w-12 h-12 ${cfg.iconBg} rounded-2xl mb-4 mx-auto`}>
          <Icon className={`w-6 h-6 ${cfg.iconColor}`} />
        </div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white text-center">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-zinc-400 text-center mt-2 leading-relaxed">{message}</p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 font-bold text-sm transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl ${cfg.btn} text-white font-bold text-sm transition-colors`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
