"use client";

import { memo, useState } from "react";
import { Brain, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger } from "../ui/primitives";
import { translate, useI18n } from "@/lib/i18n";
import type { ThinkingContent } from "@/lib/types";

const MAX_THINKING_CACHE_ENTRIES = 100;
const thinkingContentCache = new Map<string, Promise<string>>();

function loadThinkingContent(sessionId: string, entryId: string, blockIndex: number): Promise<string> {
  const key = `${sessionId}:${entryId}:${blockIndex}`;
  const cached = thinkingContentCache.get(key);
  if (cached) {
    thinkingContentCache.delete(key);
    thinkingContentCache.set(key, cached);
    return cached;
  }

  const request = fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/entries/${encodeURIComponent(entryId)}/thinking?blockIndex=${blockIndex}`,
  ).then(async (response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json() as { thinking?: unknown };
    if (typeof data.thinking !== "string") throw new Error(translate("messageView.invalidThinkingResponse"));
    return data.thinking;
  }).catch((error) => {
    thinkingContentCache.delete(key);
    throw error;
  });

  thinkingContentCache.set(key, request);
  if (thinkingContentCache.size > MAX_THINKING_CACHE_ENTRIES) {
    const oldestKey = thinkingContentCache.keys().next().value;
    if (oldestKey) thinkingContentCache.delete(oldestKey);
  }
  return request;
}

export const ThinkingBlock = memo(function ThinkingBlock({ block, duration, sessionId, entryId, blockIndex }: {
  block: ThinkingContent;
  duration?: number;
  sessionId?: string;
  entryId?: string;
  blockIndex: number;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    setExpanded(nextOpen);
    if (!nextOpen || !block.deferred || content !== null) return;
    if (!sessionId || !entryId) {
      setError(t("messageView.thinkingUnavailable"));
      return;
    }

    setLoading(true);
    setError(null);
    void loadThinkingContent(sessionId, entryId, blockIndex)
      .then((text) => setContent(text))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  };

  return (
    <div className="activity-row" data-activity-operation="true">
      <Collapsible open={expanded} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger className="activity-row-trigger">
          <span className="activity-row-indicator" aria-hidden>
            <Brain size={12} strokeWidth={1.8} />
          </span>
          <span className="activity-row-tool">{t("messageView.thinking")}</span>
          <span className="activity-row-preview" />
          {duration !== undefined && (
            <span className="activity-row-duration">{t("messageView.durationSeconds", { seconds: duration })}</span>
          )}
          <ChevronDown
            size={12}
            strokeWidth={1.8}
            aria-hidden
            style={{
              flexShrink: 0,
              transform: expanded ? "none" : "rotate(-90deg)",
              transition: "transform var(--dur-fast) var(--ease-out-warm)",
            }}
          />
        </CollapsibleTrigger>
        {expanded && (
          <div className="thinking-details">
            <div
              className={`thinking-output${error ? " thinking-output-error" : ""}`}
            >
              {loading ? t("messageView.loadingThinking") : error ?? (block.deferred ? content : block.thinking)}
            </div>
          </div>
        )}
      </Collapsible>
    </div>
  );
}, (prev, next) => (
  prev.block.thinking === next.block.thinking
  && prev.block.deferred === next.block.deferred
  && prev.duration === next.duration
  && prev.sessionId === next.sessionId
  && prev.entryId === next.entryId
  && prev.blockIndex === next.blockIndex
));
