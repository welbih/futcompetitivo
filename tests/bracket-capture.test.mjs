import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("capture materializes SVG line styles without changing the live bracket", () => {
  const makeNode = computed => ({ computed, style: { values: {}, setProperty(name, value, priority) { this.values[name] = { value, priority }; } } });
  const originals = [makeNode({}), makeNode({ fill: "none", stroke: "rgb(245, 197, 66)", "stroke-width": "2px" }), makeNode({ fill: "none", stroke: "rgb(0, 0, 0)", "stroke-linecap": "square" })];
  const copies = originals.map(() => makeNode({}));
  const clone = { style: {}, querySelectorAll: () => copies };
  const source = { cloneNode: () => clone, querySelectorAll: () => originals };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("app/campeonatos/[id]/bracket-capture.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, getComputedStyle: node => ({ getPropertyValue: property => node.computed[property] || "" }) });
  assert.equal(exports.createBracketCaptureClone(source), clone);
  assert.deepEqual(copies[1].style.values.stroke, { value: "rgb(245, 197, 66)", priority: "important" });
  assert.equal(copies[1].style.values.fill.value, "none");
  assert.equal(copies[1].style.values["stroke-width"].value, "2px");
  assert.equal(copies[2].style.values.stroke.value, "rgb(0, 0, 0)");
  assert.equal(copies[2].style.values["stroke-linecap"].value, "square");
  assert.equal(copies[1].style.values.transition.value, "none");
  assert.equal(clone.style.zoom, "1");
  assert.equal(originals.every(node => Object.keys(node.style.values).length === 0), true);
});
