// Queued-prompt tracking and sessionStorage persistence helpers
// extracted from useAgentSession (pure logic only — no hook state).

export interface QueuedMessageAttachment {
  mimeType: string;
}

export interface QueuedMessageEntry {
  id: string;
  text: string;
  attachments: QueuedMessageAttachment[];
}

export interface QueuedMessages {
  steering: QueuedMessageEntry[];
  followUp: QueuedMessageEntry[];
}

export const EMPTY_QUEUE: QueuedMessages = { steering: [], followUp: [] };

// omp reports only queuedMessageCount over RPC; the queued texts live in React
// state and would vanish on reload. Mirror them into sessionStorage (per
// session, best-effort, size-bounded) so a reload can restore the queue panel.
export const QUEUE_STORAGE_PREFIX = "omp-queue-";
export const QUEUE_STORAGE_MAX_CHARS = 50_000;
let fallbackId = 0;

function createQueueId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    fallbackId += 1;
    return `queued-${Date.now().toString(36)}-${fallbackId.toString(36)}`;
  }
}

export function createQueuedMessageEntry(
  text: string,
  attachments: readonly { mimeType: string }[] = [],
): QueuedMessageEntry {
  return {
    id: createQueueId(),
    text,
    attachments: attachments
      .filter((attachment) => typeof attachment.mimeType === "string" && attachment.mimeType.startsWith("image/"))
      .map(({ mimeType }) => ({ mimeType })),
  };
}

function legacyQueueId(kind: keyof QueuedMessages, index: number): string {
  return `legacy-${kind}-${index}`;
}

function readEntries(value: unknown, kind: keyof QueuedMessages): QueuedMessageEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (typeof item === "string") {
      return [{ id: legacyQueueId(kind, index), text: item, attachments: [] }];
    }
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<QueuedMessageEntry>;
    if (typeof candidate.text !== "string") return [];
    const attachments = Array.isArray(candidate.attachments)
      ? candidate.attachments.flatMap((attachment) => {
        if (!attachment || typeof attachment !== "object") return [];
        const mimeType = (attachment as Partial<QueuedMessageAttachment>).mimeType;
        return typeof mimeType === "string" && mimeType.startsWith("image/") ? [{ mimeType }] : [];
      })
      : [];
    return [{
      id: typeof candidate.id === "string" && candidate.id ? candidate.id : legacyQueueId(kind, index),
      text: candidate.text,
      attachments,
    }];
  });
}

export function removeQueuedMessage(queue: QueuedMessages, idOrText: string): QueuedMessages {
  const removeFrom = (entries: QueuedMessageEntry[]) => {
    const index = entries.findIndex((entry) => entry.id === idOrText);
    const fallbackIndex = index === -1 ? entries.findIndex((entry) => entry.text === idOrText) : -1;
    const removeIndex = index === -1 ? fallbackIndex : index;
    return removeIndex === -1 ? entries : entries.filter((_, entryIndex) => entryIndex !== removeIndex);
  };
  const steering = removeFrom(queue.steering);
  if (steering !== queue.steering) return { ...queue, steering };
  const followUp = removeFrom(queue.followUp);
  return followUp === queue.followUp ? queue : { ...queue, followUp };
}

export function promoteQueuedMessage(queue: QueuedMessages, idOrText: string): QueuedMessages {
  let index = queue.followUp.findIndex((entry) => entry.id === idOrText);
  if (index === -1) index = queue.followUp.findIndex((entry) => entry.text === idOrText);
  if (index === -1) return queue;
  const entry = queue.followUp[index];
  return {
    steering: [...queue.steering, entry],
    followUp: queue.followUp.filter((_, entryIndex) => entryIndex !== index),
  };
}

export function consumeQueuedMessage(
  queue: QueuedMessages,
  text: string,
  attachmentMimeTypes: readonly string[] = [],
): QueuedMessages {
  const matchesAttachments = (entry: QueuedMessageEntry) => entry.text === text
    && entry.attachments.length === attachmentMimeTypes.length
    && entry.attachments.every((attachment, index) => attachment.mimeType === attachmentMimeTypes[index]);
  const exactSteeringIndex = queue.steering.findIndex(matchesAttachments);
  if (exactSteeringIndex !== -1) {
    return { ...queue, steering: queue.steering.filter((_, index) => index !== exactSteeringIndex) };
  }
  const exactFollowUpIndex = queue.followUp.findIndex(matchesAttachments);
  if (exactFollowUpIndex !== -1) {
    return { ...queue, followUp: queue.followUp.filter((_, index) => index !== exactFollowUpIndex) };
  }
  // Older persisted mirrors have no attachment metadata. Text remains the
  // deterministic fallback when omp delivers an image-bearing queued turn.
  const steeringIndex = queue.steering.findIndex((entry) => entry.text === text);
  if (steeringIndex !== -1) {
    return { ...queue, steering: queue.steering.filter((_, index) => index !== steeringIndex) };
  }
  const followUpIndex = queue.followUp.findIndex((entry) => entry.text === text);
  return followUpIndex === -1
    ? queue
    : { ...queue, followUp: queue.followUp.filter((_, index) => index !== followUpIndex) };
}

export function isEmptyQueue(queue: QueuedMessages): boolean {
  return queue.steering.length === 0 && queue.followUp.length === 0;
}

export function readPersistedQueue(sessionId: string): QueuedMessages | null {
  try {
    const raw = sessionStorage.getItem(QUEUE_STORAGE_PREFIX + sessionId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Record<keyof QueuedMessages, unknown>> | null;
    const queue = {
      steering: readEntries(parsed?.steering, "steering"),
      followUp: readEntries(parsed?.followUp, "followUp"),
    };
    return isEmptyQueue(queue) ? null : queue;
  } catch {
    return null;
  }
}

export function persistQueue(sessionId: string, queue: QueuedMessages): void {
  try {
    const key = QUEUE_STORAGE_PREFIX + sessionId;
    if (isEmptyQueue(queue)) {
      sessionStorage.removeItem(key);
      return;
    }
    // Size bound: drop oldest entries until the compact metadata fits. Image
    // base64 and blob preview URLs never enter this persisted representation.
    let bounded = queue;
    let raw = JSON.stringify(bounded);
    while (raw.length > QUEUE_STORAGE_MAX_CHARS && bounded.steering.length + bounded.followUp.length > 1) {
      bounded = bounded.steering.length >= bounded.followUp.length
        ? { ...bounded, steering: bounded.steering.slice(1) }
        : { ...bounded, followUp: bounded.followUp.slice(1) };
      raw = JSON.stringify(bounded);
    }
    if (raw.length > QUEUE_STORAGE_MAX_CHARS) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, raw);
  } catch {
    // Best-effort only (quota exceeded, private mode, SSR).
  }
}

export function clearPersistedQueue(sessionId: string | null): void {
  if (!sessionId) return;
  try {
    sessionStorage.removeItem(QUEUE_STORAGE_PREFIX + sessionId);
  } catch {
    // ignore storage errors
  }
}
