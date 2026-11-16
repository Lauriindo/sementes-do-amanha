import { HttpError, jsonError, requireUserAdmin, translateAdminError } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

interface Body {
  nome?: string;
  email?: string;
  password?: string;
  roleId?: string;
  teamIds?: string[];
  ativo?: boolean;
}

/** Cria um login. O gatilho do banco cria o registro em app_users com o perfil e os times. */
export async function POST(req: Request) {
  try {
    const { admin } = await requireUserAdmin(req);
    const body = (await req.json().catch(() => ({}))) as Body;

    const nome = body.nome?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const teamIds = Array.isArray(body.teamIds) ? body.teamIds.filter((t) => typeof t === "string") : [];
    if (!nome) throw new HttpError(400, "Informe o nome do usuário.");
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Informe um e-mail válido.");
    if (password.length < 8) throw new HttpError(400, "A senha precisa ter pelo menos 8 caracteres.");
    if (!body.roleId) throw new HttpError(400, "Escolha um perfil.");

    const { data: role } = await admin.from("roles").select("id").eq("id", body.roleId).maybeSingle();
    if (!role) throw new HttpError(400, "Perfil não encontrado.");

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
      app_metadata: { role_id: body.roleId, team_ids: teamIds },
    });
    if (error || !data.user) throw new HttpError(400, translateAdminError(error?.message ?? "Erro ao criar usuário."));

    if (body.ativo === false) {
      await admin.from("app_users").update({ ativo: false }).eq("id", data.user.id);
    }
    return Response.json({ id: data.user.id }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
