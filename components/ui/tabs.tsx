"use client";

import { cn } from "@/lib/utils";

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string; badge?: string }[];
}

/** Controle segmentado simples (abas). */
export function Tabs<T extends string>({ value, onChange, items }: TabsProps<T>) {
  return (
    <div role="tablist" className="inline-flex rounded-xl bg-slate-100 p-1">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          type="button"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
            value === it.value
              ? "bg-white text-emerald-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          {it.label}
          {it.badge && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">{it.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}
