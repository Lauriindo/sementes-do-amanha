import type { Metadata } from "next";
import { VisitorsView } from "@/components/visitors/visitors-view";

export const metadata: Metadata = { title: "Visitantes" };

export default function Page() {
  return <VisitorsView />;
}
