"use client";

import { useState, useMemo } from "react";
import { Search, Contact, DollarSign, Clock } from 'lucide-react';
import { useTranslations } from "next-intl";
import { format } from "date-fns";

export default function ClientsClient({ 
  bookings,
  services
}: { 
  bookings: any[],
  services: any[]
}) {
  const t = useTranslations('Dashboard.clients');
  const [searchTerm, setSearchTerm] = useState("");

  const clientStats = useMemo(() => {
    const clientsMap = new Map<string, any>();
    
    bookings.forEach(booking => {
      const key = booking.customerEmail 
         ? booking.customerEmail.toLowerCase() 
         : booking.customerName.toLowerCase() + (booking.customerPhone || "");
      
      const service = services.find(s => s.id === booking.serviceId);
      const price = service ? parseFloat(service.price) : 0;
      
      if (!clientsMap.has(key)) {
         clientsMap.set(key, {
           name: booking.customerName,
           email: booking.customerEmail,
           phone: booking.customerPhone,
           totalSpent: 0,
           totalAppointments: 0,
           lastVisit: booking.startTime,
           consumedServices: {} as Record<string, number>
         });
      }
      
      const stat = clientsMap.get(key);
      const serviceName = service ? service.name : "Servicio Desconocido";
      
      stat.totalAppointments += 1;
      stat.totalSpent += price;
      stat.consumedServices[serviceName] = (stat.consumedServices[serviceName] || 0) + 1;
      
      if (new Date(booking.startTime) > new Date(stat.lastVisit)) {
         stat.lastVisit = booking.startTime;
         stat.name = booking.customerName;
         stat.phone = booking.customerPhone || stat.phone;
         stat.email = booking.customerEmail || stat.email;
      }
    });
    
    return Array.from(clientsMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [bookings, services]);

  const filteredClients = clientStats.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('title')}</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 focus-within:ring-2 focus-within:ring-purple-500 transition-all w-full md:w-96 shadow-sm">
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
          </div>
      ) : (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-[32px] shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-300">
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                         <th className="p-6 text-[10px] font-black tracking-widest text-slate-400 uppercase">{t('table.client')}</th>
                         <th className="p-6 text-[10px] font-black tracking-widest text-slate-400 uppercase">{t('table.contact')}</th>
                         <th className="p-6 text-[10px] font-black tracking-widest text-slate-400 uppercase">{t('table.services')}</th>
                         <th className="p-6 text-[10px] font-black tracking-widest text-slate-400 uppercase text-center">{t('table.totalAppointments')}</th>
                         <th className="p-6 text-[10px] font-black tracking-widest text-slate-400 uppercase text-right">{t('table.totalSpent', { currency: '$' })}</th>
                         <th className="p-6 text-[10px] font-black tracking-widest text-slate-400 uppercase text-right">{t('table.lastVisit')}</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {filteredClients.map((client, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                             <td className="p-6">
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-purple-500/20">
                                      {client.name.charAt(0).toUpperCase()}
                                   </div>
                                   <span className="font-bold text-slate-900 dark:text-white text-base">{client.name}</span>
                                </div>
                             </td>
                             <td className="p-6">
                                <div className="space-y-1">
                                    {client.email && <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium">{client.email}</p>}
                                    {client.phone && <p className="text-xs text-slate-400 dark:text-zinc-500">{client.phone}</p>}
                                </div>
                             </td>
                             <td className="p-6 max-w-[250px]">
                                <div className="flex flex-wrap gap-1.5">
                                   {Object.entries(client.consumedServices).map(([name, count]) => (
                                      <span key={name} className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-300 text-[10px] rounded-md font-bold truncate max-w-full" title={name}>
                                         {name} {(count as number) > 1 ? <span className="text-purple-500 ml-0.5">x{count as number}</span> : ''}
                                      </span>
                                   ))}
                                </div>
                             </td>
                             <td className="p-6 text-center">
                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-500/10 font-black text-xs">
                                   {client.totalAppointments}
                                </span>
                             </td>
                             <td className="p-6 text-right">
                                <span className="font-black text-slate-900 dark:text-white text-base inline-flex items-center gap-1">
                                   <DollarSign className="w-4 h-4 text-emerald-500" />
                                   {client.totalSpent.toFixed(2)}
                                </span>
                             </td>
                             <td className="p-6 text-right">
                                <div className="flex flex-col items-end gap-1">
                                   <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                                      {format(new Date(client.lastVisit), "dd MMM yyyy")}
                                   </span>
                                   <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                                      <Clock className="w-3 h-3" />
                                      {format(new Date(client.lastVisit), "HH:mm")}
                                   </span>
                                </div>
                             </td>
                          </tr>
                      ))}
                      {filteredClients.length === 0 && searchTerm && (
                         <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-zinc-400 font-medium">
                               No se encontraron clientes que coincidan con &quot;{searchTerm}&quot;
                            </td>
                         </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
      )}
    </div>
  );
}
