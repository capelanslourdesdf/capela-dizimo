# Meu Dízimo Digital

Plataforma web da **Pastoral do Dízimo da Capela Nossa Senhora de Lourdes**, mobile-first, para
recadastramento de dizimistas, cadastro de novos dizimistas, consulta de carnê/pagamentos e
pagamento via Pix.

Nesta fase, apenas as funcionalidades abaixo estão ativas — o restante do domínio (famílias,
metas, relatórios, pendências, outras formas de pagamento etc.) fica propositalmente fora do ar.

## Funcionalidades ativas

- **Recadastramento** (`/recadastramento`, público): dizimistas já existentes informam o número
  do carnê e atualizam nome, data de nascimento, endereço, telefone, e-mail (opcional), cônjuge e
  até 4 filhos.
- **Cadastro pelo admin**: no painel da Pastoral, cadastro de dizimista novo com os mesmos campos,
  exceto o nº do carnê, que é gerado automaticamente ao salvar.
- **Área do dizimista** (login por nº do carnê + dia/mês de nascimento — a planilha de origem não
  tem o ano): consulta do carnê e dos pagamentos do mês, atualização cadastral e pagamento via Pix
  (Mercado Pago).
- **Área da Pastoral** (login fixo, usuário e hash da senha verificados no navegador — ver
  `frontend/src/constants/adminAuth.ts`): lista/busca de dizimistas, exclusão de dizimista,
  cadastro de novos dizimistas e lançamento de devolução avulsa (valor, forma de pagamento e
  data).

## Stack

- **Frontend** (`frontend/`): React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui + React
  Router + Firebase (Firestore).
- **Backend** (`backend/`): módulos TypeScript reutilizáveis — integração com Mercado Pago e
  Firestore REST — consumidos pelas funções serverless.
- **API** (`api/`): Vercel Serverless Functions (cadastro de dizimista com geração de carnê,
  criação/consulta/webhook de pagamento Pix).

## Como rodar

```bash
npm install
cp .env.example .env   # preencha com suas credenciais (veja abaixo)
npm run dev
```

## Build de produção

```bash
npm run build
```

Gera o build estático do frontend em `frontend/dist/`. As funções em `api/` são detectadas e
publicadas automaticamente pela Vercel a partir da raiz do repositório — não fazem parte do build
do frontend.

## Importar dizimistas de uma planilha

Para carregar de uma vez os dizimistas que já existem em uma planilha `.xlsx` ou `.csv`:

```bash
npm run importar:dizimistas -- caminho/planilha.csv --dry-run   # confere o mapeamento
npm run importar:dizimistas -- caminho/planilha.csv             # grava (pula carnês já existentes)
npm run importar:dizimistas -- caminho/planilha.csv --sobrescrever
```

CSV exportado do Excel costuma vir com separador `;` e em Windows-1252 — o script detecta os dois
automaticamente, preservando a acentuação.

Cada linha vira um documento em `dizimistas` com o **nº do carnê como ID** — o mesmo formato do
app. Os importados já aparecem na listagem da Pastoral e, se a pessoa se recadastrar depois, o
registro é **atualizado** (não duplicado).

Formato suportado — o mesmo da planilha de aniversariantes da Pastoral, dividida em blocos por mês
(vários blocos podem estar empilhados na mesma aba e/ou espalhados em várias abas; o script varre
todas):

```text
ANIVERSARIANTES DO MÊS DE JANEIRO
NUMERO | NOME                  | DATA NASC. | TELEFONE
369    | MARIA SOARES RIBEIRO  | 1          | (61) 99119-7827
```

Como a coluna `DATA NASC.` traz **apenas o dia**, o mês é lido do título do bloco. O **ano não
existe** nessa planilha — por isso cada registro é gravado com `diaMesNascimento` (`dd/mm`), que é
o campo conferido no login. Quando a pessoa se recadastra informando a data completa, o registro
passa a ter também `dataNascimento`.

Os cabeçalhos são reconhecidos por aproximação (ignora acentos/maiúsculas): `NUMERO`/`Carnê`,
`NOME`, `DATA NASC.`, `TELEFONE`, além de colunas extras opcionais como `Endereço`, `Bairro`,
`Cidade`, `UF`, `E-mail`, `Cônjuge`, `Filho 1` etc., caso um dia existam. Datas completas também
são aceitas (`dd/mm/aaaa`, `aaaa-mm-dd` ou data do Excel). Colunas obrigatórias: **número do
carnê** e **nome**.

### Carnês com mais de uma pessoa

Na planilha o mesmo carnê aparece mais de uma vez quando há cônjuge ou filho — às vezes com `*`
(`394*`), às vezes só com anotação no nome (`(CONJUGE JOSILDO)`, `(ESPOSO)`, `(Filha NADIR)`).
Como **o carnê é o ID do documento**, ele é tratado como uma *unidade familiar*: a primeira linha
sem `*` e sem anotação vira o titular, e as demais entram como cônjuge/familiares dele. O login
aceita o dia/mês de **qualquer membro** daquele carnê.

Quando não há anotação de parentesco (ex.: o mesmo carnê com dois nomes sem qualquer indicação), o
script não tem como afirmar o vínculo: entra como familiar e é marcado no relatório com
`[parentesco não declarado — revisar]`, para a Pastoral conferir depois.

Sempre rode primeiro com `--dry-run`: ele mostra o dia/mês interpretado de cada linha, os
agrupamentos por carnê, o JSON do primeiro registro e avisa sobre linhas inválidas e registros sem
nascimento (sem ele a pessoa não consegue *entrar* no site, mas ainda consegue se recadastrar).

Ao final, o script ajusta o contador `contadores/proximoNumeroCarne` para ficar acima do maior
carnê importado, evitando colisão com os carnês gerados automaticamente pela Pastoral.

## Variáveis de ambiente

Veja `.env.example` na raiz do projeto para a lista completa, com instruções de onde obter cada
valor (Firebase Console e painel de integrações do Mercado Pago).

## Estrutura do projeto

```text
frontend/            # aplicação Vite (UI)
  src/
  ├── components/     # ui/, layout/, forms/, dashboard/, pastoral/
  ├── pages/          # public/, auth/, dizimista/, pastoral/
  ├── layouts/        # PublicLayout, AuthLayout, DizimistaLayout, PastoralLayout
  ├── routes/         # ProtectedDizimistaRoute, ProtectedAdminRoute
  ├── hooks/          # useDizimistaSessao, useAdminSessao
  ├── services/       # dizimistaService, pagamentoService, devolucaoService (Firestore + API)
  ├── types/          # Dizimista, PagamentoPix, Devolucao
  └── constants/       # rotas, navegação, storage

backend/              # módulos TS puros: mercadopago/, firestore/, carne/
api/                   # funções serverless: dizimistas/, mercadopago/
```

## Firestore

Coleção `dizimistas` (documento por dizimista, ID = nº do carnê), com subcoleções
`pagamentos` e `devolucoes`. As regras (`firestore.rules`) são abertas nesta fase — qualquer
cliente lê e grava. Isso é intencional para agilizar esta etapa do projeto, mas deve ser revisto
antes de uma exposição mais ampla.

**Importante:** o projeto usa deliberadamente só o Cloud Firestore (compatível com o plano
gratuito/Spark do Firebase). Nenhum outro produto — Authentication, Storage, Functions,
Analytics, Hosting — é usado em nenhuma parte do código (frontend, backend ou `api/`); não
habilite nada além do Firestore no console do Firebase.
