"use client";

import { Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { ACCESS_LABEL, AREA_LABEL, AREA_ORDER, fullAccess } from "@/lib/permissions";
import { useStore } from "@/lib/store";
import type { AccessLevel, AppArea, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Draft {
  nome: string;
  descricao: string;
  isAdmin: boolean;
  acessos: Record<AppArea, AccessLevel>;
}

const EMPTY: Draft = { nome: "", descricao: "", isAdmin: false, acessos: fullAccess("nenhum") };

export function RoleManager() {
  const { roles, users, hydrated, addRole, updateRole, removeRole } = useStore();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDraft(EMPTY);
    setEditingId(null);
    setError(null);
  };

  const startEdit = (r: Role) => {
    setEditingId(r.id);
    setDraft({ nome: r.nome, descricao: r.descricao ?? "", isAdmin: !!r.isAdmin, acessos: { ...r.acessos } });
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const nome = draft.nome.trim();
    if (!nome) return setError("Informe o nome do perfil.");
    const payload: Omit<Role, "id"> = {
      nome,
      descricao: draft.descricao.trim() || undefined,
      isAdmin: draft.isAdmin,
      acessos: draft.acessos,
    };
    if (editingId) updateRole(editingId, payload);
    else addRole(payload);
    reset();
  };

  const remove = (r: Role) => {
    if (!window.confirm(`Excluir o perfil "${r.nome}"?`)) return;
    const err = removeRole(r.id);
    if (err) {
      window.alert(err);
      return;
    }
    if (editingId === r.id) reset();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Tipos de perfil</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Cada perfil define quais áreas do sistema os usuários vinculados a ele podem ver ou editar.
          </p>
        </CardHeader>
        <CardContent>
          {!hydrated ? null : roles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Nenhum perfil cadastrado ainda.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {roles.map((r) => (
                <li key={r.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-bold text-slate-800">
                      {r.nome}
                      {r.isAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                          <ShieldCheck className="h-3.5 w-3.5" /> Administrador
                        </span>
                      )}
                    </p>
                    {r.descricao && <p className="mt-0.5 text-xs text-slate-500">{r.descricao}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      {users.filter((u) => u.roleId === r.id).length} usuário(s) vinculado(s)
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="soft" size="icon" aria-label={`Editar ${r.nome}`} onClick={() => startEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="danger" size="icon" aria-label={`Excluir ${r.nome}`} onClick={() => remove(r)}>
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
          <CardTitle>{editingId ? "Editar perfil" : "Novo perfil"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="role-nome">Nome do perfil</Label>
              <Input
                id="role-nome"
                value={draft.nome}
                placeholder="Ex.: Financeiro, Recepção…"
                onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="role-desc">Descrição (opcional)</Label>
              <Input
                id="role-desc"
                value={draft.descricao}
                onChange={(e) => setDraft({ ...draft, descricao: e.target.value })}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-slate-300 accent-emerald-600"
                checked={draft.isAdmin}
                onChange={(e) => setDraft({ ...draft, isAdmin: e.target.checked })}
              />
              É administrador (acesso total, ignora os acessos abaixo e os limites de time)
            </label>

            <fieldset className={cn("space-y-2", draft.isAdmin && "opacity-50")} disabled={draft.isAdmin}>
              <legend className="mb-1 text-sm font-semibold text-slate-700">Acesso por área</legend>
              {AREA_ORDER.map((area) => (
                <div key={area} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`role-area-${area}`} className="mb-0 flex-1 font-normal text-slate-600">
                    {AREA_LABEL[area]}
                  </Label>
                  <Select
                    id={`role-area-${area}`}
                    className="h-9 w-44 text-sm"
                    value={draft.acessos[area]}
                    onChange={(e) =>
                      setDraft({ ...draft, acessos: { ...draft.acessos, [area]: e.target.value as AccessLevel } })
                    }
                  >
                    {(Object.keys(ACCESS_LABEL) as AccessLevel[]).map((level) => (
                      <option key={level} value={level}>
                        {ACCESS_LABEL[level]}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </fieldset>

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
                    <Plus className="h-4 w-4" /> Adicionar perfil
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
