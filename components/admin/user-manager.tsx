"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import type { AppUser } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Draft {
  nome: string;
  email: string;
  /** Novo usuário: senha inicial. Edição: nova senha (vazio = não alterar). */
  password: string;
  roleId: string;
  teamIds: string[];
  ativo: boolean;
}

export function UserManager() {
  const { users, roles, teams, currentUserId, hydrated, addUser, updateUser, removeUser } = useStore();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emptyDraft = (): Draft => ({
    nome: "",
    email: "",
    password: "",
    roleId: roles.find((r) => !r.isAdmin)?.id ?? roles[0]?.id ?? "",
    teamIds: [],
    ativo: true,
  });

  const startNew = () => {
    setDraft(emptyDraft());
    setEditingId(null);
    setError(null);
  };

  const startEdit = (u: AppUser) => {
    setDraft({ nome: u.nome, email: u.email ?? "", password: "", roleId: u.roleId, teamIds: [...u.teamIds], ativo: u.ativo });
    setEditingId(u.id);
    setError(null);
  };

  const reset = () => {
    setDraft(null);
    setEditingId(null);
    setError(null);
  };

  const toggleTeam = (id: string) =>
    setDraft((d) => (d ? { ...d, teamIds: d.teamIds.includes(id) ? d.teamIds.filter((t) => t !== id) : [...d.teamIds, id] } : d));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft || busy) return;
    const nome = draft.nome.trim();
    if (!nome) return setError("Informe o nome do usuário.");
    if (!editingId && !/^\S+@\S+\.\S+$/.test(draft.email.trim())) return setError("Informe um e-mail válido.");
    if ((!editingId || draft.password) && draft.password.length < 8) {
      return setError("A senha precisa ter pelo menos 8 caracteres.");
    }
    if (!draft.roleId) return setError("Escolha um perfil.");
    const payload = { nome, roleId: draft.roleId, teamIds: draft.teamIds, ativo: draft.ativo };
    setBusy(true);
    const err = editingId
      ? await updateUser(editingId, payload, draft.password || undefined)
      : await addUser(payload, { email: draft.email, password: draft.password });
    setBusy(false);
    if (err) return setError(err);
    reset();
  };

  const remove = async (u: AppUser) => {
    if (!window.confirm(`Excluir o usuário "${u.nome}"? Ele perde o acesso ao sistema.`)) return;
    const err = await removeUser(u.id);
    if (err) {
      window.alert(err);
      return;
    }
    if (editingId === u.id) reset();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Usuários</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Vincule cada usuário a um perfil e, se fizer sentido, a um ou mais times. Sem time vinculado, ele só vê
              as categorias financeiras compartilhadas.
            </p>
          </div>
          {!draft && (
            <Button size="sm" onClick={startNew}>
              <Plus className="h-4 w-4" /> Novo
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!hydrated ? null : users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Nenhum usuário cadastrado ainda.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {users.map((u) => {
                const role = roles.find((r) => r.id === u.roleId);
                const myTeams = teams.filter((t) => u.teamIds.includes(t.id));
                return (
                  <li key={u.id} className="flex items-start gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 truncate font-bold text-slate-800">
                        {u.nome}
                        {u.id === currentUserId && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                            Você
                          </span>
                        )}
                        {!u.ativo && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                            Inativo
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {role?.nome ?? "Sem perfil"}
                        {u.email && <> · {u.email}</>}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-1">
                        {myTeams.length === 0 ? (
                          <span className="text-xs text-slate-400">Nenhum time vinculado</span>
                        ) : (
                          myTeams.map((t) => (
                            <span key={t.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              {t.nome}
                            </span>
                          ))
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="soft" size="icon" aria-label={`Editar ${u.nome}`} onClick={() => startEdit(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="danger" size="icon" aria-label={`Excluir ${u.nome}`} onClick={() => void remove(u)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{editingId ? "Editar usuário" : draft ? "Novo usuário" : "Selecione uma ação"}</CardTitle>
        </CardHeader>
        <CardContent>
          {!draft ? (
            <p className="text-sm text-slate-500">Clique em “Novo” ou no lápis de um usuário para editar.</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="user-nome">Nome</Label>
                <Input
                  id="user-nome"
                  value={draft.nome}
                  autoFocus
                  onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="user-email">E-mail de login</Label>
                <Input
                  id="user-email"
                  type="email"
                  autoComplete="off"
                  value={draft.email}
                  disabled={Boolean(editingId)}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="user-password">{editingId ? "Nova senha (opcional)" : "Senha inicial"}</Label>
                <Input
                  id="user-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={editingId ? "Deixe em branco para manter" : "Mínimo de 8 caracteres"}
                  value={draft.password}
                  onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Passe a senha para a pessoa; ela pode trocá-la depois pelo ícone de chave, ao lado do nome.
                </p>
              </div>
              <div>
                <Label htmlFor="user-role">Perfil</Label>
                <Select
                  id="user-role"
                  value={draft.roleId}
                  onChange={(e) => setDraft({ ...draft, roleId: e.target.value })}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label className="mb-2">Times</Label>
                {teams.length === 0 ? (
                  <p className="text-xs text-slate-400">Nenhum time cadastrado ainda.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {teams.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={draft.teamIds.includes(t.id)}
                        onClick={() => toggleTeam(t.id)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                          draft.teamIds.includes(t.id)
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                            : "border-slate-300 text-slate-500 hover:bg-slate-50",
                        )}
                      >
                        {t.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-slate-300 accent-emerald-600"
                  checked={draft.ativo}
                  onChange={(e) => setDraft({ ...draft, ativo: e.target.checked })}
                />
                Usuário ativo
              </label>

              {error && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={busy}>
                  {editingId ? "Salvar alterações" : "Adicionar usuário"}
                </Button>
                <Button variant="outline" onClick={reset} aria-label="Cancelar">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
