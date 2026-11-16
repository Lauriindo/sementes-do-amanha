import type { Metadata } from "next";
import { DonorView } from "@/components/donors/donor-view";

export const metadata: Metadata = { title: "Doadores" };

export default function Page() {
  return <DonorView />;
}
