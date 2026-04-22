const PAINS = [
  {
    title: "Horarios rígidos",
    desc: "No podés definir horarios distintos por empleado, día o servicio. El sistema decide por vos.",
  },
  {
    title: "Sin tu identidad de marca",
    desc: "Tus clientes reservan en una plataforma que no refleja tu negocio. Es su imagen, no la tuya.",
  },
  {
    title: "Imposible gestionar equipos o sucursales",
    desc: "Todo desde una sola vista sin flexibilidad. Crecer significa multiplicar los problemas.",
  },
  {
    title: "Pagás lo que no usás",
    desc: "Funciones que nunca tocás y te faltan las que necesitás. Un precio fijo para todas las realidades.",
  },
];

export function LandingPainSection() {
  return (
    <section className="relative z-10 bg-transparent py-[clamp(72px,9vw,120px)] px-5 lg:px-16">
      <div className="max-w-[1080px] mx-auto">
        {/* Headline */}
        <h2 className="font-serif text-[clamp(32px,4vw,58px)] leading-[1.12] tracking-[-0.5px] text-slate-900 dark:text-white mb-5 max-w-[780px] transition-colors duration-300">
          Los sistemas genéricos te obligan<br />
          a <em className="text-purple-600">adaptarte a ellos.</em>
        </h2>
        <p className="text-[clamp(15px,1.5vw,17px)] text-slate-500 dark:text-zinc-400 leading-[1.68] max-w-[520px] mb-[clamp(44px,6vw,72px)] transition-colors duration-300">
          Cada negocio es único. Un sistema que no entiende eso trabaja en tu contra.
        </p>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PAINS.map((p, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900/80 border border-black/[0.13] dark:border-white/[0.13] rounded-[14px] p-[clamp(22px,2.5vw,32px)] hover:border-red-400/30 hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden"
            >
              <div className="inline-flex items-center justify-center w-7 h-7 bg-red-500/[0.12] border border-red-500/25 rounded-[7px] text-red-400 text-[14px] font-black mb-[14px] flex-shrink-0">
                ✕
              </div>
              <div className="text-[clamp(15px,1.4vw,17px)] font-bold text-slate-900 dark:text-white tracking-[-0.3px] mb-2 leading-[1.3] transition-colors duration-300">
                {p.title}
              </div>
              <div className="text-[clamp(13px,1.2vw,14.5px)] text-slate-500 dark:text-zinc-400 leading-[1.65] transition-colors duration-300">
                {p.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
