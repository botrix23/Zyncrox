import { getSession } from "@/lib/auth-session";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminHeader } from "@/components/AdminHeader";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tenants, users, subscriptions } from "@/db/schema";
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

  // Session checks
  if (session?.userId) {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { isActive: true, mustChangePassword: true, name: true },
    });
    if (!dbUser || !dbUser.isActive) {
      redirect(`/${locale}/admin/login`);
    }
    if (dbUser?.mustChangePassword) {
      redirect(`/${locale}/admin/change-password?forced=1`);
    }
    if (dbUser?.name && !session.name) {
      session.name = dbUser.name;
    }
  }

  // Tenant + subscription data
  let tenantName = "";
  let tenantPlan: string | null = null;
  let nextBillingDate: Date | null = null;
  let tenantStatus: string = 'ACTIVE';
  let trialEndsAt: Date | null = null;
  let userEmail: string | null = session?.email ?? null;

  let shouldRedirectToBilling = false;

  if (session) {
    if (session.role === 'SUPER_ADMIN' && session.impersonatedTenantName) {
      tenantName = session.impersonatedTenantName;
    } else if (session.tenantId) {
      try {
        const [tenant, sub] = await Promise.all([
          db.query.tenants.findFirst({ where: eq(tenants.id, session.tenantId) }),
          db.query.subscriptions.findFirst({ where: eq(subscriptions.tenantId, session.tenantId) }),
        ]);

        tenantName = tenant?.name || "";
        tenantPlan = tenant?.plan ?? null;
        tenantStatus = tenant?.status ?? 'ACTIVE';
        trialEndsAt = tenant?.subscriptionExpiresAt ?? null;
        nextBillingDate = sub?.currentPeriodEnd ?? null;

        if (session.role !== 'SUPER_ADMIN') {
          if (tenant?.status === 'SUSPENDED') {
            shouldRedirectToBilling = true;
          } else if (
            tenant?.status === 'TRIAL' &&
            tenant.subscriptionExpiresAt &&
            new Date() > tenant.subscriptionExpiresAt
          ) {
            shouldRedirectToBilling = true;
          }
        }
      } catch (error) {
        console.error("Error fetching tenant details:", error);
      }
    }
  }

  // redirect() lanza una excepción internamente — debe llamarse FUERA del try/catch
  if (shouldRedirectToBilling && !isBillingPage) {
    redirect(`/${locale}/admin/billing`);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex overflow-hidden">
      <AdminSidebar user={session} locale={locale} tenantName={tenantName} tenantPlan={tenantPlan} />

      <main className="flex-1 flex flex-col min-h-screen max-h-screen overflow-hidden">
        <AdminHeader
          user={session}
          locale={locale}
          userEmail={userEmail}
          nextBillingDate={nextBillingDate}
          tenantStatus={tenantStatus}
          trialEndsAt={trialEndsAt}
        />
        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar bg-slate-50 dark:bg-black/40">
          {children}
        </div>
      </main>
    </div>
  );
}
