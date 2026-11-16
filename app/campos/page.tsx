import type { Metadata } from "next";
import { FieldManager } from "@/components/custom-fields/field-manager";
import { PageHeader } from "@/components/page-header";
import { MAX_CUSTOM_FIELDS } from "@/lib/custom-fields";

export const metadata: Metadata = { title: "Campos personalizados" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Campos personalizados"
        description={`Adicione até ${MAX_CUSTOM_FIELDS} campos extras em cada formulário (Visitantes e Finanças). Eles aparecem nos cadastros, nas tabelas e viram colunas na planilha Excel automaticamente.`}
      />
      <FieldManager />
    </>
  );
}
