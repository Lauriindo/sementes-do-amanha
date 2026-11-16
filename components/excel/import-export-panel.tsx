"use client";

import { CheckCircle2, Download, FileDown, FileUp, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { FORM_LABEL, fieldsFor } from "@/lib/custom-fields";
import {
  buildHeaders,
  downloadTemplate,
  exportTransactions,
  exportVisitors,
  parseTransactionRows,
  parseVisitorRows,
  readSheetRows,
  type ImportResult,
} from "@/lib/excel";
import { useStore } from "@/lib/store";
import type { FormKey, Transaction, Visitor } from "@/lib/types";

type Preview =
  | { form: "visitors"; fileName: string; result: ImportResult<Visitor> }
  | { form: "finance"; fileName: string; result: ImportResult<Transaction> };

export function ImportExportPanel() {
  const { fields, visitors, transactions, importVisitors, importTransactions } = useStore();
  const [form, setForm] = useState<FormKey>("visitors");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const defs = fieldsFor(fields, form);
  const headers = buildHeaders(form, defs);
  const count = form === "visitors" ? visitors.length : transactions.length;

  const changeForm = (f: FormKey) => {
    setForm(f);
    setPreview(null);
    setMessage(null);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const rows = await readSheetRows(file);
      if (form === "visitors") {
        setPreview({ form, fileName: file.name, result: parseVisitorRows(rows, defs) });
      } else {
        setPreview({ form, fileName: file.name, result: parseTransactionRows(rows, defs) });
      }
    } catch {
      setPreview(null);
      setMessage("Não foi possível ler o arquivo. Use uma planilha .xlsx, .xls ou .csv válida.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const confirmImport = () => {
    if (!preview) return;
    const n = preview.result.items.length;
    if (preview.form === "visitors") importVisitors(preview.result.items);
    else importTransactions(preview.result.items);
    setMessage(`${n} registro(s) importado(s) com sucesso!`);
    setPreview(null);
  };

  return (
    <div className="space-y-6">
      <Tabs
        value={form}
        onChange={changeForm}
        items={(["visitors", "finance"] as FormKey[]).map((k) => ({ value: k, label: FORM_LABEL[k] }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Colunas da planilha de {FORM_LABEL[form]}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            As colunas em verde são campos personalizados e acompanham automaticamente o que você configurar em “Campos”.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {headers.map((h, i) => {
              const custom = i >= headers.length - defs.length;
              return (
                <span
                  key={`${h}-${i}`}
                  className={
                    custom
                      ? "rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-300"
                      : "rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"
                  }
                >
                  {h}
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="flex h-full flex-col gap-3">
            <FileDown className="h-8 w-8 text-emerald-600" />
            <p className="font-bold">1. Baixar modelo</p>
            <p className="flex-1 text-sm text-slate-500">Planilha vazia com todas as colunas atuais e uma aba de instruções.</p>
            <Button variant="soft" onClick={() => downloadTemplate(form, defs)}>
              <Download className="h-4 w-4" /> Baixar modelo (.xlsx)
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex h-full flex-col gap-3">
            <FileUp className="h-8 w-8 text-emerald-600" />
            <p className="font-bold">2. Importar planilha</p>
            <p className="flex-1 text-sm text-slate-500">
              Aceita planilhas com ou sem as colunas personalizadas. Você confere tudo antes de confirmar.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <Button disabled={busy} onClick={() => inputRef.current?.click()}>
              <FileUp className="h-4 w-4" /> Escolher arquivo
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex h-full flex-col gap-3">
            <Download className="h-8 w-8 text-emerald-600" />
            <p className="font-bold">3. Exportar dados</p>
            <p className="flex-1 text-sm text-slate-500">{count} registro(s) de {FORM_LABEL[form]} serão exportados.</p>
            <Button
              variant="outline"
              disabled={count === 0}
              onClick={() =>
                form === "visitors" ? exportVisitors(visitors, defs) : exportTransactions(transactions, defs)
              }
            >
              <Download className="h-4 w-4" /> Exportar (.xlsx)
            </Button>
          </CardContent>
        </Card>
      </div>

      {message && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-5 w-5" /> {message}
        </p>
      )}

      {preview && (
        <Card className="animate-fade-up border-emerald-200">
          <CardHeader>
            <CardTitle>Prévia da importação — {preview.fileName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800">
                {preview.result.items.length} válido(s)
              </span>
              <span
                className={
                  preview.result.errors.length
                    ? "rounded-full bg-red-100 px-3 py-1 font-bold text-red-700"
                    : "rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-500"
                }
              >
                {preview.result.errors.length} com erro
              </span>
            </div>

            {preview.result.missingCustom.length > 0 && (
              <p className="text-slate-500">
                Sem coluna na planilha (ficarão vazios): <b>{preview.result.missingCustom.join(", ")}</b>
              </p>
            )}
            {preview.result.ignoredColumns.length > 0 && (
              <p className="text-slate-500">
                Colunas não reconhecidas (ignoradas): <b>{preview.result.ignoredColumns.join(", ")}</b>
              </p>
            )}

            {preview.result.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-xl bg-red-50 p-3 text-red-700">
                <p className="mb-1 flex items-center gap-2 font-bold">
                  <TriangleAlert className="h-4 w-4" /> Linhas que não serão importadas
                </p>
                <ul className="list-disc space-y-0.5 pl-5">
                  {preview.result.errors.slice(0, 50).map((e, i) => (
                    <li key={i}>
                      Linha {e.line}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setPreview(null)}>
                Cancelar
              </Button>
              <Button disabled={preview.result.items.length === 0} onClick={confirmImport}>
                Importar {preview.result.items.length} registro(s)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
