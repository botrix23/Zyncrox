"use client";

import Link from "next/link";
import { useState } from "react";
import { Zap } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const NAV_LINKS = ["Funciones", "Precios", "Integraciones", "Blog"];

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 z-50 bg-[rgba(245,244,242,0.80)] dark:bg-[rgba(9,9,11,0.75)] backdrop-blur-[20px] border-b border-black/[0.09] dark:border-white/[0.08] transition-colors duration-300">
        <div className="max-w-[1280px] mx-auto h-full flex items-center px-5 lg:px-16 gap-0">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 no-underline">
            <Zap className="w-[18px] h-[18px] text-purple-600 fill-purple-600" />
            <span className="text-[16px] font-bold text-slate-900 dark:text-white tracking-[-0.4px] transition-colors duration-300">
              ZyncSlot
            </span>
          </Link>

          {/* Desktop Links */}
          <ul className="hidden md:flex items-center gap-7 list-none m-0 mx-auto px-8">
            {NAV_LINKS.map((l) => (
              <li key={l}>
                <Link
                  href={`#${l.toLowerCase()}`}
                  className="text-[13.5px] font-medium text-slate-500 dark:text-zinc-400 no-underline whitespace-nowrap hover:text-slate-900 dark:hover:text-white transition-colors duration-150"
                >
                  {l}
                </Link>
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto md:ml-0">
            <ThemeToggle />
            <Link
              href="/admin/login"
              className="hidden sm:block text-[13.5px] font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white whitespace-nowrap px-[14px] py-2 rounded-lg transition-colors duration-150 hover:bg-purple-500/[0.08] no-underline"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/admin/register"
              className="text-[13.5px] font-semibold text-white bg-purple-600 hover:bg-purple-700 whitespace-nowrap px-[18px] py-2 rounded-lg shadow-[0_0_0_1px_rgba(139,92,246,0.4),0_4px_16px_rgba(139,92,246,0.25)] hover:shadow-[0_0_0_1px_rgba(139,92,246,0.5),0_6px_22px_rgba(139,92,246,0.35)] transition-all duration-150 hover:-translate-y-px no-underline"
            >
              Prueba gratis
            </Link>

            {/* Hamburger */}
            <button
              className="md:hidden flex flex-col gap-[5px] cursor-pointer bg-transparent border-none p-1 ml-2"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menú"
            >
              <span
                className="block w-5 h-[1.5px] bg-slate-900 dark:bg-white rounded-sm transition-transform duration-200"
                style={mobileOpen ? { transform: 'rotate(45deg) translate(5px, 5px)' } : {}}
              />
              <span
                className="block w-5 h-[1.5px] bg-slate-900 dark:bg-white rounded-sm transition-opacity duration-200"
                style={mobileOpen ? { opacity: 0 } : {}}
              />
              <span
                className="block w-5 h-[1.5px] bg-slate-900 dark:bg-white rounded-sm transition-transform duration-200"
                style={mobileOpen ? { transform: 'rotate(-45deg) translate(5px, -5px)' } : {}}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-[rgba(245,244,242,0.97)] dark:bg-[rgba(9,9,11,0.97)] backdrop-blur-[20px] border-b border-black/[0.09] dark:border-white/[0.08] px-5 pb-6 pt-0 flex flex-col gap-0">
          {NAV_LINKS.map((l) => (
            <Link
              key={l}
              href={`#${l.toLowerCase()}`}
              className="py-3 text-[15px] font-medium text-slate-500 dark:text-zinc-400 no-underline border-b border-black/[0.09] dark:border-white/[0.08] hover:text-slate-900 dark:hover:text-white transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {l}
            </Link>
          ))}
          <div className="flex flex-col gap-2 mt-4">
            <Link
              href="/admin/login"
              className="w-full text-center py-3 text-[15px] font-medium text-slate-500 dark:text-zinc-400 rounded-lg border border-black/[0.09] dark:border-white/[0.08] no-underline hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/admin/register"
              className="w-full text-center py-3 text-[15px] font-semibold text-white bg-purple-600 rounded-lg no-underline hover:bg-purple-700 transition-colors"
            >
              Prueba gratis →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
