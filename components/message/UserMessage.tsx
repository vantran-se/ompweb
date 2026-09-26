"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, CornerUpLeft } from "lucide-react";
import { ClickableImage } from "../ImageLightbox";
import { MessageCopyActions } from "../MessageCopyActions";
import { Tooltip } from "../ui/primitives";
import { useI18n } from "@/lib/i18n";
import { isMessageOverflowing } from "@/lib/message-overflow";
import type { ImageContent, TextContent, UserMessage as UserMessageType } from "@/lib/types";
import { ForkSessionButton, SafeMarkdownBody, formatTime, imageBlockSrc } from "./shared";

const USER_BUBBLE_MAX_HEIGHT = 300;

export function UserMessage({ message, cwd, onOpenFile, entryId, onFork, forking, onNavigate, prevAssistantEntryId, onEditContent }: {  message: UserMessageType;
  cwd?: string;
  onOpenFile?: (filePath: string) => void;
  entryId?: string;
  onFork?: (entryId: string) => void;
  forking?: boolean;
  onNavigate?: (entryId: string) => boolean | Promise<boolean>;
  prevAssistantEntryId?: string;
  onEditContent?: (content: string) => void;
}) {
  const { t, locale } = useI18n();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const content =
    typeof message.content === "string"
      ? message.content
      : message.content
          .filter((b): b is TextContent => b.type === "text")
          .map((b) => b.text)
          .join("\n");

  const imageBlocks: ImageContent[] =
    typeof message.content === "string"
      ? []
      : message.content.filter((b): b is ImageContent => b.type === "image");
  useLayoutEffect(() => {
    const element = bodyRef.current;
    if (!element) return;
    const observedElement = element;
    const updateOverflow = () => setHasOverflow(isMessageOverflowing(observedElement));
    updateOverflow();
    observedElement.addEventListener("scroll", updateOverflow, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateOverflow) : null;
    observer?.observe(observedElement);
    return () => {
      observedElement.removeEventListener("scroll", updateOverflow);
      observer?.disconnect();
    };
  }, [content, imageBlocks.length]);

  const time = formatTime(message.timestamp, locale);
  const canFork = !!entryId && !!onFork;
  const canNavigate = !!prevAssistantEntryId && !!onNavigate;

  return (
    <div
      style={{ marginBottom: 18, display: "flex", flexDirection: "column", alignItems: "flex-end", paddingRight: 6 }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", maxWidth: "85%", minWidth: 0 }}>
        <div
          className="chat-message-card"
          ref={bodyRef}
          data-selection-scope="message"
          data-overflow={hasOverflow && !expanded ? "true" : undefined}
          tabIndex={-1}
          style={{
            maxWidth: "100%",
            minWidth: 0,
            background: "var(--user-bg)",
            border: "none",
            borderLeft: "3px solid var(--accent)",
            borderRadius: "var(--radius-card)",
            boxShadow: "none",
            padding: "8px 12px",
            fontSize: "var(--chat-user-font-size)",
            lineHeight: "var(--chat-line-height)",
            color: "var(--text)",
            wordBreak: "break-word",
            maxHeight: expanded ? "none" : USER_BUBBLE_MAX_HEIGHT,
            overflowY: "auto",
          }}
        >
          {imageBlocks.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: content ? 8 : 0 }}>
              {imageBlocks.map((img, i) => {
                // lib/types.ts ImageContent uses {source:{type,data,media_type,url}}
                // pi-ai on-disk format uses flat {data, mimeType} — handle both
                const src = imageBlockSrc(img);
                return (
                  <ClickableImage
                    key={i}
                    src={src}
                    alt=""
                    style={{ maxWidth: 240, maxHeight: 240, borderRadius: 6, objectFit: "contain", display: "block", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}
                  />
                );
              })}
            </div>
          )}
          {content && <div data-message-text><SafeMarkdownBody className="markdown-user-message" cwd={cwd} onOpenFile={onOpenFile}>{content}</SafeMarkdownBody></div>}
        </div>
        {hasOverflow && (
          <button
            type="button"
            className="message-overflow-toggle ui-focus-ring"
            aria-expanded={expanded}
            aria-label={expanded ? t("messageView.collapseInput") : t("messageView.showFullInput")}
            onClick={() => setExpanded((value) => !value)}
          >
            <span>{expanded ? t("messageView.collapseInput") : t("messageView.showFullInput")}</span>
            <ChevronDown size={12} strokeWidth={1.8} aria-hidden="true" style={{ transform: expanded ? "rotate(180deg)" : "none" }} />
          </button>
        )}

        {/* Bottom row: action buttons + timestamp — inside the bubble's column,
            spanning its width, so the timestamp aligns with its right edge. */}
          <div style={{
            display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end",
            gap: 6, marginTop: 3, width: "100%",
          }}>
          <MessageCopyActions texts={[content]} bodyRef={bodyRef} />
          {(canFork || canNavigate) && (
            <div
              style={{
                display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 3,
              }}
            >
              {canNavigate && (
                <Tooltip content={t("messageView.editFromHereTitle")}>
                  <button
                    onClick={async () => { if (!(await onNavigate!(prevAssistantEntryId!))) return; onEditContent?.(content); }}
                    aria-label={t("messageView.editFromHereTitle")}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "3px 8px", height: 24, minHeight: 24,
                      background: "none", border: "none",
                      borderRadius: 5,
                      color: "var(--text-dim)",
                      cursor: "pointer",
                      fontSize: 11, fontWeight: 400,
                      whiteSpace: "nowrap",
                      transition: "color var(--dur-fast) var(--ease-out-warm)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; }}
                  >
                    <CornerUpLeft size={11} strokeWidth={1.8} />
                    {t("messageView.editFromHere")}
                  </button>
                </Tooltip>
              )}
              {canFork && (
                <ForkSessionButton entryId={entryId!} onFork={onFork!} forking={forking} />
              )}
            </div>
          )}
          {time && <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{time}</span>}
          </div>
      </div>
    </div>
  );
}
