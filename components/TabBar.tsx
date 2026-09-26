"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { Folder, GitBranch, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getFileIcon } from "./FileIcons";

export interface Tab {
  id: string;
  label: string;
  filePath: string;
  sourceSessionId?: string | null;
  sourceCwd?: string | null;
}

interface Props {
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  /** Pinned Explorer tab rendered before the file tabs (right-panel tab redesign). */
  explorerSelected?: boolean;
  onSelectExplorer?: () => void;
  /** Changed-file count badge on the Explorer tab. */
  explorerBadge?: number;
  /** Pinned Git changes tab rendered after Explorer (Tauri parity). */
  gitSelected?: boolean;
  onSelectGit?: () => void;
  /** Changed-file count badge on the Git tab. */
  gitBadge?: number;
}

export function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab, explorerSelected = false, onSelectExplorer, explorerBadge = 0, gitSelected = false, onSelectGit, gitBadge = 0 }: Props) {
  const { t } = useI18n();
  const listRef = useRef<HTMLDivElement>(null);
  const orderedTabIds = [
    ...(onSelectExplorer ? ["explorer"] : []),
    ...(onSelectGit ? ["git"] : []),
    ...tabs.map((tab) => tab.id),
  ];

  const selectTabById = (id: string) => {
    if (id === "explorer") onSelectExplorer?.();
    else if (id === "git") onSelectGit?.();
    else {
      const tab = tabs.find((item) => item.id === id);
      if (tab) onSelectTab(tab.id);
    }
  };

  const focusTabById = (id: string) => {
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(id)}"]`)?.focus();
    });
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectTabById(id);
      return;
    }

    const index = orderedTabIds.indexOf(id);
    if (index < 0 || orderedTabIds.length === 0) return;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % orderedTabIds.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + orderedTabIds.length) % orderedTabIds.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = orderedTabIds.length - 1;
    if (nextIndex !== null) {
      event.preventDefault();
      const nextId = orderedTabIds[nextIndex];
      selectTabById(nextId);
      focusTabById(nextId);
      return;
    }

    if ((event.key === "Delete" || event.key === "Backspace") && tabs.some((tab) => tab.id === id)) {
      event.preventDefault();
      onCloseTab(id);
    }
  };

  // Keep the active tab visible when the bar overflows horizontally.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(activeTabId)}"]`);
    if (!active) return;
    const listRect = list.getBoundingClientRect();
    const tabRect = active.getBoundingClientRect();
    if (tabRect.left < listRect.left) {
      list.scrollLeft -= listRect.left - tabRect.left;
    } else if (tabRect.right > listRect.right) {
      list.scrollLeft += tabRect.right - listRect.right;
    }
  }, [activeTabId, tabs]);

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={t("appShell.filePanel")}
      aria-orientation="horizontal"
      className="tabbar-scroll"
    >
      {onSelectExplorer && (
        <div
          data-tab-id="explorer"
          className="tabbar-tab tabbar-destination ui-focus-ring"
          onClick={onSelectExplorer}
          role="tab"
          tabIndex={explorerSelected ? 0 : -1}
          aria-selected={explorerSelected}
          aria-label={t("sessionSidebar.explorer")}
          aria-controls="workspace-file-panel-explorer"
          title={explorerBadge > 0 ? t("sessionSidebar.explorerChanged", { count: explorerBadge }) : t("sessionSidebar.explorer")}
          onKeyDown={(event) => handleTabKeyDown(event, "explorer")}
          data-kind="explorer"
        >
          <span className="tabbar-active-marker" aria-hidden="true" />
          <span className="tabbar-tab-icon" aria-hidden="true">
            <Folder size={14} strokeWidth={2} />
          </span>
          <span className="tabbar-tab-label">{t("sessionSidebar.explorer")}</span>
          {explorerBadge > 0 && (
            <span className="tabbar-badge" aria-hidden="true">
              {explorerBadge > 99 ? "99+" : explorerBadge}
            </span>
          )}
        </div>
      )}
      {onSelectGit && (
        <div
          data-tab-id="git"
          className="tabbar-tab tabbar-destination ui-focus-ring"
          onClick={onSelectGit}
          role="tab"
          tabIndex={gitSelected ? 0 : -1}
          aria-selected={gitSelected}
          aria-label={t("tabBar.git")}
          aria-controls="workspace-file-panel-git"
          title={gitBadge > 0 ? t("sessionSidebar.explorerChanged", { count: gitBadge }) : t("tabBar.git")}
          onKeyDown={(event) => handleTabKeyDown(event, "git")}
          data-kind="git"
        >
          <span className="tabbar-active-marker" aria-hidden="true" />
          <span className="tabbar-tab-icon" aria-hidden="true">
            <GitBranch size={14} strokeWidth={2} />
          </span>
          <span className="tabbar-tab-label">{t("tabBar.git")}</span>
          {gitBadge > 0 && (
            <span className="tabbar-badge" aria-hidden="true">
              {gitBadge > 99 ? "99+" : gitBadge}
            </span>
          )}
        </div>
      )}
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            data-tab-id={tab.id}
            className="tabbar-tab tabbar-file ui-focus-ring"
            onClick={() => onSelectTab(tab.id)}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            aria-selected={isActive}
            aria-label={tab.filePath}
            aria-controls="workspace-file-panel-file"
            onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
            onMouseDown={(e) => {
              if (e.button === 1) e.preventDefault();
            }}
            onAuxClick={(e) => {
              if (e.button !== 1) return;
              e.preventDefault();
              e.stopPropagation();
              onCloseTab(tab.id);
            }}
          >
            <span className="tabbar-active-marker" aria-hidden="true" />
            <span className="tabbar-tab-icon" aria-hidden="true">
              {getFileIcon(tab.label, 14)}
            </span>
            <span className="tabbar-tab-label" title={tab.filePath}>{tab.label}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={(event) => event.stopPropagation()}
              className="tabbar-close"
              title={t("tabBar.close")}
              aria-label={t("tabBar.closeTab", { label: tab.label })}
            >
              <X size={12} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
