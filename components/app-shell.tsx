"use client";

import {
  FileSpreadsheet,
  HeartHandshake,
  LayoutDashboard,
  ShieldCheck,
  Sprout,
  SlidersHorizontal,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { Footer } from "@/components/footer";
import { ONG } from "@/lib/ong";
import { useStore } from "@/lib/store";
import type { AppArea } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; area: AppArea }[] = [
  { href: "/", label: "Painel", icon: LayoutDashboard, area: "painel" },
  { href: "/visitantes", label: "Visitantes", icon: Users, area: "visitantes" },
  { href: "/financas", label: "Finanças", icon: Wallet, area: "financas" },
  { href: "/doadores", label: "Doadores", icon: HeartHandshake, area: "doadores" },
  { href: "/campos", label: "Campos", icon: SlidersHorizontal, area: "campos" },
  { href: "/admin", label: "Admin", icon: ShieldCheck, area: "administracao" },
  { href: "/excel", label: "Excel", icon: FileSpreadsheet, area: "excel" },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
        <Sprout className="h-6 w-6" />
      </div>
      <div className="leading-tight">
        <p className="text-base font-extrabold text-emerald-800">{ONG.nome}</p>
        <p className="text-xs text-slate-500">Gestão e Visitantes</p>
      </div>
    </div>
  );
}

/** Classes literais (o Tailwind precisa "ver" o nome completo para gerá-las). */
const MOBILE_GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { can } = useStore();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const visibleNav = NAV.filter((item) => can(item.area));

  return (
    <div className="min-h-screen">
      {/* Menu lateral (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white p-5 md:flex">
        <Brand />
        <UserMenu className="mt-6 rounded-xl border border-slate-200 p-2 pl-3" />
        <nav className="mt-6 flex flex-col gap-1" aria-label="Principal">
          {visibleNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors",
                isActive(href)
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
        <p className="mt-auto text-xs leading-relaxed text-slate-400">{ONG.sistema}</p>
      </aside>

      {/* Cabeçalho (mobile) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Brand />
          <UserMenu compact className="w-44" />
        </div>
      </header>

      <div className="flex min-h-screen flex-col md:pl-64">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-8">
          {children}
        </main>
        <Footer />
        <div className="h-16 md:hidden" aria-hidden />
      </div>

      {/* Menu inferior (mobile) */}
      <nav
        aria-label="Principal"
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 grid border-t border-slate-200 bg-white md:hidden",
          MOBILE_GRID_COLS[visibleNav.length] ?? "grid-cols-5",
        )}
      >
        {visibleNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
              isActive(href) ? "text-emerald-700" : "text-slate-500",
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
