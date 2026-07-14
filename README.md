# Cadastro de Equipamentos

Aplicacao web completa para cadastro de equipamentos com:

- formulario publico para gerar patrimonios unicos;
- painel administrativo protegido por login simples;
- importacao de unidades e equipamentos por Excel;
- upload da planilha modelo de exportacao;
- exportacao no padrao "Equipamentos Importacao";
- persistencia em Supabase;
- hospedagem preparada para Netlify.

## Arquitetura

O projeto foi dividido em tres blocos:

- `src/`: frontend React com rotas publicas e administrativas.
- `netlify/functions/`: funcoes serverless para login admin, importacoes, listagens e exportacao.
- `supabase/schema.sql`: schema completo do banco, funcoes SQL/RPC, indices, restricoes e RLS.

### Como a exclusividade dos patrimonios e garantida

- A tabela `patrimonios` possui `UNIQUE (numero_patrimonio)`.
- A tabela `patrimonios` possui `CHECK (numero_patrimonio between 1 and 999999)`.
- A funcao `create_registration(payload jsonb)` roda no banco, dentro de uma unica transacao.
- Para cada item, a funcao tenta gerar e inserir um numero aleatorio.
- Se houver colisao, a restricao `UNIQUE` dispara e o loop tenta novamente.
- O commit so acontece quando todos os equipamentos do cadastro forem salvos.

### Como o sistema evita colisao entre usuarios simultaneos

- O frontend nao reserva patrimonio nenhum.
- Toda a geracao acontece no Supabase, dentro da funcao `create_registration`.
- A restricao `UNIQUE` continua sendo a garantia final mesmo com requisicoes simultaneas.
- Se dois usuarios tentarem usar o mesmo numero no mesmo instante, uma insercao falha e o loop do banco gera outro numero.

### Como funciona o `request_id`

- Cada tentativa de cadastro gera um UUID no navegador.
- O UUID e enviado junto com a lista de equipamentos.
- A tabela `cadastros` possui `request_id` unico.
- Se a mesma requisicao for reenviada, a funcao retorna o cadastro anterior em vez de duplicar patrimonio.

### Como funcionam as tres importacoes

- Unidades:
  leitura da coluna `A` a partir da linha `2`, com normalizacao, remocao de vazios e bloqueio de duplicados.
- Equipamentos:
  leitura da coluna `A` a partir da linha `2`, com o mesmo tratamento.
- Modelo de exportacao:
  validacao da primeira aba e das colunas `A`, `C`, `E`, `F` e `H`, armazenamento em bucket privado do Supabase Storage e registro em `configuracoes`.

### Como funciona a exportacao

- A funcao administrativa busca os registros em `vw_admin_registros`.
- O sistema tenta baixar a planilha modelo salva no bucket privado.
- Se nao houver modelo, gera um modelo padrao.
- O arquivo de saida preenche:
  - coluna `A`: nome do equipamento
  - coluna `C`: patrimonio
  - coluna `E`: unidade
  - coluna `F`: sigla de tres letras
  - coluna `H`: `ATIVO` ou `INATIVO`

### Como funciona a autenticacao administrativa

- O login usa `ADMIN_USERNAME` e `ADMIN_PASSWORD`, definidos no ambiente do Netlify.
- O backend cria um cookie de sessao assinado com `ADMIN_SESSION_SECRET`.
- Somente as Netlify Functions com sessao valida executam operacoes administrativas.
- A `SUPABASE_SERVICE_ROLE_KEY` fica restrita ao backend e nunca vai para o frontend.

## Tecnologias

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- PostgreSQL
- Supabase Storage
- Netlify Functions
- React Router
- SheetJS (`xlsx`)

## Estrutura

```text
src/
  components/
  hooks/
  pages/
  services/
  types/
  utils/

shared/
  constants.ts
  generateEquipmentCode.ts
  normalizeText.ts
  requestId.ts
  types.ts
  validations.ts

netlify/
  functions/
    _shared/
    admin-login.ts
    admin-logout.ts
    admin-session.ts
    admin-dashboard.ts
    admin-list-registrations.ts
    admin-import-units.ts
    admin-import-equipment.ts
    admin-upload-template.ts
    admin-download-template.ts
    admin-export.ts
    admin-units.ts
    admin-equipment.ts
    admin-update-unit.ts
    admin-update-equipment.ts

supabase/
  schema.sql
```

## Variaveis de ambiente

Copie `.env.example` para `.env.local` durante o desenvolvimento.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

ADMIN_USERNAME=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

### Regras importantes

- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` podem aparecer no frontend.
- `SUPABASE_SERVICE_ROLE_KEY` deve existir apenas nas Netlify Functions.
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` e `ADMIN_SESSION_SECRET` devem existir apenas nas Netlify Functions.
- Nao envie credenciais reais para o GitHub.

Para producao no Netlify, configure o usuario administrativo conforme solicitado:

- `ADMIN_USERNAME=admin`
- `ADMIN_PASSWORD=<definir no painel do Netlify, nao no repositorio>`

## Como instalar e rodar localmente

```bash
npm install
npm run dev
```

O frontend sobe pelo Vite.

## Como rodar as Netlify Functions localmente

Instale a CLI do Netlify se desejar testar o fluxo completo localmente:

```bash
npm install -g netlify-cli
netlify dev
```

## Como rodar checagens e build

```bash
npm run build
```

Se quiser validar apenas o TypeScript:

```bash
npm run check
```

## Configuracao do Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Execute o arquivo [`supabase/schema.sql`](./supabase/schema.sql).
4. Crie um bucket privado chamado `modelos-exportacao`.
5. Guarde:
   - Project URL
   - anon key
   - service role key

## Storage

Bucket recomendado:

- `modelos-exportacao`

Ele deve ser privado. O acesso ao arquivo modelo deve acontecer apenas pelas Netlify Functions usando `service_role`.

## Importacao das planilhas

No painel `/admin/importacoes`:

1. Importe `Nome das Unidades`.
2. Escolha `Adicionar novos registros` ou `Substituir catalogo atual`.
3. Confirme a previa.
4. Repita o processo para `Planilha de Equipamentos`.
5. Envie a planilha `Equipamentos Importacao` como modelo de exportacao.

## Primeiro acesso administrativo

1. Configure `ADMIN_USERNAME`, `ADMIN_PASSWORD` e `ADMIN_SESSION_SECRET`.
2. Publique a aplicacao.
3. Acesse `/admin/login`.
4. Entre com as credenciais definidas no ambiente.

## GitHub

Fluxo sugerido:

1. Crie um repositorio vazio no GitHub.
2. Inicialize o repositiorio local, se necessario.
3. Adicione o remoto.
4. Envie o codigo.

Exemplo:

```bash
git init
git add .
git commit -m "feat: cadastro de equipamentos"
git branch -M main
git remote add origin <URL_DO_REPOSITORIO>
git push -u origin main
```

## Netlify

1. Conecte o repositorio do GitHub ao Netlify.
2. Configure as variaveis de ambiente.
3. Use:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Garanta que o arquivo `netlify.toml` esteja no projeto.
5. Execute o deploy.

## Rotas principais

- `/`: formulario publico
- `/admin/login`: login administrativo
- `/admin`: dashboard
- `/admin/registros`: lista de cadastros
- `/admin/unidades`: gerenciamento de unidades
- `/admin/equipamentos`: gerenciamento de equipamentos
- `/admin/importacoes`: importacoes e planilha modelo
- `/admin/exportar`: exportacao Excel

## Observacoes sobre o banco

- O frontend publico consulta apenas unidades e equipamentos ativos.
- O frontend publico nao insere diretamente em `cadastros` nem em `patrimonios`.
- O cadastro publico e feito pela RPC `create_registration`.
- O painel administrativo usa funcoes Netlify com `service_role`.

## Diagnostico de erros comuns

- Erro ao carregar unidades ou equipamentos:
  confira `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e a execucao do schema SQL.
- Erro ao salvar cadastro:
  confira se a RPC `create_registration` foi criada com sucesso.
- Falha no login administrativo:
  revise `ADMIN_USERNAME`, `ADMIN_PASSWORD` e `ADMIN_SESSION_SECRET`.
- Falha em importacoes/exportacoes:
  confira `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e o bucket `modelos-exportacao`.
- Rotas quebrando ao atualizar a pagina:
  valide se o `netlify.toml` foi publicado com os redirects.

## Validacao feita neste workspace

- Instalacao de dependencias
- Verificacao de TypeScript
- Build de producao do Vite

Nao existem testes automatizados no projeto neste momento, entao nao houve execucao de suite de testes.
