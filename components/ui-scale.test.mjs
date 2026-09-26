import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("ui scale keeps desktop zoom compensation and resets mobile root geometry", async () => {
  const source = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const box = String.raw`calc\(100%\s*\/\s*var\(--ui-scale\)\)`;

  for (const name of ["compact", "comfortable", "large"]) {
    const block = source.match(new RegExp(`html\\[data-ui-scale="${name}"\\]\\s*\\{[^}]*\\}`));
    assert.ok(block, `missing html[data-ui-scale="${name}"]`);
    assert.match(block[0], /zoom:\s*[\d.]+;/);
    assert.match(block[0], new RegExp(`height:\\s*${box}`));
    assert.match(block[0], new RegExp(`width:\\s*${box}`));
  }

  const mobile = source.match(/@media \(max-width: 640px\) \{\s*html\[data-ui-scale="compact"\],[\s\S]*?\n\}/);
  assert.ok(mobile, "missing mobile ui-scale reset");
  assert.match(mobile[0], /--ui-scale:\s*1;/);
  assert.match(mobile[0], /zoom:\s*1;/);
  assert.match(mobile[0], /width:\s*100%;/);
  assert.match(mobile[0], /height:\s*100%;/);
});
