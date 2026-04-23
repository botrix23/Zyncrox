"use client";

import { useState } from "react";
import { Plus, CalendarOff, MapPin, User, Trash2, X, Clock, Edit2, Check, Ban } from 'lucide-react';
import { createBlockAction, deleteBlockAction, updateBlockAction } from "@/app/actions/blocks";
import { createAbsenceRequestAction, approveAbsenceRequestAction, rejectAbsenceRequestAction } from "@/app/actions/absenceRequests";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Portal } from "@/components/Portal";

export default function AbsencesClient({
  initialBlocks,
  branches,
  staff,
  tenantId,
  role = 'ADMIN',
  currentStaffId,
  pendingRequests = [],
}: {
  initialBlocks: any[],
  branches: any[],
  staff: any[],
  tenantId: string,
  role?: 'ADMIN' | 'SUPER_ADMIN' | 'STAFF',
  currentStaffId?: string,
  pendingRequests?: any[],
}) {
  const isStaffRole = role === 'STAFF';
  const t = useTranslations('Dashboard.absences');
  const tServices = useTranslations('Dashboard.services.table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'blocks' | 'pending'>('blocks');
  const router = useRouter();

  const [formData, setFormData] = useState({
    type: "staff",
    branchId: branches[0]?.id || "",
    staffId: isStaffRole ? (currentStaffId || "") : (staff[0]?.id || ""),
    reason: "",
    startDate: "",
    startTime: "08:00",
    endDate: "",
    endTime: "18:00"
  });

  const resetForm = () => {
    setFormData({
      type: "staff",
      branchId: branches[0]?.id || "",
      staffId: isStaffRole ? (currentStaffId || "") : (staff[0]?.id || ""),
      reason: "",
      startDate: "",
      startTime: "08:00",
      endDate: "",
      endTime: "18:00"
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}:00`);

    let result;

    if (isStaffRole) {
      // STAFF: crea solicitud pendiente de aprobación
      result = await createAbsenceRequestAction({
        tenantId,
        staffId: currentStaffId!,
        reason: formData.reason,
        startTime: startDateTime,
        endTime: endDateTime,
      });
    } else if (editingId) {
      result = await updateBlockAction({
        id: editingId,
        tenantId,
        staffId: formData.type === "staff" ? formData.staffId : null,
        reason: formData.reason,
        startTime: startDateTime,
        endTime: endDateTime
      });
    } else {
      result = await createBlockAction({
        tenantId,
        branchId: formData.type === "branch" ? formData.branchId : (null as any),
        staffId: formData.type === "staff" ? formData.staffId : null,
        reason: formData.reason,
        startTime: startDateTime,
        endTime: endDateTime
      });
    }

    if (result.success) {
      setIsModalOpen(false);
      setEditingId(null);
      resetForm();
      router.refresh();
    } else {
      alert(t('errorSave'));
    }
    setIsLoading(false);
  };

  const handleApprove = async (id: string) => {
    const result = await approveAbsenceRequestAction(id);
    if (result.success) router.refresh();
  };

  const handleReject = async (id: string) => {
    const result = await rejectAbsenceRequestAction(id);
    if (result.success) router.refresh();
  };

  const handleEdit = (block: any) => {
    setEditingId(block.id);
    setFormData({
      type: block.staffId ? "staff" : "branch",
      branchId: block.branchId || branches[0]?.id || "",
      staffId: block.staffId || staff[0]?.id || "",
      reason: block.reason || "",
      startDate: format(new Date(block.startTime), "yyyy-MM-dd"),
      startTime: format(new Date(block.startTime), "HH:mm"),
      endDate: format(new Date(block.endTime), "yyyy-MM-dd"),
      endTime: format(new Date(block.endTime), "HH:mm")
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    const result = await deleteBlockAction(id, tenantId);
    if (result.success) {
      router.refresh();
    } else {
      alert(t('errorDelete'));
    }
  };

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('title')}</h1>
            <p className="text-slate-500 dark:text-zinc-400 mt-1">
              {isStaffRole ? 'Solicita días libres o ausencias. El administrador deberá aprobarlas.' : t('subtitle')}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-sm font-bold shadow-xl shadow-rose-500/20 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            {isStaffRole ? 'Solicitar ausencia' : t('new')}
          </button>
        </div>

        {/* Tabs — solo para ADMIN */}
        {!isStaffRole && (
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('blocks')}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'blocks' ? 'bg-white dark:bg-zinc-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}
            >
              Bloqueos activos
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white dark:bg-zinc-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}
            >
              Solicitudes pendientes
              {pendingRequests.length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">{pendingRequests.length}</span>
              )}
            </button>
          </div>
        )}

        {/* Tab Pendientes — solo ADMIN */}
        {!isStaffRole && activeTab === 'pending' && (
          pendingRequests.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] shadow-sm">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">Sin solicitudes pendientes</p>
              <p className="text-sm text-slate-400 mt-1">Todo está al día</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                      <th className="p-6 text-xs font-black text-slate-400">PROFESIONAL</th>
                      <th className="p-6 text-xs font-black text-slate-400">MOTIVO</th>
                      <th className="p-6 text-xs font-black text-slate-400">DESDE</th>
                      <th className="p-6 text-xs font-black text-slate-400">HASTA</th>
                      <th className="p-6 text-xs font-black text-slate-400 text-right">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {pendingRequests.map((req) => {
                      const member = staff.find(s => s.id === req.staffId);
                      return (
                        <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-purple-100 dark:bg-purple-500/10 rounded-xl flex items-center justify-center">
                                <User className="w-4 h-4 text-purple-500" />
                              </div>
                              <span className="font-bold text-slate-900 dark:text-white text-sm">{member?.name || 'Desconocido'}</span>
                            </div>
                          </td>
                          <td className="p-6 text-sm text-slate-600 dark:text-zinc-400">{req.reason || '—'}</td>
                          <td className="p-6 text-sm font-bold text-slate-900 dark:text-white">{format(new Date(req.startTime), "dd MMM yyyy, HH:mm")}</td>
                          <td className="p-6 text-sm font-bold text-slate-900 dark:text-white">{format(new Date(req.endTime), "dd MMM yyyy, HH:mm")}</td>
                          <td className="p-6">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApprove(req.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all"
                              >
                                <Check className="w-3.5 h-3.5" /> Aprobar
                              </button>
                              <button
                                onClick={() => handleReject(req.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all"
                              >
                                <Ban className="w-3.5 h-3.5" /> Rechazar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* Tabla principal — bloqueos (ADMIN) o solicitudes propias (STAFF) */}
        {(isStaffRole || activeTab === 'blocks') && (initialBlocks.length === 0
          ? (
          <div className="text-center py-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] shadow-sm">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarOff className="w-10 h-10 text-rose-500" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{t('noBlocks')}</h3>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                         <th className="p-6 text-xs font-black text-slate-400">{t('table.reason')}</th>
                         <th className="p-6 text-xs font-black text-slate-400">{isStaffRole ? 'ESTADO' : t('table.affected')}</th>
                         <th className="p-6 text-xs font-black text-slate-400">{t('table.start')}</th>
                         <th className="p-6 text-xs font-black text-slate-400">{t('table.end')}</th>
                         {!isStaffRole && <th className="p-6 text-xs font-black text-slate-400 text-right">{tServices('actions')}</th>}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {initialBlocks.map((block) => {
                         const branch = branches.find(b => b.id === block.branchId);
                         const staffMember = staff.find(s => s.id === block.staffId);
                         const afecctedText = staffMember ? staffMember.name : (branch ? t('types.branchAffected', { name: branch.name }) : t('types.global'));
                         const statusStyles: Record<string, string> = {
                           PENDING: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
                           APPROVED: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                           REJECTED: 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
                         };
                         const statusLabels: Record<string, string> = {
                           PENDING: 'Pendiente',
                           APPROVED: 'Aprobada',
                           REJECTED: 'Rechazada',
                         };

                         return (
                            <tr key={block.id} className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${!isStaffRole ? 'group cursor-pointer' : ''}`} onClick={!isStaffRole ? () => handleEdit(block) : undefined}>
                               <td className="p-6">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 bg-rose-50 dark:bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500">
                                        <CalendarOff className="w-5 h-5" />
                                     </div>
                                     <span className="font-bold text-slate-900 dark:text-white">{block.reason || t('types.defaultReason')}</span>
                                  </div>
                               </td>
                               <td className="p-6">
                                  {isStaffRole ? (
                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${statusStyles[block.status] || statusStyles['PENDING']}`}>
                                      {statusLabels[block.status] || 'Pendiente'}
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
                                       {staffMember ? <User className="w-4 h-4 text-slate-400" /> : <MapPin className="w-4 h-4 text-slate-400" />}
                                       <span className="font-medium">{afecctedText}</span>
                                    </div>
                                  )}
                               </td>
                               <td className="p-6 text-sm font-bold text-slate-900 dark:text-white">
                                  {format(new Date(block.startTime), "dd MMM yyyy, HH:mm")}
                               </td>
                               <td className="p-6 text-sm font-bold text-slate-900 dark:text-white">
                                  {format(new Date(block.endTime), "dd MMM yyyy, HH:mm")}
                               </td>
                               {!isStaffRole && (
                                 <td className="p-6 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => handleEdit(block)}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-amber-500 rounded-xl transition-all inline-flex"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(block.id)}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-rose-500 rounded-xl transition-all inline-flex"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                 </td>
                               )}
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
             {/* Backdrop con Blur Dinámico - Fixed para cubrir todo */}
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { setIsModalOpen(false); setEditingId(null); }} />
            <div className="relative z-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h3 className="text-xl font-black tracking-tight">
                    {isStaffRole ? 'Solicitar ausencia' : (editingId ? t('form.titleEdit') : t('form.titleNew'))}
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingId(null);
                  }} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                
                <div className="space-y-4">
                    {!isStaffRole && (
                      <div className="flex gap-4 p-1 bg-slate-100 dark:bg-white/5 rounded-xl w-fit">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, type: "staff" })}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${formData.type === "staff" ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}
                        >
                          {t('filter.individual')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, type: "branch" })}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${formData.type === "branch" ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}
                        >
                          {t('filter.branch')}
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 ml-1">{t('form.reasonLabel')}</label>
                        <input
                          required
                          type="text"
                          value={formData.reason}
                          onChange={e => setFormData({...formData, reason: e.target.value})}
                          className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all text-sm font-medium"
                          placeholder={t('form.reasonPlaceholder')}
                        />
                    </div>

                    {!isStaffRole && (formData.type === "branch" ? (
                      <div className="space-y-2">
                          <label className="text-xs font-black text-slate-500 ml-1">{t('form.branchSelect')}</label>
                          <select
                              required
                              value={formData.branchId}
                              onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                              className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none text-sm font-bold"
                          >
                              {branches.map(b => (
                                  <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                          </select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                          <label className="text-xs font-black text-slate-500 ml-1">{t('form.staffSelect')}</label>
                          <select
                              required
                              value={formData.staffId}
                              onChange={e => setFormData({ ...formData, staffId: e.target.value })}
                              className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none text-sm font-bold"
                          >
                              {staff.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                          </select>
                      </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-white/5 pt-6">
                   <div className="col-span-2 text-xs font-black tracking-widest text-rose-500 uppercase">{t('sections.startBlock')}</div>
                   <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('form.startDate')}</label>
                        <input 
                            required
                            type="date"
                            value={formData.startDate}
                            onChange={e => setFormData({...formData, startDate: e.target.value})}
                            className="w-full p-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('form.startTime')}</label>
                        <input 
                            required
                            type="time"
                            value={formData.startTime}
                            onChange={e => setFormData({...formData, startTime: e.target.value})}
                            className="w-full p-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-4">
                   <div className="col-span-2 text-xs font-black tracking-widest text-rose-500 uppercase">{t('sections.endBlock')}</div>
                   <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('form.endDate')}</label>
                        <input 
                            required
                            type="date"
                            value={formData.endDate}
                            onChange={e => setFormData({...formData, endDate: e.target.value})}
                            className="w-full p-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('form.endTime')}</label>
                        <input 
                            required
                            type="time"
                            value={formData.endTime}
                            onChange={e => setFormData({...formData, endTime: e.target.value})}
                            className="w-full p-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                    </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-rose-500/20 disabled:opacity-50 flex items-center justify-center text-sm mt-4"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                  ) : (
                    editingId ? t('form.save') : t('form.create')
                  )}
                </button>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
