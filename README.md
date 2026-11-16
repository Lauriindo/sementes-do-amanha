# Sementes do Amanhã — Sistema Integrado de Gestão e Visitantes

Aplicação web em **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS** para a ONG *Sementes do Amanhã* (Taboão da Serra - SP). Desenvolvido por **NEKKO**.

## Funcionalidades

- **Painel**: saldo total, entradas, saídas, visitantes no local e gráficos (entradas × saídas, gastos por categoria).
- **Visitantes**: tag animada `🟢 NO LOCAL` (Tailwind `animate-pulse`/`animate-ping`), check-out com um clique (`⚪ SAIU` + hora de saída), busca, ordenação, filtro e histórico.
- **Finanças**: entradas e saídas com categorias, busca, ordenação e totais. Cada entrada pode ser vinculada a um doador.
- **Doadores**: cadastro leve (nome, como gostaria de ser chamado, contato livre e 2 campos extras) — sem CPF, endereço ou outro dado pessoal sensível. Inclui a flag "anônimo recorrente".
- **Administração (perfis, times e usuários)**: controle de acesso com login (e-mail e senha) e regras aplicadas no próprio banco (RLS).
  - **Perfis**: cada perfil define, por área do sistema (Painel, Visitantes, Finanças, Doadores, Campos, Administração, Excel), o nível de acesso: sem acesso / só visualizar / visualizar e editar.
  - **Times**: cada time trata um conjunto de categorias financeiras (ex.: um time cuida das doações presenciais, outro dos gastos). O admin decide, por time, se essas categorias ficam restritas a quem está vinculado a ele ou se são compartilhadas com todo mundo.
  - **Usuários**: vinculam um perfil e (opcionalmente) um ou mais times. Cada usuário é um login criado pelo administrador (e-mail e senha inicial); a pessoa pode trocar a própria senha pelo ícone de chave na barra lateral.
- **Campos personalizados**: até **10 por formulário** (Visitantes e Finanças), tipos Texto, Número, Seleção (dropdown) e Data. Aparecem nos formulários, nas tabelas e como colunas extras no Excel.
- **Excel (SheetJS)**: baixar modelo, exportar e importar com colunas dinâmicas — a importação aceita planilhas **com ou sem** as colunas personalizadas e mostra uma prévia com erros por linha.

> O **primeiro login** criado no Supabase vira administrador automaticamente. Não há cadastro público: quem se cadastrar por fora fica sem perfil e sem acesso.

## Configuração do banco (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com) (região *South America (São Paulo)*).
2. **SQL Editor → New query**: cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. Cria as tabelas, as regras de acesso (RLS) e o gatilho dos usuários. Pode ser executado de novo sem perder dados.
3. **Authentication → Sign In / Providers → Email**: desative **Allow new users to sign up** (os logins são criados pelo admin dentro do sistema).
4. **Authentication → Users → Add user → Create new user**: crie o seu login (marque *Auto Confirm User*). Esse primeiro usuário vira **Administrador**.
5. **Project Settings → API Keys**: copie a chave pública (*Publishable* ou *anon*) e a secreta (*Secret* ou *service_role*).

## Variáveis de ambiente

| Variável | Onde pegar | Pública? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → Data API → Project URL | sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API Keys → Publishable (ou *anon public*) | sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → Secret (ou *service_role*) | **não** — só no servidor |

A chave secreta é usada apenas pelas rotas `app/api/users` (criar, trocar senha e excluir logins), que verificam se quem chamou pode editar a Administração. Nunca a coloque no código nem com prefixo `NEXT_PUBLIC_`.

## Rodando localmente

Requer Node.js 18.18+ (recomendado 20 LTS).

```bash
cp .env.example .env.local   # e preencha as três variáveis
npm install
npm run dev      # http://localhost:3000
npm run build    # build de produção
```

## Deploy na Vercel

1. Na Vercel: **Add New → Project**, importe o repositório do GitHub (framework detectado: Next.js).
2. Em **Environment Variables**, cadastre as três variáveis da tabela acima.
3. Clique em **Deploy**.
4. No Supabase, em **Authentication → URL Configuration**, coloque o endereço da Vercel em **Site URL**.

> A dependência `xlsx` é instalada do CDN oficial do SheetJS (versão 0.20.3, sem as vulnerabilidades conhecidas da 0.18.5 do npm). A Vercel consegue instalar normalmente.

## Onde mexer

| Arquivo | O que controla |
| --- | --- |
| `lib/ong.ts` | Nome, endereço, textos, categorias financeiras e motivos de visita |
| `lib/custom-fields.ts` | Regras dos campos personalizados (limite de 10, validação) |
| `lib/columns.ts` | Colunas padrão das planilhas |
| `lib/excel.ts` | Modelo, exportação e importação do Excel |
| `lib/storage.ts` | Acesso ao banco: um repositório por tabela, com mapeamento app ↔ colunas |
| `lib/auth.tsx` | Login, sessão e troca de senha |
| `supabase/schema.sql` | Tabelas, RLS e gatilho de usuários |
| `app/api/users/` | Criação, troca de senha e exclusão de logins (servidor) |
| `lib/permissions.ts` | Áreas do sistema, níveis de acesso e o filtro de finanças por time |
| `lib/store.tsx` | Estado global — inclui perfis, times, usuários, doadores e o usuário logado |
| `components/footer.tsx` | Rodapé "Desenvolvido por NEKKO" |

## Persistência e segurança

- Os dados ficam no Supabase (Postgres) e são compartilhados por todos os usuários. Cada ação grava só o registro alterado, então várias pessoas podem usar ao mesmo tempo. Ao voltar para a aba, o sistema busca o que os outros lançaram.
- As permissões de `lib/permissions.ts` (nível por área e escopo de finanças por time) são repetidas como políticas RLS em `supabase/schema.sql`: mesmo fora do app, cada login só lê ou grava o que o perfil permite. Se mudar uma regra em um lugar, mude no outro.
- Backup: *Excel → Exportar*, ou os backups automáticos do Supabase (Database → Backups).

## Como funcionam os campos personalizados

- Definições: `CustomFieldDef { id, form, label, type, options?, required? }`, salvas na tabela `custom_fields` (a ordem fica na coluna `position`).
- Valores: cada registro guarda `custom: { [fieldId]: valor }`.
- `components/custom-fields/dynamic-fields.tsx` renderiza os campos nos formulários conforme o tipo.
- `lib/excel.ts` monta o cabeçalho como `colunas padrão + rótulos dos campos` e, ao importar, casa as colunas extras pelo rótulo (ignorando acentos e maiúsculas).
- Excluir um campo não apaga os valores já gravados; eles apenas deixam de ser exibidos.
