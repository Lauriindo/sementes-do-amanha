import type { Metadata } from "next";
import { FinanceView } from "@/components/finance/finance-view";

export const metadata: Metadata = { title: "Finanças" };

export default function Page() {
  return <FinanceView />;
}
