"use client";

import { useState, type FormEvent } from "react";
import { DynamicFields } from "@/components/custom-fields/dynamic-fields";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { missingRequired } from "@/lib/custom-fields";
import { MOTIVOS_VISITA } from "@/lib/ong";
import type { CustomFieldDef, CustomValues, Visitor } from "@/lib/types";
import { isoToLocalInput, localInputToIso } from "@/lib/utils";

interface VisitorFormProps {
  initial?: Visitor | null;
  defs: CustomFieldDef[];
  onSubmit: (v: Omit<Visitor, "id">) => void;
  onCancel: () => void;
}

export function VisitorForm({ initial, defs, onSubmit, onCancel }: VisitorFormProps) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [documento, setDocumento] = useState(initial?.documento ?? "");
  const [motivo, setMotivo] = useState(initial?.motivo ?? "");
  const [destino, setDestino] = useState(initial?.destino ?? "");
  const [entrada, setEntrada] = useState(isoToLocalInput(initial?.entrada ?? new Date().toISOString()));
  const [saida, setSaida] = useState(isoToLocalInput(initial?.saida));
  const [custom, setCustom] = useState<CustomValues>(initial?.custom ?? {});
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return setError("Informe o nome do visitante.");
    const entradaIso = localInputToIso(entrada);
    if (!entradaIso) return setError("Informe a data e hora de entrada.");
    const saidaIso = localInputToIso(saida);
    if (saidaIso && saidaIso < entradaIso) return setError("A saída não pode ser anterior à entrada.");
    const missing = missingRequired(defs, custom);
    if (missing.length) return setError(`Preencha: ${missing.join(", ")}.`);

    onSubmit({
      nome: nome.trim(),
      documento: documento.trim(),
      motivo: motivo.trim(),
      destino: destino.trim(),
      entrada: entradaIso,
      saida: saidaIso,
      custom,
    });
  };

  return (
    <form onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="v-nome">
            Nome completo <span className="text-red-500">*</span>
          </Label>
          <Input id="v-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        </div>
        <div>
          <Label htmlFor="v-doc">Documento (CPF/RG)</Label>
          <Input id="v-doc" value={documento} onChange={(e) => setDocumento(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="v-motivo">Motivo da visita</Label>
          <Input id="v-motivo" list="motivos" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <datalist id="motivos">
            {MOTIVOS_VISITA.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="v-destino">Quem / qual setor está visitando</Label>
          <Input id="v-destino" value={destino} onChange={(e) => setDestino(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="v-entrada">Entrada</Label>
          <Input id="v-entrada" type="datetime-local" value={entrada} onChange={(e) => setEntrada(e.target.value)} />
        </div>
        {initial && (
          <div>
            <Label htmlFor="v-saida">Saída (vazio = ainda no local)</Label>
            <Input id="v-saida" type="datetime-local" value={saida} onChange={(e) => setSaida(e.target.value)} />
          </div>
        )}
      </div>

      <DynamicFields defs={defs} values={custom} onChange={setCustom} idPrefix="v" />

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{initial ? "Salvar alterações" : "Registrar entrada"}</Button>
      </div>
    </form>
  );
}
