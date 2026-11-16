"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA } from "@/lib/ong";
import { useStore } from "@/lib/store";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Draft {
  nome: string;
  descricao: string;
  categorias: string[];
  compartilhar: boolean;
}

const EMPTY: Draft = { nome: "", descricao: "", categorias: [], compartilhar: false };

export function TeamManager() {
  const { teams, users, hydrated, addTeam, updateTeam, removeTeam } = useStore();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDraft(EMPTY);
    setEditingId(null);
    setError(null);
  };

  const startEdit = (t: Team) => {
    setEditingId(t.id);
    setDraft({ nome: t.nome, descricao: t.descricao ?? "", categorias: [...t.categorias], compartilhar: t.compartilhar });
    setError(null);
  };

  const toggleCategoria = (c: string) =>
    setDraft((d) => ({
      ...d,
      categorias: d.categorias.includes(c) ? d.categorias.filter((x) => x !== c) : [...d.categorias, c],
    }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const nome = draft.nome.trim();
    if (!nome) return setError("Informe o nome do time.");
    const payload: Omit<Team, "id"> = {
      nome,
      descricao: draft.descricao.trim() || undefined,
      categorias: draft.categorias,
      compartilhar: draft.compartilhar,
    };
    if (editingId) updateTeam(editingId, payload);
    else addTeam(payload);
    reset();
  };

  const remove = (t: Team) => {
    if (
      window.confirm(
        `Excluir o time "${t.nome}"? Os usuários vinculados a ele deixarão de ter esse vínculo (mas continuam existindo).`,
      )
    ) {
      removeTeam(t.id);
      if (editingId === t.id) reset();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Times e áreas</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Cada time trata um conjunto de categorias financeiras. Se “Compartilhar” estiver desligado, só quem está
            vinculado ao time (ou o administrador) vê esses lançamentos no painel e em Finanças.
          </p>
        </CardHeader>
        <CardContent>
          {!hydrated ? null : teams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Nenhum time cadastrado ainda. Sem times, todas as categorias ficam visíveis a todos.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {teams.map((t) => (
                <li key={t.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-bold text-slate-800">
                      {t.nome}
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-bold",
                          t.compartilhar ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800",
                        )}
                      >
                        {t.compartilhar ? "Compartilha com outros times" : "Restrito ao time"}
                      </span>
                    </p>
                    {t.descricao && <p className="mt-0.5 text-xs text-slate-500">{t.descricao}</p>}
                    <p className="mt-1 flex flex-wrap gap-1">
                      {t.categorias.length === 0 ? (
                        <span className="text-xs text-slate-400">Nenhuma categoria vinculada</span>
                      ) : (
                        t.categorias.map((c) => (
                          <span key={c} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                            {c}
                          </span>
                        ))
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {users.filter((u) => u.teamIds.includes(t.id)).length} usuário(s) vinculado(s)
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="soft" size="icon" aria-label={`Editar ${t.nome}`} onClick={() => startEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="danger" size="icon" aria-label={`Excluir ${t.nome}`} onClick={() => remove(t)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{editingId ? "Editar time" : "Novo time"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="team-nome">Nome do time</Label>
              <Input
                id="team-nome"
                value={draft.nome}
                placeholder="Ex.: Financeiro — Doações presenciais"
                onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="team-desc">Descrição (opcional)</Label>
              <Input
                id="team-desc"
                value={draft.descricao}
                onChange={(e) => setDraft({ ...draft, descricao: e.target.value })}
              />
            </div>

            <div>
              <Label className="mb-2">Categorias de entrada que este time trata</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS_ENTRADA.map((c) => (
                  <ChipToggle key={c} label={c} checked={draft.categorias.includes(c)} onToggle={() => toggleCategoria(c)} />
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2">Categorias de saída que este time trata</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS_SAIDA.map((c) => (
                  <ChipToggle key={c} label={c} checked={draft.categorias.includes(c)} onToggle={() => toggleCategoria(c)} />
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-emerald-600"
                checked={draft.compartilhar}
                onChange={(e) => setDraft({ ...draft, compartilhar: e.target.checked })}
              />
              <span>
                Compartilhar com outros times
                <span className="block text-xs font-normal text-slate-500">
                  Ligado: qualquer usuário com acesso a Finanças vê essas categorias. Desligado: só quem está
                  vinculado a este time (ou o administrador) vê.
                </span>
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingId ? (
                  "Salvar alterações"
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Adicionar time
                  </>
                )}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={reset} aria-label="Cancelar edição">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ChipToggle({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onToggle}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        checked ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-300 text-slate-500 hover:bg-slate-50",
      )}
    >
      {label}
    </button>
  );
}
