"use client";

import { LogOut, Pencil, Plus, Search, Trash2, UserCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { SortHeader } from "@/components/ui/sort-header";
import { StatusTag } from "@/components/visitors/status-tag";
import { VisitorForm } from "@/components/visitors/visitor-form";
import { fieldsFor, formatCustomValue } from "@/lib/custom-fields";
import { useStore } from "@/lib/store";
import type { Visitor } from "@/lib/types";
import { compareValues, formatDateTime, todayISO, type SortDir } from "@/lib/utils";

type StatusFilter = "todos" | "no-local" | "saiu";

export function VisitorsView() {
  const { visitors, fields, hydrated, can, addVisitor, updateVisitor, removeVisitor, checkout } = useStore();
  const defs = fieldsFor(fields, "visitors");
  const canEdit = can("visitantes", "editar");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "entrada", dir: "desc" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Visitor | null>(null);

  const sortValue = (v: Visitor, key: string): string | number => {
    if (key.startsWith("c:")) return v.custom?.[key.slice(2)] ?? "";
    switch (key) {
      case "status":
        return v.saida ? 1 : 0;
      case "nome":
        return v.nome;
      case "documento":
        return v.documento;
      case "motivo":
        return v.motivo;
      case "destino":
        return v.destino;
      case "entrada":
        return v.entrada;
      case "saida":
        return v.saida ?? "";
      default:
        return "";
    }
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = visitors.filter((v) => {
      if (status === "no-local" && v.saida) return false;
      if (status === "saiu" && !v.saida) return false;
      if (!term) return true;
      const hay = [v.nome, v.documento, v.motivo, v.destino, ...Object.values(v.custom ?? {})]
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
    const mult = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => mult * compareValues(sortValue(a, sort.key), sortValue(b, sort.key)));
  }, [visitors, q, status, sort]);

  const noLocal = visitors.filter((v) => !v.saida).length;
  const hoje = todayISO();
  const entradasHoje = visitors.filter((v) => todayISO(new Date(v.entrada)) === hoje).length;

  const toggleSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (v: Visitor) => {
    setEditing(v);
    setDialogOpen(true);
  };
  const close = () => setDialogOpen(false);

  const th = (key: string, label: string) => (
    <SortHeader label={label} active={sort.key === key} dir={sort.dir} onClick={() => toggleSort(key)} />
  );

  return (
    <>
      <PageHeader
        title="Visitantes"
        description="Registre a entrada, acompanhe quem está na ONG e faça o check-out com um clique."
        actions={
          canEdit && (
            <Button onClick={openNew} className="h-12 px-5 text-base">
              <Plus className="h-5 w-5" /> Novo visitante
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="No local agora" value={String(noLocal)} icon={UserCheck} />
        <StatCard label="Entradas hoje" value={String(entradasHoje)} icon={Users} tone="slate" />
        <StatCard label="Total no histórico" value={String(visitors.length)} icon={Users} tone="slate" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome, documento, motivo…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Buscar visitantes"
            />
          </div>
          <Select
            className="md:w-52"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            aria-label="Filtrar por status"
          >
            <option value="todos">Todos os status</option>
            <option value="no-local">🟢 No local</option>
            <option value="saiu">⚪ Saiu</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50">
              <tr>
                {th("status", "Status")}
                {th("nome", "Nome")}
                {th("documento", "Documento")}
                {th("motivo", "Motivo")}
                {th("destino", "Visitando")}
                {th("entrada", "Entrada")}
                {th("saida", "Saída")}
                {defs.map((d) => th(`c:${d.id}`, d.label))}
                {canEdit && (
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((v) => (
                <tr key={v.id} className="transition-colors hover:bg-emerald-50/40">
                  <td className="px-4 py-3">
                    <StatusTag inside={!v.saida} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-800">{v.nome}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{v.documento || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{v.motivo || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{v.destino || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(v.entrada)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(v.saida)}</td>
                  {defs.map((d) => (
                    <td key={d.id} className="px-4 py-3 text-slate-600">
                      {formatCustomValue(d, v.custom?.[d.id])}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {!v.saida && (
                          <Button size="sm" onClick={() => checkout(v.id)}>
                            <LogOut className="h-4 w-4" /> Check-out
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" aria-label={`Editar ${v.nome}`} onClick={() => openEdit(v)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="danger"
                          size="icon"
                          aria-label={`Excluir ${v.nome}`}
                          onClick={() => window.confirm(`Excluir o registro de ${v.nome}?`) && removeVisitor(v.id)}
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
              {visitors.length === 0
                ? "Nenhum visitante registrado ainda. Clique em “Novo visitante” para começar 🌱"
                : "Nenhum visitante encontrado com esses filtros."}
            </div>
          )}
        </div>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={close}
        title={editing ? "Editar visitante" : "Novo visitante"}
        description={editing ? undefined : "A entrada é registrada com a data e hora atuais."}
      >
        <VisitorForm
          key={editing?.id ?? "new"}
          initial={editing}
          defs={defs}
          onCancel={close}
          onSubmit={(data) => {
            if (editing) updateVisitor(editing.id, data);
            else addVisitor(data);
            close();
          }}
        />
      </Dialog>
    </>
  );
}
