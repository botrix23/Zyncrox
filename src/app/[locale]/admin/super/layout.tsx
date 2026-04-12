import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-session';
import Link from 'next/link';
import { ShieldCheck, Users, BarChart2, FileText, LogOut } from 'lucide-react';

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect('/es/admin/login');
  }

  const navItems = [
    { href: '/es/admin/super', label: 'Dashboard', icon: BarChart2 },
    { href: '/es/admin/super/tenants', label: 'Empresas', icon: Users },
    { href: '/es/admin/super/logs', label: 'Logs de Auditoría', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-black/40 border-r border-white/5 flex flex-col p-6 sticky top-0 h-screen">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-6 h-6 text-purple-400" />
            <span className="font-black text-lg tracking-tight">ZyncSlot</span>
          </div>
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest">Super Admin</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/5 pt-4 mt-4">
          <p className="text-xs text-zinc-500 mb-1">Sesión activa</p>
          <p className="text-sm font-semibold text-white truncate">{session.email}</p>
          <form action="/es/admin/login">
            <button type="submit" className="mt-3 flex items-center gap-2 text-xs text-zinc-500 hover:text-rose-400 transition-colors">
              <LogOut className="w-3 h-3" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
