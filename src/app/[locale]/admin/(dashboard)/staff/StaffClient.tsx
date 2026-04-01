"use client";

import { useState } from "react";
import { 
  Plus, 
  Search, 
  User, 
  Mail, 
  Trash2,
  Edit2,
  X,
  ChevronRight,
  MoreVertical,
  Infinity,
  CalendarDays,
  Clock,
  Building2
} from 'lucide-react';
import { createStaffAction, updateStaffAction, deleteStaffAction } from "@/app/actions/staff";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";

export default function StaffClient({ 
  initialStaff,
  branches,
  tenantId 
}: { 
  initialStaff: any[],
  branches: any[],
  tenantId: string 
}) {
  const t = useTranslations('Dashboard.staff');
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    branchId: branches[0]?.id || "", // Mantener para compatibilidad
    assignments: [] as any[]
  });

  const filteredStaff = initialStaff.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (member?: any) => {
    if (member) {
      setEditingMember(member);
      const assignments = (member.assignments || []).map((a: any) => ({
        ...a,
        startDate: a.startDate ? new Date(a.startDate).toISOString().split('T')[0] : "",
        endDate: a.endDate ? new Date(a.endDate).toISOString().split('T')[0] : "",
        startTime: a.startTime || "",
        endTime: a.endTime || "",
        isPermanent: !!a.isPermanent
      }));

      // Asegurar que haya al menos una permanente, si no hay, la primera de la lista lo será por defecto (seguridad)
      if (!assignments.some((a: any) => a.isPermanent)) {
        if (assignments[0]) assignments[0].isPermanent = true;
      }

      setFormData({
        name: member.name,
        email: member.email || "",
        branchId: member.branchId,
        assignments: assignments
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: "",
        email: "",
        branchId: branches[0]?.id || "",
        assignments: [{
          branchId: branches[0]?.id || "",
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          startDate: "",
          endDate: "",
          startTime: "",
          endTime: "",
          isPermanent: true
        }]
      });
    }
    setIsModalOpen(true);
  };

  const handleAddAssignment = () => {
    if (formData.assignments.length >= 3) return;
    setFormData({
      ...formData,
      assignments: [
        ...formData.assignments,
        {
          branchId: branches[0]?.id || "",
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          startDate: new Date().toISOString().split('T')[0], // Sugerir hoy como inicio
          endDate: "",
          startTime: "",
          endTime: "",
          isPermanent: false
        }
      ]
    });
  };

  const handleRemoveAssignment = (index: number) => {
    const newAssignments = [...formData.assignments];
    newAssignments.splice(index, 1);
    setFormData({ ...formData, assignments: newAssignments });
  };

  const handleAssignmentChange = (index: number, field: string, value: any) => {
    const newAssignments = [...formData.assignments];
    newAssignments[index] = { ...newAssignments[index], [field]: value };
    setFormData({ ...formData, assignments: newAssignments });
  };

  const toggleDay = (index: number, day: string) => {
    const newAssignments = [...formData.assignments];
    const days = [...newAssignments[index].daysOfWeek];
    if (days.includes(day)) {
      newAssignments[index].daysOfWeek = days.filter(d => d !== day);
    } else {
      newAssignments[index].daysOfWeek = [...days, day];
    }
    setFormData({ ...formData, assignments: newAssignments });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Preparar datos (limpiar fechas vacías)
    const processedAssignments = formData.assignments.map(a => ({
      ...a,
      startDate: a.startDate || null,
      endDate: a.endDate || null
    }));

    // Sincronizar branchId principal con la asignación permanente
    const permanentAssignment = formData.assignments.find(a => a.isPermanent);
    const finalBranchId = permanentAssignment?.branchId || formData.branchId;

    let result;
    if (editingMember) {
      result = await updateStaffAction({
        id: editingMember.id,
        tenantId,
        ...formData,
        branchId: finalBranchId,
        assignments: processedAssignments
      });
    } else {
      result = await createStaffAction({
        tenantId,
        ...formData,
        branchId: finalBranchId,
        assignments: processedAssignments
      });
    }

    if (result.success) {
      setIsModalOpen(false);
      router.refresh();
    } else {
      alert(t('errorSave'));
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t('confirmDelete', { name }))) return;
    
    setOpenMenu(null);
    const result = await deleteStaffAction(id, tenantId);
    if (result.success) {
      router.refresh();
    } else {
      alert(t('errorDelete'));
    }
  };

  // Close menu on click outside
  useEffect(() => {
    if (!openMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setMenuPos(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenu]);

  const handleOpenMenu = useCallback((e: React.MouseEvent<HTMLButtonElement>, memberId: string) => {
    e.stopPropagation();
    if (openMenu === memberId) {
      setOpenMenu(null);
      setMenuPos(null);
      return;
    }
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    setMenuPos({ 
      top: rect.bottom + window.scrollY + 4, 
      left: rect.right - 176, // 176 = w-44
    });
    setOpenMenu(memberId);
  }, [openMenu]);

  const dayAbbreviations: Record<string, string> = {
    monday: 'Lu',
    tuesday: 'Ma',
    wednesday: 'Mi',
    thursday: 'Ju',
    friday: 'Vi',
    saturday: 'Sa',
    sunday: 'Do'
  };

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('title')}</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">{t('subtitle')}</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-sm font-bold shadow-xl shadow-purple-500/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          {t('new')}
        </button>
      </div>

      {/* Grid Layout for Staff */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {filteredStaff.map((member) => {
          // Identificar si tiene un override activo hoy
          const today = new Date().toISOString().split('T')[0];
          const activeOverride = member.assignments?.find((a: any) => 
            !a.isPermanent && 
            a.startDate && 
            new Date(a.startDate).toISOString().split('T')[0] <= today &&
            (!a.endDate || new Date(a.endDate).toISOString().split('T')[0] >= today)
          );
          const permanentBranch = member.assignments?.find((a: any) => a.isPermanent)?.branchId;
          const branchName = branches.find(b => b.id === (activeOverride?.branchId || permanentBranch))?.name;

          return (
          <div key={member.id} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-purple-500/5 transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4">
              <button 
                onClick={(e) => handleOpenMenu(e, member.id)}
                className={`p-2 rounded-xl transition-all ${openMenu === member.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-1">
                <div className="w-full h-full rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center relative overflow-hidden">
                    <User className="w-12 h-12 text-slate-300" />
                    <div className="absolute bottom-0 left-0 w-full bg-slate-900/80 backdrop-blur-sm py-1 rounded-b-xl">
                        <span className="text-[8px] font-black text-white tracking-tighter">{t('verified')}</span>
                    </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{member.name}</h3>
                <div className="mt-1 flex flex-col items-center gap-1">
                  <p className="text-[10px] font-bold text-purple-600 tracking-widest uppercase">
                    {branchName || 'Sin sucursal'}
                  </p>
                  {activeOverride && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-black rounded-full border border-amber-500/20 animate-pulse">
                      <CalendarDays className="w-2.5 h-2.5" />
                      TEMPORAL
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full pt-2 space-y-2">
                <div className="flex items-center gap-3 text-slate-500 dark:text-zinc-500 bg-slate-50 dark:bg-white/5 p-2 rounded-xl">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold truncate tracking-tight">{member.email || t('noEmail')}</span>
                </div>
                {!activeOverride && member.assignments?.filter((a: any) => !a.isPermanent).length > 0 && (
                   <div className="flex items-center justify-center gap-1 text-[8px] font-bold text-slate-400">
                     <Clock className="w-2.5 h-2.5" />
                     Próxima rotación programada
                   </div>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-xl font-black tracking-tight">{editingMember ? t('form.titleEdit') : t('form.titleNew')}</h3>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">{t('form.rotationTitle')}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{t('form.nameLabel')}</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium"
                    placeholder={t('form.namePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{t('form.emailLabel')}</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium"
                    placeholder="email@ejemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-6">
                {/* 1. SUCURSAL PERMANENTE */}
                {formData.assignments.filter(a => a.isPermanent).map((assignment, idx) => {
                  const realIdx = formData.assignments.indexOf(assignment);
                  return (
                  <div key="permanent" className="bg-emerald-500/5 border border-emerald-500/20 rounded-[24px] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-emerald-500/10">
                      <div className="flex items-center gap-2">
                        <Infinity className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Sucursal Base Permanente</span>
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sucursal</label>
                          <select 
                            required
                            value={assignment.branchId}
                            onChange={e => handleAssignmentChange(realIdx, 'branchId', e.target.value)}
                            className="w-full p-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none"
                          >
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Horario Base</label>
                          <div className="grid grid-cols-2 gap-2">
                             <input type="time" value={assignment.startTime} onChange={e => handleAssignmentChange(realIdx, 'startTime', e.target.value)} className="p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold" />
                             <input type="time" value={assignment.endTime} onChange={e => handleAssignmentChange(realIdx, 'endTime', e.target.value)} className="p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold" />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                          <button key={day} type="button" onClick={() => toggleDay(realIdx, day)} className={`px-2 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${assignment.daysOfWeek.includes(day) ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-zinc-800 text-slate-400 border border-slate-100 dark:border-white/5'}`}>
                            {dayAbbreviations[day]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )})}

                {/* 2. OVERRIDES TEMPORALES */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Rotaciones Temporales</label>
                    {formData.assignments.length < 4 && (
                      <button type="button" onClick={handleAddAssignment} className="text-[9px] font-black text-purple-600 bg-purple-500/10 px-3 py-1.5 rounded-xl hover:bg-purple-500/20 transition-all">
                        + Añadir override
                      </button>
                    )}
                  </div>
                  
                  {formData.assignments.filter(a => !a.isPermanent).length === 0 && (
                    <div className="p-8 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-3xl text-center">
                      <p className="text-[10px] font-bold text-slate-400 italic">No hay overrides programados. El staff siempre estará en su sucursal base.</p>
                    </div>
                  )}

                  <div className="space-y-4">
                  {formData.assignments.filter(a => !a.isPermanent).map((assignment, idx) => {
                    const realIdx = formData.assignments.indexOf(assignment);
                    return (
                    <div key={`temp-${idx}`} className="bg-amber-500/5 border border-amber-500/20 rounded-[20px] overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-500/10">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-3 h-3 text-amber-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Override Temporal</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveAssignment(realIdx)} className="text-rose-500 hover:bg-rose-500/10 p-1 rounded-md transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           <div className="space-y-1">
                             <label className="text-[8px] font-black text-slate-400 uppercase">Sucursal Destino</label>
                             <select value={assignment.branchId} onChange={e => handleAssignmentChange(realIdx, 'branchId', e.target.value)} className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none">
                               {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                             </select>
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase">Desde</label>
                                <input type="date" required value={assignment.startDate} onChange={e => handleAssignmentChange(realIdx, 'startDate', e.target.value)} className="w-full p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase">Hasta</label>
                                <input type="date" value={assignment.endDate} onChange={e => handleAssignmentChange(realIdx, 'endDate', e.target.value)} className="w-full p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold" />
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase">Horario Especial</label>
                            <div className="grid grid-cols-2 gap-2">
                               <input type="time" value={assignment.startTime} onChange={e => handleAssignmentChange(realIdx, 'startTime', e.target.value)} className="p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold" />
                               <input type="time" value={assignment.endTime} onChange={e => handleAssignmentChange(realIdx, 'endTime', e.target.value)} className="p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase">Días Aplicables</label>
                            <div className="flex flex-wrap gap-1">
                              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                                <button key={day} type="button" onClick={() => toggleDay(realIdx, day)} className={`px-1.5 py-1 rounded-md text-[7px] font-black uppercase transition-all ${assignment.daysOfWeek.includes(day) ? 'bg-amber-500 text-white' : 'bg-white dark:bg-zinc-800 text-slate-400 border border-slate-100 dark:border-white/5'}`}>
                                  {dayAbbreviations[day]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )})}
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center text-sm uppercase tracking-widest"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                ) : (
                  editingMember ? t('form.save') : t('form.create')
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Actions Dropdown */}
      {openMenu && menuPos && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
          className="w-44 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <button 
            onClick={() => {
              const m = initialStaff.find(m => m.id === openMenu);
              if (m) handleOpenModal(m);
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center gap-2 font-bold"
          >
            <Edit2 className="w-4 h-4" /> {t('form.titleEdit')}
          </button>
          <div className="border-t border-slate-100 dark:border-white/5">
            <button 
              onClick={() => {
                const m = initialStaff.find(m => m.id === openMenu);
                if (m) handleDelete(m.id, m.name);
                setOpenMenu(null);
              }}
              className="w-full text-left px-4 py-3 text-sm text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-2 font-bold"
            >
              <Trash2 className="w-4 h-4" /> {t('confirmDelete', { name: '' }).replace('Are you sure you want to delete ""?', 'Delete').replace('¿Estás seguro de eliminar a ""?', 'Eliminar')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
