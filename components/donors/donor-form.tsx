"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Donor } from "@/lib/types";

interface DonorFormProps {
  initial?: Donor | null;
  onSubmit: (d: Omit<Donor, "id">) => void;
  onCancel: () => void;
}

export function DonorForm({ initial, onSubmit, onCancel }: DonorFormProps) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [comoChamar, setComoChamar] = useState(initial?.comoChamar ?? "");
  const [anonimoRecorrente, setAnonimoRecorrente] = useState(initial?.anonimoRecorrente ?? false);
  const [contato, setContato] = useState(initial?.contato ?? "");
  const [extra1, setExtra1] = useState(initial?.extra1 ?? "");
  const [extra2, setExtra2] = useState(initial?.extra2 ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim() && !comoChamar.trim()) {
      return setError("Informe o nome ou como a pessoa gostaria de ser chamada.");
    }
    onSubmit({
      nome: nome.trim(),
      comoChamar: comoChamar.trim() || undefined,
      anonimoRecorrente,
      contato: contato.trim() || undefined,
      extra1: extra1.trim() || undefined,
      extra2: extra2.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit}>
      <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
        Guarde só o essencial: nada de CPF, endereço ou outro dado sensível — o objetivo é reconhecer o doador, não
        identificá-lo formalmente.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="d-nome">Nome</Label>
          <Input id="d-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        </div>
        <div>
          <Label htmlFor="d-chamar">Como gostaria de ser chamado(a)</Label>
          <Input id="d-chamar" value={comoChamar} onChange={(e) => setComoChamar(e.target.value)} placeholder="Ex.: Dona Maria" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="d-contato">Contato (opcional)</Label>
          <Input
            id="d-contato"
            value={contato}
            onChange={(e) => setContato(e.target.value)}
            placeholder="Ex.: WhatsApp, e-mail ou “pela Maria”"
          />
        </div>
        <div>
          <Label htmlFor="d-extra1">Informação adicional 1 (opcional)</Label>
          <Input id="d-extra1" value={extra1} onChange={(e) => setExtra1(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="d-extra2">Informação adicional 2 (opcional)</Label>
          <Input id="d-extra2" value={extra2} onChange={(e) => setExtra2(e.target.value)} />
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-emerald-600"
          checked={anonimoRecorrente}
          onChange={(e) => setAnonimoRecorrente(e.target.checked)}
        />
        <span>
          Doador anônimo recorrente
          <span className="block text-xs font-normal text-slate-500">
            Marque quando a pessoa prefere não se identificar, mas doa com frequência e a equipe quer reconhecer isso.
          </span>
        </span>
      </label>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{initial ? "Salvar alterações" : "Cadastrar doador"}</Button>
      </div>
    </form>
  );
}
