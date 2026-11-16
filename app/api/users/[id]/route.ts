import {
  countOtherActiveAdmins,
  HttpError,
  jsonError,
  requireUserAdmin,
  translateAdminError,
} from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Define uma nova senha para o usuário. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { admin } = await requireUserAdmin(req);
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { password?: string };
    const password = body.password ?? "";
    if (password.length < 8) throw new HttpError(400, "A senha precisa ter pelo menos 8 caracteres.");

    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) throw new HttpError(400, translateAdminError(error.message));
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

/** Exclui o login (o registro em app_users some junto, por cascata). */
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { admin, callerId } = await requireUserAdmin(req);
    const { id } = await params;
    if (id === callerId) throw new HttpError(400, "Você não pode excluir o seu próprio usuário.");

    const { data: target } = await admin
      .from("app_users")
      .select("ativo, role:roles(is_admin)")
      .eq("id", id)
      .maybeSingle();
    const targetIsAdmin = Boolean(target?.ativo && (target.role as unknown as { is_admin: boolean } | null)?.is_admin);
    if (targetIsAdmin && (await countOtherActiveAdmins(admin, id)) === 0) {
      throw new HttpError(400, "Não é possível excluir o único usuário administrador.");
    }

    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new HttpError(400, translateAdminError(error.message));
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
