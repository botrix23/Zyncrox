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
  Building2,
  Phone,
  Star,
  MessageSquare,
  Info
} from 'lucide-react';
import { createStaffAction, updateStaffAction, deleteStaffAction } from "@/app/actions/staff";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Portal } from "@/components/Portal";
import PhoneInput from "@/components/PhoneInput";

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
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [selectedStaffReviews, setSelectedStaffReviews] = useState<any | null>(null);
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    inheritBranchHours: false,
    branchId: branches[0]?.id || "", // Mantener para compatibilidad
    assignments: [] as any[],
    allowsHomeService: true
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
        phone: member.phone || "",
        emergencyContactName: member.emergencyContactName || "",
        emergencyContactPhone: member.emergencyContactPhone || "",
        inheritBranchHours: !!member.inheritBranchHours,
        branchId: member.branchId,
        assignments: assignments,
        allowsHomeService: member.allowsHomeService ?? true
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        inheritBranchHours: false,
        branchId: branches[0]?.id || "",
        assignments: [{
          branchId: branches[0]?.id || "",
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          startDate: "",
          endDate: "",
          startTime: "",
          endTime: "",
          isPermanent: true
        }],
        allowsHomeService: true
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

    const processedAssignments = formData.assignments.map(a => ({
      ...a,
      startDate: a.startDate || null,
      endDate: a.endDate || null
    }));

    const permanentAssignment = formData.assignments.find(a => a.isPermanent);
    const finalBranchId = permanentAssignment?.branchId || formData.branchId;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      alert(t('invalidEmail'));
      setIsLoading(false);
      return;
    }

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
        assignments: processedAssignments,
        allowsHomeService: formData.allowsHomeService
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
    if (rect) {
      setMenuPos({ 
        top: rect.bottom + window.scrollY + 4, 
        left: rect.right - 176,
      });
    }
    setOpenMenu(memberId);
  }, [openMenu]);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {filteredStaff.map((member) => {
          const today = new Date().toISOString().split('T')[0];
          const activeOverride = member.assignments?.find((a: any) => 
            !a.isPermanent && 
            a.startDate && 
            new Date(a.startDate).toISOString().split('T')[0] <= today &&
            (!a.endDate || new Date(a.endDate).toISOString().split('T')[0] >= today)
          );
          const permanentBranch = member.assignments?.find((a: any) => a.isPermanent)?.branchId;
          const branchName = branches.find(b => b.id === (activeOverride?.branchId || permanentBranch || member.branchId))?.name;

          const hasFutureRotation = !activeOverride && member.assignments?.some((a: any) => 
            !a.isPermanent && 
            a.startDate && 
            new Date(a.startDate).toISOString().split('T')[0] > today
          );

          const avgRating = member.reviews?.length > 0 
            ? (member.reviews.reduce((acc: number, r: any) => acc + Number(r.rating), 0) / member.reviews.length).toFixed(1)
            : null;

          return (
          <div 
            key={member.id} 
            onClick={() => handleOpenModal(member)}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all group overflow-hidden relative cursor-pointer active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 p-4 z-10">
              <button 
                onClick={(e) => handleOpenMenu(e, member.id)}
                className={`p-2 rounded-xl transition-all ${openMenu === member.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-1">
                <div className="w-full h-full rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center relative overflow-hidden">
                    <User className="w-12 h-12 text-slate-300" />
                    <div className="absolute bottom-0 left-0 w-full bg-slate-900/80 backdrop-blur-sm py-1.5 rounded-b-xl">
                        <span className="text-[11px] font-bold text-white tracking-tight uppercase leading-none">{t('verified')}</span>
                    </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">{member.name}</h3>
                {avgRating && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStaffReviews(member);
                      setIsReviewsModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 p-1 px-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all"
                  >
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`w-3 h-3 ${star <= Math.round(Number(avgRating)) ? 'text-yellow-400 fill-current' : 'text-slate-200 dark:text-zinc-800'}`} />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">{avgRating}</span>
                  </button>
                )}
              </div>

              <div className="mt-1 flex flex-col items-center gap-1 w-full">
                <p className="text-[11px] font-bold text-purple-600 uppercase tracking-widest leading-none mb-1">
                  {branchName || t('noBranch')}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
                  {activeOverride && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20 animate-pulse">
                      <CalendarDays className="w-3 h-3" />
                      {t('form.temporaryAssignment').toUpperCase()}
                    </span>
                  )}
                  {member.allowsHomeService && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20">
                      <Plus className="w-3 h-3" />
                      {t('form.homeServiceOk')}
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full pt-2 space-y-2">
                <div className="flex items-center gap-3 text-slate-500 dark:text-zinc-500 bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-slate-100 dark:border-white/5 text-left">
                    <Mail className="w-4 h-4" />
                    <span className="text-xs font-bold truncate tracking-tight">{member.email || t('noEmail')}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 dark:text-zinc-500 bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-slate-100 dark:border-white/5 text-left">
                    <Phone className="w-4 h-4" />
                    <span className="text-xs font-bold truncate tracking-tight">{member.phone || t('noPhone')}</span>
                </div>
                {hasFutureRotation && (
                   <div className="flex items-center justify-center gap-2 pt-1 text-[11px] font-bold text-slate-400 animate-in fade-in slide-in-from-top-1 duration-500">
                     <Clock className="w-3.5 h-3.5" />
                     {t('nextRotationScheduled')}
                   </div>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>

      {/* Modals */}
      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
            <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h3 className="text-xl font-black tracking-tight">{editingMember ? t('form.titleEdit') : t('form.titleNew')}</h3>
                  <p className="text-[11px] font-bold text-slate-400 mt-1">{t('form.rotationTitle')}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('form.nameLabel')}</label>
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
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('form.emailLabel')}</label>
                    <input 
                      required
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium"
                      placeholder={t('form.emailLabel')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('form.phoneLabel')}</label>
                    <PhoneInput 
                      value={formData.phone}
                      onChange={val => setFormData({...formData, phone: val})}
                      placeholder={t('form.phonePlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('form.emergencyContactLabel')}</label>
                    <input 
                      type="text" 
                      value={formData.emergencyContactName}
                      onChange={e => setFormData({...formData, emergencyContactName: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm font-medium"
                      placeholder={t('form.emergencyContactPlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">{t('form.emergencyPhoneLabel')}</label>
                    <PhoneInput 
                      value={formData.emergencyContactPhone}
                      onChange={val => setFormData({...formData, emergencyContactPhone: val})}
                      placeholder={t('form.emergencyPhonePlaceholder')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[24px]">
                    <div className="flex items-center gap-3 pr-4">
                      <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{t('form.allowsHomeServiceLabel')}</p>
                      <div className="group relative shrink-0">
                        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help transition-colors hover:text-purple-500" />
                        <div className="hidden group-hover:block absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 p-3 bg-slate-900/95 backdrop-blur-md text-[11px] text-zinc-100 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-1 duration-200 border border-white/10">
                          {t('form.allowsHomeServiceHint')}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                        </div>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, allowsHomeService: !formData.allowsHomeService})}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 ${formData.allowsHomeService ? 'bg-purple-600' : 'bg-slate-300 dark:bg-white/20'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.allowsHomeService ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[24px]">
                    <div className="flex items-center gap-3 pr-4">
                       <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{t('form.inheritBranchHoursLabel')}</p>
                       <div className="group relative shrink-0">
                        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help transition-colors hover:text-blue-500" />
                        <div className="hidden group-hover:block absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 p-3 bg-slate-900/95 backdrop-blur-md text-[11px] text-zinc-100 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-1 duration-200 border border-white/10">
                          {t('form.inheritBranchHoursHint')}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                        </div>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, inheritBranchHours: !formData.inheritBranchHours})}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${formData.inheritBranchHours ? 'bg-blue-600' : 'bg-slate-300 dark:bg-white/20'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.inheritBranchHours ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {formData.assignments.filter(a => a.isPermanent).map((assignment, idx) => {
                    const realIdx = formData.assignments.indexOf(assignment);
                    return (
                    <div key="permanent" className="bg-emerald-500/5 border border-emerald-500/20 rounded-[24px] overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-emerald-500/10">
                        <div className="flex items-center gap-2">
                          <Infinity className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{t('form.permanentBase')}</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400">{t('form.branchSelect')}</label>
                            <select 
                              required
                              value={assignment.branchId}
                              onChange={e => handleAssignmentChange(realIdx, 'branchId', e.target.value)}
                              className="w-full p-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none"
                            >
                              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                          </div>
                          <div className={`space-y-1.5 transition-opacity duration-300 ${formData.inheritBranchHours ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                            <label className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">{t('form.baseSchedule')}</label>
                            <div className="grid grid-cols-2 gap-2">
                               <input type="time" value={assignment.startTime} onChange={e => handleAssignmentChange(realIdx, 'startTime', e.target.value)} className="p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold" />
                               <input type="time" value={assignment.endTime} onChange={e => handleAssignmentChange(realIdx, 'endTime', e.target.value)} className="p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold" />
                            </div>
                          </div>
                        </div>
                        <div className={`flex flex-wrap gap-1 transition-opacity duration-300 ${formData.inheritBranchHours ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                          {days.map(day => (
                            <button key={day} type="button" onClick={() => toggleDay(realIdx, day)} className={`px-2.5 py-2 rounded-xl text-xs font-bold uppercase transition-all ${assignment.daysOfWeek.includes(day) ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-zinc-800 text-slate-400 border border-slate-100 dark:border-white/5'}`}>
                              {t(`days.${day}`)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )})}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 ml-1">{t('form.rotationTitle')}</label>
                      {formData.assignments.length < 4 && (
                        <button type="button" onClick={handleAddAssignment} className="text-[9px] font-black text-purple-600 bg-purple-500/10 px-3 py-1.5 rounded-xl hover:bg-purple-500/20 transition-all">
                          + {t('form.addAssignment')}
                        </button>
                      )}
                    </div>
                    
                    {formData.assignments.filter(a => !a.isPermanent).length === 0 && (
                      <div className="p-8 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-3xl text-center">
                        <p className="text-[10px] font-bold text-slate-400 italic">{t('form.noTemporaryAssignments')}.</p>
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
                            <span className="text-[9px] font-black text-amber-600">{t('form.temporaryAssignment')}</span>
                          </div>
                          <button type="button" onClick={() => handleRemoveAssignment(realIdx)} className="text-rose-500 hover:bg-rose-500/10 p-1 rounded-md transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             <div className="space-y-1">
                               <label className="text-[8px] font-black text-slate-400">{t('form.destinationBranch')}</label>
                               <select value={assignment.branchId} onChange={e => handleAssignmentChange(realIdx, 'branchId', e.target.value)} className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none">
                                 {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                               </select>
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-slate-400 uppercase">{t('form.from')}</label>
                                  <input type="date" required value={assignment.startDate} onChange={e => handleAssignmentChange(realIdx, 'startDate', e.target.value)} className="w-full p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-slate-400 uppercase">{t('form.to')}</label>
                                  <input type="date" value={assignment.endDate} onChange={e => handleAssignmentChange(realIdx, 'endDate', e.target.value)} className="w-full p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold" />
                                </div>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[8px] font-black text-slate-400 uppercase">{t('form.specialSchedule')}</label>
                              <div className="grid grid-cols-2 gap-2">
                                 <input type="time" value={assignment.startTime} onChange={e => handleAssignmentChange(realIdx, 'startTime', e.target.value)} className="p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold" />
                                 <input type="time" value={assignment.endTime} onChange={e => handleAssignmentChange(realIdx, 'endTime', e.target.value)} className="p-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold" />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[8px] font-black text-slate-400 uppercase">{t('form.applicableDays')}</label>
                              <div className="flex flex-wrap gap-1">
                                {days.map(day => (
                                  <button key={day} type="button" onClick={() => toggleDay(realIdx, day)} className={`px-1.5 py-1 rounded-md text-[7px] font-black uppercase transition-all ${assignment.daysOfWeek.includes(day) ? 'bg-amber-500 text-white' : 'bg-white dark:bg-zinc-800 text-slate-400 border border-slate-100 dark:border-white/5'}`}>
                                    {t(`days.${day}`)}
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
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center text-sm"
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
        </Portal>
      )}

      {isReviewsModalOpen && selectedStaffReviews && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsReviewsModalOpen(false)} />
             <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xl">
                      {selectedStaffReviews.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight">{selectedStaffReviews.name}</h3>
                      <p className="text-[11px] font-bold text-slate-400">{t('form.reviewsHistory')}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsReviewsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                  {(!selectedStaffReviews.reviews || selectedStaffReviews.reviews.length === 0) ? (
                    <div className="text-center py-12 space-y-3">
                      <MessageSquare className="w-12 h-12 text-slate-200 mx-auto" />
                      <p className="text-sm font-bold text-slate-400">{t('form.noReviews')}</p>
                    </div>
                  ) : (
                    selectedStaffReviews.reviews.map((r: any) => (
                      <div key={r.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-2">
                         <div className="flex items-center justify-between">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star key={star} className={`w-3 h-3 ${star <= Math.round(Number(r.rating)) ? 'text-yellow-400 fill-current' : 'text-slate-200 dark:text-zinc-800'}`} />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                         </div>
                         {r.comment ? (
                           <p className="text-sm text-slate-700 dark:text-zinc-300 font-medium italic">"{r.comment}"</p>
                         ) : (
                           <p className="text-xs text-slate-400 italic">{t('form.noComment')}</p>
                         )}
                         
                         {r.responses && r.responses.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 dark:border-white/5 mt-2 space-y-2">
                              {r.responses.filter((resp: any) => resp.questionType === 'TEXT' && resp.answer).map((resp: any, idx: number) => (
                                 <div key={idx} className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400">{resp.questionText}</p>
                                    <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">"{resp.answer}"</p>
                                 </div>
                              ))}
                            </div>
                         )}
                      </div>
                    ))
                  )}
                </div>
             </div>
          </div>
        </Portal>
      )}

      {openMenu && menuPos && (
        <Portal>
          <div 
            ref={menuRef}
            className="fixed z-[10000] w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200"
            style={{ 
              top: menuPos.top, 
              left: menuPos.left 
            }}
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const member = initialStaff.find(s => s.id === openMenu);
                if (member) handleDelete(member.id, member.name);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
              {t('form.deleteProfile')}
            </button>
          </div>
        </Portal>
      )}
    </>
  );
}
