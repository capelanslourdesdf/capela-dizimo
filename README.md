# Meu Dízimo Digital

Plataforma web **mobile-first** da **Pastoral do Dízimo da Capela Nossa Senhora de Lourdes**, para
recadastramento e acompanhamento de dizimistas, lançamento de devoluções (contribuições) e
controle financeiro mensal da Tesouraria da Capela.

O site tem **quatro áreas**, cada uma com seu próprio login e nível de acesso:

| Área | Quem acessa | Login |
|---|---|---|
| **Pública** | Qualquer visitante | Sem login |
| **Dizimista** | Qualquer dizimista cadastrado | Nº do carnê + dia/mês de nascimento |
| **Administrativo (Pastoral)** | Pastoral do Dízimo, Coordenadora, Tesoureiro | Perfil + senha |
| **Tesouraria** | Coordenadora, Tesoureiro, Secretaria Paroquial | Perfil + senha (independente da Pastoral) |

---

## 1. Área pública

### 1.1. Home (`/`)
Página inicial institucional — nome e ícone da Capela, botão para o Recadastramento. Não expõe
nenhum link direto para a área do dizimista nem para o Administrativo (o acesso administrativo
fica só no rodapé/cabeçalho, como "Administrativo").

### 1.2. Como funciona (`/como-funciona`)
Página explicativa com o passo a passo do recadastramento e perguntas frequentes (o que dá pra
fazer no site, como contribuir, o que fazer sem saber o nº do carnê, segurança dos dados).

### 1.3. Recadastramento (`/recadastramento`)
Formulário público para quem **já tem cadastro** (vindo da planilha física antiga ou de um
recadastramento anterior) atualizar nome, data de nascimento e telefone/WhatsApp. Três formas de
informar quem é a pessoa:

1. **"Já tenho o número do carnê"** — digita o número; o site busca automaticamente (com
   debounce) e, se encontrar, pré-preenche os dados para conferência/edição.
2. **"Não sei o número do carnê"** — busca **só pelo nome** (campo de data foi removido desse
   fluxo), com comparação aproximada de texto (tolera pequenas diferenças de grafia — variações
   como "THIAGO/TIAGO" e afins). A pessoa escolhe o cadastro certo numa lista de resultados, ou
   toca em **"Não é nenhum desses"** para cair na opção 3.
3. **"Cadastrar dizimista sem carnê (gerar um novo)"** — o site gera automaticamente um número de
   carnê ainda livre (a partir de 500, até 5 dígitos) e a pessoa preenche os dados do zero.

O envio grava (ou atualiza, se o carnê já existir) o documento do dizimista. A **primeira** vez
que os dados são salvos marca `recadastradoEm` — essa data é a referência a partir da qual o
dizimista passa a ser cobrado/acompanhado (ver seção 6.1); recadastramentos seguintes não mudam
essa data.

---

## 2. Área do dizimista (`/dizimista/...`)

### 2.1. Login (`/entrar`)
Nº do carnê + dia/mês de nascimento (a planilha de origem não registra o ano completo para todo
mundo). Um mesmo carnê pode pertencer a uma família inteira (cônjuge e filhos importados junto) —
qualquer membro consegue entrar usando a própria data. A sessão fica salva por 30 dias.

### 2.2. Início — Dashboard (`/dizimista`)
- Cartões de resumo: nº do carnê, total já devolvido e **meses pendentes no ano** (todos os meses
  do ano corrente até o mês atual, sem exceção — mesmo quem se cadastrou no meio do ano tem o ano
  inteiro contado).
- Grade com a situação de cada mês do ano (pago/pendente).
- Lista de devoluções já registradas, agrupadas por mês.
- Mensagem motivacional sorteada conforme a regularidade da pessoa (nunca devolveu, em dia,
  irregular).
- Botão de destaque **"Devolver meu dízimo"**, levando direto ao fluxo de devolução.

### 2.3. Devolver meu dízimo (`/dizimista/fazer-devolucao`)
Fluxo de **demonstração** (não lança nada de verdade no financeiro — aviso visível na tela):
1. Escolhe a forma: **Pix** ou **Cartão de crédito/débito**.
2. Escolhe um ou vários meses do ano na grade (meses já pagos aparecem marcados).
3. Se escolher mais de um mês, decide como dividir o valor: **valor total dividido** entre os
   meses (sem perder centavo de arredondamento) ou **o mesmo valor** repetido em cada mês.
4. **Pix**: gera um QR Code e um código "copia e cola" fictícios, com cronômetro de expiração
   (5 min) e botão de copiar.
5. **Cartão**: formulário completo (número, validade, CVV, nome do titular, CPF/CNPJ), com
   checkbox **"Salvar cartão para as próximas devoluções"** e aviso de segurança. Qualquer
   preenchimento válido "aprova" o pagamento (mock).

### 2.4. Minhas devoluções (`/dizimista/devolucoes`)
Grade do ano com a situação mês a mês e o histórico completo de devoluções, agrupado por mês (se a
pessoa devolveu mais de uma vez no mesmo mês, todas aparecem juntas).

### 2.5. Atualização cadastral (`/dizimista/cadastro`)
Mesmo formulário do recadastramento público, já logado — atualiza nome, nascimento e telefone.

### 2.6. Pagamento via Pix real (desativado)
Existe uma tela pronta (`/dizimista/pagamento`) com integração real ao Mercado Pago (gera cobrança
Pix de verdade, consulta status a cada poucos segundos até aprovar) — mas a rota **não está
registrada** no site: ninguém consegue chegar nela hoje. Fica pronta para ativação futura.

---

## 3. Área administrativa — Pastoral (`/pastoral/...`)

Acesso por perfil + senha (`/pastoral/entrar`). Três perfis podem entrar: **Pastoral do Dízimo**,
**Coordenadora** e **Tesoureiro** — o perfil "Pastoral do Dízimo" não enxerga Configurações nem o
link para a Tesouraria.

### 3.1. Dizimistas (`/pastoral`) — tela inicial
- Lista completa de dizimistas, com busca (nome ou nº do carnê) e filtro por status
  (Ativo/Inativo/Todos).
- Cartões de resumo: total de ativos, inativos, total geral e **valor arrecadado no ano**.
- Bloco expansível **"Total arrecadado por ano"**, com gráfico de evolução mensal do ano corrente
  e o total de cada ano anterior.
- Bloco expansível **"Aniversariantes do mês"**.
- **Exportar ativos** — baixa um `.txt` com os números de carnê de todos os dizimistas ativos.
- **Cadastrar novo dizimista** — mesmo formulário do recadastramento, mas o nº do carnê é sempre
  **gerado automaticamente** ao salvar (nunca digitado pelo admin).
- **Lançar devolução** direto da lista (informando o nº do carnê, ou `-x-` para uma devolução
  avulsa sem dizimista vinculado), sem precisar abrir a ficha da pessoa.
- Toque numa linha abre a ficha completa do dizimista.

### 3.2. Ficha do dizimista (`/pastoral/dizimistas/:numeroCarne`)
- Dados cadastrais completos, badge de status (Ativo/Inativo), avatar com iniciais.
- Cartões: dizimista desde (mês do recadastramento), total devolvido, meses devolvidos no ano,
  meses pendentes no ano.
- Grade do ano com a situação mês a mês.
- Histórico de devoluções agrupado por mês, com **editar** e **excluir** por lançamento.
- **Editar cadastro**, **lançar devolução** e **excluir dizimista** (remove também todo o
  histórico de devoluções e pagamentos vinculados) — com confirmação.

### 3.3. Recadastramentos (`/pastoral/recadastramentos`)
Lista de todo mundo que já passou pelo formulário de recadastramento (quem só existe pela
importação da planilha antiga, sem nunca ter se recadastrado, fica de fora), com **contador
total**, busca por nome/carnê e a data de cada recadastramento. Também permite fazer um
recadastramento manualmente, pelo mesmo formulário usado no site público.

### 3.4. Lançamento de devoluções em lote (`/pastoral/devolucoes/lote`)
Lança a devolução de **vários dizimistas de uma vez**, para o mesmo mês/ano e forma de pagamento:
uma linha por dizimista (nº do carnê + valor), com botão para adicionar várias linhas de uma vez
(até 50 por clique). Ao processar, cada linha é validada individualmente — carnês não encontrados
ou com erro ficam destacados numa lista de falhas, mantidos no formulário para corrigir e
reprocessar sem redigitar tudo.

### 3.5. Lista de devoluções (`/pastoral/devolucoes/lista`)
Todas as devoluções lançadas **num mês específico** (navegação mês a mês), de qualquer dizimista —
inclusive avulsas —, com busca por carnê/nome, total do mês, e **editar**/**excluir** por
lançamento.

### 3.6. Configurações (`/pastoral/configuracoes`)
- **Mínimo de meses ativos**: define quantos meses (dos últimos 6) o dizimista precisa ter
  devolvido para contar como Ativo (ver seção 6.1).
- **Membros da Pastoral**: cadastro de nomes usados no campo "Lançado por" das devoluções (CRUD
  completo — criar, renomear, excluir).

Só Coordenadora e Tesoureiro têm acesso a esta tela (Pastoral do Dízimo não vê o link nem consegue
acessar a URL direto).

---

## 4. Tesouraria (`/tesouraria/...`)

Controle financeiro geral da Capela — não é só sobre dízimo, mas todas as receitas e despesas.
Tem **login e sessão totalmente independentes** da Pastoral (perfis: Coordenadora, Tesoureiro e
**Secretaria Paroquial** — este último só existe aqui): dá para entrar direto em
`/tesouraria/entrar` sem passar pelo Administrativo antes. Quem tenta acessar uma página da
Tesouraria sem sessão ativa é redirecionado ao login e, depois de entrar, volta automaticamente
para a página que queria (inclusive um mês específico, ex.: `/tesouraria/2026-08`). Só o perfil
**Tesoureiro** pode incluir, editar ou excluir — os demais perfis entram em **modo somente
leitura**.

Os dados começam a partir de **agosto de 2026** (`COMPETENCIA_INICIAL_TESOURARIA`) — meses
anteriores não são controlados pelo site.

### 4.1. Painel (`/tesouraria`)
Balancete do mês selecionável (total em receita, total em despesas, saldo) e a lista de todos os
meses controlados, do mais recente ao mais antigo, cada um já com receita/despesa/saldo
calculados — inclusive meses ainda não abertos por ninguém aparecem com totais zerados.

### 4.2. Controle mensal (`/tesouraria/:competencia`, ex. `/tesouraria/2026-08`)
A tela principal de lançamento:
- Cartões de resumo: total de receita, total de despesas, saldo total do mês.
- **Receitas por categoria** (accordion expansível): Dízimo, Oferta, Bazar, Lojinha, Eventos,
  Ação solidária, Doações. A categoria **Dízimo é calculada automaticamente** a partir das
  devoluções lançadas pela Pastoral naquele mês (por forma de pagamento) — nunca é um lançamento
  manual, e nunca duplica ou fica desatualizada se uma devolução for editada/excluída depois.
- **Lista de receitas do mês** (accordion): cada lançamento com data, categoria, forma de
  pagamento, valor e observação (com quebras de linha preservadas) — **lançar**, **editar** e
  **excluir** (as receitas calculadas de dízimo não podem ser editadas/excluídas diretamente, só
  refletem as devoluções).
- **Lista de despesas do mês** (accordion): dia, quem solicitou, empresa/prestador, valor, se está
  **quitada**, se **possui NF-e** (com atalho para copiar a chave de acesso e abrir a consulta
  oficial da Receita), observação. Tem **busca por todos os campos** (prestador, solicitante,
  valor, observação, status) com o total do resultado filtrado. **Lançar**, **editar**, **excluir**.
- **Fechar mês / reabrir mês** — trava o mês contra novos lançamentos (reversível).
- **Gerar PDF** e **Exportar Excel** — relatório completo do mês (resumo, receitas por categoria,
  receitas por forma de pagamento, receitas e despesas detalhadas). O PDF usa o azul de Nossa
  Senhora de Lourdes nos cabeçalhos das tabelas e traz, ao final, os nomes do Tesoureiro,
  Coordenadora e Pároco (sem linha de assinatura — é só identificação).

### 4.3. Evolução (`/tesouraria/evolucao`)
Gráfico de entradas x saídas mês a mês, desde o início do controle da Tesouraria.

### 4.4. Eventos (`/tesouraria/eventos`)
Visão simplificada por evento (nome, data, total arrecadado, despesa, saldo), filtrável por ano,
com cartões de total arrecadado/despesa/saldo do ano selecionado. Criar, editar e excluir eventos.

---

## 5. Papéis de acesso

| Perfil | Entra na Pastoral | Entra na Tesouraria | Vê Configurações | Edita na Tesouraria |
|---|---|---|---|---|
| **Pastoral do Dízimo** | Sim | Não | Não | — |
| **Coordenadora** | Sim | Sim | Sim | Não (só leitura) |
| **Tesoureiro** | Sim | Sim | Sim | Sim |
| **Secretaria Paroquial** | Não | Sim | — | Não (só leitura) |

Coordenadora e Tesoureiro usam a **mesma senha** nos dois logins (é a mesma pessoa, dois portões
diferentes). Cada perfil tem sua própria senha, verificada no navegador via hash SHA-256 (ver
seção 9) — não existe usuário/senha único.

---

## 6. Regras de negócio importantes

### 6.1. Status Ativo / Inativo
Dos últimos 6 meses a partir do mês atual, se o dizimista devolveu em pelo menos **N** deles
(configurável em Configurações, padrão 3), fica **Ativo** — caso contrário, **Inativo**. A janela
nunca recua antes do próprio recadastramento da pessoa no site: quem se cadastrou há menos de 6
meses tem o mínimo exigido reduzido na mesma proporção. Dizimistas que só existem pela importação
da planilha antiga (nunca se recadastraram) contam com a janela cheia de 6 meses, sem limite
inferior.

### 6.2. Meses pendentes
Contagem sempre a partir de **janeiro do ano corrente até o mês atual**, sem exceção por data de
cadastro — mesmo quem se cadastrou em julho tem os meses de janeiro a junho contados como
pendentes, se não foram pagos.

### 6.3. Geração de número de carnê
Números a partir de 500 até 5 dígitos, avançando um contador compartilhado
(`contadores/proximoNumeroCarne`) dentro de uma transação do Firestore — garante que duas pessoas
gerando um número ao mesmo tempo nunca recebam o mesmo, mesmo pulando números já usados por
carnês físicos antigos.

### 6.4. Devolução avulsa
Usa o "carnê" especial `-x-` — não corresponde a nenhum dizimista real, só existe como caminho de
gravação no Firestore. Serve para registrar uma contribuição de quem doou/dizimou sem carnê.

---

## 7. Stack técnica

- **Frontend** (`frontend/`): React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui (Radix) +
  React Router + React Hook Form + Zod + Firebase (Cloud Firestore, client SDK).
- **Backend** (`backend/`): módulos TypeScript reutilizáveis — integração com Mercado Pago e
  Firestore REST — consumidos pelas funções serverless.
- **API** (`api/`): Vercel Serverless Functions (cadastro de dizimista com geração de carnê,
  criação/consulta/webhook de pagamento Pix real).
- **Geração de relatórios**: `jspdf` + `jspdf-autotable` (PDF) e `xlsx` (Excel), no navegador.

### 7.1. Leituras no Firestore
As telas que leem listas grandes (devoluções, dizimistas, controles/eventos da Tesouraria,
configurações, membros da Pastoral) usam um **cache em memória de 60s**
(`frontend/src/lib/cacheLeitura.ts`) — evita repetir a mesma leitura cara quando a pessoa navega
entre telas que pedem os mesmos dados em sequência, invalidado automaticamente a cada gravação.
Consultas que decidem **disponibilidade antes de gravar** (ex.: geração de número de carnê,
checagem de recadastramento existente) nunca passam por esse cache — são sempre lidas ao vivo,
dentro de transações do Firestore, para nunca haver colisão.

---

## 8. Como rodar

```bash
npm install
cp .env.example .env   # preencha com suas credenciais (veja seção 9)
npm run dev
```

## Build de produção

```bash
npm run build
```

Gera o build estático do frontend em `frontend/dist/`. As funções em `api/` são detectadas e
publicadas automaticamente pela Vercel a partir da raiz do repositório — não fazem parte do build
do frontend.

---

## 9. Variáveis de ambiente

Veja `.env.example` na raiz do projeto para a lista completa, com instruções de onde obter cada
valor (Firebase Console e painel de integrações do Mercado Pago). Resumo:

- `VITE_FIREBASE_API_KEY` / `VITE_FIREBASE_PROJECT_ID` — Firestore, no navegador.
- `FIREBASE_PROJECT_ID` — mesmo projeto, usado pelas funções serverless via REST.
- `MERCADOPAGO_ACCESS_TOKEN` / `MERCADOPAGO_WEBHOOK_SECRET` — Pix real (hoje só usado pela tela
  desativada, seção 2.6).
- `VITE_SENHA_PASTORAL_DIZIMO_HASH`, `VITE_SENHA_COORDENADORA_HASH`,
  `VITE_SENHA_TESOUREIRO_HASH`, `VITE_SENHA_SECRETARIA_PAROQUIAL_HASH` — hash SHA-256 da senha de
  cada perfil (gere com `npm run gerar:hash-senha -- "sua-senha"`). Sem a variável definida, cada
  perfil cai numa senha padrão de desenvolvimento — troque antes de divulgar o site.

---

## 10. Scripts utilitários

Todos exigem `FIREBASE_PROJECT_ID` no `.env` da raiz (ou no ambiente) e falam com o Firestore pela
REST API — nenhum precisa de credencial além do projeto (as regras são abertas).

### Importar dizimistas de uma planilha
```bash
npm run importar:dizimistas -- caminho/planilha.csv --dry-run   # confere o mapeamento
npm run importar:dizimistas -- caminho/planilha.csv             # grava (pula carnês já existentes)
npm run importar:dizimistas -- caminho/planilha.csv --sobrescrever
```
Lê a planilha de aniversariantes da Pastoral (blocos por mês, cabeçalhos reconhecidos por
aproximação), grava um documento por carnê em `dizimistas` e trata carnês repetidos (cônjuge/filho
no mesmo número) como uma unidade familiar. Sempre rodar `--dry-run` primeiro. Ao final, ajusta o
contador de próximo carnê para não colidir com os importados.

### Importar devoluções (planilha de controle)
```bash
node scripts/importar-devolucoes.mjs "planilha.csv" --dry-run
node scripts/importar-devolucoes.mjs "planilha.csv"
```
Importa as devoluções de janeiro/fevereiro/março de 2026 a partir da planilha "CONTROLE DEVOLUCAO",
um documento por mês/dizimista com valor lançado. A seção "CARNÊ SOLIDÁRIO" (números que colidem
com outros dizimistas) fica de fora por padrão.

### Normalizar dados existentes
```bash
npm run normalizar:maiusculas -- --dry-run   # mostra o que mudaria
npm run normalizar:maiusculas                # grava
```
Padroniza nomes e campos textuais para MAIÚSCULAS nos registros já gravados. Não altera e-mail,
telefone, CEP, datas, números de carnê nem observações.

### Corrigir ano de nascimento desconhecido
```bash
node scripts/corrigir-ano-nascimento-1999.mjs --dry-run
node scripts/corrigir-ano-nascimento-1999.mjs
```
Cadastros antigos usavam 1999 como "ano desconhecido" — troca para 1700 (visivelmente inválido),
preservando dia/mês (usados no login e nos aniversariantes).

### Verificar competência das devoluções
```bash
node scripts/verificar-competencia-devolucoes.mjs
```
Checagem somente leitura: conta quantas devoluções não têm o campo `competencia` preenchido —
usado para validar com segurança os filtros de leitura por período (seção 7.1).

### Gerar hash de senha
```bash
npm run gerar:hash-senha -- "minha-senha"
```
Gera o SHA-256 em hex de uma senha, para preencher qualquer uma das variáveis
`VITE_SENHA_*_HASH`.

---

## 11. Estrutura do projeto

```text
frontend/
  src/
  ├── components/     # ui/ (shadcn), layout/, forms/, dashboard/, pastoral/
  ├── pages/           # public/, auth/, dizimista/, pastoral/, tesouraria/
  ├── layouts/         # PublicLayout, AuthLayout, DizimistaLayout, PastoralLayout, TesourariaLayout
  ├── routes/          # ProtectedDizimistaRoute, ProtectedAdminRoute, ProtectedTesourariaRoute,
  │                     # ProtegerContraPastoralDizimo
  ├── hooks/           # useDizimistaSessao, useAdminSessao, useTesourariaSessao
  ├── services/        # dizimistaService, devolucaoService, tesourariaService, pagamentoService,
  │                     # configuracaoService, membroPastoralService (Firestore + API)
  ├── lib/             # firebase.ts (init), cacheLeitura.ts (cache de leituras)
  ├── types/           # Dizimista, Devolucao, ControleTesouraria, EntradaTesouraria, SaidaTesouraria,
  │                     # EventoTesouraria, MembroPastoral, PagamentoPix
  └── constants/       # rotas, navegação, papéis de acesso, senhas, categorias, storage

backend/               # módulos TS puros: mercadopago/, firestore/, carne/
api/                    # funções serverless: dizimistas/, mercadopago/
scripts/                # importação/normalização de dados (ver seção 10)
```

---

## 12. Firestore

Coleções principais:

| Coleção | ID do documento | Conteúdo |
|---|---|---|
| `dizimistas` | nº do carnê | Dados cadastrais; subcoleções `pagamentos` e `devolucoes` |
| `tesouraria` | competência (`aaaa-mm`) | Controle mensal — entradas e saídas embutidas no documento |
| `tesourariaEventos` | auto | Eventos (nome, ano, data, arrecadado, despesa) |
| `membrosPastoral` | auto | Nomes usados no campo "Lançado por" |
| `configuracoes` | `geral` | Configurações gerais (mínimo de meses ativos) |
| `contadores` | `proximoNumeroCarne` | Contador do próximo nº de carnê livre a gerar |

As regras (`firestore.rules`) são abertas nesta fase — qualquer cliente lê e grava. Isso é
intencional para agilizar esta etapa do projeto, mas deve ser revisto antes de uma exposição mais
ampla.

**Importante:** o projeto usa deliberadamente só o Cloud Firestore (compatível com o plano
gratuito/Spark do Firebase). Nenhum outro produto — Authentication, Storage, Functions,
Analytics, Hosting — é usado em nenhuma parte do código (frontend, backend ou `api/`); não
habilite nada além do Firestore no console do Firebase.
