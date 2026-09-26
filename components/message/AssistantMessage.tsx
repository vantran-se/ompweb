"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleSlash, Square, Volume2 } from "lucide-react";
import { MessageCopyActions } from "../MessageCopyActions";
import { Tooltip } from "../ui/primitives";
import { useSpeechContext } from "@/hooks/useSpeechSynthesis";
import { useI18n } from "@/lib/i18n";
import { isEmptyThinkingBlock } from "@/lib/message-display";
import type { AssistantContentBlock, AssistantMessage as AssistantMessageType, TextContent, ThinkingContent, ToolCallContent, ToolResultMessage } from "@/lib/types";
import { ForkSessionButton, SafeMarkdownBody, formatTime } from "./shared";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCallBlock, ToolCallGroup } from "./ToolCall";

type GroupedBlockItem =
  | { type: "single"; item: { block: AssistantContentBlock; originalIndex: number } }
  | { type: "toolGroup"; items: Array<{ block: ToolCallContent; originalIndex: number }> };

function groupAdjacentBlocks(items: Array<{ block: AssistantContentBlock; originalIndex: number }>): GroupedBlockItem[] {
  const result: GroupedBlockItem[] = [];
  let currentGroup: Array<{ block: ToolCallContent; originalIndex: number }> | null = null;

  for (const item of items) {
    if (item.block.type === "toolCall") {
      if (!currentGroup) currentGroup = [];
      currentGroup.push({ block: item.block as ToolCallContent, originalIndex: item.originalIndex });
    } else {
      if (currentGroup) {
        if (currentGroup.length === 1) {
          result.push({ type: "single", item: currentGroup[0] });
        } else {
          result.push({ type: "toolGroup", items: currentGroup });
        }
        currentGroup = null;
      }
      result.push({ type: "single", item });
    }
  }

  if (currentGroup) {
    if (currentGroup.length === 1) {
      result.push({ type: "single", item: currentGroup[0] });
    } else {
      result.push({ type: "toolGroup", items: currentGroup });
    }
  }

  return result;
}

export function isInterruptedMessage(errorMessage?: string | null, stopReason?: string): boolean {
  if (stopReason === "aborted") return true;
  if (!errorMessage) return false;
  const lower = errorMessage.toLowerCase().trim();
  return (
    lower === "interrupted by user" ||
    lower === "interrupted" ||
    lower === "generation stopped by user" ||
    lower.startsWith("interrupted by user") ||
    lower.startsWith("interrupted:") ||
    lower === "aborted" ||
    lower === "request aborted"
  );
}

export function AssistantMessage({
  message,
  isStreaming,
  toolResults,
  modelNames,
  cwd,
  onOpenFile,
  showTimestamp,
  prevTimestamp,
  sessionId,
  entryId,
  forkEntryId,
  onFork,
  forking,
  toolCallsDefaultCollapsed,
  liveTokensPerSecond,
}: {
  message: AssistantMessageType;
  isStreaming?: boolean;
  toolResults?: Map<string, ToolResultMessage>;
  modelNames?: Record<string, string>;
  cwd?: string;
  onOpenFile?: (filePath: string) => void;
  showTimestamp?: boolean;
  prevTimestamp?: number;
  sessionId?: string;
  entryId?: string;
  /** User entry omp's `branch` command accepts for this reply (#103). */
  forkEntryId?: string;
  onFork?: (entryId: string) => void;
  forking?: boolean;
  toolCallsDefaultCollapsed: boolean;
  liveTokensPerSecond?: number | null;
}) {
  const { t, locale } = useI18n();
  const { isSupported: ttsSupported, isSpeaking: ttsSpeaking, speakingId: ttsSpeakingId, toggle: ttsToggle } = useSpeechContext();
  const speakableText = useMemo(() => {
    return (message.content ?? [])
      .filter((b): b is TextContent => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("\n\n");
  }, [message.content]);
  const messageSpeechId = entryId ?? (message.timestamp ? String(message.timestamp) : "msg");
  const isThisSpeaking = ttsSpeaking && ttsSpeakingId === messageSpeechId;
  const time = showTimestamp ? formatTime(message.timestamp, locale) : null;
  const bodyRef = useRef<HTMLDivElement>(null);
  const texts = (message.content ?? []).filter((block): block is TextContent => block.type === "text").map((block) => block.text);
  const canFork = !!forkEntryId && !!onFork;
  const blockItems = (message.content ?? [])
    .map((block, originalIndex) => ({ block, originalIndex }))
    .filter(({ block }) => !isEmptyThinkingBlock(block, { isStreaming }));
  const blocks = blockItems.map(({ block }) => block);
  const hasActivityBlocks = blocks.some((block) => block.type === "thinking" || block.type === "toolCall");
  const errorMessage = message.errorMessage?.trim() || null;
  const isInterrupted = isInterruptedMessage(errorMessage, message.stopReason);
  const blockItemsRef = useRef(blockItems);
  blockItemsRef.current = blockItems;


  // Streaming-based timing for thinking blocks
  const blockStartTimesRef = useRef<Map<number, number>>(new Map());
  const [streamingDurations, setStreamingDurations] = useState<Map<number, number>>(new Map());

  // Thinking duration derived from file timestamps: time from prev message end to this message end
  // This is the total generation time (thinking + any text before first tool call)
  const thinkingDurationFromFile = useMemo<number | undefined>(() => {
    if (!message.timestamp || !prevTimestamp) return undefined;
    const secs = Math.round((message.timestamp - prevTimestamp) / 1000);
    return secs > 0 ? secs : undefined;
  }, [message.timestamp, prevTimestamp]);

  // Tool call durations derived from session file timestamps (accurate for completed messages)
  // assistant message timestamp = when generation ended = when tools started running
  // toolResult timestamp = when tool execution finished
  const toolCallDurations = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    if (!toolResults || !message.timestamp || !Array.isArray(message.content)) return map;
    for (const block of message.content) {
      if (block.type === "toolCall") {
        const tc = block as ToolCallContent;
        const result = toolResults.get(tc.toolCallId);
        if (result?.timestamp && message.timestamp) {
          const secs = Math.round((result.timestamp - message.timestamp) / 1000);
          if (secs > 0) map.set(tc.toolCallId, secs);
        }
      }
    }
    return map;
  }, [toolResults, message.content, message.timestamp]);
  useEffect(() => {
    if (!isStreaming) {
      // Finalise any un-finished thinking block durations on stream end
      const now = new Date().getTime();
      setStreamingDurations((prev: Map<number, number>) => {
        const next = new Map(prev);
        for (const [idx, start] of blockStartTimesRef.current) {
          if (!next.has(idx)) next.set(idx, Math.round((now - start) / 1000));
        }
        return next;
      });
      return;
    }
    const tick = () => {
      const items = blockItemsRef.current;
      const now = Date.now();

      // Record start time for each block the first time we see it
      items.forEach(({ originalIndex }) => {
        if (!blockStartTimesRef.current.has(originalIndex)) blockStartTimesRef.current.set(originalIndex, now);
      });

      // When a non-last block has a successor already started, finalise its duration
      setStreamingDurations((prev: Map<number, number>) => {
        let changed = false;
        const next = new Map(prev);
        for (let i = 0; i < items.length - 1; i++) {
          const originalIndex = items[i].originalIndex;
          const nextOriginalIndex = items[i + 1].originalIndex;
          if (!next.has(originalIndex) && blockStartTimesRef.current.has(originalIndex)) {
            const start = blockStartTimesRef.current.get(originalIndex)!;
            const nextStart = blockStartTimesRef.current.get(nextOriginalIndex) ?? now;
            next.set(originalIndex, Math.round((nextStart - start) / 1000));
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };
    const id = setInterval(tick, 300);
    tick();
    return () => clearInterval(id);
  }, [isStreaming]);

  if (blocks.length === 0 && !isStreaming && !errorMessage) return null;

  return (
    <div
      className="chat-message"
      data-live={isStreaming ? "true" : undefined}
      style={{ marginBottom: 6 }}
    >
      {/* Model label */}
      <div
        style={{
          fontSize: 11,
          color: "var(--text-dim)",
          marginBottom: 4,
          display: hasActivityBlocks ? "none" : "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {message.provider && (
          <span>{modelNames?.[`${message.provider}:${message.model}`] ?? modelNames?.[message.model] ?? message.model}</span>
        )}
        {isStreaming && (() => {
          let chars = 0;
          for (const b of blocks) {
            if (b.type === "text") chars += (b as TextContent).text?.length ?? 0;
            else if (b.type === "thinking") chars += (b as ThinkingContent).thinking?.length ?? 0;
          }
          const est = Math.round(chars / 4);
          return (
            <>

              {est > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text)" }} title={t("messageView.estimatedTokens")}>
                  <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 400 }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="1.5" x2="5" y2="8.5" /><polyline points="2 6 5 8.5 8 6" />
                    </svg>
                    {est}
                  </span>
                  {liveTokensPerSecond != null && (() => {
                    // Speed tiers use the semantic status tokens as TEXT color
                    // (theme-adaptive, AA-verified) over a subtle tint — the
                    // old hardcoded palette failed AA for white-on-fill.
                    const tier = liveTokensPerSecond >= 50 ? "success" : liveTokensPerSecond >= 30 ? "renamed" : liveTokensPerSecond >= 15 ? "warning" : "error";
                    const tone = `var(--status-${tier})`;
                    return (
                      <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 4, background: `color-mix(in srgb, ${tone} 14%, var(--bg-panel))`, color: tone, fontSize: 11, fontWeight: 400 }}>
                        {t("messageView.tokensPerSecond", { tps: liveTokensPerSecond.toFixed(1) })}
                      </span>
                    );
                  })()}
                </span>
              )}
            </>
          );
        })()}
      </div>

      <div ref={bodyRef} data-selection-scope="message" tabIndex={-1} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {groupAdjacentBlocks(blockItems).map((group, groupIdx) => {
          if (group.type === "single") {
            const { block, originalIndex } = group.item;
            return (
              <BlockView
                key={`${entryId ?? "stream"}-${originalIndex}`}
                block={block}
                toolResults={toolResults}
                isStreaming={isStreaming}
                streamingDuration={streamingDurations.get(originalIndex) ?? (block.type === "thinking" ? thinkingDurationFromFile : undefined)}
                toolCallDurations={toolCallDurations}
                cwd={cwd}
                onOpenFile={onOpenFile}
                sessionId={sessionId}
                entryId={entryId}
                blockIndex={originalIndex}
                toolCallsDefaultCollapsed={toolCallsDefaultCollapsed}
              />
            );
          }
          return (
            <ToolCallGroup
              key={`${entryId ?? "stream"}-group-${groupIdx}`}
              items={group.items}
              toolResults={toolResults}
              isStreaming={isStreaming}
              toolCallDurations={toolCallDurations}
              onOpenFile={onOpenFile}
              toolCallsDefaultCollapsed={toolCallsDefaultCollapsed}
            />
          );
        })}
        {errorMessage && (
          isInterrupted ? (
            <div
              role="status"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 9px",
                border: "1px solid color-mix(in srgb, var(--text-muted) 25%, var(--border))",
                borderRadius: "var(--radius-control)",
                background: "color-mix(in srgb, var(--text-muted) 6%, var(--bg-panel))",
                color: "var(--text-muted)",
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              <CircleSlash size={14} strokeWidth={1.8} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>{t("messageView.interruptedByUser")}</span>
            </div>
          ) : (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
                padding: "7px 9px",
                border: "1px solid color-mix(in srgb, var(--status-error) 35%, var(--border))",
                borderRadius: "var(--radius-control)",
                background: "color-mix(in srgb, var(--status-error) 7%, var(--bg-panel))",
                color: "var(--status-error)",
                fontSize: 12,
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              <CircleAlert size={14} strokeWidth={1.8} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{t(errorMessage)}</span>
            </div>
          )
        )}
      </div>

      {!isStreaming && (texts.some((text) => text.trim()) || time || canFork || (ttsSupported && speakableText.trim().length > 0)) && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 6, marginTop: 3 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 3 }}>
            <MessageCopyActions texts={texts} bodyRef={bodyRef} />
            {ttsSupported && speakableText.trim().length > 0 && (
              <Tooltip content={isThisSpeaking ? t("messageView.stopSpeech") : t("messageView.readAloud")}>
                <button
                  type="button"
                  className="message-copy-action"
                  onClick={() => ttsToggle(messageSpeechId, speakableText)}
                  aria-label={isThisSpeaking ? t("messageView.stopSpeech") : t("messageView.readAloud")}
                  style={isThisSpeaking ? { color: "var(--accent)", background: "var(--bg-hover)" } : undefined}
                >
                  {isThisSpeaking ? <Square size={13} aria-hidden="true" /> : <Volume2 size={13} aria-hidden="true" />}
                  <span>{isThisSpeaking ? t("messageView.stopSpeech") : t("messageView.readAloud")}</span>
                </button>
              </Tooltip>
            )}
            {canFork && <ForkSessionButton entryId={forkEntryId!} onFork={onFork!} forking={forking} />}
          </div>
          {time && <span style={{ fontSize: 10, color: "var(--text-dim)", marginLeft: "auto" }}>{time}</span>}
        </div>
      )}
    </div>
  );
}

function BlockView({ block, toolResults, isStreaming, streamingDuration, toolCallDurations, cwd, onOpenFile, sessionId, entryId, blockIndex, toolCallsDefaultCollapsed }: { block: AssistantContentBlock; toolResults?: Map<string, ToolResultMessage>; isStreaming?: boolean; streamingDuration?: number; toolCallDurations?: Map<string, number>; cwd?: string; onOpenFile?: (filePath: string) => void; sessionId?: string; entryId?: string; blockIndex: number; toolCallsDefaultCollapsed: boolean }) {
  if (block.type === "text") {
    return <TextBlock block={block as TextContent} isStreaming={isStreaming} cwd={cwd} onOpenFile={onOpenFile} />;
  }
  if (block.type === "thinking") {
    return <ThinkingBlock block={block as ThinkingContent} duration={streamingDuration} sessionId={sessionId} entryId={entryId} blockIndex={blockIndex} />;
  }
  if (block.type === "toolCall") {
    const tc = block as ToolCallContent;
    const result = toolResults?.get(tc.toolCallId);
    const duration = toolCallDurations?.get(tc.toolCallId);
    return <ToolCallBlock block={tc} result={result} duration={duration} isStreaming={isStreaming} defaultCollapsed={toolCallsDefaultCollapsed} onOpenFile={onOpenFile} />;
  }
  return null;
}

// Every message_update frame delivers freshly parsed block objects, so the
// block memos below compare content (text/thinking strings, tool call ids)
// instead of object identity: finished blocks of the streaming message then
// skip their ReactMarkdown re-parse and only the actively growing block
// re-renders per frame.
export const TextBlock = memo(function TextBlock({ block, isStreaming, cwd, onOpenFile }: { block: TextContent; isStreaming?: boolean; cwd?: string; onOpenFile?: (filePath: string) => void }) {
  return <div data-message-text><SafeMarkdownBody isStreaming={isStreaming} cwd={cwd} onOpenFile={onOpenFile}>{block.text}</SafeMarkdownBody></div>;
}, (prev, next) => (
  prev.block.text === next.block.text
  && prev.isStreaming === next.isStreaming
  && prev.cwd === next.cwd
  && prev.onOpenFile === next.onOpenFile
));
