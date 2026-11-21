import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function setup() {
  const refs = [], calls = [];
  let cursor = 0, effects = [], reduced = false, cancelled = 0;
  const exports = {};
  const root = { getBoundingClientRect: () => ({ left: 0, top: 0 }), querySelectorAll: () => items };
  let items = [];
  const react = {
    useRef: value => refs[cursor++] ??= { current: value },
    useLayoutEffect: effect => effects.push(effect),
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("app/components/use-layout-transition.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, require: () => react,
    window: { matchMedia: () => ({ matches: reduced }) },
  });
  const item = (key, y, value = "1") => ({
    dataset: { motionKey: key, motionValue: value }, offsetWidth: 100,
    getBoundingClientRect: () => ({ left: 0, top: y, width: 100 }),
    animate: (frames, options) => { calls.push({ key, frames, options }); return { cancel: () => cancelled++ }; },
  });
  return {
    calls, item, cancelled: () => cancelled,
    reduce: () => { reduced = true; },
    render(next) {
      items = next; cursor = 0; effects = [];
      const ref = exports.useLayoutTransition(JSON.stringify(next.map(element => element.dataset)));
      ref.current = root;
      effects[0]();
    },
  };
}

test("ranking rows animate from their previous positions and unchanged rows stay still", () => {
  const ctx = setup();
  ctx.render([ctx.item("A", 0), ctx.item("B", 50)]);
  assert.equal(ctx.calls.length, 0);
  ctx.render([ctx.item("B", 0), ctx.item("A", 50)]);
  assert.equal(ctx.calls.length, 2);
  assert.equal(ctx.calls[0].frames[0].transform, "translate(0px, 50px)");
  assert.equal(ctx.calls[1].frames[0].transform, "translate(0px, -50px)");
  ctx.render([ctx.item("B", 0), ctx.item("A", 50)]);
  assert.equal(ctx.calls.length, 2);
  assert.equal(ctx.cancelled(), 2);
});

test("new knockout slots and score changes animate, with reduced-motion respected", () => {
  const ctx = setup();
  ctx.render([ctx.item("semi", 0)]);
  ctx.render([ctx.item("semi", 0, "winner-2"), ctx.item("final", 50, "player-2")]);
  assert.equal(ctx.calls.length, 2);
  assert.equal(ctx.calls[0].frames[0].opacity, .4);
  ctx.reduce();
  ctx.render([ctx.item("semi", 50, "winner-3"), ctx.item("final", 0, "player-3")]);
  assert.equal(ctx.calls.length, 2);
});
