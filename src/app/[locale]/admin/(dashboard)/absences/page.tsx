import { redirect } from "next/navigation";

// Ausencias is now integrated as a tab inside the Personal (staff) page.
// Redirect any direct navigation to /admin/absences → /admin/staff
export default async function AbsencesPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  redirect(`/${locale}/admin/staff`);
}
