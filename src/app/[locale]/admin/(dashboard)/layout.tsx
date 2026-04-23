import { getSession } from "@/lib/auth-session";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminHeader } from "@/components/AdminHeader";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tenants, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

export default async function AdminLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const session = await getSession();
  const locale = params.locale || 'es';

  // Cierre inmediato de sesión: si el usuario tiene userId, verificar isActive en BD
  if (session?.userId) {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { isActive: true },
    });
    if (dbUser && !dbUser.isActive) {
      cookies().delete("zync_session");
      redirect(`/${locale}/admin/login`);
    }
  }

  // Obtener nombre de la empresa para el sidebar
  let tenantName = "";
  if (session) {
    if (session.role === 'SUPER_ADMIN' && session.impersonatedTenantName) {
      tenantName = session.impersonatedTenantName;
    } else if (session.tenantId) {
      try {
        const tenant = await db.query.tenants.findFirst({
          where: eq(tenants.id, session.tenantId)
        });
        tenantName = tenant?.name || "";
      } catch (error) {
        console.error("Error fetching tenant details:", error);
        tenantName = "";
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex overflow-hidden">
      {/* Sidebar - Solo si hay sesión para evitar flash */}
      <AdminSidebar user={session} locale={locale} tenantName={tenantName} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen max-h-screen overflow-hidden">
        {/* Top Header */}
        <AdminHeader user={session} />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar bg-slate-50 dark:bg-black/40">
          {children}
        </div>
      </main>
    </div>
  );
}
