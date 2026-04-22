"use client";

import { Check, Bell } from "lucide-react";

interface FloatingToastProps {
  title: string;
  subtitle: string;
  time: string;
  type: "success" | "notification";
  position: "top-right" | "bottom-left";
}

export function FloatingToast({ title, subtitle, time, type, position }: FloatingToastProps) {
  const isTopRight = position === "top-right";
  
  return (
    <div className={`
      fixed ${isTopRight ? "top-32 right-12" : "bottom-24 left-12"} 
      z-40 w-72 p-4 
      bg-slate-900/90 dark:bg-zinc-900/90 backdrop-blur-xl 
      border border-white/10 rounded-2xl shadow-2xl 
      flex items-start gap-4 animate-in fade-in slide-in-from-${isTopRight ? 'right' : 'left'}-12 duration-1000
    `}>
      <div className={`
        w-10 h-10 rounded-xl flex items-center justify-center shrink-0
        ${type === "success" ? "bg-purple-600/20 text-purple-400" : "bg-amber-600/20 text-amber-400"}
      `}>
        {type === "success" ? <Check className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-white truncate">{title}</p>
          <span className="text-[10px] text-zinc-500 font-medium shrink-0">{time}</span>
        </div>
        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{subtitle}</p>
      </div>
    </div>
  );
}
