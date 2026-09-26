import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { tsconfigPaths: true });
const { layoutToViewportPx, readUiScale, viewportToLayoutPx } = await jiti.import(
  "./ui-geometry.ts",
);

test("geometry conversions preserve measurements across supported scales", () => {
  for (const scale of [0.9, 1, 1.1, 1.2]) {
    const viewportValue = 297;
    const layoutValue = viewportToLayoutPx(viewportValue, scale);
    assert.equal(layoutToViewportPx(layoutValue, scale), viewportValue);
  }

  assert.equal(viewportToLayoutPx(120), 120);
  assert.equal(layoutToViewportPx(120), 120);
});

test("readUiScale reads a positive finite root scale without extra style reads", () => {
  const originalDocument = globalThis.document;
  const originalGetComputedStyle = globalThis.getComputedStyle;
  const defaultRoot = {};
  const explicitRoot = {};
  let reads = 0;

  globalThis.document = { documentElement: defaultRoot };
  globalThis.getComputedStyle = (root) => {
    reads += 1;
    assert.equal(root, explicitRoot);
    return { getPropertyValue: (name) => {
      assert.equal(name, "--ui-scale");
      return " 1.2 ";
    } };
  };

  try {
    assert.equal(readUiScale(explicitRoot), 1.2);
    assert.equal(reads, 1);
  } finally {
    globalThis.document = originalDocument;
    globalThis.getComputedStyle = originalGetComputedStyle;
  }
});

test("readUiScale safely falls back to one", () => {
  const originalDocument = globalThis.document;
  const originalGetComputedStyle = globalThis.getComputedStyle;
  const root = {};
  globalThis.document = { documentElement: root };

  try {
    for (const raw of ["", "0", "-1", "Infinity", "not-a-number"]) {
      globalThis.getComputedStyle = () => ({ getPropertyValue: () => raw });
      assert.equal(readUiScale(), 1, `expected fallback for ${JSON.stringify(raw)}`);
    }

    globalThis.getComputedStyle = () => { throw new Error("style unavailable"); };
    assert.equal(readUiScale(), 1);
  } finally {
    globalThis.document = originalDocument;
    globalThis.getComputedStyle = originalGetComputedStyle;
  }
});
