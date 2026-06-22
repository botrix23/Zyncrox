"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Copy, Calendar as CalendarIcon, X } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

const DAY_IDS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export interface TimeSlot {
  open: string;
  close: string;
}

export interface DaySchedule {
  isOpen: boolean;
  slots: TimeSlot[];
}

export interface BusinessHoursData {
  regular: Record<string, DaySchedule>;
  special: Record<string, DaySchedule>;
}

const DEFAULT_SCHEDULE: DaySchedule = {
  isOpen: true,
  slots: [{ open: '08:00', close: '17:00' }]
};

const INITIAL_DATA: BusinessHoursData = {
  regular: DAY_IDS.reduce((acc, id) => ({ ...acc, [id]: { ...DEFAULT_SCHEDULE } }), {}),
  special: {}
};

interface BusinessHoursPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function BusinessHoursPicker({ value, onChange }: BusinessHoursPickerProps) {
  const t = useTranslations('BusinessHours');
  const locale = useLocale();

  const [data, setData] = useState<BusinessHoursData>(() => {
    try {
      if (!value) return INITIAL_DATA;
      const parsed = JSON.parse(value);
      return {
        regular: { ...INITIAL_DATA.regular, ...parsed.regular },
        special: parsed.special || {}
      };
    } catch {
      return INITIAL_DATA;
    }
  });

  const [activeTab, setActiveTab] = useState<'regular' | 'special'>('regular');
  const [newSpecialDate, setNewSpecialDate] = useState("");

  useEffect(() => {
    onChange(JSON.stringify(data));
  }, [data]);

  const updateRegularDay = (dayId: string, schedule: Partial<DaySchedule>) => {
    setData(prev => ({
      ...prev,
      regular: { ...prev.regular, [dayId]: { ...prev.regular[dayId], ...schedule } }
    }));
  };

  const addSlot = (dayId: string, isSpecial = false, dateKey?: string) => {
    setData(prev => {
      const target = isSpecial && dateKey ? prev.special[dateKey] : prev.regular[dayId];
      const newSlots = [...target.slots, { open: '13:00', close: '17:00' }];
      if (isSpecial && dateKey) return { ...prev, special: { ...prev.special, [dateKey]: { ...target, slots: newSlots } } };
      return { ...prev, regular: { ...prev.regular, [dayId]: { ...target, slots: newSlots } } };
    });
  };

  const removeSlot = (dayId: string, slotIndex: number, isSpecial = false, dateKey?: string) => {
    setData(prev => {
      const target = isSpecial && dateKey ? prev.special[dateKey] : prev.regular[dayId];
      const newSlots = target.slots.filter((_, i) => i !== slotIndex);
      if (isSpecial && dateKey) return { ...prev, special: { ...prev.special, [dateKey]: { ...target, slots: newSlots } } };
      return { ...prev, regular: { ...prev.regular, [dayId]: { ...target, slots: newSlots } } };
    });
  };

  const updateSlot = (dayId: string, slotIndex: number, field: 'open' | 'close', val: string, isSpecial = false, dateKey?: string) => {
    setData(prev => {
      const target = isSpecial && dateKey ? prev.special[dateKey] : prev.regular[dayId];
      const newSlots = target.slots.map((s, i) => i === slotIndex ? { ...s, [field]: val } : s);
      if (isSpecial && dateKey) return { ...prev, special: { ...prev.special, [dateKey]: { ...target, slots: newSlots } } };
      return { ...prev, regular: { ...prev.regular, [dayId]: { ...target, slots: newSlots } } };
    });
  };

  const copyToAll = (fromDayId: string) => {
    const source = data.regular[fromDayId];
    setData(prev => ({
      ...prev,
      regular: DAY_IDS.reduce((acc, id) => ({ ...acc, [id]: JSON.parse(JSON.stringify(source)) }), {})
    }));
  };

  const addSpecialDate = () => {
    if (!newSpecialDate) return;
    setData(prev => ({ ...prev, special: { ...prev.special, [newSpecialDate]: { isOpen: false, slots: [] } } }));
    setNewSpecialDate("");
  };

  const removeSpecialDate = (dateKey: string) => {
    setData(prev => {
      const newSpecial = { ...prev.special };
      delete newSpecial[dateKey];
      return { ...prev, special: newSpecial };
    });
  };

  return (
    <div className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden flex flex-col min-h-[400px]">
      <div className="flex border-b border-slate-200 dark:border-white/5 p-2 gap-2">
        <button type="button" onClick={() => setActiveTab('regular')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'regular' ? 'bg-white dark:bg-zinc-800 shadow-sm text-purple-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}>
          {t('regularTab')}
        </button>
        <button type="button" onClick={() => setActiveTab('special')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'special' ? 'bg-white dark:bg-zinc-800 shadow-sm text-purple-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}>
          {t('specialTab')}
        </button>
      </div>

      <div className="p-3 sm:p-6 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar">
        {activeTab === 'regular' ? (
          <div className="space-y-3 sm:space-y-6">
            {DAY_IDS.map(dayId => {
              const schedule = data.regular[dayId];
              return (
                <div key={dayId} className="group p-3 sm:p-4 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 rounded-2xl hover:border-purple-500/30 transition-all">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${schedule.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">{t(`days.${dayId}`)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={() => copyToAll(dayId)}
                        className="flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-black uppercase tracking-wider transition-all hover:bg-purple-600 hover:text-white active:scale-95 shadow-sm border border-purple-100 dark:border-purple-500/20"
                        title={t('copyToAll')}>
                        <Copy className="w-3 h-3 shrink-0" />
                        <span>{t('copyShort')}</span>
                      </button>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input type="checkbox" checked={schedule.isOpen}
                          onChange={e => updateRegularDay(dayId, { isOpen: e.target.checked })}
                          className="sr-only peer" />
                        <div className="w-10 h-5 bg-slate-200 dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                      </label>
                    </div>
                  </div>

                  {schedule.isOpen ? (
                    <div className="space-y-2">
                      {schedule.slots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <div className="flex-1 grid grid-cols-2 gap-1.5">
                            <input type="time" value={slot.open}
                              onChange={e => updateSlot(dayId, idx, 'open', e.target.value)}
                              className="w-full min-w-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-2 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all" />
                            <input type="time" value={slot.close}
                              onChange={e => updateSlot(dayId, idx, 'close', e.target.value)}
                              className="w-full min-w-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-2 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all" />
                          </div>
                          {schedule.slots.length > 1 && (
                            <button type="button" onClick={() => removeSlot(dayId, idx)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => addSlot(dayId)}
                        className="w-full py-2 border border-dashed border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-purple-500 hover:border-purple-500/50 transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest">
                        <Plus className="w-3.5 h-3.5" />
                        {t('addSlot')}
                      </button>
                    </div>
                  ) : (
                    <div className="py-1 px-1 text-xs text-slate-400 italic">{t('closed')}</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="date" value={newSpecialDate} onChange={e => setNewSpecialDate(e.target.value)}
                className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3 rounded-2xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all" />
              <button type="button" onClick={addSpecialDate}
                className="w-full sm:w-auto px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-purple-500/20 transition-all">
                {t('addDate')}
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(data.special).length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-zinc-900/50 rounded-3xl border-2 border-dashed border-slate-100 dark:border-white/5">
                  <CalendarIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-400">{t('noSpecialDates')}</p>
                </div>
              ) : Object.entries(data.special).sort(([a], [b]) => a.localeCompare(b)).map(([dateKey, schedule]) => (
                <div key={dateKey} className="p-3 sm:p-4 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 rounded-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 shrink-0 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-600 font-bold text-xs">
                      {new Date(dateKey + 'T12:00:00').getDate()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-900 dark:text-white tracking-tight truncate">
                        {new Date(dateKey + 'T12:00:00').toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-slate-400">{dateKey}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" checked={schedule.isOpen}
                        onChange={e => setData(prev => ({
                          ...prev,
                          special: {
                            ...prev.special,
                            [dateKey]: {
                              ...prev.special[dateKey],
                              isOpen: e.target.checked,
                              slots: e.target.checked && prev.special[dateKey].slots.length === 0
                                ? [{ open: '08:00', close: '17:00' }]
                                : prev.special[dateKey].slots
                            }
                          }
                        }))}
                        className="sr-only peer" />
                      <div className="w-10 h-5 bg-slate-200 dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 shadow-inner"></div>
                    </label>
                    <button type="button" onClick={() => removeSpecialDate(dateKey)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {schedule.isOpen && (
                    <div className="space-y-2">
                      {schedule.slots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <div className="flex-1 grid grid-cols-2 gap-1.5">
                            <input type="time" value={slot.open}
                              onChange={e => updateSlot("", idx, 'open', e.target.value, true, dateKey)}
                              className="w-full min-w-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-2 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all" />
                            <input type="time" value={slot.close}
                              onChange={e => updateSlot("", idx, 'close', e.target.value, true, dateKey)}
                              className="w-full min-w-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-2 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all" />
                          </div>
                          <button type="button" onClick={() => removeSlot("", idx, true, dateKey)}
                            className="p-2 text-slate-400 hover:text-rose-500 rounded-xl transition-all shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addSlot("", true, dateKey)}
                        className="w-full py-2 border border-dashed border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-purple-500 hover:border-purple-500/50 transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest">
                        <Plus className="w-3.5 h-3.5" />
                        {t('addSlot')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
