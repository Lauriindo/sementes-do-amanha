import { cn } from "@/lib/utils";

interface StatusTagProps {
  /** true = visitante ainda está na ONG. */
  inside: boolean;
  className?: string;
}

/**
 * Tag de status do visitante.
 * - NO LOCAL: pílula verde com `animate-pulse` + anel `animate-ping` no ponto.
 * - SAIU: pílula cinza estática.
 */
export function StatusTag({ inside, className }: StatusTagProps) {
  if (inside) {
    return (
      <span
        className={cn(
          "inline-flex animate-pulse items-center gap-2 whitespace-nowrap rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold tracking-wide text-emerald-800 ring-1 ring-emerald-300",
          className,
        )}
      >
        <span className="relative flex h-2.5 w-2.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
        </span>
        🟢 NO LOCAL
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-bold tracking-wide text-slate-500 ring-1 ring-slate-200",
        className,
      )}
    >
      ⚪ SAIU
    </span>
  );
}
