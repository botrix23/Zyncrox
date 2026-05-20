import { LandingNavbar } from "@/components/LandingNavbar";
import { LandingHero } from "@/components/LandingHero";
import { LandingIndustrySection } from "@/components/LandingIndustrySection";
import { LandingHowSection } from "@/components/LandingHowSection";
import { LandingFeaturesSection } from "@/components/LandingFeaturesSection";
import { LandingPainSection } from "@/components/LandingPainSection";
import { LandingDiffSection } from "@/components/LandingDiffSection";
import { LandingBrandSection } from "@/components/LandingBrandSection";
import { LandingPricingSection } from "@/components/LandingPricingSection";
import { LandingFaqCtaSection } from "@/components/LandingFaqCtaSection";
import { getSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export default async function LandingPage({ params: { locale } }: { params: { locale: string } }) {
  const session = await getSession();

  if (session) {
    if (session.role === 'SUPER_ADMIN') {
      redirect(`/${locale}/admin/super`);
    }
    redirect(`/${locale}/admin`);
  }

  return (
    <div className="relative min-h-screen bg-[#f5f4f2] dark:bg-[#09090b] overflow-x-hidden transition-colors duration-300 selection:bg-purple-500/30">
      {/* Radial background gradients */}
      <div
        className="pointer-events-none fixed inset-0 z-0 dark:opacity-100 opacity-40 transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 0% 0%, rgba(109,40,217,0.16) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 100% 100%, rgba(109,40,217,0.12) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10">
        <LandingNavbar />
        <main>
          <LandingHero />
          <LandingIndustrySection />
          <LandingHowSection />
          <LandingFeaturesSection />
          <LandingPainSection />
          <LandingDiffSection />
          <LandingBrandSection />
          <LandingPricingSection />
        </main>
        <LandingFaqCtaSection />
      </div>
    </div>
  );
}
