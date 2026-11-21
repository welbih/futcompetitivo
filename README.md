# Futcompetitivo

Projeto com Next.js, React, TypeScript e Tailwind CSS.

## Desenvolvimento

```sh
npm install
npm run dev
```

Abra http://localhost:3000.

## Atualizações ao vivo dos campeonatos

A página individual mantém uma conexão `EventSource` com
`/api/campeonatos/{id}/eventos`. O proxy encaminha o SSE público usando
`FUTCOMPETITIVO_API_URL`, sem expor credenciais nem aplicar o timeout de 15 segundos
das consultas JSON. Não há nova variável obrigatória.

Os eventos `conectado` e `campeonato-atualizado` provocam uma consulta completa do
campeonato, incluindo classificação atual, resultados e chaveamento. Ao reconectar,
os dados são sincronizados novamente: o backend não oferece replay de eventos.
A exclusão encerra a conexão e mostra a opção de voltar à listagem. A conexão
também é encerrada ao sair da página.

O backend atual exige **uma única réplica**, pois distribui os eventos em memória.
Proxies/CDNs devem permitir streaming sem cache ou buffering. Limites de duração
das funções de hospedagem podem encerrar o stream; a tela tenta reconectar e
sincroniza os dados novamente. Confirme a entrega imediata dos eventos e heartbeats
na implantação.

Testes da integração e dos fluxos administrativos:

```sh
node --test tests/championship-live.test.mjs tests/championship-management.test.mjs
```

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

### Variáveis de autenticação na Vercel

Em Settings → Environment Variables do projeto, configure as variáveis para os
ambientes desejados (Production, Preview e Development) e faça um novo deploy.

| Variável | Valor |
| --- | --- |
| `FUTCOMPETITIVO_API_URL` | Endereço público do backend, por exemplo `https://api.seu-dominio.com` |
| `FUTCOMPETITIVO_CLIENT_ID` | Mesmo valor de `CLIENT_ID` do backend |
| `FUTCOMPETITIVO_CLIENT_SECRET` | Mesmo valor de `CLIENT_SECRET` do backend, marcado como Sensitive na Vercel |

As credenciais são privadas do servidor Next.js. Mantenha os nomes sem
`NEXT_PUBLIC_`. Para desenvolvimento local, preencha `.env.local` usando
`.env.example` como referência. Informe as duas credenciais juntas.

O backend atual autentica o cliente via HTTP Basic em
`FUTCOMPETITIVO_API_URL/oauth2/token`, usando
`grant_type=urn:futcompetitivo:params:oauth:grant-type:password` e as credenciais
do usuário. A opção Entrar no menu da Arena abre a modal de login. Após entrar,
o menu exibe o primeiro nome e a opção Sair, que chama `/auth/logout` no backend.
O token é mantido em cookie HttpOnly até sua expiração e enviado pelo servidor
Next.js nas chamadas à API. `JWT_JWK` e `JWT_ISSUER` são configurações do backend.

A página `/campeonatos/novo` usa `GET /organizacoes`, `GET /jogadores`, `GET /equipes` e
`POST /campeonatos` da API Java. Inicie a API antes de preencher o formulário.
O endereço padrão é `http://localhost:8080`; para alterar, copie `.env.example`
para `.env.local` e ajuste `FUTCOMPETITIVO_API_URL`. Reinicie o Next.js após alterar.
As chamadas passam pelo servidor Next.js para evitar a necessidade de CORS.

A criação envia apenas `organizacaoId`, `edicao` e `participantes` (pares de `jogadorId` e `equipeId`), conforme
`CampeonatoRequest`. Jogo e formato não pertencem a esse contrato. Os cadastros
de organização, jogador e equipe devem existir e estar ativos. A API vincula os participantes ao salvar o campeonato.

## X1

A página `/x1`, disponível em Sua Arena, lista e cria confrontos pessoais entre
dois participantes, cada um formado por jogador e equipe ativos, nos formatos
melhor de 3 e melhor de 5. Permite acompanhar
as partidas, registrar ou editar resultados, manter empates sem pênaltis,
desempatar opcionalmente por pênaltis e encerrar
a série antecipadamente após atingir a maioria das vitórias.

A integração utiliza `GET /x1`, `GET /x1/{id}`, `POST /x1`,
`PUT /x1/{id}/partidas/{partidaId}/resultado` e `POST /x1/{id}/encerrar`,
com chamadas intermediadas pelas rotas `/api/x1` do Next.js. O mando alternado,
a ordem das partidas, o vencedor e os cancelamentos são definidos pela API Java.

A criação envia `participanteUm` e `participanteDois`, cada um com `jogadorId`
e `equipeId`, além de `tipo` e `encerrarAntecipadamente`. Os jogadores devem
ser diferentes; ambos podem escolher a mesma equipe. As respostas retornam
os participantes com `jogador` e `equipe`, incluindo mandante, visitante e vencedor,
e os placares da série em `vitoriasParticipanteUm` e `vitoriasParticipanteDois`.
Empates sem disputa de pênaltis enviam ambos os campos de pênaltis como `null`
e não somam vitória. Se houver disputa, os dois placares devem ser preenchidos
e diferentes. Uma série finalizada com o mesmo número de vitórias termina
empatada, sem vencedor. Essas regras também devem estar na API Java em execução.

