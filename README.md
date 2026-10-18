# Futcompetitivo

Projeto com Next.js, React, TypeScript e Tailwind CSS.

## Desenvolvimento

```sh
npm install
npm run dev
```

Abra http://localhost:3000.

## Verificação e produção

```sh
npm run lint
npm run build
npm start
```

O comando `npm start` exige uma compilação prévia com `npm run build`.

## API de campeonatos

A página `/campeonatos/novo` usa `GET /organizacoes`, `GET /jogadores`, `GET /equipes` e
`POST /campeonatos` da API Java. Inicie a API antes de preencher o formulário.
O endereço padrão é `http://localhost:8080`; para alterar, copie `.env.example`
para `.env.local` e ajuste `FUTCOMPETITIVO_API_URL`. Reinicie o Next.js após alterar.
As chamadas passam pelo servidor Next.js para evitar a necessidade de CORS.

A criação envia apenas `organizacaoId`, `edicao` e `participantes` (pares de `jogadorId` e `equipeId`), conforme
`CampeonatoRequest`. Jogo e formato não pertencem a esse contrato. Os cadastros
de organização, jogador e equipe devem existir e estar ativos. A API vincula os participantes ao salvar o campeonato.

