# Auditoria somente-leitura — Bloco 17 (Notas Fiscais)

Nenhum código, migration, dado, policy ou bucket foi alterado. Todos os achados abaixo vêm de leituras feitas nesta sessão (busca no código + SELECTs no banco realmente conectado, ref `strjxknhzdxjnxexdoyf`).

## 1. Código atual do módulo de Notas Fiscais

Busca em `src/` por `invoices|notas_fiscais|url_arquivo|storage.from|createSignedUrl|getPublicUrl`:

- As **únicas** ocorrências estão em `src/integrations/supabase/types.ts` (tipos gerados: `invoices`, `notas_fiscais`, coluna `url_arquivo`).
- Rotas existentes: `src/routes/index.tsx`, `pagamentos.tsx`, `profissionais.$id.tsx`, `__root.tsx`. Não existe rota, componente, hook ou query de Notas Fiscais.
- Não há nenhuma chamada de Storage no projeto: zero `storage.from(...)`, zero `getPublicUrl`, zero `createSignedUrl`, zero upload.

Conclusão: **`url_arquivo` não é lido nem escrito por nenhum código hoje** — é apenas uma coluna de texto no schema. Não há UI de upload/visualização de NF.

Observação adicional (fora do escopo, mas relevante): o typecheck atual do projeto está quebrado (erros TS4111/TS2322/TS18048 em `__root.tsx`, `index.tsx`, `pagamentos.tsx`, `profissionais.$id.tsx`). Isso não foi corrigido porque a tarefa é somente leitura.

## 2. Schema real de `public.invoices`

Colunas (via `information_schema.columns`): `id uuid NOT NULL default gen_random_uuid()`, `company_id uuid NOT NULL`, `contractor_id uuid NOT NULL`, `numero text NULL`, `competencia date NOT NULL`, `valor numeric NOT NULL`, `data_emissao date NULL`, `data_vencimento date NULL`, `url_arquivo text NULL`, `status text NOT NULL`, `observacoes text NULL`, `created_at timestamptz NOT NULL`, `updated_at timestamptz NOT NULL`, `payment_id uuid NULL`, `submitted_by_user_id uuid NULL`, `submitted_at timestamptz NULL`.

Constraints (`pg_constraint`):
- PK `invoices_pkey (id)`
- UNIQUE `invoices_company_id_numero_key (company_id, numero)`
- FK `company_id -> companies(id) ON DELETE CASCADE`
- FK `contractor_id -> contractors(id) ON DELETE CASCADE`
- FK `payment_id -> payments(id) ON DELETE SET NULL`
- FK `submitted_by_user_id -> users(id) ON DELETE SET NULL`
- CHECK `status IN ('pending','approved','paid','rejected','cancelled')`
- CHECK `valor >= 0`

RLS: **habilitado** (`pg_class.relrowsecurity = true`). Policies atuais (todas para role `authenticated`):
- `invoices_select_financial_staff` SELECT — `company_id = current_active_company_id() AND current_active_user_has_role(ARRAY['administrator','finance_hr'])`
- `invoices_select_professional_own` SELECT — `company_id = current_active_company_id() AND contractor_id = current_professional_contractor_id()`
- `invoices_insert_financial_staff` INSERT — with_check igual à regra de staff
- `invoices_update_financial_staff` UPDATE — using + with_check da regra de staff
- `invoices_delete_financial_staff` DELETE — regra de staff

Ou seja: hoje **o PJ só lê; não existe policy de INSERT para o profissional**.

## 3. Identidade, perfis, papéis e vínculos

Não existe tabela `profiles` nem `user_roles`. O papel está numa coluna:

- `public.users`: `id uuid` (FK → `auth.users.id`), `company_id uuid NOT NULL` (FK → `companies.id`), `nome_completo`, `email`, `role text NOT NULL`, `status text NOT NULL`, timestamps. RLS on; policies `users_select_self_or_admin` (`id = auth.uid() OR dj_pay_is_admin(company_id)`), `users_insert_admin`, `users_update_admin`, `users_delete_admin` — todas para role `public`.
- `public.contractors`: `id`, `company_id NOT NULL`, `user_id uuid NULL` (FK → `auth.users.id`) — este é o vínculo usuário→contractor. RLS on; `contractors_select_company_or_own` (`dj_pay_is_financeiro_ou_admin(company_id) OR user_id = auth.uid()`), insert/update/delete só admin. Triggers `contractors_enforce_company_from_auth` (BEFORE INSERT/UPDATE) forçam `company_id` a partir de `users` com `status = 'active'`.
- `public.companies`: policies `companies_select_member`, `companies_update_admin`.

Funções de autorização — existem **duas famílias incompatíveis** convivendo:

| Família | Espera `users.status` | Espera `users.role` |
| --- | --- | --- |
| `current_active_company_id()`, `current_active_user_has_role()`, `current_user_role()`, `current_company_id()`, `current_professional_contractor_id()`, `is_company_admin()`, `can_manage_finance()` | `'active'` | `'administrator'`, `'finance_hr'`, `'professional_pj'` |
| `dj_pay_has_role()`, `dj_pay_has_company_role()`, `dj_pay_is_admin()`, `dj_pay_is_financeiro_ou_admin()`, `is_company_member()`, `dj_pay_is_own_contractor()` | `'ativo'` | `'administrador'/'admin'`, `'financeiro_rh'/'financeiro'`, e em `notas_fiscais` literalmente `'Administrador'`, `'Financeiro/RH'` | 

`invoices` usa a família 1; `notas_fiscais`, `users`, `contractors`, `companies` usam a família 2. Nenhum vocabulário é comprovável hoje: `public.users` está **vazia** (`select distinct status/role` → NULL), portanto não é possível confirmar por dados quais valores o app grava.

## 4. `storage.buckets`

`select count(*) from storage.buckets` → **0**. Não há nenhum bucket, portanto nada a listar em `id,name,public,file_size_limit,allowed_mime_types`.

## 5. Policies de `storage.objects`

`pg_policies` filtrado por `schemaname='storage' and tablename='objects'` → **nenhuma linha**. RLS está **habilitado** em `storage.objects` e em `storage.buckets` (`relrowsecurity = true`). Com RLS ligado e zero policies, todo acesso de `anon`/`authenticated` ao Storage está bloqueado.

## 6. Objetos ligados a NF

`select count(*) from storage.objects` → **0**. Não existe nenhum arquivo, logo não há padrão de `name`, `bucket_id` ou `owner_id` a descrever. Também `public.invoices` tem **0 linhas** e **0 registros com `url_arquivo` preenchido**; `public.notas_fiscais` tem **0 linhas**.

## 7. URL pública, download autenticado ou signed URL?

**Nenhum dos três.** Não há bucket, não há objeto e não há chamada de Storage no código. O projeto ainda não tem estratégia de arquivo de NF implementada — a decisão está aberta.

## 8. Desenho mínimo seguro proposto (NÃO aplicado)

Reaproveita `public.invoices` (sem criar `notas_fiscais`), preserva dados, sem `service_role` no cliente e sem `user_metadata` para autorização.

### 8.0 Pré-requisito: unificar o vocabulário de papéis
Antes de qualquer policy nova, decidir uma única convenção de `users.status`/`users.role` e usar uma só família de funções. Enquanto as duas famílias coexistirem, uma policy pode liberar e a outra negar o mesmo usuário. Proposta: adotar a família `current_*` (`status = 'active'`, roles `administrator | finance_hr | professional_pj`), já usada por `invoices`.

### 8.1 Bucket
Bucket **privado** `invoices` (criado pela ferramenta de storage, não por migration), com `file_size_limit` (ex. 10 MB) e `allowed_mime_types` restritos a `application/pdf`, `image/png`, `image/jpeg`, `application/xml`, `text/xml`.

### 8.2 Convenção de caminho
`{company_id}/{contractor_id}/{invoice_id}/{arquivo}` — os dois primeiros segmentos permitem autorizar via `storage.foldername(name)` sem consultar metadados do arquivo.

### 8.3 Policies em `storage.objects` (bucket `invoices`, role `authenticated`)
- **SELECT**: staff da empresa (`foldername[1]::uuid = current_active_company_id()` + `current_active_user_has_role(['administrator','finance_hr'])`) **OU** PJ dono (`foldername[1]::uuid = current_active_company_id() AND foldername[2]::uuid = current_professional_contractor_id()`).
- **INSERT** (upload novo): mesma dupla condição, no `with_check`.
- **UPDATE** (necessário para `upsert: true`): mesma condição em `USING` e `WITH CHECK`. Se preferir imutabilidade da NF enviada, **não** criar policy de UPDATE e usar sempre `upsert: false` com nome de arquivo novo (versionamento por sufixo/timestamp) — recomendação preferida para trilha de auditoria.
- **DELETE**: só staff da empresa. PJ não apaga NF enviada.

### 8.4 Policies em `public.invoices` a acrescentar
- Nova policy de **INSERT** para PJ: `company_id = current_active_company_id() AND contractor_id = current_professional_contractor_id() AND status = 'pending' AND submitted_by_user_id = auth.uid()`.
- Nova policy de **UPDATE** para PJ, restrita: só enquanto `status = 'pending'`, mantendo `company_id`/`contractor_id` inalterados (validação por trigger, já que `WITH CHECK` não vê `OLD`) e sem permitir mudança de `status`.
- **DELETE** por PJ: não conceder.
- Manter as quatro policies de staff como estão (após a normalização de papéis do 8.0).
- `submitted_at`: default `now()` ou trigger, para não depender do cliente.

### 8.5 Acesso ao arquivo
Somente **signed URL** de curta duração (`createSignedUrl`, ex. 60–300 s), gerada com o cliente autenticado do usuário (RLS aplica). Nunca `getPublicUrl`, nunca bucket público, nunca chave de service role no navegador. `url_arquivo` passa a guardar o **caminho do objeto** (`storage_path`), não uma URL assinada; a URL é gerada na hora do clique.

## Limitações desta auditoria
Nenhuma consulta ficou faltando por falta de acesso. As duas limitações são de **dados**, não de permissão: `public.users`, `public.invoices`, `storage.buckets` e `storage.objects` estão vazias, então não é possível comprovar empiricamente o vocabulário de `role`/`status` em uso nem padrões de caminho de arquivo.

## Consultas usadas
```sql
-- 2 e 3: colunas
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public'
  and table_name in ('invoices','notas_fiscais','users','contractors','companies')
order by table_name, ordinal_position;

-- 2, 3 e 5: policies
select schemaname, tablename, policyname, cmd, roles::text, qual, with_check
from pg_policies
where (schemaname='public' and tablename in ('invoices','notas_fiscais','users','contractors','companies'))
   or (schemaname='storage' and tablename='objects')
order by tablename, policyname;

-- 2 e 5: RLS habilitado
select n.nspname, c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where (n.nspname='storage' and c.relname in ('objects','buckets'))
   or (n.nspname='public' and c.relname in ('invoices','notas_fiscais','users','contractors'));

-- 2: constraints
select con.conname, pg_get_constraintdef(con.oid)
from pg_constraint con
join pg_class c on c.oid=con.conrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='invoices';

-- 4, 6 e limitações: contagens
select (select count(*) from storage.buckets) buckets,
       (select count(*) from storage.objects) objects,
       (select count(*) from public.invoices) invoices,
       (select count(*) from public.invoices where url_arquivo is not null) inv_com_arquivo,
       (select count(*) from public.notas_fiscais) notas_fiscais,
       (select string_agg(distinct status,',') from public.users) user_status,
       (select string_agg(distinct role,',') from public.users) user_roles;
```
Busca no código: `rg -n "invoices|notas_fiscais|url_arquivo|storage\.from|createSignedUrl|getPublicUrl" src`
