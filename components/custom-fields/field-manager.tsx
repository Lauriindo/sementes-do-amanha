"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import {
  FIELD_TYPE_LABEL,
  FORM_LABEL,
  MAX_CUSTOM_FIELDS,
  fieldsFor,
  parseOptions,
} from "@/lib/custom-fields";
import { useStore } from "@/lib/store";
import type { CustomFieldDef, FieldType, FormKey } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Draft {
  label: string;
  type: FieldType;
  optionsText: string;
  required: boolean;
}

const EMPTY: Draft = { label: "", type: "text", optionsText: "", required: false };

export function FieldManager() {
  const { fields, addField, updateField, removeField, moveField, hydrated, can } = useStore();
  const canEdit = can("campos", "editar");
  const [form, setForm] = useState<FormKey>("visitors");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = fieldsFor(fields, form);
  const full = list.length >= MAX_CUSTOM_FIELDS;

  const reset = () => {
    setDraft(EMPTY);
    setEditingId(null);
    setError(null);
  };

  const changeForm = (f: FormKey) => {
    setForm(f);
    reset();
  };

  const startEdit = (f: CustomFieldDef) => {
    setEditingId(f.id);
    setDraft({
      label: f.label,
      type: f.type,
      optionsText: (f.options ?? []).join(", "),
      required: !!f.required,
    });
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      form,
      label: draft.label,
      type: draft.type,
      options: draft.type === "select" ? parseOptions(draft.optionsText) : undefined,
      required: draft.required,
    };
    const err = editingId ? updateField(editingId, payload) : addField(payload);
    if (err) setError(err);
    else reset();
  };

  const remove = (f: CustomFieldDef) => {
    if (
      window.confirm(
        `Excluir o campo "${f.label}"? Ele deixará de aparecer nos formulários e na planilha. Os valores já preenchidos não são apagados.`,
      )
    ) {
      removeField(f.id);
      if (editingId === f.id) reset();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={form}
          onChange={changeForm}
          items={(["visitors", "finance"] as FormKey[]).map((k) => ({
            value: k,
            label: FORM_LABEL[k],
            badge: `${fieldsFor(fields, k).length}/${MAX_CUSTOM_FIELDS}`,
          }))}
        />
        <div className="flex items-center gap-2" aria-label={`${list.length} de ${MAX_CUSTOM_FIELDS} campos usados`}>
          {Array.from({ length: MAX_CUSTOM_FIELDS }, (_, i) => (
            <span
              key={i}
              className={cn("h-2 w-5 rounded-full", i < list.length ? "bg-emerald-500" : "bg-slate-200")}
            />
          ))}
        </div>
      </div>

      <div className={cn("grid gap-6", canEdit && "lg:grid-cols-5")}>
        {/* Lista de campos */}
        <Card className={cn(canEdit && "lg:col-span-3")}>
          <CardHeader>
            <CardTitle>Campos de {FORM_LABEL[form]}</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Aparecem automaticamente no formulário, na tabela e como colunas extras na planilha Excel.
            </p>
          </CardHeader>
          <CardContent>
            {!hydrated ? null : list.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Nenhum campo personalizado ainda. Crie o primeiro ao lado 🌱
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {list.map((f, i) => (
                  <li key={f.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-800">
                        {f.label}
                        {f.required && <span className="ml-1 text-red-500">*</span>}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {FIELD_TYPE_LABEL[f.type]}
                        {f.type === "select" && f.options ? ` · ${f.options.join(", ")}` : ""}
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon" aria-label="Subir" disabled={i === 0} onClick={() => moveField(f.id, -1)}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Descer"
                          disabled={i === list.length - 1}
                          onClick={() => moveField(f.id, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button variant="soft" size="icon" aria-label={`Editar ${f.label}`} onClick={() => startEdit(f)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="danger" size="icon" aria-label={`Excluir ${f.label}`} onClick={() => remove(f)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Formulário de criação/edição */}
        {canEdit && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{editingId ? "Editar campo" : "Novo campo"}</CardTitle>
          </CardHeader>
          <CardContent>
            {full && !editingId ? (
              <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                Você já usa os {MAX_CUSTOM_FIELDS} campos permitidos em {FORM_LABEL[form]}. Exclua um campo para criar outro.
              </p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label htmlFor="cf-label">Nome do campo</Label>
                  <Input
                    id="cf-label"
                    value={draft.label}
                    maxLength={40}
                    placeholder="Ex.: Veio de qual bairro?"
                    onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cf-type">Tipo</Label>
                  <Select
                    id="cf-type"
                    value={draft.type}
                    disabled={!!editingId}
                    onChange={(e) => setDraft({ ...draft, type: e.target.value as FieldType })}
                  >
                    {(Object.keys(FIELD_TYPE_LABEL) as FieldType[]).map((t) => (
                      <option key={t} value={t}>
                        {FIELD_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </Select>
                  {editingId && (
                    <p className="mt-1 text-xs text-slate-400">O tipo não pode mudar depois de criado.</p>
                  )}
                </div>
                {draft.type === "select" && (
                  <div>
                    <Label htmlFor="cf-options">Opções (separe por vírgula)</Label>
                    <Input
                      id="cf-options"
                      value={draft.optionsText}
                      placeholder="Ex.: Manhã, Tarde, Noite"
                      onChange={(e) => setDraft({ ...draft, optionsText: e.target.value })}
                    />
                  </div>
                )}
                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-slate-300 accent-emerald-600"
                    checked={draft.required}
                    onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
                  />
                  Preenchimento obrigatório
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
                        <Plus className="h-4 w-4" /> Adicionar campo
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
            )}
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
