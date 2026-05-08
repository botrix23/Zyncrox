'use client';

interface WeeklyBarChartProps {
  thisWeek: number[];
  prevWeek: number[];
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function WeeklyBarChart({ thisWeek, prevWeek }: WeeklyBarChartProps) {
  const max = Math.max(...thisWeek, ...prevWeek, 1);

  return (
    <div className="flex items-end justify-between gap-2 sm:gap-3" style={{ height: '160px' }}>
      {DAYS.map((day, i) => {
        const currentPct = Math.max((thisWeek[i] / max) * 100, thisWeek[i] > 0 ? 4 : 0);
        const prevPct = Math.max((prevWeek[i] / max) * 100, prevWeek[i] > 0 ? 4 : 0);

        return (
          <div key={day} className="flex-1 flex flex-col items-center gap-2">
            {/* Bar container */}
            <div className="w-full flex gap-0.5 items-end" style={{ height: '120px' }}>
              {/* Previous week */}
              <div
                className="flex-1 bg-purple-200 dark:bg-purple-900/40 rounded-t transition-all duration-700"
                style={{ height: `${prevPct}%` }}
                title={`Semana anterior: ${prevWeek[i]}`}
              />
              {/* Current week */}
              <div
                className="flex-1 bg-purple-600 rounded-t transition-all duration-700"
                style={{ height: `${currentPct}%` }}
                title={`Esta semana: ${thisWeek[i]}`}
              />
            </div>
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-zinc-500 font-medium leading-none">
              {day}
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">
              {thisWeek[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
