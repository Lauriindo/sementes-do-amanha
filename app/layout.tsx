import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth/auth-gate";
import { AuthProvider } from "@/lib/auth";
import { ONG } from "@/lib/ong";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${ONG.nome} · Gestão e Visitantes`, template: `%s · ${ONG.nome}` },
  description: ONG.descricao,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={nunito.variable}>
      <body className="font-sans">
        <AuthProvider>
          <StoreProvider>
            <AuthGate>
              <AppShell>{children}</AppShell>
            </AuthGate>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
