"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authedFetch, useAuth } from "./auth";
import { validateField } from "./custom-fields";
import { fullAccess, hasAccess } from "./permissions";
import { repositories as repos } from "./storage";
import type {
  AccessLevel,
  AppArea,
  AppUser,
  CustomFieldDef,
  Donor,
  FormKey,
  Role,
  Team,
  Transaction,
  Visitor,
} from "./types";
import { todayISO, uid } from "./utils";

type NewField = Omit<CustomFieldDef, "id">;
type NewRole = Omit<Role, "id">;
type NewTeam = Omit<Team, "id">;
type NewUser = Omit<AppUser, "id" | "email">;
type NewDonor = Omit<Donor, "id">;

/** Dados de login de um novo usuário (criado pelo admin). */
export interface NewLogin {
  email: string;
  password: string;
}

interface StoreValue {
  /** false até os dados serem lidos do banco (evita "flash" de tela vazia). */
  hydrated: boolean;
  /** Mensagem de erro ao carregar os dados, se houver. */
  loadError: string | null;
  reload: () => Promise<void>;

  visitors: Visitor[];
  transactions: Transaction[];
  fields: CustomFieldDef[];

  addVisitor: (v: Omit<Visitor, "id">) => void;
  updateVisitor: (id: string, v: Omit<Visitor, "id">) => void;
  removeVisitor: (id: string) => void;
  checkout: (id: string) => void;
  importVisitors: (items: Visitor[]) => void;

  addTransaction: (t: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, t: Omit<Transaction, "id">) => void;
  removeTransaction: (id: string) => void;
  importTransactions: (items: Transaction[]) => void;

  /** Retorna a mensagem de erro (ou null em caso de sucesso). */
  addField: (f: NewField) => string | null;
  updateField: (id: string, f: NewField) => string | null;
  removeField: (id: string) => void;
  moveField: (id: string, dir: -1 | 1) => void;

  loadDemo: () => void;

  /* Perfis, times, usuários e doadores (ver lib/permissions.ts) */
  roles: Role[];
  teams: Team[];
  users: AppUser[];
  donors: Donor[];
  /** Id do usuário logado. */
  currentUserId: string | null;
  currentUser: AppUser | null;
  currentRole: Role | null;
  /** true se o usuário atual (currentRole) tem pelo menos `min` na área informada. */
  can: (area: AppArea, min?: AccessLevel) => boolean;

  addRole: (r: NewRole) => void;
  updateRole: (id: string, r: NewRole) => void;
  removeRole: (id: string) => string | null;

  addTeam: (t: NewTeam) => void;
  updateTeam: (id: string, t: NewTeam) => void;
  removeTeam: (id: string) => void;

  /** Criam/alteram/excluem logins pelo servidor. Retornam a mensagem de erro ou null. */
  addUser: (u: NewUser, login: NewLogin) => Promise<string | null>;
  updateUser: (id: string, u: NewUser, newPassword?: string) => Promise<string | null>;
  removeUser: (id: string) => Promise<string | null>;

  addDonor: (d: NewDonor) => void;
  updateDonor: (id: string, d: NewDonor) => void;
  removeDonor: (id: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return String(err);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const sessionUserId = session?.user.id ?? null;

  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);

  /** Gravações em andamento: enquanto houver alguma, não recarregamos ao voltar à aba. */
  const pending = useRef(0);

  const reload = useCallback(async () => {
    try {
      const [v, t, f, r, tm, u, d] = await Promise.all([
        repos.visitors.getAll(),
        repos.transactions.getAll(),
        repos.fields.getAll(),
        repos.roles.getAll(),
        repos.teams.getAll(),
        repos.users.getAll(),
        repos.donors.getAll(),
      ]);
      setVisitors(v);
      setTransactions(t);
      setFields(f);
      setRoles(r);
      setTeams(tm);
      setUsers(u);
      setDonors(d);
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setLoadError(errorMessage(err));
    } finally {
      setHydrated(true);
    }
  }, []);

  // Carrega ao entrar; limpa tudo ao sair.
  useEffect(() => {
    if (!sessionUserId) {
      setHydrated(false);
      setVisitors([]);
      setTransactions([]);
      setFields([]);
      setRoles([]);
      setTeams([]);
      setUsers([]);
      setDonors([]);
      return;
    }
    void reload();
  }, [sessionUserId, reload]);

  // Ao voltar para a aba, busca o que outras pessoas lançaram nesse meio tempo.
  useEffect(() => {
    if (!sessionUserId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && pending.current === 0) void reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [sessionUserId, reload]);

  /**
   * A tela é atualizada na hora (otimista) e a gravação roda em segundo plano.
   * Se o banco recusar (ex.: sem permissão), avisa e recarrega o estado real.
   */
  const persist = useCallback(
    (op: () => Promise<unknown>) => {
      pending.current += 1;
      op()
        .catch((err) => {
          console.error(err);
          window.alert(`Não foi possível salvar no banco de dados: ${errorMessage(err)}\n\nOs dados foram recarregados.`);
          void reload();
        })
        .finally(() => {
          pending.current -= 1;
        });
    },
    [reload],
  );

  /* Visitantes */
  const addVisitor = useCallback(
    (v: Omit<Visitor, "id">) => {
      const item = { ...v, id: uid() };
      setVisitors((prev) => [item, ...prev]);
      persist(() => repos.visitors.insert([item]));
    },
    [persist],
  );
  const updateVisitor = useCallback(
    (id: string, v: Omit<Visitor, "id">) => {
      const item = { ...v, id };
      setVisitors((prev) => prev.map((x) => (x.id === id ? item : x)));
      persist(() => repos.visitors.update(item));
    },
    [persist],
  );
  const removeVisitor = useCallback(
    (id: string) => {
      setVisitors((prev) => prev.filter((x) => x.id !== id));
      persist(() => repos.visitors.remove(id));
    },
    [persist],
  );
  const checkout = useCallback(
    (id: string) => {
      const current = visitors.find((x) => x.id === id);
      if (!current || current.saida) return;
      const item = { ...current, saida: new Date().toISOString() };
      setVisitors((prev) => prev.map((x) => (x.id === id ? item : x)));
      persist(() => repos.visitors.update(item));
    },
    [visitors, persist],
  );
  const importVisitors = useCallback(
    (items: Visitor[]) => {
      setVisitors((prev) => [...items, ...prev]);
      persist(() => repos.visitors.insert(items));
    },
    [persist],
  );

  /* Finanças */
  const addTransaction = useCallback(
    (t: Omit<Transaction, "id">) => {
      const item = { ...t, id: uid() };
      setTransactions((prev) => [item, ...prev]);
      persist(() => repos.transactions.insert([item]));
    },
    [persist],
  );
  const updateTransaction = useCallback(
    (id: string, t: Omit<Transaction, "id">) => {
      const item = { ...t, id };
      setTransactions((prev) => prev.map((x) => (x.id === id ? item : x)));
      persist(() => repos.transactions.update(item));
    },
    [persist],
  );
  const removeTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => prev.filter((x) => x.id !== id));
      persist(() => repos.transactions.remove(id));
    },
    [persist],
  );
  const importTransactions = useCallback(
    (items: Transaction[]) => {
      setTransactions((prev) => [...items, ...prev]);
      persist(() => repos.transactions.insert(items));
    },
    [persist],
  );

  /* Campos personalizados (máx. MAX_CUSTOM_FIELDS por formulário) */
  const addField = useCallback(
    (f: NewField) => {
      const error = validateField(f, fields);
      if (error) return error;
      const item = { ...f, label: f.label.trim(), id: uid() };
      setFields((prev) => [...prev, item]);
      persist(() => repos.fields.insert([{ ...item, position: fields.length }]));
      return null;
    },
    [fields, persist],
  );
  const updateField = useCallback(
    (id: string, f: NewField) => {
      const error = validateField(f, fields, id);
      if (error) return error;
      const item = { ...f, label: f.label.trim(), id };
      setFields((prev) => prev.map((x) => (x.id === id ? item : x)));
      persist(() => repos.fields.update(item));
      return null;
    },
    [fields, persist],
  );
  const removeField = useCallback(
    (id: string) => {
      setFields((prev) => prev.filter((x) => x.id !== id));
      persist(() => repos.fields.remove(id));
    },
    [persist],
  );
  const moveField = useCallback(
    (id: string, dir: -1 | 1) => {
      const target = fields.find((x) => x.id === id);
      if (!target) return;
      const form: FormKey = target.form;
      const sameForm = fields.filter((x) => x.form === form);
      const i = sameForm.findIndex((x) => x.id === id);
      const j = i + dir;
      if (j < 0 || j >= sameForm.length) return;
      [sameForm[i], sameForm[j]] = [sameForm[j], sameForm[i]];
      // Reinsere os campos do formulário nas mesmas posições do array original.
      let k = 0;
      const next = fields.map((x) => (x.form === form ? sameForm[k++] : x));
      setFields(next);
      persist(() => Promise.all(next.map((x, position) => repos.fields.update({ ...x, position }))));
    },
    [fields, persist],
  );

  /* Dados de exemplo para validar o sistema com a equipe (somente com o banco vazio). */
  const loadDemo = useCallback(() => {
    const now = new Date();
    const daysAgo = (n: number, h = 10) => {
      const d = new Date(now);
      d.setDate(d.getDate() - n);
      d.setHours(h, 0, 0, 0);
      return d;
    };
    const iso = (d: Date) => d.toISOString();
    const plusHours = (d: Date, h: number) => new Date(d.getTime() + h * 3600_000);

    const v = (nome: string, motivo: string, destino: string, entrada: Date, saida: Date | null): Visitor => ({
      id: uid(),
      nome,
      documento: "",
      motivo,
      destino,
      entrada: iso(entrada),
      saida: saida ? iso(saida) : null,
      custom: {},
    });
    const t = (
      tipo: Transaction["tipo"],
      descricao: string,
      valor: number,
      categoria: string,
      d: Date,
      doadorId: string | null = null,
    ): Transaction => ({
      id: uid(),
      tipo,
      descricao,
      valor,
      categoria,
      data: todayISO(d),
      doadorId,
      custom: {},
    });

    const doadoraId = uid();
    const hoje = new Date(now.getTime() - 40 * 60_000);

    const demoDonors: Donor[] = donors.length
      ? []
      : [
          {
            id: doadoraId,
            nome: "Maria Eduarda Santos",
            comoChamar: "Duda",
            anonimoRecorrente: false,
            contato: "",
            extra1: "",
            extra2: "",
          },
          {
            id: uid(),
            nome: "",
            comoChamar: "Doador anônimo",
            anonimoRecorrente: true,
            contato: "",
            extra1: "",
            extra2: "",
          },
        ];
    const demoVisitors: Visitor[] = visitors.length
      ? []
      : [
          v("Ana Paula Souza", "Voluntariado", "Coordenação", hoje, null),
          v("Carlos Eduardo Lima", "Doação", "Secretaria", new Date(now.getTime() - 15 * 60_000), null),
          v("Fernanda Alves", "Reunião", "Diretoria", daysAgo(0, 8), plusHours(daysAgo(0, 8), 1.5)),
          v("Roberto Nascimento", "Visita institucional", "Coordenação", daysAgo(1, 14), plusHours(daysAgo(1, 14), 2)),
          v("Juliana Prado", "Entrevista", "Secretaria", daysAgo(3, 9), plusHours(daysAgo(3, 9), 1)),
        ];
    const demoTransactions: Transaction[] = transactions.length
      ? []
      : [
          t("entrada", "Doação mensal de associados", 1850, "Doações", daysAgo(2), demoDonors.length ? doadoraId : null),
          t("entrada", "Campanha do agasalho", 920.5, "Campanhas", daysAgo(9)),
          t("entrada", "Parceria com mercado local", 1200, "Parcerias", daysAgo(35)),
          t("saida", "Compra de alimentos", 640.3, "Alimentação", daysAgo(4)),
          t("saida", "Material de limpeza", 210, "Material", daysAgo(11)),
          t("saida", "Conta de energia", 385.9, "Contas fixas", daysAgo(20)),
          t("saida", "Transporte de doações", 150, "Transporte", daysAgo(40)),
        ];

    // Exemplo de dois times com finanças separadas (doações presenciais x despesas).
    const demoTeams: Team[] = teams.length
      ? []
      : [
          {
            id: uid(),
            nome: "Financeiro — Doações presenciais",
            descricao: "Recebe e registra as doações feitas presencialmente na ONG.",
            categorias: ["Doações", "Campanhas", "Eventos"],
            compartilhar: false,
          },
          {
            id: uid(),
            nome: "Financeiro — Despesas",
            descricao: "Cuida dos gastos e contas da ONG.",
            categorias: ["Alimentação", "Material", "Manutenção", "Transporte", "Contas fixas"],
            compartilhar: false,
          },
        ];
    const demoRoles: Role[] =
      roles.length > 1
        ? []
        : [
            {
              id: uid(),
              nome: "Financeiro",
              descricao: "Cuida das finanças e dos doadores do time em que está.",
              acessos: {
                ...fullAccess("nenhum"),
                painel: "visualizar",
                financas: "editar",
                doadores: "editar",
                excel: "visualizar",
              },
            },
            {
              id: uid(),
              nome: "Voluntário",
              descricao: "Acompanha o painel e os visitantes.",
              acessos: { ...fullAccess("nenhum"), painel: "visualizar", visitantes: "visualizar" },
            },
          ];

    setDonors((prev) => [...demoDonors, ...prev]);
    setVisitors((prev) => [...demoVisitors, ...prev]);
    setTransactions((prev) => [...demoTransactions, ...prev]);
    setTeams((prev) => [...prev, ...demoTeams]);
    setRoles((prev) => [...prev, ...demoRoles]);

    persist(async () => {
      await repos.donors.insert(demoDonors); // antes das finanças (chave estrangeira)
      await Promise.all([
        repos.visitors.insert(demoVisitors),
        repos.transactions.insert(demoTransactions),
        repos.teams.insert(demoTeams),
        repos.roles.insert(demoRoles),
      ]);
    });
  }, [donors, visitors, transactions, teams, roles, persist]);

  /* Perfis */
  const addRole = useCallback(
    (r: NewRole) => {
      const item = { ...r, id: uid() };
      setRoles((prev) => [...prev, item]);
      persist(() => repos.roles.insert([item]));
    },
    [persist],
  );
  const updateRole = useCallback(
    (id: string, r: NewRole) => {
      const item = { ...r, id };
      setRoles((prev) => prev.map((x) => (x.id === id ? item : x)));
      persist(() => repos.roles.update(item));
    },
    [persist],
  );
  const removeRole = useCallback(
    (id: string): string | null => {
      if (users.some((u) => u.roleId === id)) {
        return "Este perfil está em uso por pelo menos um usuário. Troque o perfil dele(s) antes de excluir.";
      }
      const role = roles.find((x) => x.id === id);
      if (role?.isAdmin && roles.filter((x) => x.isAdmin).length <= 1) {
        return "Não é possível excluir o único perfil de administrador.";
      }
      setRoles((prev) => prev.filter((x) => x.id !== id));
      persist(() => repos.roles.remove(id));
      return null;
    },
    [users, roles, persist],
  );

  /* Times */
  const addTeam = useCallback(
    (t: NewTeam) => {
      const item = { ...t, id: uid() };
      setTeams((prev) => [...prev, item]);
      persist(() => repos.teams.insert([item]));
    },
    [persist],
  );
  const updateTeam = useCallback(
    (id: string, t: NewTeam) => {
      const item = { ...t, id };
      setTeams((prev) => prev.map((x) => (x.id === id ? item : x)));
      persist(() => repos.teams.update(item));
    },
    [persist],
  );
  const removeTeam = useCallback(
    (id: string) => {
      const affected = users
        .filter((u) => u.teamIds.includes(id))
        .map((u) => ({ ...u, teamIds: u.teamIds.filter((tid) => tid !== id) }));
      setTeams((prev) => prev.filter((x) => x.id !== id));
      setUsers((prev) => prev.map((u) => affected.find((a) => a.id === u.id) ?? u));
      persist(async () => {
        await Promise.all(affected.map((u) => repos.users.update(u)));
        await repos.teams.remove(id);
      });
    },
    [users, persist],
  );

  /* Usuários (logins) */
  const isAdminUser = useCallback(
    (u: AppUser) => (u.ativo && roles.find((r) => r.id === u.roleId)?.isAdmin) ?? false,
    [roles],
  );

  const addUser = useCallback(
    async (u: NewUser, login: NewLogin): Promise<string | null> => {
      const error = await authedFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({ ...u, email: login.email.trim(), password: login.password }),
      });
      if (!error) await reload();
      return error;
    },
    [reload],
  );

  const updateUser = useCallback(
    async (id: string, u: NewUser, newPassword?: string): Promise<string | null> => {
      const target = users.find((x) => x.id === id);
      if (!target) return "Usuário não encontrado.";
      const next: AppUser = { ...target, ...u, id };
      if (isAdminUser(target) && !isAdminUser(next) && !users.some((x) => x.id !== id && isAdminUser(x))) {
        return "Este é o único administrador ativo. Mantenha-o como administrador e ativo.";
      }
      try {
        await repos.users.update(next);
      } catch (err) {
        return errorMessage(err);
      }
      setUsers((prev) => prev.map((x) => (x.id === id ? next : x)));
      if (newPassword) {
        return authedFetch(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify({ password: newPassword }) });
      }
      return null;
    },
    [users, isAdminUser],
  );

  const removeUser = useCallback(
    async (id: string): Promise<string | null> => {
      if (id === sessionUserId) return "Você não pode excluir o seu próprio usuário.";
      const target = users.find((x) => x.id === id);
      if (target && isAdminUser(target) && !users.some((u) => u.id !== id && isAdminUser(u))) {
        return "Não é possível excluir o único usuário administrador.";
      }
      const error = await authedFetch(`/api/users/${id}`, { method: "DELETE" });
      if (!error) setUsers((prev) => prev.filter((x) => x.id !== id));
      return error;
    },
    [users, isAdminUser, sessionUserId],
  );

  /* Doadores */
  const addDonor = useCallback(
    (d: NewDonor) => {
      const item = { ...d, id: uid() };
      setDonors((prev) => [item, ...prev]);
      persist(() => repos.donors.insert([item]));
    },
    [persist],
  );
  const updateDonor = useCallback(
    (id: string, d: NewDonor) => {
      const item = { ...d, id };
      setDonors((prev) => prev.map((x) => (x.id === id ? item : x)));
      persist(() => repos.donors.update(item));
    },
    [persist],
  );
  const removeDonor = useCallback(
    (id: string) => {
      setDonors((prev) => prev.filter((x) => x.id !== id));
      // No banco, a chave estrangeira já desvincula os lançamentos (on delete set null).
      setTransactions((prev) => prev.map((t) => (t.doadorId === id ? { ...t, doadorId: null } : t)));
      persist(() => repos.donors.remove(id));
    },
    [persist],
  );

  const currentUser = useMemo(() => users.find((u) => u.id === sessionUserId) ?? null, [users, sessionUserId]);
  const currentRole = useMemo(
    () => (currentUser?.ativo ? roles.find((r) => r.id === currentUser.roleId) ?? null : null),
    [currentUser, roles],
  );
  const can = useCallback(
    (area: AppArea, min: AccessLevel = "visualizar") => hasAccess(currentRole, area, min),
    [currentRole],
  );

  const value: StoreValue = {
    hydrated,
    loadError,
    reload,
    visitors,
    transactions,
    fields,
    addVisitor,
    updateVisitor,
    removeVisitor,
    checkout,
    importVisitors,
    addTransaction,
    updateTransaction,
    removeTransaction,
    importTransactions,
    addField,
    updateField,
    removeField,
    moveField,
    loadDemo,
    roles,
    teams,
    users,
    donors,
    currentUserId: sessionUserId,
    currentUser,
    currentRole,
    can,
    addRole,
    updateRole,
    removeRole,
    addTeam,
    updateTeam,
    removeTeam,
    addUser,
    updateUser,
    removeUser,
    addDonor,
    updateDonor,
    removeDonor,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore deve ser usado dentro de <StoreProvider>");
  return ctx;
}
