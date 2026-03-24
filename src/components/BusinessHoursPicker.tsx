"use client";

import { useState, useEffect } from "react";
import { Clock, Plus, Trash2, Copy, Calendar as CalendarIcon, X } from "lucide-react";

const DAYS = [
  { id: 'monday', name: 'Lunes' },
  { id: 'tuesday', name: 'Martes' },
  { id: 'wednesday', name: 'Miércoles' },
  { id: 'thursday', name: 'Jueves' },
  { id: 'friday', name: 'Viernes' },
  { id: 'saturday', name: 'Sábado' },
  { id: 'sunday', name: 'Domingo' },
];

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
  regular: DAYS.reduce((acc, day) => ({ ...acc, [day.id]: { ...DEFAULT_SCHEDULE } }), {}),
  special: {}
};

interface BusinessHoursPickerProps {
  value: string; // Serialized JSON
  onChange: (value: string) => void;
}

export default function BusinessHoursPicker({ value, onChange }: BusinessHoursPickerProps) {
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
      regular: {
        ...prev.regular,
        [dayId]: { ...prev.regular[dayId], ...schedule }
      }
    }));
  };

  const addSlot = (dayId: string, isSpecial = false, dateKey?: string) => {
    const updateFn = (prev: BusinessHoursData) => {
      const target = isSpecial && dateKey ? prev.special[dateKey] : prev.regular[dayId];
      const newSlots = [...target.slots, { open: '13:00', close: '17:00' }];
      
      if (isSpecial && dateKey) {
        return {
          ...prev,
          special: { ...prev.special, [dateKey]: { ...target, slots: newSlots } }
        };
      }
      return {
        ...prev,
        regular: { ...prev.regular, [dayId]: { ...target, slots: newSlots } }
      };
    };
    setData(updateFn);
  };

  const removeSlot = (dayId: string, slotIndex: number, isSpecial = false, dateKey?: string) => {
    const updateFn = (prev: BusinessHoursData) => {
      const target = isSpecial && dateKey ? prev.special[dateKey] : prev.regular[dayId];
      const newSlots = target.slots.filter((_, i) => i !== slotIndex);
      
      if (isSpecial && dateKey) {
        return {
          ...prev,
          special: { ...prev.special, [dateKey]: { ...target, slots: newSlots } }
        };
      }
      return {
        ...prev,
        regular: { ...prev.regular, [dayId]: { ...target, slots: newSlots } }
      };
    };
    setData(updateFn);
  };

  const updateSlot = (dayId: string, slotIndex: number, field: 'open' | 'close', val: string, isSpecial = false, dateKey?: string) => {
    const updateFn = (prev: BusinessHoursData) => {
      const target = isSpecial && dateKey ? prev.special[dateKey] : prev.regular[dayId];
      const newSlots = target.slots.map((s, i) => i === slotIndex ? { ...s, [field]: val } : s);
      
      if (isSpecial && dateKey) {
        return {
          ...prev,
          special: { ...prev.special, [dateKey]: { ...target, slots: newSlots } }
        };
      }
      return {
        ...prev,
        regular: { ...prev.regular, [dayId]: { ...target, slots: newSlots } }
      };
    };
    setData(updateFn);
  };

  const copyToAll = (fromDayId: string) => {
    const source = data.regular[fromDayId];
    setData(prev => ({
      ...prev,
      regular: DAYS.reduce((acc, day) => ({
        ...acc,
        [day.id]: JSON.parse(JSON.stringify(source))
      }), {})
    }));
  };

  const addSpecialDate = () => {
    if (!newSpecialDate) return;
    setData(prev => ({
      ...prev,
      special: {
        ...prev.special,
        [newSpecialDate]: { isOpen: false, slots: [] }
      }
    }));
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
        <button
          type="button"
          onClick={() => setActiveTab('regular')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all ${activeTab === 'regular' ? 'bg-white dark:bg-zinc-800 shadow-sm text-purple-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
        >
          Horario regular
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('special')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all ${activeTab === 'special' ? 'bg-white dark:bg-zinc-800 shadow-sm text-purple-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
        >
          Fechas especiales
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar">
        {activeTab === 'regular' ? (
          <div className="space-y-6">
            {DAYS.map(day => {
              const schedule = data.regular[day.id];
              return (
                <div key={day.id} className="group p-4 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 rounded-2xl hover:border-purple-500/30 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${schedule.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{day.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => copyToAll(day.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-purple-500 hover:bg-purple-500/5 rounded-lg transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
                        title="Copiar horario a todos los días"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copiar a todos
                      </button>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={schedule.isOpen}
                          onChange={e => updateRegularDay(day.id, { isOpen: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                      </label>
                    </div>
                  </div>

                  {schedule.isOpen ? (
                    <div className="space-y-3">
                      {schedule.slots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="time"
                                value={slot.open}
                                onChange={e => updateSlot(day.id, idx, 'open', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-2.5 pl-10 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all"
                              />
                            </div>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="time"
                                value={slot.close}
                                onChange={e => updateSlot(day.id, idx, 'close', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-2.5 pl-10 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all"
                              />
                            </div>
                          </div>
                          {schedule.slots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSlot(day.id, idx)}
                              className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addSlot(day.id)}
                        className="w-full py-2 border border-dashed border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold text-slate-400 hover:text-purple-500 hover:border-purple-500/50 transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Añadir tramo
                      </button>
                    </div>
                  ) : (
                    <div className="py-2 px-1 text-xs text-slate-400 italic">Cerrado</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-3">
              <input
                type="date"
                value={newSpecialDate}
                onChange={e => setNewSpecialDate(e.target.value)}
                className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={addSpecialDate}
                className="px-6 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-purple-500/20 transition-all"
              >
                Añadir fecha
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(data.special).length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-zinc-900/50 rounded-3xl border-2 border-dashed border-slate-100 dark:border-white/5">
                  <CalendarIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-400">No hay fechas especiales configuradas</p>
                </div>
              ) : Object.entries(data.special).sort(([a], [b]) => a.localeCompare(b)).map(([dateKey, schedule]) => (
                <div key={dateKey} className="p-4 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-600 font-bold text-xs">
                        {new Date(dateKey + 'T12:00:00').getDate()}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                          {new Date(dateKey + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{dateKey}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={schedule.isOpen}
                          onChange={e => setData(prev => ({
                            ...prev,
                            special: { 
                              ...prev.special, 
                              [dateKey]: { 
                                ...prev.special[dateKey], 
                                isOpen: e.target.checked,
                                slots: e.target.checked && prev.special[dateKey].slots.length === 0 ? [{ open: '08:00', close: '17:00' }] : prev.special[dateKey].slots
                              } 
                            }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 shadow-inner"></div>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeSpecialDate(dateKey)}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {schedule.isOpen && (
                    <div className="space-y-3 pl-13">
                      {schedule.slots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                           <div className="flex-1 grid grid-cols-2 gap-2">
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="time"
                                value={slot.open}
                                onChange={e => updateSlot("", idx, 'open', e.target.value, true, dateKey)}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-2.5 pl-10 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all"
                              />
                            </div>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="time"
                                value={slot.close}
                                onChange={e => updateSlot("", idx, 'close', e.target.value, true, dateKey)}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-2.5 pl-10 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSlot("", idx, true, dateKey)}
                            className="p-3 text-slate-400 hover:text-rose-500 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addSlot("", true, dateKey)}
                        className="w-full py-2 border border-dashed border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold text-slate-400 hover:text-purple-500 hover:border-purple-500/50 transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Añadir tramo
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-slate-100 dark:bg-white/5 border-t border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">
            <Clock className="w-3 h-3" />
            Configuración guardada automáticamente
        </div>
      </div>
    </div>
  );
}
