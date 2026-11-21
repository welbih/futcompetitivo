import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const flush = () => new Promise(resolve => setImmediate(resolve));
function load(file, globals) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, ...globals });
  return exports;
}
function setup(fetcher) {
  const sources = [], data = [], status = [], errors = [], timers = new Set();
  let removed = 0, calls = 0;
  class Source {
    static OPEN = 1; static CLOSED = 2;
    readyState = 1; listeners = {};
    constructor(url) { this.url = url; sources.push(this); }
    addEventListener(type, listener) { this.listeners[type] = listener; }
    emit(type, campeonatoId = 7) { this.listeners[type]?.({ data: JSON.stringify({ campeonatoId }) }); }
    close() { this.readyState = 2; }
  }
  const { watchChampionship } = load("app/campeonatos/[id]/championship-live.ts", {
    AbortController, EventSource: Source,
    fetch: (...args) => { calls++; return fetcher ? fetcher(...args) : Promise.resolve(Response.json({ id: 7, version: calls })); },
    setTimeout: fn => { timers.add(fn); return fn; }, clearTimeout: fn => timers.delete(fn),
  });
  const watcher = watchChampionship("7", { data: value => data.push(value), status: value => status.push(value), error: value => errors.push(value), removed: () => removed++ });
  return { watcher, sources, data, status, errors, timers, calls: () => calls, removed: () => removed };
}

test("one stream synchronizes connect, updates and reconnections, ignoring other championships", async () => {
  const ctx = setup(); await flush();
  assert.equal(ctx.sources.length, 1);
  assert.equal(ctx.calls(), 1);
  ctx.sources[0].emit("campeonato-atualizado", 8); await flush();
  assert.equal(ctx.calls(), 1);
  ctx.sources[0].emit("conectado"); await flush();
  ctx.sources[0].emit("campeonato-atualizado"); await flush();
  ctx.sources[0].emit("conectado"); await flush();
  assert.equal(ctx.calls(), 4);
  assert.equal(ctx.data.length, 4);
  ctx.watcher.close();
  assert.equal(ctx.sources[0].readyState, 2);
});

test("events arriving during a GET trigger a second authoritative fetch", async () => {
  let resolve;
  const ctx = setup(() => new Promise(done => { resolve = done; }));
  ctx.sources[0].emit("campeonato-atualizado");
  ctx.sources[0].emit("campeonato-atualizado");
  assert.equal(ctx.calls(), 1);
  resolve(Response.json({ id: 7, version: 1 })); await flush();
  assert.equal(ctx.calls(), 2);
  resolve(Response.json({ id: 7, version: 2 })); await flush();
  assert.equal(ctx.data.at(-1).version, 2);
  ctx.watcher.close();
});

test("late GET cannot overwrite a local mutation", async () => {
  let resolve;
  const ctx = setup(() => new Promise(done => { resolve = done; }));
  ctx.watcher.update({ id: 7, version: 2 });
  resolve(Response.json({ id: 7, version: 1 })); await flush();
  assert.equal(ctx.data.length, 1);
  assert.equal(ctx.data[0].version, 2);
  resolve(Response.json({ id: 7, version: 3 })); await flush();
  assert.equal(ctx.data.at(-1).version, 3);
  ctx.watcher.close();
});

test("deletion event and missed deletion via HTTP 404 close the stream", async () => {
  const ctx = setup(); await flush();
  ctx.sources[0].emit("campeonato-excluido");
  assert.equal(ctx.removed(), 1);
  assert.equal(ctx.sources[0].readyState, 2);
  const missing = setup(() => Promise.resolve(Response.json({}, { status: 404 }))); await flush();
  assert.equal(missing.removed(), 1);
  assert.equal(missing.sources[0].readyState, 2);
});

test("terminal stream errors schedule reconnect and cleanup cancels retries", async () => {
  const ctx = setup(); await flush();
  ctx.sources[0].readyState = 2; ctx.sources[0].onerror(); await flush();
  assert.equal(ctx.status.includes("reconnecting"), true);
  assert.equal(ctx.timers.size, 1);
  for (const fn of ctx.timers) { ctx.timers.delete(fn); fn(); }
  assert.equal(ctx.sources.length, 2);
  ctx.watcher.close();
  assert.equal(ctx.timers.size, 0);
});

test("SSE proxy streams bytes without JSON parsing or short timeout and cancels upstream", async () => {
  let init, cancelled = false;
  const { GET } = load("app/api/campeonatos/[id]/eventos/route.ts", {
    Response, Headers, AbortController, ReadableStream,
    require: () => ({ apiBase: () => "http://backend" }),
    fetch: async (_url, options) => { init = options; return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("event: conectado\ndata: {}\n\n")); }, cancel() { cancelled = true; } }), { headers: { "Content-Type": "text/event-stream" } }); },
  });
  const response = await GET(new Request("http://localhost/api", { headers: { "Last-Event-ID": "opaque-id" } }), { params: Promise.resolve({ id: "7" }) });
  assert.equal(response.headers.get("X-Accel-Buffering"), "no");
  assert.equal(init.headers.get("Authorization"), null);
  assert.equal(init.headers.get("Last-Event-ID"), "opaque-id");
  const reader = response.body.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: conectado/);
  await reader.cancel();
  assert.equal(cancelled, true);
  assert.equal(init.signal.aborted, true);
});
