"use client";

import { Loader2, LogOut, Sprout } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { ONG } from "@/lib/ong";
import { useStore } from "@/lib/store";
import { supabaseConfigured } from "@/lib/supabase";

function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <Sprout className="h-6 w-6" />
              </div>
              <div className="leading-tight">
                <p className="text-base font-extrabold text-emerald-800">{ONG.nome}</p>
                <p className="text-xs text-slate-500">Gestão e Visitantes</p>
              </div>
            </div>
            {children}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin" aria-label="Carregando" />
    </div>
  );
}

function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(await signIn(email, password));
    setBusy(false);
  };

  return (
    <CenteredCard>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="login-email">E-mail</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="login-password">Senha</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Entrar
        </Button>
        <p className="text-center text-xs text-slate-400">
          Esqueceu a senha? Peça a um administrador para definir uma nova.
        </p>
      </form>
    </CenteredCard>
  );
}

/** Mostra o login quando não há sessão e bloqueia usuários inativos ou sem perfil. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { ready, session, signOut } = useAuth();
  const { hydrated, currentUser, currentRole, loadError, reload } = useStore();

  if (!supabaseConfigured) {
    return (
      <CenteredCard>
        <p className="text-sm text-slate-600">
          O banco de dados ainda não foi configurado. Defina <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (veja o README).
        </p>
      </CenteredCard>
    );
  }
  if (!ready) return <Loading />;
  if (!session) return <LoginForm />;
  if (!hydrated) return <Loading />;

  if (loadError) {
    return (
      <CenteredCard>
        <p className="font-bold text-slate-800">Não foi possível carregar os dados.</p>
        <p className="mt-1 break-words text-sm text-slate-500">{loadError}</p>
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" onClick={() => void reload()}>
            Tentar de novo
          </Button>
          <Button variant="outline" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </CenteredCard>
    );
  }

  if (!currentUser || !currentRole) {
    return (
      <CenteredCard>
        <p className="font-bold text-slate-800">Acesso ainda não liberado</p>
        <p className="mt-1 text-sm text-slate-500">
          {currentUser && !currentUser.ativo
            ? "Seu usuário está inativo."
            : "Seu usuário ainda não tem um perfil de acesso."}{" "}
          Fale com um administrador da {ONG.nome}.
        </p>
        <Button variant="outline" className="mt-4 w-full" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </CenteredCard>
    );
  }

  return <>{children}</>;
}
