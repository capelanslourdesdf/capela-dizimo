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
2. **"Não sei o número do carnê"** — mostra uma orientação pra procurar a Pastoral do Dízimo
   pessoalmente (evita duplicar o cadastro), com a opção de gerar um número novo mesmo assim (cai
   na opção 3). Não existe mais busca automática por nome aqui — ela lia a coleção inteira de
   dizimistas a cada busca, um custo que cresce com o tamanho da base e não tem como ser evitado
   com uma comparação de texto aproximada (não dá pra fazer no próprio Firestore).
3. **"Cadastrar dizimista sem carnê (gerar um novo)"** — o site gera automaticamente um número de
   carnê ainda livre (a partir de 500, até 5 dígitos) e a pessoa preenche os dados do zero.

O envio grava (ou atualiza, se o carnê já existir) o documento do dizimista. A **primeira** vez
que os dados são salvos marca `recadastradoEm` — essa data é a referência a partir da qual o
dizimista passa a ser cobrado/acompanhado (ver seção 6.1); recadastramentos seguintes não mudam
essa data.

A data de nascimento aceita qualquer ano até o atual, sem limite inferior (a Pastoral às vezes
precisa registrar datas bem antigas, de cópias de registros físicos antigos).

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
   meses (sem perder centavo de arredondamento) ou **o mesmo valor** repetido em cada mês. O campo
   de valor traz chips de sugestão (R$20/30/50/100/200) numa faixa horizontal arrastável — com
   mouse (clicar e arrastar) ou toque — que indica com um degradê quando tem mais opção pra rolar.
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
**Coordenadora** e **Tesoureiro** — mas cada um enxerga (e consegue acessar, mesmo digitando a URL
direto) um recorte diferente das telas. Ver a tabela completa na seção 5.

### 3.1. Dizimistas (`/pastoral`) — tela inicial
- Lista **paginada** (30 dizimistas por página, com "anterior"/"próxima") em vez de trazer a base
  inteira de uma vez — importante em escala de milhares de dizimistas. Busca por nome ou nº do
  carnê roda no próprio Firestore (não mais no navegador): é uma busca por **prefixo** (encontra
  quem o nome ou o carnê **começam** com o termo digitado, não quem contém em qualquer posição) —
  com indicador de carregamento enquanto busca. Filtro por status (Ativo/Inativo/Todos) também
  roda no Firestore, combinável com a busca.
- Cartões de resumo: total de ativos, inativos e total geral. **Coordenadora e Tesoureiro** também
  veem o card de **valor arrecadado no ano** e o bloco expansível **"Total arrecadado por ano"**
  (gráfico de evolução mensal do ano corrente + total de cada ano anterior) — a **Pastoral do
  Dízimo não vê nenhum dos dois**.
- Bloco expansível **"Aniversariantes do mês"**.
- **Exportar ativos** — baixa um `.txt` com os números de carnê de todos os dizimistas ativos.
- **Cadastrar novo dizimista** — mesmo formulário do recadastramento, mas o nº do carnê é sempre
  **gerado automaticamente** ao salvar (nunca digitado pelo admin).
- **Lançar devolução** direto da lista (informando o nº do carnê, ou marcando o checkbox
  "Devolução avulsa" para uma contribuição sem dizimista vinculado), sem precisar abrir a ficha da
  pessoa.
- Toque numa linha abre a ficha completa do dizimista.

O status Ativo/Inativo exibido aqui vem de um campo gravado no próprio dizimista (`status`),
mantido em dia automaticamente — ver seção 6.1.

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

### 3.4. Lançar devolução (`/pastoral/devolucoes/nova`)
Tela dedicada para lançar a devolução de **um único** dizimista — mesmo carnê + formulário usado
nos atalhos das telas acima, só que numa página própria (útil pra quem quer ir direto lançar sem
passar pela lista de dizimistas). Depois de lançar, o formulário limpa e fica pronto pra lançar a
próxima em seguida.

O formulário pede **Data da devolução** (dd/mm/aaaa, não mais "mês/ano") — a competência (mês de
referência, usada no status do dizimista) é calculada automaticamente a partir dela, nunca digitada
à parte. O padrão já vem preenchido com hoje (ou o dia 1 do mês, se a tela já sugeriu outro mês,
como ao lançar a partir da Lista de devoluções de um mês passado). Esse dia também é o que aparece
no calendário de receitas da Tesouraria (seção 4.2, a partir de setembro/2026).

### 3.5. Lançamento de devoluções em lote (`/pastoral/devolucoes/lote`)
Lança a devolução de **vários dizimistas de uma vez**, todos na mesma data e forma de pagamento:
uma linha por dizimista (nº do carnê + valor), com botão para adicionar várias linhas de uma vez
(até 50 por clique). Ao processar, cada linha é validada individualmente — carnês não encontrados
ou com erro ficam destacados numa lista de falhas, mantidos no formulário para corrigir e
reprocessar sem redigitar tudo.

### 3.6. Lista de devoluções (`/pastoral/devolucoes/lista`)
Todas as devoluções lançadas **num mês específico** (navegação mês a mês), de qualquer dizimista —
inclusive avulsas —, com busca por carnê/nome, total do mês, e **editar**/**excluir** por
lançamento.

### 3.7. Configurações (`/pastoral/configuracoes`)
- **Mínimo de meses ativos**: define quantos meses (dos últimos 6) o dizimista precisa ter
  devolvido para contar como Ativo (ver seção 6.1).
- **Membros da Pastoral**: cadastro de nomes usados no campo "Lançado por" das devoluções (CRUD
  completo — criar, renomear, excluir).

Só o Tesoureiro tem acesso a esta tela (Pastoral do Dízimo e Coordenadora não veem o link nem
conseguem acessar a URL direto — ver seção 5.1).

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

Dentro da área da Pastoral, o item "Tesouraria" no menu (atalho para cá) só aparece para
**Coordenadora** e **Tesoureiro** — a Pastoral do Dízimo não vê o atalho (mas, como o login daqui é
separado, ela também não conseguiria entrar mesmo com o link).

### 4.1. Painel (`/tesouraria`)
Balancete do mês selecionável (total em receita, total em despesas, saldo) e a lista de todos os
meses controlados, do mais recente ao mais antigo, cada um já com receita/despesa/saldo
calculados — inclusive meses ainda não abertos por ninguém aparecem com totais zerados. Os valores
de cada mês ficam em colunas de largura fixa (Receita/Despesas/Saldo sempre na mesma posição, mês a
mês), em vez de deslizar conforme o tamanho do número.

### 4.2. Controle mensal (`/tesouraria/:competencia`, ex. `/tesouraria/2026-08`)
A tela principal de lançamento:
- Cartões de resumo: total de receita, total de despesas, saldo total do mês.
- **Receitas por categoria** (accordion expansível): Dízimo, Oferta, Bazar, Lojinha, Eventos,
  Ação solidária, Doações. A categoria **Dízimo é calculada automaticamente** a partir das
  devoluções lançadas pela Pastoral naquele mês (por forma de pagamento) — nunca é um lançamento
  manual, e nunca duplica ou fica desatualizada se uma devolução for editada/excluída depois.
- **Lista de receitas do mês** e **Lista de despesas do mês**: em vez de uma lista corrida, mostram
  um **calendário do mês inteiro** — cada dia com lançamento exibe um resumo (R$ + quantidade),
  verde para receita e vermelho para despesa; dias sem nada ficam apagados e não são clicáveis.
  Clicar num dia abre um **popup** com a lista completa daquele dia (lançar, editar, excluir,
  observação com quebras de linha preservadas). Lançamentos sem dia conhecido (raro, de antes de
  existir esse controle) aparecem numa lista à parte, "Sem data informada".
  - A receita de **Dízimo** aparece no **dia real** de cada devolução a partir de **setembro de
    2026** (quando o lançamento de devolução passou a coletar o dia exato — seção 3.4). O mês de
    **agosto de 2026** é a exceção: como não havia controle de dia nele, o dízimo daquele mês
    continua aparecendo agregado (até 3 lançamentos "Calculado", um por forma de pagamento) no
    **último dia do mês**.
  - Despesas **pendentes** podem ser **selecionadas em lote** (uma a uma ou via "Selecionar todas
    as pendentes", respeitando a busca) e marcadas como **quitadas de uma vez só** — a seleção
    mostra uma lista de conferência (dia, prestador, valor) antes de confirmar, com opção de tirar
    alguma da seleção ali mesmo.
  - Despesas com **NF-e** guardam a chave de acesso, com atalho pra copiar e abrir a consulta
    oficial da Receita.
  - Tem **busca por todos os campos** das despesas (prestador, solicitante, valor, observação,
    status) com o total do resultado filtrado.
- **Fechar mês / reabrir mês** — trava o mês contra novos lançamentos (reversível).
- **Gerar PDF** e **Exportar Excel** — relatório completo do mês (resumo, receitas por categoria,
  receitas por forma de pagamento, receitas e despesas detalhadas). Despesas com NF-e trazem a
  **chave de acesso completa** e um **link clicável** para a consulta oficial da Receita (o PDF traz
  o link no rodapé da seção de despesas; o Excel traz uma coluna própria "Consultar NF-e" com o
  link em cada linha que tiver nota). O PDF usa o azul de Nossa Senhora de Lourdes nos cabeçalhos
  das tabelas e traz, ao final, os nomes do Tesoureiro, Coordenadora e Pároco (sem linha de
  assinatura — é só identificação).

### 4.3. Evolução (`/tesouraria/evolucao`)
Gráfico de entradas x saídas mês a mês, desde o início do controle da Tesouraria.

### 4.4. Eventos (`/tesouraria/eventos`)
Visão simplificada por evento (nome, data, total arrecadado, despesa, saldo), filtrável por ano,
com cartões de total arrecadado/despesa/saldo do ano selecionado. Criar, editar e excluir eventos.

---

## 5. Papéis de acesso

| Perfil | Entra na Pastoral | Entra na Tesouraria | Edita na Tesouraria |
|---|---|---|---|
| **Pastoral do Dízimo** | Sim | Não | — |
| **Coordenadora** | Sim | Sim | Não (só leitura) |
| **Tesoureiro** | Sim | Sim | Sim |
| **Secretaria Paroquial** | Não | Sim | Não (só leitura) |

Coordenadora e Tesoureiro usam a **mesma senha** nos dois logins (é a mesma pessoa, dois portões
diferentes). Cada perfil tem sua própria senha, verificada no navegador via hash SHA-256 (ver
seção 9) — não existe usuário/senha único.

### 5.1. O que cada perfil vê e usa dentro da área da Pastoral

Dentro da própria área da Pastoral, cada perfil tem um recorte diferente do menu — e isso não é só
visual: quem não pode usar uma tela também é barrado se tentar acessar a URL dela direto (redirecionado
de volta para Dizimistas), ver `podeAcessarRotaPastoral` em `constants/papeisAcesso.ts`.

| Tela | Pastoral do Dízimo | Coordenadora | Tesoureiro |
|---|---|---|---|
| Dizimistas (lista + ficha) | Sim | Sim | Sim |
| Lançar devolução | Sim | Não | Sim |
| Lançar devoluções em lote | Sim | Não | Sim |
| Lista de devoluções | Não | Não | Sim |
| Recadastramentos | Não | Não | Sim |
| Configurações | Não | Não | Sim |
| Tesouraria (atalho no menu) | Não | Sim | Sim |

Além disso, dentro de Dizimistas, o **total arrecadado no ano** (card e o bloco "Total arrecadado
por ano") só aparece para Coordenadora e Tesoureiro — a Pastoral do Dízimo não vê esses valores em
nenhum lugar da tela (ver `podeVerTotalArrecadado`, no mesmo arquivo).

---

## 6. Regras de negócio importantes

### 6.1. Status Ativo / Inativo
Dos últimos 6 meses a partir do mês atual, se o dizimista devolveu em pelo menos **N** deles
(configurável em Configurações, padrão 3), fica **Ativo** — caso contrário, **Inativo**. A janela
nunca recua antes do próprio recadastramento da pessoa no site: quem se cadastrou há menos de 6
meses tem o mínimo exigido reduzido na mesma proporção. Dizimistas que só existem pela importação
da planilha antiga (nunca se recadastraram) contam com a janela cheia de 6 meses, sem limite
inferior.

O resultado fica gravado no próprio documento do dizimista (campo `status`), pra a lista de
Dizimistas não precisar reler o histórico de devolução de todo mundo só pra montar a tabela (ver
seção 7.1). Esse campo é mantido de duas formas:
- **Na hora**, sempre que uma devolução daquele dizimista é lançada, editada ou excluída (recalcula
  só a pessoa afetada).
- **1x por dia**, por um Cron da Vercel (`api/cron/recalcular-status.ts`, agendado em `vercel.json`)
  que recalcula todo mundo do zero — pega quem muda de Ativo pra Inativo só pela passagem do tempo
  (ex.: parou de devolver e, meses depois, ninguém mexeu no cadastro dele), caso que a atualização
  "na hora" não cobre sozinha.

A contagem agregada de Ativos/Inativos (mostrada nos cards de Dizimistas) segue o mesmo padrão do
"Total arrecadado por ano" (seção 7.1): um documento (`agregados/statusDizimistas`) mantido por
incremento, não por somar a base inteira a cada carregamento.

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
Pra registrar uma contribuição de quem doou/dizimou sem carnê, quem lança marca o checkbox
"Devolução avulsa" (nas telas de lançamento — seções 3.1, 3.4, 3.5 e 3.6) em vez de informar um
nº de carnê. Por trás, usa o "carnê" especial `000` — puramente numérico de propósito (digitável
no teclado numérico do celular, mais limpo em relatórios/analytics) — que não corresponde a
nenhum dizimista real, só existe como caminho de gravação no Firestore.

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
As telas que leem listas grandes (devoluções, controles/eventos da Tesouraria, configurações,
membros da Pastoral) usam um **cache de 5 minutos** (`frontend/src/lib/cacheLeitura.ts`) — evita
repetir a mesma leitura cara quando a pessoa navega entre telas que pedem os mesmos dados em
sequência, invalidado automaticamente a cada gravação. O cache também é persistido em
`localStorage`: sobrevive a um F5 ou a fechar e reabrir a aba, então quem passa o dia voltando numa
tela que lê uma coleção grande não paga a leitura completa de novo a cada recarregamento — só volta
a ler do Firestore depois que o cache expira, ou na hora, se alguém gravar algo na mesma aba.
Consultas que decidem **disponibilidade antes de gravar** (ex.: geração de número de carnê,
checagem de recadastramento existente) nunca passam por esse cache — são sempre lidas ao vivo,
dentro de transações do Firestore, para nunca haver colisão.

**A tela de Dizimistas é a única que não lê a coleção inteira nem com cache** — em escala de
milhares de dizimistas, isso continuaria crescendo sem limite. Em vez disso:
- A **tabela** é paginada direto no Firestore (`limit`/`startAfter`, 30 por página) — cada
  carregamento de página custa só os documentos daquela página, nunca a base inteira.
- A **busca** também roda como consulta do Firestore, não como filtro no navegador — como o
  Firestore não faz busca por "contém" nativamente, é uma busca por **prefixo** (`where(campo, '>=',
  termo).where(campo, '<=', termo + '\uf8ff')`), a única forma de buscar sem ler a base inteira a
  cada tecla. Combinar o filtro de status com a busca por nome exige um **índice composto**
  (`dizimistas`, campos `status` + `nomeCompleto`, ambos crescentes) — já criado manualmente no
  Firebase Console; se precisar recriar em outro projeto, o próprio erro do Firestore no console do
  navegador traz um link pronto para criá-lo.
- O status **Ativo/Inativo** e o **mês de nascimento** (usado nos aniversariantes) ficam gravados
  em campos do próprio documento (`status`, `mesNascimento`), consultáveis direto — ver seção 6.1
  para como `status` é mantido em dia.
- O card **"Total"** usa uma agregação nativa do Firestore (`getCountFromServer`) — conta os
  documentos sem ler cada um.
- **"Exportar ativos"** é a única ação que ainda lê vários documentos de uma vez (todos os Ativos) —
  aceitável por ser uma ação explícita e ocasional, não algo disparado a cada carregamento da tela.

O **"Total arrecadado por ano"** (tela Dizimistas) também não soma o histórico inteiro a cada
carregamento. Um documento agregado (`agregados/totaisDevolucaoPorAno`) guarda dois mapas —
`totais` (por ano) e `totaisPorMes` (por competência "aaaa-mm", usado no gráfico de evolução
mensal e no calendário de receitas da Tesouraria) — atualizados de forma incremental (`increment()`,
atômico) a cada devolução lançada, editada ou excluída; a tela só lê esse resumo pronto. As demais
leituras da tela (gráfico do ano corrente) ficam limitadas à janela recente, não ao histórico
completo.

### 7.2. Cron diário (Vercel)
Um único job agendado (`api/cron/recalcular-status.ts`, ver `vercel.json` → `crons`) roda 1x por
dia (madrugada, horário de Brasília) e recalcula do zero o `status` e o `mesNascimento` de todos os
dizimistas, além de reconstruir `agregados/statusDizimistas`. É o único mecanismo que pega quem
muda de Ativo pra Inativo só pela passagem do tempo (seção 6.1) — sem gravação nenhuma disparando
isso. Protegido por um token (`CRON_SECRET`, seção 9): a Vercel manda esse token automaticamente
quando a variável está configurada no projeto.

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
- `CRON_SECRET` — protege o endpoint do Cron diário (seção 7.2). Qualquer valor secreto seu;
  configure no painel da Vercel (Settings → Environment Variables). Sem essa variável, o Cron ainda
  funciona (as regras do Firestore já são abertas), só fica sem essa checagem extra.

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

### Migrar devoluções avulsas (histórico — já executado)
```bash
node scripts/migrar-devolucoes-avulsas.mjs --dry-run
node scripts/migrar-devolucoes-avulsas.mjs
```
Move devoluções avulsas gravadas sob o carnê especial antigo (`-x-`) para o atual (`000` — ver
seção 6.4). Já foi rodado em produção; rodar de novo não faz nada (não sobra mais nenhuma sob a
chave antiga), mas o script fica registrado caso surja outro ambiente/base com dados antigos.

### Preencher totais de devolução por ano (histórico — já executado)
```bash
node scripts/preencher-totais-devolucao-por-ano.mjs --dry-run
node scripts/preencher-totais-devolucao-por-ano.mjs
```
Soma o histórico de devoluções já existente (todos os dizimistas + avulsas) e grava o ponto de
partida do agregado `agregados/totaisDevolucaoPorAno` (seção 7.1). Só precisa rodar uma vez — daí
em diante o agregado se mantém sozinho a cada gravação. Já foi rodado em produção; só voltaria a
ser necessário se o agregado for apagado ou zerado por engano.

### Recalcular status, mês de nascimento e agregados (histórico — já executado)
```bash
node scripts/recalcular-status-e-agregados.mjs --dry-run
node scripts/recalcular-status-e-agregados.mjs
```
Mesmo cálculo do Cron diário (seção 7.2), rodado manualmente: recalcula `status` e `mesNascimento`
de todos os dizimistas e reconstrói `agregados/statusDizimistas` e
`agregados/totaisDevolucaoPorAno` (incluindo `totaisPorMes`) a partir do histórico de devoluções já
existente. Só precisa rodar uma vez para estabelecer o ponto de partida — daí em diante o Cron e as
gravações do dia a dia mantêm tudo em dia sozinhos. Já foi rodado em produção; só voltaria a ser
necessário se algum desses agregados for apagado ou corrompido.

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
  ├── components/     # ui/ (shadcn), layout/, forms/, dashboard/ (inclui CalendarioResumoDiario), pastoral/
  ├── pages/           # public/, auth/, dizimista/, pastoral/, tesouraria/
  ├── layouts/         # PublicLayout, AuthLayout, DizimistaLayout, PastoralLayout, TesourariaLayout
  ├── routes/          # ProtectedDizimistaRoute, ProtectedAdminRoute, ProtectedTesourariaRoute,
  │                     # ProtegerRotaPastoral (regra de acesso por papel, seção 5.1)
  ├── hooks/           # useDizimistaSessao, useAdminSessao, useTesourariaSessao
  ├── services/        # dizimistaService, devolucaoService, tesourariaService, pagamentoService,
  │                     # configuracaoService, membroPastoralService, statusAgregadoService (Firestore + API)
  ├── lib/             # firebase.ts (init), cacheLeitura.ts (cache de leituras)
  ├── types/           # Dizimista, Devolucao, ControleTesouraria, EntradaTesouraria, SaidaTesouraria,
  │                     # EventoTesouraria, MembroPastoral, PagamentoPix
  └── constants/       # rotas, navegação, papéis de acesso (inclui regras por tela, seção 5.1), senhas, categorias, storage

backend/               # módulos TS puros: mercadopago/, firestore/, carne/
api/                    # funções serverless: dizimistas/, mercadopago/, cron/ (recálculo diário, seção 7.2)
scripts/                # importação/normalização de dados (ver seção 10)
```

---

## 12. Firestore

Coleções principais:

| Coleção | ID do documento | Conteúdo |
|---|---|---|
| `dizimistas` | nº do carnê | Dados cadastrais (inclui `status` e `mesNascimento`, seção 6.1/7.1); subcoleções `pagamentos` e `devolucoes` (devoluções incluem `data`, o dia exato, a partir de set/2026 — seção 3.4) |
| `tesouraria` | competência (`aaaa-mm`) | Controle mensal — entradas e saídas embutidas no documento |
| `tesourariaEventos` | auto | Eventos (nome, ano, data, arrecadado, despesa) |
| `membrosPastoral` | auto | Nomes usados no campo "Lançado por" |
| `configuracoes` | `geral` | Configurações gerais (mínimo de meses ativos) |
| `contadores` | `proximoNumeroCarne` | Contador do próximo nº de carnê livre a gerar |
| `agregados` | `totaisDevolucaoPorAno` | Total de devoluções por ano e por mês (`totais`, `totaisPorMes`), mantido incrementalmente (seção 7.1) |
| `agregados` | `statusDizimistas` | Contagem de Ativos/Inativos, mantida incrementalmente e recalculada 1x/dia (seção 6.1/7.2) |

As regras (`firestore.rules`) são abertas nesta fase — qualquer cliente lê e grava. Isso é
intencional para agilizar esta etapa do projeto, mas deve ser revisto antes de uma exposição mais
ampla.

**Importante:** o projeto usa deliberadamente só o Cloud Firestore (compatível com o plano
gratuito/Spark do Firebase). Nenhum outro produto — Authentication, Storage, Functions,
Analytics, Hosting — é usado em nenhuma parte do código (frontend, backend ou `api/`); não
habilite nada além do Firestore no console do Firebase.
