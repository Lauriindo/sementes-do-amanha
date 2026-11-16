"use client";

import { ArrowDownCircle, ArrowUpCircle, Pencil, Plus, Scale, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FinanceForm } from "@/components/finance/finance-form";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { SortHeader } from "@/components/ui/sort-header";
import { fieldsFor, formatCustomValue } from "@/lib/custom-fields";
import { visibleTransactions } from "@/lib/permissions";
import { useStore } from "@/lib/store";
import type { Transaction } from "@/lib/types";
import { cn, compareValues, formatCurrency, formatDate, type SortDir } from "@/lib/utils";

type TypeFilter = "todos" | "entrada" | "saida";

export function FinanceView() {
  const {
    transactions: allTransactions,
    fields,
    teams,
    donors,
    currentUser,
    currentRole,
    hydrated,
    can,
    addTransaction,
    updateTransaction,
    removeTransaction,
  } = useStore();
  const defs = fieldsFor(fields, "finance");
  const canEdit = can("financas", "editar");
  const transactions = useMemo(
    () => visibleTransactions(allTransactions, teams, currentUser, currentRole),
    [allTransactions, teams, currentUser, currentRole],
  );
  const donorLabel = (id?: string | null) => {
    if (!id) return "—";
    const d = donors.find((x) => x.id === id);
    return d ? d.comoChamar || d.nome || "Doador anônimo" : "—";
  };

  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<TypeFilter>("todos");
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "data", dir: "desc" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const sortValue = (t: Transaction, key: string): string | number => {
    if (key.startsWith("c:")) return t.custom?.[key.slice(2)] ?? "";
    switch (key) {
      case "tipo":
        return t.tipo;
      case "descricao":
        return t.descricao;
      case "categoria":
        return t.categoria;
      case "valor":
        return t.valor;
      case "data":
        return t.data;
      default:
        return "";
    }
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = transactions.filter((t) => {
      if (tipo !== "todos" && t.tipo !== tipo) return false;
      if (!term) return true;
      return [t.descricao, t.categoria, ...Object.values(t.custom ?? {})].join(" ").toLowerCase().includes(term);
    });
    const mult = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => mult * compareValues(sortValue(a, sort.key), sortValue(b, sort.key)));
  }, [transactions, q, tipo, sort]);

  const totals = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    for (const t of rows) {
      if (t.tipo === "entrada") entradas += t.valor;
      else saidas += t.valor;
    }
    return { entradas, saidas, saldo: entradas - saidas };
  }, [rows]);

  const toggleSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const close = () => setDialogOpen(false);
  const th = (key: string, label: string, className?: string) => (
    <SortHeader label={label} active={sort.key === key} dir={sort.dir} onClick={() => toggleSort(key)} className={className} />
  );

  return (
    <>
      <PageHeader
        title="Finanças"
        description="Registre doações, receitas e gastos. Os totais abaixo respeitam a busca e os filtros."
        actions={
          canEdit && (
            <Button
              className="h-12 px-5 text-base"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-5 w-5" /> Novo lançamento
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Entradas" value={formatCurrency(totals.entradas)} icon={ArrowUpCircle} />
        <StatCard label="Saídas" value={formatCurrency(totals.saidas)} icon={ArrowDownCircle} tone="red" />
        <StatCard label="Saldo" value={formatCurrency(totals.saldo)} icon={Scale} tone={totals.saldo < 0 ? "red" : "emerald"} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por descrição ou categoria…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Buscar lançamentos"
            />
          </div>
          <Select
            className="md:w-48"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TypeFilter)}
            aria-label="Filtrar por tipo"
          >
            <option value="todos">Entradas e saídas</option>
            <option value="entrada">Somente entradas</option>
            <option value="saida">Somente saídas</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-slate-50">
              <tr>
                {th("data", "Data")}
                {th("tipo", "Tipo")}
                {th("descricao", "Descrição")}
                {th("categoria", "Categoria")}
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Doador</th>
                {th("valor", "Valor", "text-right")}
                {defs.map((d) => th(`c:${d.id}`, d.label))}
                {canEdit && (
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-emerald-50/40">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(t.data)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                        t.tipo === "entrada" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700",
                      )}
                    >
                      {t.tipo === "entrada" ? "Entrada" : "Saída"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{t.descricao}</td>
                  <td className="px-4 py-3 text-slate-600">{t.categoria}</td>
                  <td className="px-4 py-3 text-slate-600">{t.tipo === "entrada" ? donorLabel(t.doadorId) : "—"}</td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-4 py-3 text-right font-bold",
                      t.tipo === "entrada" ? "text-emerald-700" : "text-red-600",
                    )}
                  >
                    {t.tipo === "entrada" ? "+" : "−"} {formatCurrency(t.valor)}
                  </td>
                  {defs.map((d) => (
                    <td key={d.id} className="px-4 py-3 text-slate-600">
                      {formatCustomValue(d, t.custom?.[d.id])}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${t.descricao}`}
                          onClick={() => {
                            setEditing(t);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="danger"
                          size="icon"
                          aria-label={`Excluir ${t.descricao}`}
                          onClick={() => window.confirm(`Excluir o lançamento "${t.descricao}"?`) && removeTransaction(t.id)}
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
              {transactions.length === 0
                ? "Nenhum lançamento ainda. Clique em “Novo lançamento” para começar 🌱"
                : "Nenhum lançamento encontrado com esses filtros."}
            </div>
          )}
        </div>
      </Card>

      <Dialog open={dialogOpen} onClose={close} title={editing ? "Editar lançamento" : "Novo lançamento"}>
        <FinanceForm
          key={editing?.id ?? "new"}
          initial={editing}
          defs={defs}
          onCancel={close}
          onSubmit={(data) => {
            if (editing) updateTransaction(editing.id, data);
            else addTransaction(data);
            close();
          }}
        />
      </Dialog>
    </>
  );
}
