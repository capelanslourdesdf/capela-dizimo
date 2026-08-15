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
- **Área do dizimista** (login por nº do carnê + data de nascimento): consulta do carnê e dos
  pagamentos do mês, atualização cadastral e pagamento via Pix (Mercado Pago).
- **Área da Pastoral** (login fixo via variável de ambiente): lista/busca de dizimistas, cadastro
  de novos dizimistas e lançamento de devolução avulsa (valor, forma de pagamento e data).

## Stack

- **Frontend** (`frontend/`): React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui + React
  Router + Firebase (Firestore).
- **Backend** (`backend/`): módulos TypeScript reutilizáveis — integração com Mercado Pago e
  Firestore REST — consumidos pelas funções serverless.
- **API** (`api/`): Vercel Serverless Functions (login do admin, cadastro com geração de carnê,
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

backend/              # módulos TS puros: mercadopago/, firestore/, carne/, admin/
api/                   # funções serverless: admin/, dizimistas/, mercadopago/
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
