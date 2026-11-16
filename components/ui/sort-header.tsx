import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn, type SortDir } from "@/lib/utils";

interface SortHeaderProps {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}

/** Cabeçalho de tabela clicável para ordenação. */
export function SortHeader({ label, active, dir, onClick, className }: SortHeaderProps) {
  const Icon = !active ? ChevronsUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500", className)}
    >
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 hover:text-emerald-700">
        {label}
        <Icon className={cn("h-3.5 w-3.5", active ? "text-emerald-600" : "text-slate-300")} />
      </button>
    </th>
  );
}
