"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

export const COUNTRIES = [
  { code: 'SV', name: 'El Salvador', prefix: '+503', flag: '🇸🇻' },
  { code: 'US', name: 'USA', prefix: '+1', flag: '🇺🇸' },
  { code: 'GT', name: 'Guatemala', prefix: '+502', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', prefix: '+504', flag: '🇭🇳' },
  { code: 'CR', name: 'Costa Rica', prefix: '+506', flag: '🇨🇷' },
  { code: 'NI', name: 'Nicaragua', prefix: '+505', flag: '🇳🇮' },
  { code: 'PA', name: 'Panamá', prefix: '+507', flag: '🇵🇦' },
  { code: 'MX', name: 'México', prefix: '+52', flag: '🇲🇽' },
  { code: 'CO', name: 'Colombia', prefix: '+57', flag: '🇨🇴' },
  { code: 'ES', name: 'España', prefix: '+34', flag: '🇪🇸' },
  { code: 'AR', name: 'Argentina', prefix: '+54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', prefix: '+56', flag: '🇨🇱' },
  { code: 'PE', name: 'Perú', prefix: '+51', flag: '🇵🇪' },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function PhoneInput({ value, onChange, placeholder = "0000-0000", className = "" }: PhoneInputProps) {
  const [showList, setShowList] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Intentar detectar el prefijo actual del valor
  const currentCountry = COUNTRIES.find(c => value.startsWith(c.prefix)) || COUNTRIES[0];
  const numberPart = value.startsWith(currentCountry.prefix) ? value.slice(currentCountry.prefix.length).trim() : value;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.prefix.includes(searchTerm)
  );

  const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
    onChange(`${country.prefix} ${numberPart}`);
    setShowList(false);
    setSearchTerm("");
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d- ]/g, "");
    onChange(`${currentCountry.prefix} ${val}`);
  };

  return (
    <div className={`relative flex gap-2 ${className}`} ref={containerRef}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowList(!showList)}
          className="h-[58px] flex items-center gap-2 px-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-purple-500/50 transition-all min-w-[100px] justify-between"
        >
          <span className="text-xl">{currentCountry.flag}</span>
          <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">{currentCountry.prefix}</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showList ? 'rotate-180' : ''}`} />
        </button>

        {showList && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 border-b border-slate-100 dark:border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar país..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {filteredCountries.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left ${currentCountry.code === c.code ? 'bg-purple-500/5' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{c.flag}</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-white">{c.name}</span>
                  </div>
                  <span className="text-slate-400 text-xs font-bold">{c.prefix}</span>
                </button>
              ))}
              {filteredCountries.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-slate-500">No se encontraron resultados</div>
              )}
            </div>
          </div>
        )}
      </div>

      <input
        type="text"
        value={numberPart}
        onChange={handleNumberChange}
        placeholder={placeholder}
        className="flex-1 h-[58px] p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm text-slate-900 dark:text-white"
      />
    </div>
  );
}
