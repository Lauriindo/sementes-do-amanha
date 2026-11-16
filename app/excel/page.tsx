import type { Metadata } from "next";
import { ImportExportPanel } from "@/components/excel/import-export-panel";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Excel" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Importar e exportar (Excel)"
        description="Baixe o modelo, preencha no Excel e importe. Os campos personalizados viram colunas extras automaticamente."
      />
      <ImportExportPanel />
    </>
  );
}
