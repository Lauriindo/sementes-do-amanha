"use client";

import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { DynamicFields } from "@/components/custom-fields/dynamic-fields";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { missingRequired } from "@/lib/custom-fields";
import { CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA } from "@/lib/ong";
import { useStore } from "@/lib/store";
import type { CustomFieldDef, CustomValues, Transaction, TransactionType } from "@/lib/types";
import { cn, todayISO } from "@/lib/utils";

interface FinanceFormProps {
  initial?: Transaction | null;
  defs: CustomFieldDef[];
  onSubmit: (t: Omit<Transaction, "id">) => void;
  onCancel: () => void;
}

export function FinanceForm({ initial, defs, onSubmit, onCancel }: FinanceFormProps) {
  const { donors } = useStore();
  const [tipo, setTipo] = useState<TransactionType>(initial?.tipo ?? "entrada");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [valor, setValor] = useState(initial ? String(initial.valor) : "");
  const [data, setData] = useState(initial?.data ?? todayISO());
  const [categoria, setCategoria] = useState(initial?.categoria ?? "");
  const [doadorId, setDoadorId] = useState<string>(initial?.doadorId ?? "");
  const [custom, setCustom] = useState<CustomValues>(initial?.custom ?? {});
  const [error, setError] = useState<string | null>(null);

  const categorias: readonly string[] = tipo === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
  // Mantém categorias antigas (ex.: importadas) visíveis ao editar.
  const opcoes = categoria && !categorias.includes(categoria) ? [...categorias, categoria] : categorias;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) return setError("Informe a descrição.");
    const n = Number(valor.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return setError("Informe um valor maior que zero.");
    if (!data) return setError("Informe a data.");
    const missing = missingRequired(defs, custom);
    if (missing.length) return setError(`Preencha: ${missing.join(", ")}.`);

    onSubmit({
      tipo,
      descricao: descricao.trim(),
      valor: Math.round(n * 100) / 100,
      data,
      categoria: categoria || "Outros",
      doadorId: tipo === "entrada" && doadorId ? doadorId : null,
      custom,
    });
  };

  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tipo de lançamento">
        <button
          type="button"
          role="radio"
          aria-checked={tipo === "entrada"}
          onClick={() => {
            setTipo("entrada");
            setCategoria("");
          }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-2xl border-2 p-4 text-base font-bold transition-all",
            tipo === "entrada"
              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
              : "border-slate-200 text-slate-500 hover:bg-slate-50",
          )}
        >
          <ArrowUpCircle className="h-5 w-5" /> Entrada
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={tipo === "saida"}
          onClick={() => {
            setTipo("saida");
            setCategoria("");
          }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-2xl border-2 p-4 text-base font-bold transition-all",
            tipo === "saida"
              ? "border-red-400 bg-red-50 text-red-700"
              : "border-slate-200 text-slate-500 hover:bg-slate-50",
          )}
        >
          <ArrowDownCircle className="h-5 w-5" /> Saída
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="f-desc">
            Descrição <span className="text-red-500">*</span>
          </Label>
          <Input id="f-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} autoFocus />
        </div>
        <div>
          <Label htmlFor="f-valor">
            Valor (R$) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="f-valor"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="f-data">
            Data <span className="text-red-500">*</span>
          </Label>
          <Input id="f-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className={tipo === "entrada" ? "" : "sm:col-span-2"}>
          <Label htmlFor="f-cat">Categoria</Label>
          <Select id="f-cat" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Selecione…</option>
            {opcoes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        {tipo === "entrada" && (
          <div>
            <Label htmlFor="f-doador">Quem doou (opcional)</Label>
            <Select id="f-doador" value={doadorId} onChange={(e) => setDoadorId(e.target.value)}>
              <option value="">Não informado</option>
              {donors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.comoChamar || d.nome || "Doador anônimo"}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <DynamicFields defs={defs} values={custom} onChange={setCustom} idPrefix="f" />

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{initial ? "Salvar alterações" : "Registrar lançamento"}</Button>
      </div>
    </form>
  );
}
