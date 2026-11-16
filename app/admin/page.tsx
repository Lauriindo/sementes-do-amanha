import type { Metadata } from "next";
import { AdminView } from "@/components/admin/admin-view";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Administração" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Administração"
        description="Defina perfis de acesso, organize os times por área e vincule os usuários a eles."
      />
      <AdminView />
    </>
  );
}
