import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { tsconfigPaths: true });
const {
  QUEUE_STORAGE_PREFIX,
  consumeQueuedMessage,
  createQueuedMessageEntry,
  persistQueue,
  promoteQueuedMessage,
  readPersistedQueue,
  removeQueuedMessage,
} = await jiti.import("./useAgentSession-queue.ts");

let entries;

beforeEach(() => {
  entries = new Map();
  globalThis.sessionStorage = {
    getItem(key) { return entries.get(key) ?? null; },
    setItem(key, value) { entries.set(key, value); },
    removeItem(key) { entries.delete(key); },
  };
});

afterEach(() => {
  delete globalThis.sessionStorage;
});

test("creates attachment-aware entries without retaining image payloads", () => {
  const entry = createQueuedMessageEntry("inspect this", [
    { mimeType: "image/png", data: "large-base64", previewUrl: "blob:preview" },
    { mimeType: "text/plain", data: "ignored" },
  ]);

  assert.equal(typeof entry.id, "string");
  assert.ok(entry.id.length > 0);
  assert.deepEqual(entry, { ...entry, text: "inspect this", attachments: [{ mimeType: "image/png" }] });

  persistQueue("s1", { steering: [entry], followUp: [] });
  const raw = entries.get(`${QUEUE_STORAGE_PREFIX}s1`);
  assert.equal(raw.includes("large-base64"), false);
  assert.equal(raw.includes("blob:preview"), false);
  assert.deepEqual(readPersistedQueue("s1"), { steering: [entry], followUp: [] });
});

test("migrates legacy string arrays and ignores malformed stored entries", () => {
  entries.set(`${QUEUE_STORAGE_PREFIX}s1`, JSON.stringify({
    steering: ["legacy steer", null],
    followUp: ["same", { text: "new", attachments: [{ mimeType: "image/jpeg" }, { mimeType: "bad" }] }],
  }));

  const queue = readPersistedQueue("s1");
  assert.deepEqual(queue, {
    steering: [{ id: "legacy-steering-0", text: "legacy steer", attachments: [] }],
    followUp: [
      { id: "legacy-followUp-0", text: "same", attachments: [] },
      { id: "legacy-followUp-1", text: "new", attachments: [{ mimeType: "image/jpeg" }] },
    ],
  });
});

test("remove and promote use identity to disambiguate duplicate text", () => {
  const first = { id: "first", text: "same", attachments: [] };
  const second = { id: "second", text: "same", attachments: [{ mimeType: "image/png" }] };
  const queue = { steering: [], followUp: [first, second] };

  const promoted = promoteQueuedMessage(queue, "second");
  assert.deepEqual(promoted, { steering: [second], followUp: [first] });
  assert.deepEqual(removeQueuedMessage(promoted, "first"), { steering: [second], followUp: [] });
});

test("delivery consumes one deterministic matching entry and preserves duplicates", () => {
  const plain = { id: "plain", text: "same", attachments: [] };
  const image = { id: "image", text: "same", attachments: [{ mimeType: "image/png" }] };
  const other = { id: "other", text: "same", attachments: [{ mimeType: "image/jpeg" }] };
  const queue = { steering: [plain], followUp: [image, other] };

  const afterImage = consumeQueuedMessage(queue, "same", ["image/png"]);
  assert.deepEqual(afterImage, { steering: [plain], followUp: [other] });
  assert.deepEqual(consumeQueuedMessage(afterImage, "same"), { steering: [], followUp: [other] });
});
