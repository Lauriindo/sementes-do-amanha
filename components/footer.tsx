import { Heart } from "lucide-react";
import { ONG } from "@/lib/ong";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
      <p className="font-semibold text-slate-600">
        {ONG.nome} · {ONG.cidade}
      </p>
      <p className="mt-1 inline-flex items-center gap-1.5">
        Desenvolvido com <Heart className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" /> por{" "}
        <span className="font-extrabold tracking-wide text-emerald-700">{ONG.desenvolvidoPor}</span>
      </p>
    </footer>
  );
}
