"use client";

import { HeartHandshake, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DonorForm } from "@/components/donors/donor-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import type { Donor } from "@/lib/types";

export function DonorView() {
  const { donors, transactions, hydrated, can, addDonor, updateDonor, removeDonor } = useStore();
  const canEdit = can("doadores", "editar");

  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Donor | null>(null);

  const doacoesPorDoador = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.tipo !== "entrada" || !t.doadorId) continue;
      map.set(t.doadorId, (map.get(t.doadorId) ?? 0) + 1);
    }
    return map;
  }, [transactions]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return donors;
    return donors.filter((d) => [d.nome, d.comoChamar, d.contato].join(" ").toLowerCase().includes(term));
  }, [donors, q]);

  const close = () => setDialogOpen(false);

  const remove = (d: Donor) => {
    const label = d.comoChamar || d.nome || "este doador";
    if (window.confirm(`Excluir "${label}"? Os lançamentos já vinculados a ele deixam de ter um doador identificado.`)) {
      removeDonor(d.id);
    }
  };

  return (
    <>
      <PageHeader
        title="Doadores"
        description="Cadastro leve para reconhecer quem apoia a ONG — sem CPF, endereço ou outro dado pessoal sensível."
        actions={
          canEdit && (
            <Button
              className="h-12 px-5 text-base"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-5 w-5" /> Novo doador
            </Button>
          )
        }
      />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome, apelido ou contato…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Buscar doadores"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Como chamar
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Contato</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Doações</th>
                {canEdit && (
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((d) => (
                <tr key={d.id} className="transition-colors hover:bg-emerald-50/40">
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {d.nome || <span className="italic text-slate-400">Não informado</span>}
                    {d.anonimoRecorrente && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                        <HeartHandshake className="h-3 w-3" /> Anônimo recorrente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.comoChamar || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{d.contato || "—"}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{doacoesPorDoador.get(d.id) ?? 0}</td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${d.nome || d.comoChamar}`}
                          onClick={() => {
                            setEditing(d);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="danger"
                          size="icon"
                          aria-label={`Excluir ${d.nome || d.comoChamar}`}
                          onClick={() => remove(d)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {hydrated && rows.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-500">
              {donors.length === 0
                ? "Nenhum doador cadastrado ainda."
                : "Nenhum doador encontrado com essa busca."}
            </div>
          )}
        </div>
      </Card>

      <Dialog open={dialogOpen} onClose={close} title={editing ? "Editar doador" : "Novo doador"}>
        <DonorForm
          key={editing?.id ?? "new"}
          initial={editing}
          onCancel={close}
          onSubmit={(data) => {
            if (editing) updateDonor(editing.id, data);
            else addDonor(data);
            close();
          }}
        />
      </Dialog>
    </>
  );
}
