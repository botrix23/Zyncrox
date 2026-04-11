"use client";

import { useState, useMemo } from "react";
import { 
  Search, Contact, DollarSign, Clock, Calendar, User, 
  MapPin, Star, TrendingUp, History, X, Phone, Mail, 
  ChevronRight, Award, Scissors, ShoppingBag, Settings2
} from 'lucide-react';
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import Link from "next/link";
import { useParams } from "next/navigation";

interface BookingDetail {
  id: string;
  startTime: Date;
  status: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  service: { name: string; price: string };
  staff: { name: string };
  branch: { name: string };
}

export default function ClientsClient({ 
  bookings,
  vipThreshold
}: { 
  bookings: BookingDetail[],
  vipThreshold: number
}) {
  const t = useTranslations('Dashboard.clients');
  const params = useParams();
  const locale = params.locale as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  const clientStats = useMemo(() => {
    const clientsMap = new Map<string, any>();
    
    bookings.forEach(booking => {
      const key = booking.customerEmail 
         ? booking.customerEmail.toLowerCase() 
         : booking.customerName.toLowerCase() + (booking.customerPhone || "");
      
      const price = parseFloat(booking.service.price) || 0;
      
      if (!clientsMap.has(key)) {
         clientsMap.set(key, {
           name: booking.customerName,
           email: booking.customerEmail,
           phone: booking.customerPhone,
           totalSpent: 0,
           totalAppointments: 0,
           lastVisit: booking.startTime,
           consumedServices: {} as Record<string, { count: number, total: number }>,
           history: [] as BookingDetail[]
         });
      }
      
      const stat = clientsMap.get(key);
      const serviceName = booking.service.name;
      
      stat.totalAppointments += 1;
      stat.totalSpent += price;
      stat.history.push(booking);
      
      // Capturar mejores datos de contacto si están disponibles
      if (booking.customerEmail && !stat.email) stat.email = booking.customerEmail;
      if (booking.customerPhone && !stat.phone) stat.phone = booking.customerPhone;
      
      if (!stat.consumedServices[serviceName]) {
        stat.consumedServices[serviceName] = { count: 0, total: 0 };
      }
      stat.consumedServices[serviceName].count += 1;
      stat.consumedServices[serviceName].total += price;
      
      if (new Date(booking.startTime) > new Date(stat.lastVisit)) {
         stat.lastVisit = booking.startTime;
         stat.name = booking.customerName;
      }
    });
    
    return Array.from(clientsMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [bookings]);

  const filteredClients = clientStats.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  const topService = (client: any) => {
    return Object.entries(client.consumedServices)
      .sort(([, a]: any, [, b]: any) => b.count - a.count)[0];
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('title')}</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/5 focus-within:ring-2 focus-within:ring-purple-500 transition-all w-full md:w-96 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input 
            type="text" 
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-sm w-full placeholder:text-slate-400 dark:placeholder:text-zinc-500"
          />
        </div>
      </div>

      {clientStats.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] shadow-sm">
            <div className="w-20 h-20 bg-purple-50 dark:bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Contact className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{t('noClients')}</h3>
            <p className="text-slate-500 dark:text-zinc-400">{t('noClientsDescription')}</p>
          </div>
      ) : (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-300">
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                         <th className="p-6 text-[11px] font-black tracking-widest text-slate-400 uppercase">{t('table.client')}</th>
                         <th className="p-6 text-[11px] font-black tracking-widest text-slate-400 uppercase">{t('table.contact')}</th>
                         <th className="p-6 text-[11px] font-black tracking-widest text-slate-400 uppercase">{t('table.mainService')}</th>
                         <th className="p-6 text-[11px] font-black tracking-widest text-slate-400 uppercase text-center">{t('table.frequency')}</th>
                         <th className="p-6 text-[11px] font-black tracking-widest text-slate-400 uppercase text-right">{t('table.totalSpent')}</th>
                         <th className="p-6 text-[11px] font-black tracking-widest text-slate-400 uppercase text-right">{t('table.action')}</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {filteredClients.map((client, idx) => {
                          const isVip = client.totalAppointments >= vipThreshold;
                          const [topSvcName, topSvcData]: any = topService(client);

                          return (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => setSelectedClient(client)}>
                               <td className="p-6">
                                  <div className="flex items-center gap-3">
                                     <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black shadow-lg ${isVip ? 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-orange-500/20' : 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/20'}`}>
                                        {client.name.charAt(0).toUpperCase()}
                                     </div>
                                     <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 dark:text-white text-[15px] flex items-center gap-1.5">
                                          {client.name}
                                          {isVip && <Award className="w-3.5 h-3.5 text-amber-500" />}
                                        </span>
                                        {isVip && <span className="text-[10px] font-black text-amber-600 uppercase tracking-tight">{t('frequent')}</span>}
                                     </div>
                                  </div>
                               </td>
                               <td className="p-6">
                                  <div className="space-y-0.5">
                                      {client.email && <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">{client.email}</p>}
                                      {client.phone && <p className="text-[11px] text-slate-400 dark:text-zinc-500">{client.phone}</p>}
                                  </div>
                               </td>
                               <td className="p-6">
                                  <div className="flex items-center gap-2">
                                     <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300 text-[11px] rounded-lg font-bold">
                                        {topSvcName}
                                     </span>
                                  </div>
                               </td>
                               <td className="p-6 text-center">
                                  <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full font-black text-[11px] ${isVip ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' : 'bg-purple-50 text-purple-600 dark:bg-purple-500/10'}`}>
                                     {t('table.frequencyCount', { count: client.totalAppointments })}
                                  </span>
                               </td>
                               <td className="p-6 text-right">
                                  <span className="font-black text-slate-900 dark:text-white text-base inline-flex items-center gap-1">
                                     <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                                     {client.totalSpent.toFixed(2)}
                                  </span>
                               </td>
                               <td className="p-6 text-right">
                                  <button className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-lg text-purple-600 transition-all opacity-0 group-hover:opacity-100">
                                     <ChevronRight className="w-4 h-4" />
                                  </button>
                               </td>
                            </tr>
                          );
                      })}
                   </tbody>
                </table>
             </div>
          </div>
      )}

      {/* MODAL DE HISTORIAL DETALLADO */}
      {selectedClient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-hidden">
           {/* Backdrop con Blur Dinámico - Fixed para cubrir todo incluso con scroll */}
           <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedClient(null)} />
           
           <div className="relative bg-white dark:bg-zinc-900 w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 border border-white/10">
              {/* Header Modal - Refined Size */}
              <div className="p-6 border-b border-slate-100 dark:border-white/5 relative bg-slate-50/50 dark:bg-white/[0.02]">
                 <button onClick={() => setSelectedClient(null)} className="absolute top-5 right-5 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all">
                    <X className="w-4 h-4" />
                 </button>
                 
                 <div className="flex flex-row gap-4 items-center">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-xl shrink-0 ${selectedClient.totalAppointments >= vipThreshold ? 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-orange-500/30' : 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/30'}`}>
                        {selectedClient.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">{selectedClient.name}</h2>
                          {selectedClient.totalAppointments >= vipThreshold && (
                            <div className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-amber-500/20 flex items-center gap-0.5">
                               <Award className="w-2.5 h-2.5" /> {t('vipDesc')}
                            </div>
                          )}
                       </div>
                       
                       <div className="flex flex-wrap gap-3 text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                          {selectedClient.email ? (
                            <div className="flex items-center gap-1.5 bg-white dark:bg-white/5 py-0.5 px-2 rounded-lg border border-slate-200 dark:border-white/5 truncate max-w-[200px]">
                               <Mail className="w-3 h-3 text-purple-500" /> {selectedClient.email}
                            </div>
                          ) : (
                            <div className="text-xs italic opacity-60">{t('noEmail')}</div>
                          )}
                          {selectedClient.phone ? (
                            <div className="flex items-center gap-1.5 bg-white dark:bg-white/5 py-0.5 px-2 rounded-lg border border-slate-200 dark:border-white/5">
                               <Phone className="w-3 h-3 text-emerald-500" /> {selectedClient.phone}
                            </div>
                          ) : (
                            <div className="text-xs italic opacity-60">{t('noPhone')}</div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Contenido Scrollable - Reduced Spacing */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                {/* Stats Summary - Refined Boxes */}
                <div className="grid grid-cols-3 gap-4">
                   <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                      <div className="flex items-center gap-2 mb-1">
                         <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                         <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('stats.invested')}</p>
                      </div>
                      <p className="text-xl font-black text-slate-900 dark:text-white">${selectedClient.totalSpent.toFixed(2)}</p>
                   </div>
                   <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                      <div className="flex items-center gap-2 mb-1">
                         <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                         <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('stats.appointments')}</p>
                      </div>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{selectedClient.totalAppointments}</p>
                   </div>
                   <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                      <div className="flex items-center gap-2 mb-1">
                         <Scissors className="w-3.5 h-3.5 text-amber-600" />
                         <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('stats.favorite')}</p>
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={topService(selectedClient)[0] as string}>
                        {topService(selectedClient)[0]}
                      </p>
                   </div>
                </div>

                {/* Service History Table */}
                <div className="space-y-3">
                   <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('history.title')}</h3>
                   </div>
                   
                   <div className="border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden bg-white dark:bg-zinc-800/50">
                      <table className="w-full text-left border-collapse">
                         <thead className="bg-slate-100/50 dark:bg-white/5">
                            <tr>
                               <th className="p-3 text-xs font-black text-slate-400 uppercase tracking-widest">{t('history.date')}</th>
                               <th className="p-3 text-xs font-black text-slate-400 uppercase tracking-widest">{t('history.service')}</th>
                               <th className="p-3 text-xs font-black text-slate-400 uppercase tracking-widest">{t('history.staffBranch')}</th>
                               <th className="p-3 text-xs font-black text-slate-400 uppercase tracking-widest text-right">{t('history.amount')}</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {selectedClient.history.map((h: any, idx: number) => (
                               <tr key={idx} className="text-xs hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                  <td className="p-3">
                                     <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 dark:text-white">{format(h.startTime, "dd MMM yyyy", { locale: locale === 'es' ? es : enUS })}</span>
                                        <span className="text-[10px] text-slate-400 font-bold">{format(h.startTime, "HH:mm")}</span>
                                     </div>
                                  </td>
                                  <td className="p-3">
                                     <span className="font-bold text-purple-600 dark:text-purple-400">{h.service.name}</span>
                                  </td>
                                  <td className="p-3">
                                     <div className="flex flex-col">
                                        <span className="font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                                           <User className="w-2.5 h-2.5 opacity-50" /> {h.staff.name}
                                        </span>
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                           <MapPin className="w-2.5 h-2.5 opacity-50" /> {h.branch.name}
                                        </span>
                                     </div>
                                  </td>
                                  <td className="p-3 text-right">
                                     <span className="font-black text-slate-900 dark:text-white">${parseFloat(h.service.price).toFixed(2)}</span>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>

                {/* Suggested Reward / Quick Config Link */}
                <div className="p-5 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-purple-500/20 rounded-[2rem]">
                   <div className="flex items-center justify-between gap-3 mb-2">
                       <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                          <Award className="w-4 h-4" />
                          <h4 className="text-xs font-black uppercase tracking-widest">{t('loyaltyPotential')}</h4>
                       </div>
                       <Link 
                          href={`/${locale}/admin/appearance`}
                          className="flex items-center gap-1 text-xs font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest border border-indigo-200 dark:border-indigo-500/30 px-2 py-1 rounded-lg transition-all"
                       >
                          <Settings2 className="w-2.5 h-2.5" /> {t('adjustThreshold')}
                       </Link>
                   </div>
                   <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed font-medium">
                      {selectedClient.totalAppointments >= vipThreshold 
                        ? t('vipSuccess', { threshold: vipThreshold })
                        : t('vipMissing', { count: selectedClient.totalAppointments, missing: vipThreshold - selectedClient.totalAppointments })}
                   </p>
                </div>
              </div>

              {/* Footer Modal - Refined */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-white/2 border-t border-slate-100 dark:border-white/5 flex justify-end">
                 <button 
                   onClick={() => setSelectedClient(null)}
                   className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-[13px] tracking-tight hover:opacity-90 transition-all shadow-lg active:scale-95"
                 >
                    {t('closeProfile')}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
