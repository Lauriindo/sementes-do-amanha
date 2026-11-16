/**
 * Camada de persistência (Supabase).
 *
 * Cada coleção do app é uma tabela. As gravações são feitas item a item
 * (insert/update/remove) para que várias pessoas usem o sistema ao mesmo
 * tempo sem uma sobrescrever o que a outra lançou.
 *
 * Os mapeadores convertem entre os tipos do app (camelCase, lib/types.ts) e as
 * colunas do banco (snake_case, supabase/schema.sql).
 */
import { getSupabase } from "./supabase";
import type { AppUser, CustomFieldDef, Donor, Role, Team, Transaction, Visitor } from "./types";

type Row = Record<string, unknown>;

export interface Repository<T extends { id: string }> {
  getAll(): Promise<T[]>;
  insert(items: T[]): Promise<void>;
  update(item: T): Promise<void>;
  remove(id: string): Promise<void>;
}

interface Mapper<T> {
  table: string;
  order: { column: string; ascending: boolean };
  toRow: (item: T) => Row;
  fromRow: (row: Row) => T;
}

class SupabaseRepository<T extends { id: string }> implements Repository<T> {
  constructor(private readonly m: Mapper<T>) {}

  async getAll(): Promise<T[]> {
    const { data, error } = await getSupabase()
      .from(this.m.table)
      .select("*")
      .order(this.m.order.column, { ascending: this.m.order.ascending });
    if (error) throw error;
    return (data ?? []).map((row) => this.m.fromRow(row as Row));
  }

  async insert(items: T[]): Promise<void> {
    if (items.length === 0) return;
    const { error } = await getSupabase().from(this.m.table).insert(items.map(this.m.toRow));
    if (error) throw error;
  }

  async update(item: T): Promise<void> {
    const { id, ...rest } = this.m.toRow(item);
    const { error } = await getSupabase().from(this.m.table).update(rest).eq("id", id);
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await getSupabase().from(this.m.table).delete().eq("id", id);
    if (error) throw error;
  }
}

const str = (v: unknown) => (v == null ? "" : String(v));
const optStr = (v: unknown) => (v == null ? undefined : String(v));

export const repositories = {
  visitors: new SupabaseRepository<Visitor>({
    table: "visitors",
    order: { column: "entrada", ascending: false },
    toRow: (v) => ({
      id: v.id,
      nome: v.nome,
      documento: v.documento ?? "",
      motivo: v.motivo ?? "",
      destino: v.destino ?? "",
      entrada: v.entrada,
      saida: v.saida ?? null,
      custom: v.custom ?? {},
    }),
    fromRow: (r) => ({
      id: str(r.id),
      nome: str(r.nome),
      documento: str(r.documento),
      motivo: str(r.motivo),
      destino: str(r.destino),
      entrada: str(r.entrada),
      saida: (r.saida as string | null) ?? null,
      custom: (r.custom as Visitor["custom"]) ?? {},
    }),
  }),

  transactions: new SupabaseRepository<Transaction>({
    table: "transactions",
    order: { column: "data", ascending: false },
    toRow: (t) => ({
      id: t.id,
      tipo: t.tipo,
      descricao: t.descricao ?? "",
      valor: t.valor,
      data: t.data,
      categoria: t.categoria ?? "",
      doador_id: t.doadorId ?? null,
      custom: t.custom ?? {},
    }),
    fromRow: (r) => ({
      id: str(r.id),
      tipo: r.tipo as Transaction["tipo"],
      descricao: str(r.descricao),
      valor: Number(r.valor),
      data: str(r.data),
      categoria: str(r.categoria),
      doadorId: (r.doador_id as string | null) ?? null,
      custom: (r.custom as Transaction["custom"]) ?? {},
    }),
  }),

  /** A ordem dos campos vem da posição no array (coluna `position`). */
  fields: new SupabaseRepository<CustomFieldDef & { position?: number }>({
    table: "custom_fields",
    order: { column: "position", ascending: true },
    toRow: (f) => ({
      id: f.id,
      form: f.form,
      label: f.label,
      type: f.type,
      options: f.options ?? null,
      required: Boolean(f.required),
      ...(f.position !== undefined ? { position: f.position } : {}),
    }),
    fromRow: (r) => ({
      id: str(r.id),
      form: r.form as CustomFieldDef["form"],
      label: str(r.label),
      type: r.type as CustomFieldDef["type"],
      options: (r.options as string[] | null) ?? undefined,
      required: Boolean(r.required),
    }),
  }),

  roles: new SupabaseRepository<Role>({
    table: "roles",
    order: { column: "created_at", ascending: true },
    toRow: (r) => ({
      id: r.id,
      nome: r.nome,
      descricao: r.descricao ?? null,
      is_admin: Boolean(r.isAdmin),
      acessos: r.acessos,
    }),
    fromRow: (r) => ({
      id: str(r.id),
      nome: str(r.nome),
      descricao: optStr(r.descricao),
      isAdmin: Boolean(r.is_admin),
      acessos: r.acessos as Role["acessos"],
    }),
  }),

  teams: new SupabaseRepository<Team>({
    table: "teams",
    order: { column: "created_at", ascending: true },
    toRow: (t) => ({
      id: t.id,
      nome: t.nome,
      descricao: t.descricao ?? null,
      categorias: t.categorias,
      compartilhar: t.compartilhar,
    }),
    fromRow: (r) => ({
      id: str(r.id),
      nome: str(r.nome),
      descricao: optStr(r.descricao),
      categorias: (r.categorias as string[]) ?? [],
      compartilhar: Boolean(r.compartilhar),
    }),
  }),

  /** Só leitura/edição: criar e excluir logins passa pela API (app/api/users). */
  users: new SupabaseRepository<AppUser>({
    table: "app_users",
    order: { column: "created_at", ascending: true },
    toRow: (u) => ({
      id: u.id,
      nome: u.nome,
      role_id: u.roleId || null,
      team_ids: u.teamIds,
      ativo: u.ativo,
    }),
    fromRow: (r) => ({
      id: str(r.id),
      nome: str(r.nome),
      email: optStr(r.email),
      roleId: str(r.role_id),
      teamIds: (r.team_ids as string[]) ?? [],
      ativo: Boolean(r.ativo),
    }),
  }),

  donors: new SupabaseRepository<Donor>({
    table: "donors",
    order: { column: "created_at", ascending: false },
    toRow: (d) => ({
      id: d.id,
      nome: d.nome ?? "",
      como_chamar: d.comoChamar ?? null,
      anonimo_recorrente: d.anonimoRecorrente,
      contato: d.contato ?? null,
      extra1: d.extra1 ?? null,
      extra2: d.extra2 ?? null,
    }),
    fromRow: (r) => ({
      id: str(r.id),
      nome: str(r.nome),
      comoChamar: optStr(r.como_chamar),
      anonimoRecorrente: Boolean(r.anonimo_recorrente),
      contato: optStr(r.contato),
      extra1: optStr(r.extra1),
      extra2: optStr(r.extra2),
    }),
  }),
};
