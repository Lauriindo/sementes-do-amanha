"use client";

import { ArrowDownCircle, ArrowUpCircle, Sparkles, UserCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { CategoryChart, MonthlyChart, type CategoryPoint, type MonthlyPoint } from "@/components/dashboard/charts";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusTag } from "@/components/visitors/status-tag";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ONG } from "@/lib/ong";
import { visibleTransactions } from "@/lib/permissions";
import { useStore } from "@/lib/store";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function DashboardView() {
  const { visitors, transactions: allTransactions, teams, currentUser, currentRole, hydrated, loadDemo } = useStore();
  const transactions = useMemo(
    () => visibleTransactions(allTransactions, teams, currentUser, currentRole),
    [allTransactions, teams, currentUser, currentRole],
  );

  const stats = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    const porCategoria = new Map<string, number>();
    const porMes = new Map<string, { Entradas: number; Saídas: number }>();

    for (const t of transactions) {
      const key = t.data.slice(0, 7);
      const m = porMes.get(key) ?? { Entradas: 0, Saídas: 0 };
      if (t.tipo === "entrada") {
        entradas += t.valor;
        m.Entradas += t.valor;
      } else {
        saidas += t.valor;
        m.Saídas += t.valor;
        porCategoria.set(t.categoria, (porCategoria.get(t.categoria) ?? 0) + t.valor);
      }
      porMes.set(key, m);
    }

    // Últimos 6 meses (inclui meses sem movimento).
    const monthly: MonthlyPoint[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const m = porMes.get(key) ?? { Entradas: 0, Saídas: 0 };
      monthly.push({ mes: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, ...m });
    }

    const categories: CategoryPoint[] = [...porCategoria.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { entradas, saidas, saldo: entradas - saidas, monthly, categories };
  }, [transactions]);

  const noLocal = useMemo(() => visitors.filter((v) => !v.saida), [visitors]);
  const isEmpty = hydrated && visitors.length === 0 && transactions.length === 0;

  return (
    <>
      <PageHeader title={`Olá, equipe da ${ONG.nome} 🌱`} description={ONG.descricao} />

      {isEmpty && currentRole?.isAdmin && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50/60">
          <CardContent className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-emerald-900">Tudo pronto para começar!</p>
              <p className="text-sm text-emerald-800/80">
                Registre o primeiro visitante ou lançamento — ou carregue dados de exemplo para conhecer o sistema.
              </p>
            </div>
            <Button variant="outline" onClick={loadDemo}>
              <Sparkles className="h-4 w-4" /> Carregar exemplo
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo total" value={formatCurrency(stats.saldo)} icon={Wallet} tone={stats.saldo < 0 ? "red" : "emerald"} />
        <StatCard label="Entradas" value={formatCurrency(stats.entradas)} icon={ArrowUpCircle} />
        <StatCard label="Saídas" value={formatCurrency(stats.saidas)} icon={ArrowDownCircle} tone="red" />
        <StatCard label="Visitantes no local" value={String(noLocal.length)} icon={UserCheck} hint="Atualizado em tempo real" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Entradas × Saídas (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyChart data={stats.monthly} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.categories.length === 0 ? (
              <p className="flex h-72 items-center justify-center text-center text-sm text-slate-500">
                Sem saídas registradas ainda.
              </p>
            ) : (
              <CategoryChart data={stats.categories} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Quem está na ONG agora</CardTitle>
          <Link href="/visitantes" className="text-sm font-semibold text-emerald-700 hover:underline">
            Ver todos
          </Link>
        </CardHeader>
        <CardContent>
          {noLocal.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum visitante no local neste momento.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {noLocal.slice(0, 6).map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-800">{v.nome}</p>
                    <p className="truncate text-xs text-slate-500">
                      Desde {formatDateTime(v.entrada)}
                      {v.motivo ? ` · ${v.motivo}` : ""}
                    </p>
                  </div>
                  <StatusTag inside />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
