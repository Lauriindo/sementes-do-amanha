export type FormKey = "visitors" | "finance";

export type FieldType = "text" | "number" | "select" | "date";

/** Definição de um campo personalizado criado pela ONG. */
export interface CustomFieldDef {
  id: string;
  form: FormKey;
  label: string;
  type: FieldType;
  /** Somente para type === "select". */
  options?: string[];
  required?: boolean;
}

/** Valores dos campos personalizados de um registro, indexados por CustomFieldDef.id. */
export type CustomValues = Record<string, string | number>;

export interface Visitor {
  id: string;
  nome: string;
  documento: string;
  motivo: string;
  /** Quem/qual setor está sendo visitado. */
  destino: string;
  /** ISO 8601 (UTC). */
  entrada: string;
  /** ISO 8601 (UTC). null/ausente = ainda no local. */
  saida?: string | null;
  custom: CustomValues;
}

export type TransactionType = "entrada" | "saida";

export interface Transaction {
  id: string;
  tipo: TransactionType;
  descricao: string;
  valor: number;
  /** yyyy-mm-dd */
  data: string;
  categoria: string;
  /** Doador vinculado (ver Donor), quando aplicável. */
  doadorId?: string | null;
  custom: CustomValues;
}

/* -------------------------------------------------------------------------- */
/* Perfis, times e usuários (ver lib/permissions.ts e supabase/schema.sql)    */
/* -------------------------------------------------------------------------- */

/** Cada item do menu principal é uma "área" que um perfil pode ou não acessar. */
export type AppArea =
  | "painel"
  | "visitantes"
  | "financas"
  | "doadores"
  | "campos"
  | "administracao"
  | "excel";

export type AccessLevel = "nenhum" | "visualizar" | "editar";

/** Tipo de perfil: define o que os usuários vinculados a ele podem acessar. */
export interface Role {
  id: string;
  nome: string;
  descricao?: string;
  /** Administrador: ignora o escopo dos times e vê/edita tudo. */
  isAdmin?: boolean;
  acessos: Record<AppArea, AccessLevel>;
}

/** Time que trata uma ou mais categorias financeiras (a "área" do time). */
export interface Team {
  id: string;
  nome: string;
  descricao?: string;
  /** Categorias financeiras (lib/ong.ts) sob responsabilidade deste time. */
  categorias: string[];
  /** Se true, usuários de outros times também veem os lançamentos dessas categorias. */
  compartilhar: boolean;
}

/** Usuário do sistema. O id é o mesmo do login (Supabase Auth). */
export interface AppUser {
  id: string;
  nome: string;
  /** E-mail de login (somente leitura no app). */
  email?: string;
  roleId: string;
  /** Times aos quais está vinculado; vazio = não vinculado a nenhum time. */
  teamIds: string[];
  ativo: boolean;
}

/** Cadastro de doador — sem dados pessoais sensíveis. */
export interface Donor {
  id: string;
  nome: string;
  /** Como a pessoa prefere ser chamada (opcional). */
  comoChamar?: string;
  /** Doador que prefere permanecer anônimo, mas quer ser reconhecido como recorrente. */
  anonimoRecorrente: boolean;
  /** Texto livre (ex.: e-mail, telefone ou "pela Maria") — opcional. */
  contato?: string;
  extra1?: string;
  extra2?: string;
}
