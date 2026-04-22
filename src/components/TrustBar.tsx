export function TrustBar() {
  const avatars = [
    { initials: "AF", color: "bg-indigo-500" },
    { initials: "CM", color: "bg-blue-500" },
    { initials: "JL", color: "bg-amber-500" },
    { initials: "RV", color: "bg-emerald-500" },
  ];

  return (
    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-1000">
      <div className="flex -space-x-2">
        {avatars.map((avatar, i) => (
          <div 
            key={i} 
            className={`w-8 h-8 rounded-full border-2 border-white dark:border-zinc-950 ${avatar.color} flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}
          >
            {avatar.initials}
          </div>
        ))}
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
        <span className="font-bold text-slate-900 dark:text-white">+2.400 negocios</span> ya gestionan sus citas con Zyncrox
      </p>
    </div>
  );
}
