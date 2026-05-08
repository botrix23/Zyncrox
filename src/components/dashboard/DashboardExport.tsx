'use client';
import { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';

export function DashboardExport() {
  const [loadingCsv, setLoadingCsv] = useState(false);

  const handleCsvExport = async () => {
    setLoadingCsv(true);
    try {
      const res = await fetch('/api/admin/dashboard/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-${new Date().toISOString().slice(0, 7)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al exportar. Inténtalo de nuevo.');
    } finally {
      setLoadingCsv(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCsvExport}
        disabled={loadingCsv}
        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loadingCsv
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Download className="w-4 h-4" />
        }
        Excel
      </button>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
      >
        <FileText className="w-4 h-4" />
        PDF
      </button>
    </div>
  );
}
