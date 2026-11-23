import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, URL, Response, AbortSignal, ...globals });
  return exports;
}
const sources = load("app/equipes/logo-sources.ts");
const logo = "https://assets.football-logos.cc/logos/spain/256x256/real-madrid.5ce15611.png";

test("football logo hosts are proxied and unapproved origins remain rejected", () => {
  assert.equal(sources.teamLogoSource(logo), `/api/equipes/logo?url=${encodeURIComponent(logo)}`);
  assert.equal(sources.canOptimizeTeamLogo("https://football-logos.cc/logo.svg"), true);
  for (const url of ["http://assets.football-logos.cc/logo.png", "https://evil.example/logo.png", "https://assets.football-logos.cc.evil.example/logo.png", "https://user:pass@assets.football-logos.cc/logo.png"]) assert.equal(sources.canOptimizeTeamLogo(url), false);
});

test("proxy returns image bytes and rejects HTML and unknown domains", async () => {
  let calls = 0, html = false;
  const { GET } = load("app/api/equipes/logo/route.ts", {
    require: () => sources,
    fetch: async (_url, options) => { calls++; assert.equal(options.redirect, "error"); return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": html ? "text/html" : "image/png" } }); },
  });
  const request = url => new Request(`http://localhost/api/equipes/logo?url=${encodeURIComponent(url)}`);
  const response = await GET(request(logo));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/png");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal((await response.arrayBuffer()).byteLength, 3);
  assert.equal((await GET(request("https://evil.example/logo.png"))).status, 400);
  assert.equal(calls, 1);
  html = true;
  assert.equal((await GET(request(logo))).status, 415);
});
