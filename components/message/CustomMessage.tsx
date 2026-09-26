"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy, EyeOff } from "lucide-react";
import { MarkdownBody } from "../MarkdownBody";
import { ClickableImage } from "../ImageLightbox";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import { formatCompactNumber } from "@/lib/format";
import { parseCompactionSummary } from "@/lib/compaction-summary";
import { translate, useI18n } from "@/lib/i18n";
import type { CustomMessage as CustomMessageType, ImageContent, TextContent, UserMessage as UserMessageType } from "@/lib/types";
import { formatTime, safeJson } from "./shared";

export function CompactionMessage({ message }: { message: CustomMessageType }) {
  const { t, locale } = useI18n();
  const summary = getMessageText(message.content);
  const parsedSummary = useMemo(() => parseCompactionSummary(summary), [summary]);
  const time = formatTime(message.timestamp, locale);
  // omp ≥17.4 compaction entries carry the maintenance method and the real
  // post-compaction token count; older sessions only have tokensBefore.
  const details = (message.details ?? null) as { tokensBefore?: unknown; tokensAfter?: unknown; method?: unknown } | null;
  const tokensBefore = typeof details?.tokensBefore === "number" ? details.tokensBefore : null;
  const tokensAfter = typeof details?.tokensAfter === "number" ? details.tokensAfter : null;
  const method = typeof details?.method === "string" && details.method ? details.method : null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "var(--bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderBottom: "1px solid var(--border)", background: "var(--bg-panel)", color: "var(--text-muted)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 650 }}>{t("messageView.compactionLabel")}</span>
          {time && <span style={{ marginLeft: "auto", color: "var(--text-dim)", fontSize: 10 }}>{time}</span>}
        </div>
        <div data-selection-scope="message" tabIndex={-1} style={{ padding: "11px 13px 12px" }}>
          <div style={{ color: "var(--text)", fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>{t("messageView.conversationCompacted")}</div>
          {(method || (tokensBefore !== null && tokensAfter !== null)) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              {method && (
                <span style={{ padding: "1px 7px", borderRadius: 4, background: "var(--bg-subtle)", color: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                  {method}
                </span>
              )}
              {tokensBefore !== null && tokensAfter !== null && (
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                  {t("messageView.compactionTokenDelta", {
                    before: formatCompactNumber(tokensBefore, locale),
                    after: formatCompactNumber(tokensAfter, locale),
                  })}
                </span>
              )}
            </div>
          )}
          <div style={{ marginTop: 3, marginBottom: 10, color: "var(--text)", fontSize: 14, lineHeight: 1.5 }}>{t("messageView.compactionDescription")}</div>
          {parsedSummary.body ? <MarkdownBody className="markdown-compaction-message">{parsedSummary.body}</MarkdownBody> : <span style={{ color: "var(--text-dim)", fontSize: 12 }}>{t("messageView.noSummary")}</span>}
          <CompactionFileMetadata readFiles={parsedSummary.readFiles} modifiedFiles={parsedSummary.modifiedFiles} />
        </div>
      </div>
    </div>
  );
}
function CompactionFileMetadata({ readFiles, modifiedFiles }: { readFiles: string[]; modifiedFiles: string[] }) {
  const { t } = useI18n();
  const total = readFiles.length + modifiedFiles.length;
  if (total === 0) return null;

  const parts = [];
  if (readFiles.length > 0) parts.push(t("messageView.filesReadCount", { count: readFiles.length }));
  if (modifiedFiles.length > 0) parts.push(t("messageView.filesModifiedCount", { count: modifiedFiles.length }));

  return (
    <details className="compaction-file-details">
      <summary>{t("messageView.fileContext", { parts: parts.join(", ") })}</summary>
      {modifiedFiles.length > 0 && <CompactionFileList title={t("messageView.modifiedFiles")} files={modifiedFiles} />}
      {readFiles.length > 0 && <CompactionFileList title={t("messageView.readFiles")} files={readFiles} />}
    </details>
  );
}

function CompactionFileList({ title, files }: { title: string; files: string[] }) {
  return (
    <div className="compaction-file-section">
      <div className="compaction-file-title">{title}</div>
      <ul className="compaction-file-list">
        {files.map((file) => (
          <li key={file}>{file}</li>
        ))}
      </ul>
    </div>
  );
}

function stripHiddenWrappers(text: string): string {
  let t = text.trim();
  t = t.replace(/^<!--[\s\S]*?-->\s*/, "").trim();
  const outer = t.match(/^<([a-zA-Z0-9_-]+)(?:\s[^>]*)?>\s*([\s\S]*?)\s*<\/\1>\s*$/);
  if (outer) return outer[2].trim();
  return t;
}

function friendlyHiddenLabel(customType: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    "mid-run-todo-nudge": "Todo reminder",
    "todo-error-reminder": "Todo reminder",
    "resolve-reminder": "Pending preview",
    "interrupted-thinking": "Interrupted",
    "autoresearch-resume": "Resume hint",
    "plan-mode-context": "Plan context",
    "plan-mode-reference": "Plan reference",
    "goal-mode-context": "Goal context",
    "goal-continuation": "Goal continuation",
    "goal-budget-limit": "Budget limit",
    "thinking-loop-redirect": "Loop guard",
    "image-attachment-description": "Image note",
    "extension_debug": "Extension",
    "lsp-late-diagnostic": "Diagnostics",
  };
  if (map[customType]) return map[customType];
  if (!customType) return t("messageView.extensionType");
  return customType.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function HiddenExtensionMessage({ message, cwd, onOpenFile }: { message: CustomMessageType; cwd?: string; onOpenFile?: (filePath: string) => void }) {
  const { t, locale } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const { copied, copy: copyContent } = useCopyFeedback();
  const rawText = getMessageText(message.content);
  const images = getMessageImages(message.content);
  const cleanText = useMemo(() => stripHiddenWrappers(rawText), [rawText]);
  const preview = useMemo(() => {
    const normalized = cleanText.replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    return normalized.length > 92 ? `${normalized.slice(0, 92)}…` : normalized;
  }, [cleanText]);
  const hasDetails = message.details !== undefined;
  const detailsText = hasDetails ? safeJson(message.details) : "";
  const label = friendlyHiddenLabel(message.customType, t);
  const time = formatTime(message.timestamp, locale);

  return (
    <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}>
      <div data-selection-scope="message" tabIndex={-1} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: "100%", maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)", opacity: 0.55 }} />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? t("messageView.collapse") : t("messageView.expand")}
            style={{
              userSelect: expanded ? "none" : undefined,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              maxWidth: "78%",
              padding: "4px 10px",
              border: "1px dashed color-mix(in srgb, var(--border) 88%, transparent)",
              borderRadius: 999,
              background: "color-mix(in srgb, var(--bg-subtle) 92%, var(--bg))",
              color: "var(--text-dim)",
              cursor: "pointer",
              fontSize: 11,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            <EyeOff size={12} strokeWidth={1.8} style={{ flexShrink: 0, opacity: 0.85 }} />
            <span style={{ userSelect: "none", fontFamily: "var(--font-mono)", fontWeight: 650, letterSpacing: "0.01em", color: "var(--text-muted)", fontSize: 11 }}>
              {label}
            </span>
            {preview ? (
              <>
                <span style={{ width: 3, height: 3, borderRadius: 999, background: "var(--text-dim)", opacity: 0.5, flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, fontSize: 11 }}>{preview}</span>
              </>
            ) : null}
            <ChevronRight size={11} strokeWidth={1.8} style={{ flexShrink: 0, opacity: 0.7, transform: expanded ? "rotate(90deg)" : "none", transition: "transform var(--dur-fast) var(--ease-out-warm)" }} />
          </button>
          <div style={{ flex: 1, height: 1, background: "var(--border)", opacity: 0.55 }} />
        </div>
        {time ? <span style={{ userSelect: "none", marginTop: 2, color: "var(--text-dim)", fontSize: 10, fontVariantNumeric: "tabular-nums", opacity: 0.75 }}>{time}</span> : null}
        {expanded ? (
          <div
            style={{
              marginTop: 6,
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: 8,
              overflow: "hidden",
              background: "var(--bg-subtle)",
            }}
          >
            <div style={{ padding: "8px 10px" }}>
              {images.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: cleanText ? 8 : 0 }}>
                  {images.map((img, i) => {
                    const src = imageSource(img);
                    if (!src) return null;
                    return (
                      <ClickableImage
                        key={i}
                        src={src}
                        alt=""
                        style={{ maxWidth: 240, maxHeight: 240, borderRadius: 6, objectFit: "contain", display: "block", border: "1px solid var(--border)" }}
                      />
                    );
                  })}
                </div>
              )}
              {cleanText ? (
                <MarkdownBody className="markdown-custom-message" cwd={cwd} onOpenFile={onOpenFile}>
                  {cleanText}
                </MarkdownBody>
              ) : (
                <span style={{ color: "var(--text-dim)", fontSize: 12 }}>{t("messageView.noMessage")}</span>
              )}
            </div>
            <div
              style={{
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 9px",
                borderTop: "1px solid var(--border)",
                background: "var(--bg-panel)",
              }}
            >
              {(cleanText || detailsText) ? (
                <button
                  onClick={() => copyContent(cleanText || detailsText)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 7px",
                    border: "none",
                    background: "none",
                    color: copied ? "var(--accent)" : "var(--text-dim)",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  {copied ? <Check size={11} strokeWidth={1.8} /> : <Copy size={11} strokeWidth={1.8} />}
                  {copied ? t("messageView.copied") : t("messageView.copy")}
                </button>
              ) : null}
              {hasDetails ? (
                <button
                  onClick={() => setDetailsExpanded((v) => !v)}
                  style={{
                    marginLeft: "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 7px",
                    border: "none",
                    background: "none",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  {detailsExpanded ? t("messageView.hideDetails") : t("messageView.showDetails")}
                  <ChevronDown size={11} strokeWidth={1.8} style={{ transform: detailsExpanded ? "rotate(180deg)" : "none", transition: "transform var(--dur-fast) var(--ease-out-warm)" }} />
                </button>
              ) : (
                <button
                  onClick={() => setExpanded(false)}
                  style={{
                    marginLeft: "auto",
                    padding: "3px 7px",
                    border: "none",
                    background: "none",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  {t("messageView.collapse")}
                </button>
              )}
            </div>
            {hasDetails && detailsExpanded ? (
              <pre
                style={{
                  margin: 0,
                  padding: "9px 10px",
                  borderTop: "1px solid var(--border)",
                  backgroundColor: "var(--bg)",
                  color: "var(--text-muted)",
                  fontSize: 12,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: 360,
                  overflow: "auto",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {detailsText}
              </pre>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CustomMessage({ message, cwd, onOpenFile }: { message: CustomMessageType; cwd?: string; onOpenFile?: (filePath: string) => void }) {
  const { t, locale } = useI18n();
  const [contentExpanded, setContentExpanded] = useState(true);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const { copied, copy: copyContent } = useCopyFeedback();
  const text = getMessageText(message.content);
  const images = getMessageImages(message.content);
  const hasDetails = message.details !== undefined;
  const detailsText = hasDetails ? safeJson(message.details) : "";
  const isIrc = IRC_CUSTOM_TYPES.has(message.customType);
  const ircEnvelope = isIrc ? parseIrcEnvelope(text) : null;
  const displayText = ircEnvelope ? ircEnvelope.body : text;
  const title = isIrc
    ? (ircEnvelope?.sender ?? formatCustomType(message.customType))
    : message.customType === "advisor"
      ? t("messageView.advisorLabel")
      : formatCustomType(message.customType);
  const time = formatTime(message.timestamp, locale);


  return (
    <div style={{ marginBottom: 16 }}>
      <div
        data-selection-scope="message"
        tabIndex={-1}
        style={{
          border: "1px solid var(--border)",
          borderRadius: 8,
          overflow: "hidden",
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-panel)",
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 650 }}>
            {isIrc && message.customType === "irc:incoming" ? `← ${title}` : title}
          </span>
          {time && <span style={{ marginLeft: "auto", color: "var(--text-dim)", fontSize: 10 }}>{time}</span>}
        </div>

        {contentExpanded ? (
          <div style={{ padding: "6px 9px" }}>
            {images.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: displayText ? 8 : 0 }}>
                {images.map((img, i) => {
                  const src = imageSource(img);
                  if (!src) return null;
                  return (
                    <ClickableImage
                      key={i}
                      src={src}
                      alt=""
                      style={{ maxWidth: 240, maxHeight: 240, borderRadius: 6, objectFit: "contain", display: "block", border: "1px solid var(--border)" }}
                    />
                  );
                })}
              </div>
            )}
            {displayText ? <MarkdownBody className="markdown-custom-message" cwd={cwd} onOpenFile={onOpenFile}>{displayText}</MarkdownBody> : <span style={{ color: "var(--text-dim)", fontSize: 12 }}>{t("messageView.noMessage")}</span>}
          </div>
        ) : (
          <button
            onClick={() => setContentExpanded(true)}
            style={{
              display: "block",
              width: "100%",
              padding: "8px 10px",
              border: "none",
              background: "transparent",
              color: "var(--text-dim)",
              cursor: "pointer",
              fontSize: 12,
              textAlign: "left",
            }}
          >
            {displayText ? previewText(displayText) : t("messageView.showExtensionMessage")}
          </button>
        )}

        <div
          style={{
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 9px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-subtle)",
          }}
        >
          {text || detailsText ? (
            <button
              onClick={() => copyContent(displayText || detailsText)}
              style={{
                padding: "3px 7px",
                border: "none",
                background: "none",
                color: copied ? "var(--accent)" : "var(--text-dim)",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              {copied ? t("messageView.copied") : t("messageView.copy")}
            </button>
          ) : null}
          {hasDetails && (
            <button
              onClick={() => {
                setDetailsExpanded((v) => !v);
              }}
              style={{
                marginLeft: "auto",
                padding: "3px 7px",
                border: "none",
                background: "none",
                color: "var(--text-dim)",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              {detailsExpanded ? t("messageView.hideDetails") : t("messageView.showDetails")}
            </button>
          )}
        </div>

        {hasDetails && detailsExpanded && (
          <pre
            style={{
              margin: 0,
              padding: "9px 10px",
              borderTop: "1px solid var(--border)",
              backgroundColor: "var(--bg)",
              color: "var(--text-muted)",
              fontSize: 12,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 360,
              overflow: "auto",
              fontFamily: "var(--font-mono)",
            }}
          >
            {detailsText}
          </pre>
        )}
      </div>
    </div>
  );
}

function getMessageText(content: CustomMessageType["content"] | UserMessageType["content"]): string {
  if (typeof content === "string") return content;
  return content
    .filter((b): b is TextContent => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function getMessageImages(content: CustomMessageType["content"] | UserMessageType["content"]): ImageContent[] {
  if (typeof content === "string") return [];
  return content.filter((b): b is ImageContent => b.type === "image");
}

function imageSource(img: ImageContent): string {
  const flat = img as unknown as { data?: string; mimeType?: string };
  if (img.source) {
    return img.source.type === "base64"
      ? `data:${img.source.media_type};base64,${img.source.data}`
      : img.source.url ?? "";
  }
  return flat.data ? `data:${flat.mimeType};base64,${flat.data}` : "";
}


function formatCustomType(type: string): string {
  return type || translate("messageView.extensionType");
}

// Peer IRC messages are persisted as custom_message entries whose content is
// an envelope: "<irc>\nIncoming IRC message from agent `Name`:\n<body>". The
// card title must show the SENDER, not the raw customType.
const IRC_CUSTOM_TYPES = new Set(["irc:incoming", "irc:autoreply", "irc:relay"]);

function parseIrcEnvelope(content: string): { sender: string | null; body: string } {
  const lines = content.split("\n");
  let sender: string | null = null;
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/agent\s*`([^`]+)`/);
    if (match) {
      sender = match[1];
      bodyStart = i + 1;
      break;
    }
  }
  return { sender, body: lines.slice(bodyStart).join("\n").trim() };
}

function previewText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return translate("messageView.showExtensionMessage");
  return normalized.length > 140 ? `${normalized.slice(0, 140)}...` : normalized;
}
