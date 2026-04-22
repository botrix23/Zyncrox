const FEATURES = [
  {
    num: "01",
    title: "Slot locking en tiempo real",
    desc: "Cuando tu cliente elige un horario, nadie más puede tomarlo. Elimina las dobles reservas para siempre.",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <rect x="5" y="11" width="14" height="10" rx="2" stroke="#8b5cf6" strokeWidth="1.8"/>
        <path d="M8 11V7a4 4 0 118 0v4" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="12" cy="16" r="1.2" fill="#8b5cf6"/>
      </svg>
    ),
  },
  {
    num: "02",
    title: "Multi-sucursal y multi-staff",
    desc: "Gestioná todas tus sedes y tu equipo desde un panel. Horarios individuales y rotaciones automáticas.",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <circle cx="8" cy="8" r="3" stroke="#8b5cf6" strokeWidth="1.8"/>
        <circle cx="16" cy="8" r="3" stroke="#8b5cf6" strokeWidth="1.8"/>
        <path d="M2 20c0-3.314 2.686-6 6-6M16 14c3.314 0 6 2.686 6 6" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M10 20c0-2.761 1.343-5 3-5s3 2.239 3 5" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    num: "03",
    title: "Tu marca en cada detalle",
    desc: "Logo, colores, cover y redes sociales. Tu portal de reservas, tu identidad — no la nuestra.",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" stroke="#8b5cf6" strokeWidth="1.8"/>
        <path d="M12 7v5l3 2" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M7 12h1M16 12h1M12 7V6M12 18v-1" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    num: "04",
    title: "Varios servicios en una sola cita",
    desc: "Reservá corte + color + tratamiento en un solo flujo, el mismo día o en días distintos.",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="#8b5cf6" strokeWidth="1.8"/>
        <path d="M8 2v4M16 2v4M3 10h18" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M7 14h2M11 14h2M15 14h2" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    num: "05",
    title: "Servicio a domicilio inteligente",
    desc: "Zonas de cobertura con tarifas y confirmación automática por WhatsApp. Sin llamadas, sin errores.",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#8b5cf6" strokeWidth="1.8"/>
        <circle cx="12" cy="9" r="2.5" stroke="#8b5cf6" strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    num: "06",
    title: "Reseñas y clientes VIP",
    desc: "Encuestas personalizadas post-cita y detección automática de tus clientes más fieles.",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#8b5cf6" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export function LandingFeaturesSection() {
  return (
    <section className="relative z-10 bg-transparent py-[clamp(72px,9vw,120px)] px-5 lg:px-16" id="funciones">
      <div className="max-w-[1080px] mx-auto">
        {/* Header */}
        <div className="mb-[clamp(44px,6vw,64px)]">
          <h2 className="font-serif text-[clamp(32px,4vw,54px)] leading-[1.12] tracking-[-0.4px] text-slate-900 dark:text-white mb-4 transition-colors duration-300">
            Todo lo que necesitás.<br />
            <em className="text-purple-600">Nada de lo que no.</em>
          </h2>
          <p className="text-[clamp(14px,1.4vw,16px)] text-slate-500 dark:text-zinc-400 leading-[1.68] max-w-[480px] transition-colors duration-300">
            Funcionalidades pensadas para negocios reales, no para demos de marketing.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08] rounded-[14px] p-[clamp(20px,2.2vw,28px)] hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-500/[0.18] hover:-translate-y-[3px] hover:shadow-[0_8px_28px_rgba(139,92,246,0.10),0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200 cursor-default relative overflow-hidden group"
            >
              <div className="text-[11px] font-bold text-zinc-400 tracking-[0.5px] mb-[14px] tabular-nums">{f.num}</div>
              <div className="w-10 h-10 rounded-[10px] bg-purple-100 dark:bg-purple-950/40 group-hover:bg-purple-200/70 dark:group-hover:bg-purple-900/60 flex items-center justify-center mb-[14px] flex-shrink-0 transition-colors duration-200">
                {f.icon}
              </div>
              <div className="text-[clamp(13.5px,1.2vw,15px)] font-bold text-slate-900 dark:text-white tracking-[-0.2px] mb-[7px] leading-[1.3] transition-colors duration-300">
                {f.title}
              </div>
              <div className="text-[clamp(12px,1.1vw,13.5px)] text-zinc-500 dark:text-zinc-400 leading-[1.64] transition-colors duration-300">
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
