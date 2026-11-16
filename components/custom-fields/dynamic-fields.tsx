"use client";

import { Input, Label, Select } from "@/components/ui/input";
import type { CustomFieldDef, CustomValues } from "@/lib/types";

interface DynamicFieldsProps {
  defs: CustomFieldDef[];
  values: CustomValues;
  onChange: (values: CustomValues) => void;
  idPrefix: string;
}

/**
 * Renderiza, dinamicamente, os campos personalizados configurados pela ONG
 * (texto, número, seleção ou data). Usado dentro dos formulários de
 * Visitantes e Finanças, logo após os campos padrão.
 */
export function DynamicFields({ defs, values, onChange, idPrefix }: DynamicFieldsProps) {
  if (defs.length === 0) return null;

  const set = (def: CustomFieldDef, raw: string) => {
    const next = { ...values };
    if (raw === "") {
      delete next[def.id];
    } else if (def.type === "number") {
      const n = Number(raw);
      if (Number.isFinite(n)) next[def.id] = n;
    } else {
      next[def.id] = raw;
    }
    onChange(next);
  };

  return (
    <fieldset className="mt-5 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/40 p-4">
      <legend className="px-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
        Campos personalizados
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {defs.map((def) => {
          const id = `${idPrefix}-${def.id}`;
          const value = values[def.id] ?? "";
          return (
            <div key={def.id}>
              <Label htmlFor={id}>
                {def.label}
                {def.required && <span className="text-red-500"> *</span>}
              </Label>
              {def.type === "select" ? (
                <Select id={id} value={String(value)} onChange={(e) => set(def, e.target.value)}>
                  <option value="">Selecione…</option>
                  {def.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id={id}
                  type={def.type === "number" ? "number" : def.type === "date" ? "date" : "text"}
                  step={def.type === "number" ? "any" : undefined}
                  value={String(value)}
                  onChange={(e) => set(def, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
