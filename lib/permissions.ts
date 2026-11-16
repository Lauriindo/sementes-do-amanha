import type { AccessLevel, AppArea, AppUser, Role, Team, Transaction } from "./types";

export const AREA_LABEL: Record<AppArea, string> = {
  painel: "Painel",
  visitantes: "Visitantes",
  financas: "Finanças",
  doadores: "Doadores",
  campos: "Campos personalizados",
  administracao: "Administração (perfis, times e usuários)",
  excel: "Excel (exportar/importar)",
};

export const AREA_ORDER: AppArea[] = [
  "painel",
  "visitantes",
  "financas",
  "doadores",
  "campos",
  "administracao",
  "excel",
];

export const ACCESS_LABEL: Record<AccessLevel, string> = {
  nenhum: "Sem acesso",
  visualizar: "Só visualizar",
  editar: "Visualizar e editar",
};

const LEVEL_ORDER: Record<AccessLevel, number> = { nenhum: 0, visualizar: 1, editar: 2 };

/** Mapa de acessos com o mesmo nível em todas as áreas — ponto de partida para novos perfis. */
export function fullAccess(level: AccessLevel): Record<AppArea, AccessLevel> {
  return {
    painel: level,
    visitantes: level,
    financas: level,
    doadores: level,
    campos: level,
    administracao: level,
    excel: level,
  };
}

/** true se o perfil garante pelo menos `min` na área informada. Administrador sempre tem acesso total. */
export function hasAccess(role: Role | null, area: AppArea, min: AccessLevel = "visualizar"): boolean {
  if (!role) return false;
  if (role.isAdmin) return true;
  return LEVEL_ORDER[role.acessos[area] ?? "nenhum"] >= LEVEL_ORDER[min];
}

/**
 * Filtra lançamentos financeiros pelo escopo dos times: a categoria de um time
 * que não compartilha só aparece para quem está vinculado a esse time (ou para
 * administradores). Categorias sem time responsável ficam visíveis a todos.
 */
export function visibleTransactions(
  transactions: Transaction[],
  teams: Team[],
  user: AppUser | null,
  role: Role | null,
): Transaction[] {
  if (role?.isAdmin) return transactions;

  const restricted = new Map<string, Team[]>();
  for (const team of teams) {
    if (team.compartilhar) continue;
    for (const categoria of team.categorias) {
      restricted.set(categoria, [...(restricted.get(categoria) ?? []), team]);
    }
  }
  if (restricted.size === 0) return transactions;

  const myTeamIds = new Set(user?.teamIds ?? []);
  return transactions.filter((t) => {
    const owners = restricted.get(t.categoria);
    if (!owners) return true;
    return owners.some((team) => myTeamIds.has(team.id));
  });
}
