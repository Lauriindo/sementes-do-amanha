import { normalizeText, reservedNames } from "./columns";
import type { CustomFieldDef, CustomValues, FieldType, FormKey } from "./types";
import { formatDate } from "./utils";

/** Limite de campos personalizados por formulário. */
export const MAX_CUSTOM_FIELDS = 10;

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: "Texto simples",
  number: "Número",
  select: "Seleção (dropdown)",
  date: "Data",
};

export const FORM_LABEL: Record<FormKey, string> = {
  visitors: "Visitantes",
  finance: "Finanças",
};

export function fieldsFor(fields: CustomFieldDef[], form: FormKey): CustomFieldDef[] {
  return fields.filter((f) => f.form === form);
}

/** "A, B; C\nD" -> ["A","B","C","D"] (sem duplicatas). */
export function parseOptions(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[,;\n]/)) {
    const opt = raw.trim();
    const key = normalizeText(opt);
    if (opt && !seen.has(key)) {
      seen.add(key);
      out.push(opt);
    }
  }
  return out;
}

export type FieldDraft = Pick<CustomFieldDef, "form" | "label" | "type" | "options">;

/**
 * Valida um campo novo (ou em edição). Retorna a mensagem de erro ou null.
 * Regras: rótulo obrigatório e único no formulário, sem colidir com colunas
 * padrão da planilha, dropdown com >= 2 opções e máximo de 10 campos.
 */
export function validateField(
  draft: FieldDraft,
  existing: CustomFieldDef[],
  editingId?: string,
): string | null {
  const label = draft.label.trim();
  if (!label) return "Informe o nome do campo.";
  if (label.length > 40) return "O nome do campo deve ter até 40 caracteres.";

  const siblings = existing.filter((f) => f.form === draft.form && f.id !== editingId);
  if (!editingId && siblings.length >= MAX_CUSTOM_FIELDS) {
    return `Limite de ${MAX_CUSTOM_FIELDS} campos personalizados atingido neste formulário.`;
  }

  const norm = normalizeText(label);
  if (!norm) return "O nome do campo precisa conter letras ou números.";
  if (reservedNames(draft.form).has(norm)) {
    return `"${label}" já é uma coluna padrão deste formulário. Escolha outro nome.`;
  }
  if (siblings.some((f) => normalizeText(f.label) === norm)) {
    return `Já existe um campo chamado "${label}" neste formulário.`;
  }

  if (draft.type === "select" && (draft.options?.length ?? 0) < 2) {
    return "Informe pelo menos 2 opções para o dropdown.";
  }
  return null;
}

/** Rótulos dos campos obrigatórios que estão vazios. */
export function missingRequired(defs: CustomFieldDef[], values: CustomValues): string[] {
  return defs
    .filter((d) => d.required && (values[d.id] === undefined || values[d.id] === ""))
    .map((d) => d.label);
}

/** Texto para exibir um valor personalizado em tabelas. */
export function formatCustomValue(def: CustomFieldDef, value: string | number | undefined): string {
  if (value === undefined || value === "") return "—";
  if (def.type === "date") return formatDate(String(value));
  if (def.type === "number") return Number(value).toLocaleString("pt-BR");
  return String(value);
}
