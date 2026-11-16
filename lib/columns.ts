import type { FormKey } from "./types";

/** Coluna padrão (fixa) de um formulário — presente sempre na planilha. */
export interface ColumnSpec {
  key: string;
  header: string;
  required?: boolean;
  /** Descrição exibida na aba "Instruções" da planilha modelo. */
  hint: string;
  example: string;
  /** Nomes alternativos aceitos ao importar. */
  aliases?: string[];
}

export function normalizeText(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const VISITOR_COLUMNS: ColumnSpec[] = [
  { key: "nome", header: "Nome", required: true, hint: "Nome completo do visitante", example: "Maria da Silva", aliases: ["visitante"] },
  { key: "documento", header: "Documento", hint: "CPF ou RG (opcional)", example: "123.456.789-00", aliases: ["cpf", "rg", "cpf rg"] },
  { key: "motivo", header: "Motivo da visita", hint: "Motivo da visita (texto livre)", example: "Doação", aliases: ["motivo"] },
  { key: "destino", header: "Quem visita / Setor", hint: "Pessoa ou setor visitado", example: "Coordenação", aliases: ["destino", "setor", "quem visita"] },
  { key: "entrada", header: "Entrada", hint: "dd/mm/aaaa hh:mm — vazio = agora", example: "29/09/2026 14:30" },
  { key: "saida", header: "Saída", hint: "dd/mm/aaaa hh:mm — vazio = ainda no local", example: "29/09/2026 16:00", aliases: ["saida"] },
];

export const FINANCE_COLUMNS: ColumnSpec[] = [
  { key: "tipo", header: "Tipo", required: true, hint: "Entrada ou Saída", example: "Entrada" },
  { key: "descricao", header: "Descrição", required: true, hint: "Descrição do lançamento", example: "Doação de cestas básicas", aliases: ["descricao"] },
  { key: "categoria", header: "Categoria", hint: "Categoria (vazio = Outros)", example: "Doações" },
  { key: "valor", header: "Valor (R$)", required: true, hint: "Número, ex.: 150,50", example: "150,50", aliases: ["valor"] },
  { key: "data", header: "Data", required: true, hint: "dd/mm/aaaa", example: "29/09/2026" },
];

export const COLUMNS: Record<FormKey, ColumnSpec[]> = {
  visitors: VISITOR_COLUMNS,
  finance: FINANCE_COLUMNS,
};

/** Todos os nomes (normalizados) reservados pelas colunas padrão de um formulário. */
export function reservedNames(form: FormKey): Set<string> {
  const set = new Set<string>();
  for (const c of COLUMNS[form]) {
    set.add(normalizeText(c.header));
    set.add(normalizeText(c.key));
    c.aliases?.forEach((a) => set.add(normalizeText(a)));
  }
  return set;
}
