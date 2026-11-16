import * as XLSX from "xlsx";
import { COLUMNS, FINANCE_COLUMNS, normalizeText, type ColumnSpec } from "./columns";
import { FIELD_TYPE_LABEL } from "./custom-fields";
import type {
  CustomFieldDef,
  CustomValues,
  FormKey,
  Transaction,
  Visitor,
} from "./types";
import { formatDate, formatDateTime, todayISO, uid } from "./utils";

/* -------------------------------------------------------------------------- */
/* Exportação e modelo                                                        */
/* -------------------------------------------------------------------------- */

function setColumnWidths(ws: XLSX.WorkSheet, rows: unknown[][]) {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      const len = String(cell ?? "").length;
      widths[i] = Math.min(Math.max(widths[i] ?? 10, len + 2), 45);
    });
  }
  ws["!cols"] = widths.map((wch) => ({ wch }));
}

function customCell(def: CustomFieldDef, value: string | number | undefined): string | number {
  if (value === undefined || value === "") return "";
  if (def.type === "date") return formatDate(String(value));
  return value;
}

/** Cabeçalho = colunas padrão + um campo personalizado por coluna. */
export function buildHeaders(form: FormKey, defs: CustomFieldDef[]): string[] {
  return [...COLUMNS[form].map((c) => c.header), ...defs.map((d) => d.label)];
}

function instructionsSheet(form: FormKey, defs: CustomFieldDef[]): XLSX.WorkSheet {
  const rows: string[][] = [
    ["Coluna", "Obrigatória", "Formato / Opções", "Exemplo"],
    ...COLUMNS[form].map((c: ColumnSpec) => [c.header, c.required ? "Sim" : "Não", c.hint, c.example]),
    ...defs.map((d) => [
      d.label,
      d.required ? "Sim" : "Não",
      d.type === "select"
        ? `Escolha uma: ${(d.options ?? []).join(", ")}`
        : d.type === "date"
          ? "Data (dd/mm/aaaa)"
          : FIELD_TYPE_LABEL[d.type],
      d.type === "select" ? (d.options?.[0] ?? "") : d.type === "date" ? "29/09/2026" : d.type === "number" ? "10" : "Texto",
    ]),
    [],
    ["Observações"],
    ["• Apague nada nesta aba; preencha os dados na aba \"Dados\"."],
    ["• Colunas personalizadas são opcionais: se você removê-las da planilha, a importação continua funcionando."],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  setColumnWidths(ws, rows);
  return ws;
}

export function downloadTemplate(form: FormKey, defs: CustomFieldDef[]) {
  const headers = buildHeaders(form, defs);
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  setColumnWidths(ws, [headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.utils.book_append_sheet(wb, instructionsSheet(form, defs), "Instruções");
  XLSX.writeFile(wb, `modelo-${form === "visitors" ? "visitantes" : "financas"}.xlsx`);
}

function writeData(form: FormKey, defs: CustomFieldDef[], body: (string | number)[][], filename: string) {
  const rows = [buildHeaders(form, defs), ...body];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  setColumnWidths(ws, rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.utils.book_append_sheet(wb, instructionsSheet(form, defs), "Instruções");
  XLSX.writeFile(wb, filename);
}

export function exportVisitors(visitors: Visitor[], defs: CustomFieldDef[]) {
  const body = visitors.map((v) => [
    v.nome,
    v.documento,
    v.motivo,
    v.destino,
    v.entrada ? formatDateTime(v.entrada) : "",
    v.saida ? formatDateTime(v.saida) : "",
    ...defs.map((d) => customCell(d, v.custom?.[d.id])),
  ]);
  writeData("visitors", defs, body, `visitantes-${todayISO()}.xlsx`);
}

export function exportTransactions(items: Transaction[], defs: CustomFieldDef[]) {
  const body = items.map((t) => [
    t.tipo === "entrada" ? "Entrada" : "Saída",
    t.descricao,
    t.categoria,
    t.valor,
    formatDate(t.data),
    ...defs.map((d) => customCell(d, t.custom?.[d.id])),
  ]);
  writeData("finance", defs, body, `financas-${todayISO()}.xlsx`);
}

/* -------------------------------------------------------------------------- */
/* Importação                                                                 */
/* -------------------------------------------------------------------------- */

export interface ImportError {
  /** Número da linha na planilha (cabeçalho = 1). */
  line: number;
  message: string;
}

export interface ImportResult<T> {
  items: T[];
  errors: ImportError[];
  /** Colunas da planilha que não correspondem a nenhum campo (ignoradas). */
  ignoredColumns: string[];
  /** Campos personalizados que não existem na planilha (ok — ficam vazios). */
  missingCustom: string[];
  totalRows: number;
}

type Cell = unknown;

export async function readSheetRows(file: File): Promise<Cell[][]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const name = wb.SheetNames.find((n) => normalizeText(n) === "dados") ?? wb.SheetNames[0];
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, raw: true, defval: "" });
}

interface DateParts {
  y: number;
  m: number;
  d: number;
  H: number;
  M: number;
}

function parseDateParts(v: Cell): DateParts | null {
  if (typeof v === "number") {
    const p = XLSX.SSF.parse_date_code(v);
    return p ? { y: p.y, m: p.m, d: p.d, H: p.H, M: p.M } : null;
  }
  if (v instanceof Date) {
    return { y: v.getFullYear(), m: v.getMonth() + 1, d: v.getDate(), H: v.getHours(), M: v.getMinutes() };
  }
  const s = String(v ?? "").trim();
  if (!s) return null;
  let m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?:[ T,]+(\d{1,2}):(\d{2}))?/.exec(s);
  let parts: DateParts | null = null;
  if (m) {
    const y = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
    parts = { y, m: Number(m[2]), d: Number(m[1]), H: Number(m[4] ?? 0), M: Number(m[5] ?? 0) };
  } else {
    m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s);
    if (m) parts = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]), H: Number(m[4] ?? 0), M: Number(m[5] ?? 0) };
  }
  if (!parts) return null;
  if (parts.m < 1 || parts.m > 12 || parts.d < 1 || parts.d > 31 || parts.H > 23 || parts.M > 59) return null;
  return parts;
}

const p2 = (n: number) => String(n).padStart(2, "0");
const partsToDate = (p: DateParts) => `${p.y}-${p2(p.m)}-${p2(p.d)}`;
const partsToIso = (p: DateParts) => new Date(p.y, p.m - 1, p.d, p.H, p.M).toISOString();

function parseNumber(v: Cell): number {
  if (typeof v === "number") return v;
  let s = String(v ?? "").replace(/[^\d,.\-]/g, "");
  if (!s) return NaN;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

const isEmpty = (v: Cell) => v === undefined || v === null || String(v).trim() === "";

/** Mapeia as colunas do cabeçalho para colunas padrão e campos personalizados. */
function mapColumns(header: Cell[], form: FormKey, defs: CustomFieldDef[]) {
  const standard = new Map<number, ColumnSpec>();
  const custom = new Map<number, CustomFieldDef>();
  const ignored: string[] = [];
  const foundCustom = new Set<string>();

  header.forEach((h, idx) => {
    const norm = normalizeText(h);
    if (!norm) return;
    const std = COLUMNS[form].find(
      (c) =>
        normalizeText(c.header) === norm ||
        normalizeText(c.key) === norm ||
        c.aliases?.some((a) => normalizeText(a) === norm),
    );
    if (std && ![...standard.values()].includes(std)) {
      standard.set(idx, std);
      return;
    }
    const def = defs.find((d) => normalizeText(d.label) === norm);
    if (def && !foundCustom.has(def.id)) {
      custom.set(idx, def);
      foundCustom.add(def.id);
      return;
    }
    ignored.push(String(h).trim());
  });

  const missingCustom = defs.filter((d) => !foundCustom.has(d.id)).map((d) => d.label);
  return { standard, custom, ignored, missingCustom };
}

function coerceCustom(def: CustomFieldDef, cell: Cell): { value?: string | number; error?: string } {
  switch (def.type) {
    case "number": {
      const n = parseNumber(cell);
      return Number.isNaN(n) ? { error: `"${def.label}": "${cell}" não é um número` } : { value: n };
    }
    case "date": {
      const p = parseDateParts(cell);
      return p ? { value: partsToDate(p) } : { error: `"${def.label}": data inválida "${cell}"` };
    }
    case "select": {
      const opt = def.options?.find((o) => normalizeText(o) === normalizeText(cell));
      return opt ? { value: opt } : { error: `"${def.label}": "${cell}" não é uma opção válida` };
    }
    default:
      return { value: String(cell).trim() };
  }
}

/** Lê os campos personalizados de uma linha; devolve erros de validação. */
function readCustom(
  row: Cell[],
  custom: Map<number, CustomFieldDef>,
): { values: CustomValues; errors: string[] } {
  const values: CustomValues = {};
  const errors: string[] = [];
  custom.forEach((def, idx) => {
    const cell = row[idx];
    if (isEmpty(cell)) {
      if (def.required) errors.push(`"${def.label}" é obrigatório`);
      return;
    }
    const r = coerceCustom(def, cell);
    if (r.error) errors.push(r.error);
    else if (r.value !== undefined) values[def.id] = r.value;
  });
  return { values, errors };
}

function baseResult<T>(rows: Cell[][], form: FormKey, defs: CustomFieldDef[]) {
  const result: ImportResult<T> = { items: [], errors: [], ignoredColumns: [], missingCustom: [], totalRows: 0 };
  if (rows.length === 0) return { result, map: null };
  const map = mapColumns(rows[0], form, defs);
  result.ignoredColumns = map.ignored;
  result.missingCustom = map.missingCustom;
  return { result, map };
}

function cellByKey(row: Cell[], standard: Map<number, ColumnSpec>, key: string): Cell {
  for (const [idx, spec] of standard) if (spec.key === key) return row[idx];
  return undefined;
}

function hasColumn(standard: Map<number, ColumnSpec>, key: string) {
  return [...standard.values()].some((s) => s.key === key);
}

export function parseVisitorRows(rows: Cell[][], defs: CustomFieldDef[]): ImportResult<Visitor> {
  const { result, map } = baseResult<Visitor>(rows, "visitors", defs);
  if (!map) return result;
  if (!hasColumn(map.standard, "nome")) {
    result.errors.push({ line: 1, message: 'A coluna obrigatória "Nome" não foi encontrada.' });
    return result;
  }

  rows.slice(1).forEach((row, i) => {
    if (row.every(isEmpty)) return;
    const line = i + 2;
    result.totalRows++;
    const errs: string[] = [];

    const nome = String(cellByKey(row, map.standard, "nome") ?? "").trim();
    if (!nome) errs.push('"Nome" é obrigatório');

    const entradaCell = cellByKey(row, map.standard, "entrada");
    let entrada = new Date().toISOString();
    if (!isEmpty(entradaCell)) {
      const p = parseDateParts(entradaCell);
      if (p) entrada = partsToIso(p);
      else errs.push(`"Entrada": data inválida "${entradaCell}"`);
    }

    const saidaCell = cellByKey(row, map.standard, "saida");
    let saida: string | null = null;
    if (!isEmpty(saidaCell)) {
      const p = parseDateParts(saidaCell);
      if (p) saida = partsToIso(p);
      else errs.push(`"Saída": data inválida "${saidaCell}"`);
    }

    const { values, errors: customErrs } = readCustom(row, map.custom);
    errs.push(...customErrs);

    if (errs.length) {
      result.errors.push({ line, message: errs.join("; ") });
      return;
    }
    result.items.push({
      id: uid(),
      nome,
      documento: String(cellByKey(row, map.standard, "documento") ?? "").trim(),
      motivo: String(cellByKey(row, map.standard, "motivo") ?? "").trim(),
      destino: String(cellByKey(row, map.standard, "destino") ?? "").trim(),
      entrada,
      saida,
      custom: values,
    });
  });
  return result;
}

export function parseTransactionRows(rows: Cell[][], defs: CustomFieldDef[]): ImportResult<Transaction> {
  const { result, map } = baseResult<Transaction>(rows, "finance", defs);
  if (!map) return result;
  const missing = FINANCE_COLUMNS.filter((c) => c.required && !hasColumn(map.standard, c.key));
  if (missing.length) {
    result.errors.push({
      line: 1,
      message: `Colunas obrigatórias ausentes: ${missing.map((c) => c.header).join(", ")}.`,
    });
    return result;
  }

  rows.slice(1).forEach((row, i) => {
    if (row.every(isEmpty)) return;
    const line = i + 2;
    result.totalRows++;
    const errs: string[] = [];

    const tipoNorm = normalizeText(cellByKey(row, map.standard, "tipo"));
    let tipo: Transaction["tipo"] = "entrada";
    if (/^(entrada|receita|rec|ent)/.test(tipoNorm)) tipo = "entrada";
    else if (/^(saida|despesa|gasto|sai|des)/.test(tipoNorm)) tipo = "saida";
    else errs.push('"Tipo" deve ser Entrada ou Saída');

    const descricao = String(cellByKey(row, map.standard, "descricao") ?? "").trim();
    if (!descricao) errs.push('"Descrição" é obrigatória');

    const valorRaw = parseNumber(cellByKey(row, map.standard, "valor"));
    const valor = Math.abs(valorRaw);
    if (Number.isNaN(valorRaw) || valor === 0) errs.push('"Valor" inválido');

    const dataParts = parseDateParts(cellByKey(row, map.standard, "data"));
    if (!dataParts) errs.push('"Data" inválida ou vazia');

    const { values, errors: customErrs } = readCustom(row, map.custom);
    errs.push(...customErrs);

    if (errs.length || !dataParts) {
      result.errors.push({ line, message: errs.join("; ") });
      return;
    }
    result.items.push({
      id: uid(),
      tipo,
      descricao,
      valor,
      data: partsToDate(dataParts),
      categoria: String(cellByKey(row, map.standard, "categoria") ?? "").trim() || "Outros",
      custom: values,
    });
  });
  return result;
}
