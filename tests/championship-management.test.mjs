import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file, imports = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, Response, URL, require: path => {
    for (const [suffix, value] of Object.entries(imports)) if (path.endsWith(suffix)) return value;
    throw new Error(`Unexpected import: ${path}`);
  } });
  return exports;
}

function proxy(file, denied = false) {
  const calls = [];
  const route = load(file, {
    "campeonatos/partial-schedule": load("app/campeonatos/partial-schedule.ts"),
    "campeonatos/manual-ties": load("app/campeonatos/manual-ties.ts"),
    "auth/admin": { requireAdmin: async () => denied ? Response.json({}, { status: 403 }) : null },
    upstream: { championshipRequest: async (id, init, action) => {
      calls.push({ id, action, body: init?.body ? JSON.parse(init.body) : undefined });
      return Response.json({ id: Number(id) });
    } },
  });
  return { route, calls };
}
const context = { params: Promise.resolve({ id: "7", participanteId: "42" }) };
const request = body => new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("mata-mata forwards manual replacements and rejects duplicates", async () => {
  const { route, calls } = proxy("app/api/campeonatos/[id]/mata-mata/route.ts");
  assert.equal((await route.POST(request({ substituicoes: [{ desistenteId: 42, substitutoId: 43 }] }), context)).status, 200);
  assert.deepEqual(calls[0], { id: "7", action: "/mata-mata", body: { substituicoes: [{ desistenteId: 42, substitutoId: 43 }] } });
  assert.equal((await route.POST(request({ substituicoes: [{ desistenteId: 42, substitutoId: 43 }, { desistenteId: 44, substitutoId: 43 }] }), context)).status, 400);
  assert.equal((await route.POST(request({ substituicoes: [] }), context)).status, 200);
  assert.equal(calls.length, 2);
});

test("new management routes reject non-admin requests without calling upstream", async () => {
  for (const [file, method] of [["mata-mata/route.ts", "POST"], ["mata-mata/vagas/route.ts", "GET"], ["participantes/[participanteId]/desistir/route.ts", "POST"]]) {
    const { route, calls } = proxy(`app/api/campeonatos/[id]/${file}`, true);
    assert.equal((await route[method](request({}), context)).status, 403);
    assert.equal(calls.length, 0);
  }
});

test("withdrawal uses participant ID and rejects invalid IDs", async () => {
  const { route, calls } = proxy("app/api/campeonatos/[id]/participantes/[participanteId]/desistir/route.ts");
  assert.equal((await route.POST(request({}), context)).status, 200);
  assert.equal(calls[0].action, "/participantes/42/desistir");
  assert.equal((await route.POST(request({}), { params: Promise.resolve({ id: "7", participanteId: "0" }) })).status, 400);
  assert.equal(calls.length, 1);
});

test("all knockout formats and bronze option reach both start endpoints", async () => {
  for (const file of ["app/api/campeonatos/[id]/iniciar/route.ts", "app/api/campeonatos/[id]/iniciar/grupos/route.ts"]) {
    const { route, calls } = proxy(file);
    for (const formatoEliminatorio of ["JOGO_UNICO", "IDA_E_VOLTA", "IDA_E_VOLTA_FINAL_UNICA"]) {
      const body = { formato: "GRUPOS", grupoA: [1, 2, 5], grupoB: [3, 4, 6], quantidadeClassificados: 4, turnoEreturno: true, formatoEliminatorio, disputaTerceiroLugar: true };
      assert.equal((await route.POST(request(body), context)).status, 200);
      assert.equal(calls.at(-1).body.formatoEliminatorio, formatoEliminatorio);
      assert.equal(calls.at(-1).body.disputaTerceiroLugar, true);
    }
    assert.equal((await route.POST(request({ formato: "GRUPOS", grupoA: [1, 2, 5], grupoB: [3, 4, 6], quantidadeClassificados: 4, turnoEreturno: false, formatoEliminatorio: "INVALIDO" }), context)).status, 400);
  }
});

test("withdrawal overrides a previous aggregate lead without changing played scores", () => {
  const { winner } = load("app/campeonatos/[id]/knockout-winner.ts");
  const home = { id: 1 }, away = { id: 2 };
  const tie = { tipo: "IDA_E_VOLTA", partidas: [
    { mandante: home, visitante: away, status: "FINALIZADA", resultado: { golsMandante: 8, golsVisitante: 0 } },
    { mandante: away, visitante: home, status: "FINALIZADA", wo: true, resultado: { golsMandante: 3, golsVisitante: 0 } },
  ] };
  assert.equal(winner(tie).id, 1);
  assert.equal(winner(tie, [1]).id, 2);
  assert.equal(winner(tie, [1, 2]), null);
  assert.equal(tie.partidas[0].resultado.golsMandante, 8);
});

test("manual ties require the full eligible set, correct bracket size and valid byes", () => {
  const { validManualTies } = load("app/campeonatos/manual-ties.ts");
  const five = [{ mandanteId: 1, visitanteId: 2 }, { mandanteId: 3, visitanteId: null }, { mandanteId: null, visitanteId: 4 }, { mandanteId: 5, visitanteId: null }];
  assert.equal(validManualTies(five, [1, 2, 3, 4, 5]), true);
  assert.equal(validManualTies(five, [1, 2, 3, 4, 6]), false);
  assert.equal(validManualTies(five.slice(0, 3)), false);
  assert.equal(validManualTies([{ mandanteId: 1, visitanteId: 1 }, { mandanteId: 2, visitanteId: 3 }]), false);
  assert.equal(validManualTies([...five, { mandanteId: null, visitanteId: null }]), false);
  assert.equal(validManualTies([]), false);
});

test("manual knockout start forwards order, home advantage and byes", async () => {
  const { route, calls } = proxy("app/api/campeonatos/[id]/iniciar/eliminatorio/manual/route.ts");
  const ties = [{ mandanteId: 1, visitanteId: 2 }, { mandanteId: 3, visitanteId: null }, { mandanteId: null, visitanteId: 4 }, { mandanteId: 5, visitanteId: null }];
  assert.equal((await route.POST(request({ confrontosPrimeiraRodada: ties, formatoEliminatorio: "IDA_E_VOLTA_FINAL_UNICA", disputaTerceiroLugar: true }), context)).status, 200);
  assert.deepEqual(calls[0].body.confrontosPrimeiraRodada, ties);
  assert.equal(calls[0].action, "/iniciar/eliminatorio/manual");
  assert.equal((await route.POST(request({ confrontosPrimeiraRodada: [] }), context)).status, 400);
  const denied = proxy("app/api/campeonatos/[id]/iniciar/eliminatorio/manual/route.ts", true);
  assert.equal((await denied.route.POST(request({ confrontosPrimeiraRodada: ties }), context)).status, 403);
  assert.equal(denied.calls.length, 0);
});

test("qualified knockout accepts manual ties together with replacements", async () => {
  const { route, calls } = proxy("app/api/campeonatos/[id]/mata-mata/route.ts");
  const ties = [{ mandanteId: 43, visitanteId: 2 }, { mandanteId: 3, visitanteId: 4 }];
  const body = { confrontosPrimeiraRodada: ties, substituicoes: [{ desistenteId: 42, substitutoId: 43 }] };
  assert.equal((await route.POST(request(body), context)).status, 200);
  assert.deepEqual(calls[0].body, body);
  assert.equal((await route.POST(request({ confrontosPrimeiraRodada: [] }), context)).status, 400);
});

test("generation preference is forwarded by every start route without overriding defaults", async () => {
  const configs = [
    ["app/api/campeonatos/[id]/iniciar/route.ts", { formato: "GRUPOS", quantidadeClassificados: 4, turnoEreturno: false }],
    ["app/api/campeonatos/[id]/iniciar/grupos/route.ts", { grupoA: [1, 2, 5], grupoB: [3, 4, 6], quantidadeClassificados: 4, turnoEreturno: false }],
    ["app/api/campeonatos/[id]/iniciar/eliminatorio/manual/route.ts", { confrontosPrimeiraRodada: [{ mandanteId: 1, visitanteId: 2 }, { mandanteId: 3, visitanteId: 4 }] }],
  ];
  for (const [file, body] of configs) {
    const { route, calls } = proxy(file);
    for (const mode of ["AUTOMATICA", "ALEATORIA"]) {
      assert.equal((await route.POST(request({ ...body, formaGeracaoMataMata: mode }), context)).status, 200);
      assert.equal(calls.at(-1).body.formaGeracaoMataMata, mode);
      if (body.confrontosPrimeiraRodada) assert.deepEqual(calls.at(-1).body.confrontosPrimeiraRodada, body.confrontosPrimeiraRodada);
    }
    for (const missing of [{}, { formaGeracaoMataMata: null }]) {
      assert.equal((await route.POST(request({ ...body, ...missing }), context)).status, 200);
      assert.equal(Object.hasOwn(calls.at(-1).body, "formaGeracaoMataMata"), false);
    }
    assert.equal((await route.POST(request({ ...body, formaGeracaoMataMata: "INVALIDA" }), context)).status, 400);
  }
});

test("generation preference is rejected in formats without knockout", async () => {
  const { route, calls } = proxy("app/api/campeonatos/[id]/iniciar/route.ts");
  assert.equal((await route.POST(request({ formato: "LIGA", turnoEreturno: false, formaGeracaoMataMata: "ALEATORIA" }), context)).status, 400);
  assert.equal((await route.POST(request({ formato: "LIGA_PARCIAL", jogosPorParticipante: 3, formaGeracaoMataMata: "AUTOMATICA" }), context)).status, 400);
  assert.equal(calls.length, 0);
});

test("multiple manual groups preserve composition and enforce minimum size and unique IDs", async () => {
  const { route, calls } = proxy("app/api/campeonatos/[id]/iniciar/grupos/route.ts");
  const body = { grupos: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], quantidadeClassificados: 8 };
  assert.equal((await route.POST(request(body), context)).status, 200);
  assert.deepEqual(calls[0].body.grupos, body.grupos);
  assert.equal(calls[0].body.turnoEreturno, false);
  for (const invalid of [
    { ...body, grupos: [[1, 2], [3, 4, 5]] },
    { ...body, grupos: [[1, 2, 3], [3, 4, 5]] },
    { ...body, grupoA: [1, 2, 3], grupoB: [4, 5, 6] },
    { ...body, quantidadeGrupos: 3 },
    { ...body, grupos: [[1, 2, 3]] },
    { ...body, quantidadeClassificados: 10 },
  ]) assert.equal((await route.POST(request(invalid), context)).status, 400);
  assert.equal(calls.length, 1);
});

test("automatic group count is forwarded only for group championships", async () => {
  const { route, calls } = proxy("app/api/campeonatos/[id]/iniciar/route.ts");
  const body = { formato: "GRUPOS", quantidadeGrupos: 4, quantidadeClassificados: 8, turnoEreturno: false };
  assert.equal((await route.POST(request(body), context)).status, 200);
  assert.equal(calls[0].body.quantidadeGrupos, 4);
  for (const quantidadeGrupos of [1, 2.5, "3"]) assert.equal((await route.POST(request({ ...body, quantidadeGrupos }), context)).status, 400);
  assert.equal((await route.POST(request({ ...body, formato: "MISTA" }), context)).status, 400);
});

const schedule = [
  { partidas: [{ mandanteId: 1, visitanteId: 2 }, { mandanteId: 3, visitanteId: 4 }] },
  { partidas: [{ mandanteId: 1, visitanteId: 3 }, { mandanteId: 2, visitanteId: 4 }] },
  { partidas: [{ mandanteId: 1, visitanteId: 4 }, { mandanteId: 2, visitanteId: 3 }] },
];

test("partial schedule enforces total games, membership, pairings and round conflicts", () => {
  const { validPartialSchedule: valid } = load("app/campeonatos/partial-schedule.ts");
  assert.equal(valid(schedule, 3, [1, 2, 3, 4]), true);
  assert.equal(valid(schedule, 3, [1, 2, 3, 5]), false);
  assert.equal(valid(schedule.slice(0, 2), 3), false);
  assert.equal(valid([...schedule, schedule[0]], 3), false);
  assert.equal(valid([{ partidas: [{ mandanteId: 1, visitanteId: 2 }, { mandanteId: 1, visitanteId: 3 }] }], 3), false);
  assert.equal(valid([{ partidas: [{ mandanteId: 1, visitanteId: null }] }], 3), false);
});

test("partial mixed start supports automatic and admin-defined schedules", async () => {
  const config = { formato: "MISTA_PARCIAL", jogosPorParticipante: 3, quantidadeClassificados: 4, formatoEliminatorio: "IDA_E_VOLTA", formaGeracaoMataMata: "ALEATORIA" };
  const auto = proxy("app/api/campeonatos/[id]/iniciar/route.ts");
  assert.equal((await auto.route.POST(request(config), context)).status, 200);
  assert.equal(auto.calls[0].body.jogosPorParticipante, 3);
  assert.equal(auto.calls[0].body.formato, "MISTA_PARCIAL");
  assert.equal((await auto.route.POST(request({ ...config, turnoEreturno: true }), context)).status, 400);
  const manual = proxy("app/api/campeonatos/[id]/iniciar/liga-parcial/manual/route.ts");
  assert.equal((await manual.route.POST(request({ configuracao: config, rodadas: schedule }), context)).status, 200);
  assert.deepEqual(manual.calls[0].body.rodadas, schedule);
  assert.equal((await manual.route.POST(request({ configuracao: config, rodadas: schedule.slice(0, 2) }), context)).status, 400);
  const denied = proxy("app/api/campeonatos/[id]/iniciar/liga-parcial/manual/route.ts", true);
  assert.equal((await denied.route.POST(request({ configuracao: config, rodadas: schedule }), context)).status, 403);
});
