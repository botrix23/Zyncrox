import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-session';
import { SuperAdminLayoutClient } from './SuperAdminLayoutClient';
import { getSuperAdminNotificationsAction } from '@/app/actions/superAdmin';

export default async function SuperAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const session = await getSession();
  const locale = params.locale || 'es';

  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect(`/${locale}/admin/login`);
  }

  const notifData = await getSuperAdminNotificationsAction();

  return (
    <SuperAdminLayoutClient
      email={session.email}
      locale={locale}
      initialNotifications={notifData.notifications}
      initialUnreadCount={notifData.unreadCount}
    >
      {children}
    </SuperAdminLayoutClient>
  );
}
