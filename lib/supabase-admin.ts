import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasAccess } from "./permissions";
import type { Role } from "./types";

/**
 * Cliente com a chave secreta (service_role). SOMENTE no servidor (rotas /api):
 * ignora o RLS, então toda rota que o usa precisa checar a permissão antes.
 */
export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no servidor.");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(err: unknown): Response {
  if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
  console.error(err);
  const message = err instanceof Error ? err.message : "Erro inesperado.";
  return Response.json({ error: message }, { status: 500 });
}

/** Garante que quem chamou está logado, ativo e pode editar a Administração. */
export async function requireUserAdmin(req: Request): Promise<{ admin: SupabaseClient; callerId: string }> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Não autenticado.");

  const admin = getAdminClient();
  const { data: auth, error } = await admin.auth.getUser(token);
  if (error || !auth.user) throw new HttpError(401, "Sessão inválida. Entre novamente.");

  const { data: me } = await admin
    .from("app_users")
    .select("ativo, role:roles(id, nome, is_admin, acessos)")
    .eq("id", auth.user.id)
    .maybeSingle();

  const r = (me?.role ?? null) as unknown as { id: string; nome: string; is_admin: boolean; acessos: Role["acessos"] } | null;
  const role: Role | null = r ? { id: r.id, nome: r.nome, isAdmin: r.is_admin, acessos: r.acessos } : null;
  if (!me?.ativo || !hasAccess(role, "administracao", "editar")) {
    throw new HttpError(403, "Seu perfil não pode gerenciar usuários.");
  }
  return { admin, callerId: auth.user.id };
}

/** Quantos administradores ativos existem, desconsiderando `exceptId`. */
export async function countOtherActiveAdmins(admin: SupabaseClient, exceptId: string): Promise<number> {
  const { data, error } = await admin
    .from("app_users")
    .select("id, role:roles!inner(is_admin)")
    .eq("ativo", true)
    .eq("role.is_admin", true)
    .neq("id", exceptId);
  if (error) throw error;
  return data?.length ?? 0;
}

export function translateAdminError(message: string): string {
  if (/already (been )?registered|already exists/i.test(message)) return "Já existe um usuário com este e-mail.";
  if (/password should be at least|weak password/i.test(message)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/invalid email|unable to validate email/i.test(message)) return "E-mail inválido.";
  return message;
}
