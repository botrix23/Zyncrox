import { getSession } from "@/lib/auth-session";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminHeader } from "@/components/AdminHeader";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tenants, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export default async function AdminLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const session = await getSession();
  const locale = params.locale || 'es';
  const headersList = headers();
  const pathname = headersList.get('x-pathname') ?? '';
  const isBillingPage = pathname.includes('/billing');

  // Cierre inmediato de sesión, check de cambio de contraseña, y backfill de nombre
  if (session?.userId) {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { isActive: true, mustChangePassword: true, name: true },
    });
    if (!dbUser || !dbUser.isActive) {
      redirect(`/${locale}/admin/login`);
    }
    if (dbUser?.mustChangePassword) {
      redirect(`/${locale}/admin/change-password`);
    }
    // Backfill del nombre en memoria (sin tocar la cookie)
    if (dbUser?.name && !session.name) {
      session.name = dbUser.name;
    }
  }

  // Obtener nombre de la empresa para el sidebar y verificar expiración del trial
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
        if (session.role !== 'SUPER_ADMIN') {
          if (tenant?.status === 'SUSPENDED') {
            if (!isBillingPage) {
              redirect(`/${locale}/admin/billing`);
            }
          } else if (
            tenant?.status === 'TRIAL' &&
            tenant.subscriptionExpiresAt &&
            new Date() > tenant.subscriptionExpiresAt
          ) {
            redirect(`/${locale}/admin/billing`);
          }
        }
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
