import { getSession } from "@/lib/auth-session";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminHeader } from "@/components/AdminHeader";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import PriceChangeBanner from "@/components/PriceChangeBanner";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tenants, users, subscriptions, platformConfig } from "@/db/schema";
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
  let tenantSlug = "";
  let tenantPlan: string | null = null;
  let nextBillingDate: Date | null = null;
  let tenantStatus: string = 'ACTIVE';
  let trialEndsAt: Date | null = null;
  let userEmail: string | null = session?.email ?? null;

  let shouldRedirectToBilling = false;
  let priceChangeNotice: { effectiveDate: string; messageEs: string; messageEn: string; plans: { plan: string; currentPrice: number; newPrice: number }[] } | null = null;

  // Fetch platform config for price change notice (lightweight, cached at CDN level)
  try {
    const cfg = await db.select({ priceChangeNotice: platformConfig.priceChangeNotice })
      .from(platformConfig)
      .limit(1)
      .then(r => r[0] ?? null);
    priceChangeNotice = cfg?.priceChangeNotice ?? null;
  } catch {
    // Non-critical — ignore if column doesn't exist yet
  }

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
        tenantSlug = tenant?.slug ?? "";
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

  // redirect() lanza una excepción internamente — debe llamarse FUERA del try/catch.
  // El billing ya está fuera de este route group, así que no hay riesgo de loop.
  if (shouldRedirectToBilling) {
    redirect(`/${locale}/admin/billing`);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex overflow-hidden">
      <AdminSidebar user={session} locale={locale} tenantName={tenantName} tenantPlan={tenantPlan} tenantSlug={tenantSlug} />

      <main className="flex-1 flex flex-col min-h-screen max-h-screen overflow-hidden">
        {/* Impersonation warning banner — shown when Super Admin is viewing a tenant panel */}
        {session?.role === 'SUPER_ADMIN' && session.impersonatedTenantId && (
          <ImpersonationBanner
            tenantName={session.impersonatedTenantName ?? tenantName}
            locale={locale}
          />
        )}
        {/* Price change notice banner — shown to all tenant admins when a notice is active */}
        {priceChangeNotice && session?.role !== 'SUPER_ADMIN' && (
          <PriceChangeBanner notice={priceChangeNotice} locale={locale} />
        )}
        <AdminHeader
          user={session}
          locale={locale}
          userEmail={userEmail}
          nextBillingDate={nextBillingDate}
          tenantStatus={tenantStatus}
          trialEndsAt={trialEndsAt}
        />
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6 custom-scrollbar bg-slate-50 dark:bg-black/40">
          {children}
        </div>
      </main>
    </div>
  );
}
