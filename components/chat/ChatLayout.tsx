"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { ArrowDown, ChevronDown } from "lucide-react";
import type { AgentMessage } from "@/lib/types";
import { CHAT_COLUMN_MAX_WIDTH, MINIMAP_WIDTH } from "@/lib/chat-layout";
import { ChatMinimap } from "../ChatMinimap";
import OmpWebLogo from "../OmpWebLogo";

const CHAT_COLUMN_PADDING = 16;
const MINIMAP_CLEARANCE = 2 * (MINIMAP_WIDTH - CHAT_COLUMN_PADDING);
const CHAT_COLUMN_MAX_WIDTH_DESKTOP = `min(${CHAT_COLUMN_MAX_WIDTH}px, calc(100% - ${MINIMAP_CLEARANCE}px))`;

interface ChatColumnProps {
  children: ReactNode;
  desktopMinimapClearance?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function ChatColumn({ children, desktopMinimapClearance = false, className, style }: ChatColumnProps) {
  return (
    <div style={{ padding: `0 ${CHAT_COLUMN_PADDING}px`, ...style }} className={["chat-column", className].filter(Boolean).join(" ")}>
      <div className="chat-column-inner" style={{ maxWidth: desktopMinimapClearance ? CHAT_COLUMN_MAX_WIDTH_DESKTOP : CHAT_COLUMN_MAX_WIDTH }}>
        {children}
      </div>
    </div>
  );
}

interface EmptySessionSurfaceProps {
  title: string;
  description: string;
  runtimeVersion: ReactNode;
  workspace: ReactNode;
  notices: ReactNode;
  composer: ReactNode;
}

export function EmptySessionSurface({ title, description, runtimeVersion, workspace, notices, composer }: EmptySessionSurfaceProps) {
  return (
    <div className="empty-session-surface relative flex flex-1 flex-col overflow-hidden">
      <div className="empty-session-layout flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8" style={{ minHeight: 0 }}>
        <div className="empty-session-content w-full" style={{ maxWidth: CHAT_COLUMN_MAX_WIDTH }}>
          <div className="empty-chat-brand">
            <div className="empty-chat-identity">
              <OmpWebLogo size={30} />
              <span className="omp-wordmark">omp web</span>
            </div>
            <div className="empty-chat-versions">
              <span>
                web <strong>v{process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"}</strong>
              </span>
              {runtimeVersion}
            </div>
          </div>
          <div className="empty-session-intro">
            <span className="empty-session-rule" aria-hidden="true" />
            <h1 className="display-serif">{title}</h1>
            <p>{description}</p>
          </div>
          <div className="empty-session-workspace">{workspace}</div>
          <div className="empty-session-notices">{notices}</div>
          <div className="empty-session-composer">{composer}</div>
        </div>
      </div>
    </div>
  );
}

interface ScrollToBottomControlProps {
  isMobile: boolean;
  label: string;
  onClick: () => void;
}

export function ScrollToBottomControl({ isMobile, label, onClick }: ScrollToBottomControlProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="chat-scroll-bottom ui-focus-ring"
      style={{ position: "absolute", right: isMobile ? 16 : 48, bottom: 16, zIndex: 35, display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, padding: 0, border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: "var(--bg-panel)", color: "var(--text-muted)", cursor: "pointer", boxShadow: "var(--shadow-pop)" }}
    >
      <ArrowDown size={15} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}

interface TranscriptSurfaceProps {
  isMobile: boolean;
  isStreaming: boolean;
  label: string;
  scrollLabel: string;
  nearBottom: boolean;
  notices: ReactNode;
  children: ReactNode;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  messages: AgentMessage[];
  messageRefs: RefObject<(HTMLDivElement | null)[]>;
  onScrollToBottom: () => void;
}

export function TranscriptSurface({ isMobile, isStreaming, label, scrollLabel, nearBottom, notices, children, scrollContainerRef, messages, messageRefs, onScrollToBottom }: TranscriptSurfaceProps) {
  return (
    <div className="chat-transcript-surface relative flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      <div className="chat-transcript-notices">
        <ChatColumn desktopMinimapClearance={!isMobile}>{notices}</ChatColumn>
      </div>
      <div
        ref={scrollContainerRef}
        data-selection-scope="chat"
        tabIndex={-1}
        role="log"
        aria-live={isStreaming ? "off" : "polite"}
        aria-busy={isStreaming || undefined}
        aria-relevant="additions text"
        aria-label={label}
        className={`chat-transcript flex-1 overflow-y-auto${isMobile ? "" : " scrollbar-none [&::-webkit-scrollbar]:hidden"}`}
        style={{ minHeight: 0 }}
      >
        <ChatColumn desktopMinimapClearance={!isMobile}>{children}</ChatColumn>
      </div>
      {!nearBottom && <ScrollToBottomControl isMobile={isMobile} label={scrollLabel} onClick={onScrollToBottom} />}
      {!isMobile && (
        <div className="chat-transcript-minimap">
          <ChatMinimap messages={messages} scrollContainer={scrollContainerRef} messageRefs={messageRefs} />
        </div>
      )}
    </div>
  );
}


interface ComposerDockProps {
  minimized: boolean;
  minimizedBar: ReactNode;
  panels: ReactNode;
  composer: ReactNode;
  minimizeLabel: string;
  onMinimize: () => void;
}

export function ComposerDock({ minimized, minimizedBar, panels, composer, minimizeLabel, onMinimize }: ComposerDockProps) {
  return (
    <>
      {minimized && minimizedBar}
      <div className="composer-dock" style={{ display: minimized ? "none" : "flex" }}>
        <ChatColumn className="composer-dock-handle-row" style={{ flexShrink: 0 }}>
          <div className="composer-dock-handle-wrap">
            <button
              type="button"
              onClick={onMinimize}
              title={minimizeLabel}
              aria-label={minimizeLabel}
              className="composer-dock-handle ui-focus-ring"
            >
              <ChevronDown size={14} strokeWidth={1.8} />
            </button>
          </div>
        </ChatColumn>
        <ChatColumn className="composer-dock-panels" style={{ minHeight: 0, overflowY: "auto" }}>{panels}</ChatColumn>
        {composer}
      </div>
    </>
  );
}

interface ChatOverlaysProps {
  showDropZone: boolean;
  children: ReactNode;
}

export function ChatOverlays({ showDropZone, children }: ChatOverlaysProps) {
  return (
    <>
      {showDropZone && (
        <div className="drop-zone-overlay pointer-events-none absolute inset-0 z-50 flex items-center justify-center backdrop-blur-[1px]">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {[0, 0.8, 1.6].map((delay) => <div key={delay} className="drop-ripple-ring absolute h-180 w-180 rounded-full border-[1.5px] border-solid" style={{ transformOrigin: "center", animationDelay: `${delay}s` }} />)}
          </div>
          <svg width="280" height="280" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-zone-illustration">
            <rect x="28" y="44" width="84" height="60" rx="8" fill="color-mix(in srgb, var(--accent) 8%, transparent)" stroke="color-mix(in srgb, var(--accent) 50%, transparent)" strokeWidth="1.8" />
            <path d="M36 100 L54 72 L68 88 L80 74 L104 100Z" fill="color-mix(in srgb, var(--accent) 16%, transparent)" stroke="color-mix(in srgb, var(--accent) 40%, transparent)" strokeWidth="1.4" strokeLinejoin="round" />
            <circle cx="96" cy="58" r="8" fill="color-mix(in srgb, var(--accent) 22%, transparent)" stroke="color-mix(in srgb, var(--accent) 55%, transparent)" strokeWidth="1.6" />
            <g stroke="color-mix(in srgb, var(--accent) 45%, transparent)" strokeWidth="1.4" strokeLinecap="round">
              <line x1="96" y1="46" x2="96" y2="43" /><line x1="96" y1="70" x2="96" y2="73" /><line x1="84" y1="58" x2="81" y2="58" /><line x1="108" y1="58" x2="111" y2="58" />
              <line x1="87.5" y1="49.5" x2="85.4" y2="47.4" /><line x1="104.5" y1="66.5" x2="106.6" y2="68.6" /><line x1="104.5" y1="49.5" x2="106.6" y2="47.4" /><line x1="87.5" y1="66.5" x2="85.4" y2="68.6" />
            </g>
          </svg>
        </div>
      )}
      {children}
    </>
  );
}
