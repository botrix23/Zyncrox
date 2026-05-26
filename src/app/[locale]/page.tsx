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
import { LandingCursorGlow } from "@/components/LandingCursorGlow";
import { ScrollReveal } from "@/components/ScrollReveal";
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
    <div className="relative min-h-screen bg-[#f5f4f2] dark:bg-[#09090b] transition-colors duration-300 selection:bg-purple-500/30">

      {/* ── Fixed background: radial gradients ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 dark:opacity-100 opacity-40 transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 0% 0%, rgba(109,40,217,0.16) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 100% 100%, rgba(109,40,217,0.12) 0%, transparent 55%)',
        }}
      />

      {/* ── Animated drifting orbs ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-[0.07] dark:opacity-[0.10] animate-orb-drift-1"
          style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full opacity-[0.06] dark:opacity-[0.09] animate-orb-drift-2"
          style={{ background: "radial-gradient(circle, #6d28d9 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-[0.04] dark:opacity-[0.06] animate-orb-drift-1"
          style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)", animationDelay: "-8s" }}
        />
      </div>

      {/* ── Cursor glow (desktop only, client) ── */}
      <LandingCursorGlow />

      <div className="relative z-10">
        <LandingNavbar />
        <main>
          {/* Hero — no reveal, it's the first thing visible */}
          <LandingHero />

          {/* Industry */}
          <ScrollReveal variant="fade-up" delay={0} threshold={0.08}>
            <LandingIndustrySection />
          </ScrollReveal>

          {/* How it works */}
          <ScrollReveal variant="fade-up" delay={0} threshold={0.06}>
            <LandingHowSection />
          </ScrollReveal>

          {/* Features */}
          <ScrollReveal variant="fade-up" delay={0} threshold={0.06}>
            <LandingFeaturesSection />
          </ScrollReveal>

          {/* Pain points */}
          <ScrollReveal variant="fade-up" delay={0} threshold={0.06}>
            <LandingPainSection />
          </ScrollReveal>

          {/* Differentiators */}
          <ScrollReveal variant="fade-up" delay={0} threshold={0.06}>
            <LandingDiffSection />
          </ScrollReveal>

          {/* Brand / stats */}
          <ScrollReveal variant="fade-up" delay={0} threshold={0.06}>
            <LandingBrandSection />
          </ScrollReveal>

          {/* Pricing */}
          <ScrollReveal variant="fade-up" delay={0} threshold={0.06}>
            <LandingPricingSection />
          </ScrollReveal>
        </main>

        <ScrollReveal variant="fade-up" delay={0} threshold={0.05}>
          <LandingFaqCtaSection />
        </ScrollReveal>
      </div>
    </div>
  );
}
