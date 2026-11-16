"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabase, supabaseConfigured } from "./supabase";

interface AuthValue {
  /** false até a sessão salva no navegador ser lida. */
  ready: boolean;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** Troca a senha do próprio usuário logado. */
  changePassword: (password: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthValue | null>(null);

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(message)) return "E-mail ainda não confirmado.";
  if (/password should be at least/i.test(message)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/same.*password|different from the old/i.test(message)) return "A nova senha precisa ser diferente da atual.";
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setReady(true);
      return;
    }
    const supabase = getSupabase();
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    return error ? translateAuthError(error.message) : null;
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  const changePassword = useCallback(async (password: string) => {
    const { error } = await getSupabase().auth.updateUser({ password });
    return error ? translateAuthError(error.message) : null;
  }, []);

  return (
    <AuthContext.Provider value={{ ready, session, signIn, signOut, changePassword }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}

/** Chamada às rotas /api do próprio app, enviando o token do usuário logado. */
export async function authedFetch(path: string, init: RequestInit = {}): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return "Sessão expirada. Entre novamente.";
  try {
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
    });
    if (res.ok) return null;
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return body?.error ?? `Erro ${res.status}.`;
  } catch {
    return "Não foi possível falar com o servidor. Verifique a conexão.";
  }
}
