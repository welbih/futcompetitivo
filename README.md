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

## Perfil de produção

O Next.js utiliza o perfil `production` automaticamente em `npm run build` e
`npm start`. Não use `npm run dev` para publicar o sistema.

1. Copie `.env.production.example` para `.env.production` e preencha
   `FUTCOMPETITIVO_API_URL` com o endereço real da API. Na hospedagem, você
   também pode definir essa variável diretamente, sem criar o arquivo.
2. Execute `npm ci`, `npm run lint` e `npm run build`.
3. Execute `npm start`. A porta padrão é 3000; para alterar, use
   `npm start -- --port 3001` ou configure `PORT` no ambiente do servidor.

O servidor de produção exige uma URL de API explícita e válida. O endereço é
utilizado apenas no servidor, sem o prefixo `NEXT_PUBLIC_`. Não coloque
credenciais nessa URL. HTTP é permitido para comunicação interna entre serviços;
o endereço público do site deve usar HTTPS, configurado na hospedagem.

Arquivos `.env.production` e `.env.production.local` não são versionados.
Variáveis do ambiente têm prioridade sobre arquivos; `.env.local` também tem
prioridade sobre `.env.production`. Evite levar arquivos locais de desenvolvimento
para a hospedagem. Reinicie o servidor após alterar a configuração.

O perfil mantém as rotas de API dinâmicas, desativa o feedback de desenvolvimento
e remove o cabeçalho `X-Powered-By`. A configuração de banco e o perfil `prod`
da API Java são gerenciados no projeto `futcompetitivo-api`.

## API de campeonatos

A página `/campeonatos/novo` usa `GET /organizacoes`, `GET /jogadores`, `GET /equipes` e
`POST /campeonatos` da API Java. Inicie a API antes de preencher o formulário.
O endereço padrão é `http://localhost:8080`; para alterar, copie `.env.example`
para `.env.local` e ajuste `FUTCOMPETITIVO_API_URL`. Reinicie o Next.js após alterar.
As chamadas passam pelo servidor Next.js para evitar a necessidade de CORS.

A criação envia apenas `organizacaoId`, `edicao` e `participantes` (pares de `jogadorId` e `equipeId`), conforme
`CampeonatoRequest`. Jogo e formato não pertencem a esse contrato. Os cadastros
de organização, jogador e equipe devem existir e estar ativos. A API vincula os participantes ao salvar o campeonato.

