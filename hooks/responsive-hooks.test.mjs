import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

for (const [file, query] of [
  ["useIsMobile.ts", "PHONE_QUERY"],
  ["useIsCompactOverlay.ts", "COMPACT_OVERLAY_QUERY"],
]) {
  test(`${file} consumes its shared query and keeps the desktop SSR snapshot`, async () => {
    const source = await readFile(new URL(file, import.meta.url), "utf8");

    assert.match(source, new RegExp(`import \\{ ${query} \\} from "@/lib/responsive-contract"`));
    assert.match(source, new RegExp(`window\\.matchMedia\\(${query}\\)`, "g"));
    assert.doesNotMatch(source, /\(max-width:\s*\d+px\)/);
    assert.match(source, /function getServerSnapshot\(\): boolean \{\s*return false;\s*\}/);
    assert.match(
      source,
      /useSyncExternalStore\(subscribe, getSnapshot, getServerSnapshot\)/,
    );
  });
}
