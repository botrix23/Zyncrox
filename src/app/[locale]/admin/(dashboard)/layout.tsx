import { getSession } from "@/lib/auth-session";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminHeader } from "@/components/AdminHeader";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AdminLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const session = await getSession();
  const locale = params.locale || 'es';

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
        tenantName = ""; // Fallback to empty string if query fails
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
