"use client";

import type { ChangeEvent, RefObject } from "react";
import { Archive, Check, ChevronRight, FileUp, Plus, RefreshCw, Search, Settings2, SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Tooltip } from "../ui/primitives";
import { OmpWebTitle, SIDEBAR_BUTTON_TRANSITION, SidebarIconButton } from "../SessionSidebar-chrome";

export function SessionSidebarHeader({ selectedCwd, refreshing, importing, importInputRef, onNewSession, onOpenArchive, onImport, onRefresh }: {
  selectedCwd: string | null;
  refreshing: boolean;
  importing: boolean;
  importInputRef: RefObject<HTMLInputElement | null>;
  onNewSession: () => void;
  onOpenArchive?: () => void;
  onImport: (file: File | null) => void;
  onRefresh: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="sidebar-brand-header" style={{ padding: "10px 10px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="sidebar-brand-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <OmpWebTitle />
        <div className="sidebar-brand-actions" style={{ display: "flex", gap: 2 }}>
          {onOpenArchive && <Tooltip content={t("sessionSidebar.archiveBrowserTitle")} side="bottom"><SidebarIconButton label={t("sessionSidebar.archiveBrowser")} onClick={onOpenArchive}><Archive size={14} strokeWidth={1.9} aria-hidden="true" /></SidebarIconButton></Tooltip>}
          <Tooltip content={t("sessionSidebar.importTitle")} side="bottom"><SidebarIconButton label={t("sessionSidebar.import")} onClick={() => importInputRef.current?.click()} disabled={importing}><FileUp size={14} strokeWidth={1.9} aria-hidden="true" /></SidebarIconButton></Tooltip>
          <Tooltip content={t("sessionSidebar.refresh")} side="bottom"><SidebarIconButton label={t("sessionSidebar.refresh")} active={refreshing} onClick={onRefresh}>{refreshing ? <Check size={14} strokeWidth={2.2} aria-hidden="true" /> : <RefreshCw size={14} strokeWidth={1.9} aria-hidden="true" />}</SidebarIconButton></Tooltip>
        </div>
      </div>
      <input ref={importInputRef} type="file" accept=".jsonl,.json,application/json,application/jsonl" style={{ display: "none" }} onChange={(event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0] ?? null; event.target.value = ""; onImport(file); }} />
      <button onClick={onNewSession} disabled={!selectedCwd} className="sidebar-new-session" title={selectedCwd ? t("sessionSidebar.newSessionIn", { cwd: selectedCwd }) : t("sessionSidebar.selectProjectFirst")} style={{ width: "100%", height: 34, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "transparent", border: "1px solid transparent", borderRadius: "var(--radius-control)", color: selectedCwd ? "var(--text-muted)" : "var(--text-dim)", cursor: selectedCwd ? "pointer" : "not-allowed", fontSize: 12, fontWeight: 600, letterSpacing: "-0.01em", opacity: selectedCwd ? 1 : 0.65, transition: SIDEBAR_BUTTON_TRANSITION }} onMouseEnter={(event) => { if (!selectedCwd) return; event.currentTarget.style.background = "var(--bg-hover)"; event.currentTarget.style.borderColor = "var(--border)"; }} onMouseLeave={(event) => { event.currentTarget.style.background = "transparent"; event.currentTarget.style.borderColor = "transparent"; }}><Plus size={15} strokeWidth={2.2} style={{ color: "var(--accent)", flexShrink: 0 }} aria-hidden="true" /><span>{t("sessionSidebar.new")}</span></button>
    </div>
  );
}

export function SessionSidebarWorkspaceHeader({ searchOpen, runningOnly, searchQuery, searchInputRef, onSearchOpenChange, onSearchQueryChange, onRunningOnlyChange, onAddProject }: {
  searchOpen: boolean;
  runningOnly: boolean;
  searchQuery: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onSearchOpenChange: (open: boolean) => void;
  onSearchQueryChange: (query: string) => void;
  onRunningOnlyChange: (value: boolean) => void;
  onAddProject: () => void;
}) {
  const { t } = useI18n();
  const toggleSearch = () => { const open = !searchOpen; onSearchOpenChange(open); if (open) setTimeout(() => searchInputRef.current?.focus(), 0); else onSearchQueryChange(""); };
  return <>
    <div className="sidebar-workspace-header" style={{ flexShrink: 0, padding: "4px 10px 2px", display: "flex", alignItems: "center", gap: 2 }}>
      <span className="sidebar-workspace-heading" style={{ flex: 1, color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{t("projects.heading")}</span>
      <SidebarIconButton label={t("sessionSidebar.search")} title={t("sessionSidebar.searchTitle")} active={searchOpen} onClick={toggleSearch}><Search size={15} strokeWidth={1.9} aria-hidden="true" /></SidebarIconButton>
      <SidebarIconButton label={t("sessionSidebar.filterRunning")} title={t("sessionSidebar.filterRunningTitle")} active={runningOnly} onClick={() => onRunningOnlyChange(!runningOnly)}><SlidersHorizontal size={15} strokeWidth={1.9} aria-hidden="true" /></SidebarIconButton>
      <SidebarIconButton label={t("projects.add")} title={t("projects.addTitle")} onClick={onAddProject}><Plus size={15} strokeWidth={1.9} aria-hidden="true" /></SidebarIconButton>
    </div>
    {searchOpen && <div className="sidebar-search-wrap" style={{ padding: "0 10px 6px", flexShrink: 0 }}><input className="sidebar-session-search" ref={searchInputRef} value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onSearchOpenChange(false); onSearchQueryChange(""); } }} placeholder={t("sessionSidebar.searchPlaceholder")} aria-label={t("sessionSidebar.search")} style={{ width: "100%", height: 27, boxSizing: "border-box", padding: "0 9px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", outline: "none", color: "var(--text)", fontSize: 12 }} onFocus={(event) => { event.currentTarget.style.borderColor = "var(--accent)"; }} onBlur={(event) => { event.currentTarget.style.borderColor = "var(--border)"; }} /></div>}
  </>;
}

export function SessionSidebarFooter({ active, updateAvailable, onOpenSettings }: { active: boolean; updateAvailable?: boolean; onOpenSettings?: () => void }) {
  const { t } = useI18n();
  return <div className="sidebar-footer" style={{ borderTop: "1px solid var(--border)", flexShrink: 0 }}><button className="sidebar-settings-row" data-active={active} onClick={onOpenSettings} title={t("chatInput.settings")} aria-label={t("chatInput.settings")} style={{ width: "100%", height: 36, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 9, padding: "0 12px", background: active ? "var(--bg-selected)" : "none", border: "none", color: active ? "var(--text)" : "var(--text-muted)", cursor: "pointer", textAlign: "left", transition: SIDEBAR_BUTTON_TRANSITION }} onMouseEnter={(event) => { event.currentTarget.style.background = active ? "var(--bg-selected)" : "var(--bg-hover)"; event.currentTarget.style.color = "var(--text)"; }} onMouseLeave={(event) => { event.currentTarget.style.background = active ? "var(--bg-selected)" : "none"; event.currentTarget.style.color = active ? "var(--text)" : "var(--text-muted)"; }}><Settings2 size={14} strokeWidth={1.9} style={{ flexShrink: 0 }} aria-hidden="true" /><span style={{ flex: 1, fontSize: 12, fontWeight: active ? 600 : 500 }}>{t("chatInput.settings")}</span>{updateAvailable && <span aria-label={t("settingsConfig.updateAvailable")} title={t("settingsConfig.updateAvailable")} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 0 2px color-mix(in srgb, var(--accent) 15%, transparent)" }} />}{active && <ChevronRight size={13} strokeWidth={2} style={{ color: "var(--accent)" }} aria-hidden="true" />}</button></div>;
}

export function SessionSidebarStatus({ loading, projectsError, sessionsError, hasProjects, hasMatches, onRetry }: {
  loading: boolean;
  projectsError: string | null;
  sessionsError: string | null;
  hasProjects: boolean;
  hasMatches: boolean;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  const error = projectsError ?? sessionsError;
  if (loading) return <div role="status" aria-live="polite" aria-label={t("sessionSidebar.loading")} style={{ display: "grid", gap: 10, padding: "10px 4px" }}><div aria-hidden="true" className="skeleton" style={{ width: "78%", height: 18 }} /><div aria-hidden="true" className="skeleton" style={{ width: "92%", height: 30 }} /><div aria-hidden="true" className="skeleton" style={{ width: "86%", height: 30 }} /><div aria-hidden="true" className="skeleton" style={{ width: "68%", height: 30 }} /></div>;
  if (error) return <div role="alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 4px", color: "var(--status-error)", fontSize: 12 }}><span style={{ minWidth: 0, flex: "1 1 auto", overflowWrap: "anywhere" }}>{error}</span><button className="load-retry-button" type="button" onClick={onRetry} style={{ minHeight: 32, padding: "4px 8px", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: "var(--bg-panel)", color: "var(--text)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{t("sessionSidebar.refresh")}</button></div>;
  if (!hasProjects) return <div style={{ padding: "10px 4px", color: "var(--text-muted)", fontSize: 12, lineHeight: 1.5 }}>{t("projects.noProjects")}</div>;
  if (!hasMatches) return <div style={{ padding: "14px 4px", color: "var(--text-dim)", fontSize: 11.5, lineHeight: 1.5 }}>{t("sessionSidebar.noMatches")}</div>;
  return null;
}
