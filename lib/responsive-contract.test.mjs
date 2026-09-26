import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { tsconfigPaths: true });
const {
  COMPACT_OVERLAY_MAX_PX,
  COMPACT_OVERLAY_QUERY,
  PHONE_MAX_PX,
  PHONE_QUERY,
  isPhoneWidth,
  usesCompactOverlay,
} = await jiti.import("./responsive-contract.ts");

test("responsive queries are derived from their inclusive boundaries", () => {
  assert.equal(PHONE_MAX_PX, 640);
  assert.equal(PHONE_QUERY, "(max-width: 640px)");
  assert.equal(COMPACT_OVERLAY_MAX_PX, 1100);
  assert.equal(COMPACT_OVERLAY_QUERY, "(max-width: 1100px)");
});

test("phone width includes the boundary", () => {
  assert.equal(isPhoneWidth(PHONE_MAX_PX - 1), true);
  assert.equal(isPhoneWidth(PHONE_MAX_PX), true);
  assert.equal(isPhoneWidth(PHONE_MAX_PX + 1), false);
});

test("compact overlay width includes the boundary", () => {
  assert.equal(usesCompactOverlay(COMPACT_OVERLAY_MAX_PX - 1), true);
  assert.equal(usesCompactOverlay(COMPACT_OVERLAY_MAX_PX), true);
  assert.equal(usesCompactOverlay(COMPACT_OVERLAY_MAX_PX + 1), false);
});
