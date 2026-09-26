"use client";

import { memo, useEffect, useMemo, useState, type RefObject } from "react";
import { Files, Folder, GitBranch } from "lucide-react";
import type { Tab } from "./TabBar";
import { FileExplorer, type FileExplorerHandle } from "./FileExplorer";
import { GitChangesPanel } from "./GitChangesPanel";
import { FileViewer } from "./FileViewer";
import { useI18n } from "@/lib/i18n";
import { getFileName } from "@/lib/file-paths";
import { RightPanelProvider, type RightPanelView, type RightPanelViewModel } from "./right-panel/RightPanelContext";
import { WorkspaceContext } from "./right-panel/PanelHeader";
import { RightPanelToolbar } from "./right-panel/RightPanelToolbar";

export type { RightPanelView } from "./right-panel/RightPanelContext";

interface Props {
  fileTabs: Tab[];
  activeFileTabId: string | null;
  rightView: RightPanelView;
  onSelectView: (view: RightPanelView) => void;
  rightPanelOpen: boolean;
  rightPanelWidth: number | null;
  rightPanelResizing: boolean;
  rightPanelRef: RefObject<HTMLDivElement | null>;
  fileExplorerRef: RefObject<FileExplorerHandle | null>;
  revealPath: string | null;
  onRevealDone: () => void;
  explorerCwd: string | null;
  explorerRefreshKey: number;
  fileSearchOpen: boolean;
  onToggleFileSearch: () => void;
  onFileSearchOpenChange: (open: boolean) => void;
  explorerUploadBusy: boolean;
  onUploadBusyChange: (busy: boolean) => void;
  explorerGitCount: number;
  explorerIsRepo: boolean;
  explorerRefreshing: boolean;
  isMobile: boolean;
  isCompactOverlay: boolean;
  onOpenFile: (filePath: string, fileName: string, sourceSessionId?: string | null, sourceCwd?: string | null) => void;
  onSelectFileTab: (id: string) => void;
  onCloseFileTab: (id: string) => void;
  onCloseOtherFileTabs: () => void;
  onCloseAllFileTabs: () => void;
  onMentionActiveFile: () => void;
  onCopyActiveFilePath: () => void;
  onDownloadActiveFile: () => void;
  onRevealActiveFile: () => void;
  onExplorerRefresh: () => void;
  onExplorerRefreshDone: () => void;
  onAtMention: (relativePath: string, isDir: boolean) => void;
  onAtMentions: (relativePaths: string[]) => void;
  onMentionLines: (relativePath: string, startLine: number, endLine: number) => void;
  onExplorerGitStatus: (changedCount: number, isRepo: boolean) => void;
  onResetRightPanelWidth: () => void;
  onRightPanelResizeStart: (e: React.MouseEvent) => void;
  onRightPanelResizeKey: (e: React.KeyboardEvent) => void;
}

// Memo boundary: AppShell re-renders on polls, timers, and session updates
// while agents run. The panel hosts the full file tree, the changes list, and
// every open viewer — reconciling all of that per update janks the chat, so
// this component only re-renders when one of its own props actually changes
// (all callbacks are useCallback-stable in AppShell for the same reason).
export const RightPanel = memo(function RightPanel({
  fileTabs,
  activeFileTabId,
  rightView,
  onSelectView,
  rightPanelOpen,
  rightPanelWidth,
  rightPanelResizing,
  rightPanelRef,
  fileExplorerRef,
  revealPath,
  onRevealDone,
  explorerCwd,
  explorerRefreshKey,
  fileSearchOpen,
  onToggleFileSearch,
  onFileSearchOpenChange,
  explorerUploadBusy,
  onUploadBusyChange,
  explorerGitCount,
  explorerIsRepo,
  explorerRefreshing,
  isMobile,
  isCompactOverlay,
  onOpenFile,
  onSelectFileTab,
  onCloseFileTab,
  onCloseOtherFileTabs,
  onCloseAllFileTabs,
  onMentionActiveFile,
  onCopyActiveFilePath,
  onDownloadActiveFile,
  onRevealActiveFile,
  onExplorerRefresh,
  onExplorerRefreshDone,
  onAtMention,
  onAtMentions,
  onMentionLines,
  onExplorerGitStatus,
  onResetRightPanelWidth,
  onRightPanelResizeStart,
  onRightPanelResizeKey,
}: Props) {
  const { t } = useI18n();
  const activeFileTab = fileTabs.find((tab) => tab.id === activeFileTabId) ?? null;
  const gitBadge = explorerIsRepo ? explorerGitCount : 0;
  const [visitedViews, setVisitedViews] = useState<Set<RightPanelView>>(() => new Set(["explorer"]));
  useEffect(() => {
    setVisitedViews((previous) => {
      if (previous.has(rightView)) return previous;
      const next = new Set(previous);
      next.add(rightView);
      return next;
    });
  }, [rightView]);
  const panelModel = useMemo<RightPanelViewModel>(() => ({
    view: rightView,
    tabs: fileTabs,
    workspace: {
      explorerRoot: explorerCwd,
      activeRoot: activeFileTab?.sourceCwd ?? null,
      activeFile: activeFileTab,
    },
    status: {
      searchOpen: fileSearchOpen,
      uploadBusy: explorerUploadBusy,
      changedFileCount: explorerGitCount,
      isRepository: explorerIsRepo,
      refreshing: explorerRefreshing,
      revealPath,
    },
    navigation: {
      selectView: onSelectView,
      selectFileTab: onSelectFileTab,
      closeFileTab: onCloseFileTab,
      closeOtherFileTabs: onCloseOtherFileTabs,
      closeAllFileTabs: onCloseAllFileTabs,
    },
    discovery: {
      toggleSearch: onToggleFileSearch,
      revealActiveFile: onRevealActiveFile,
      collapseExplorer: () => fileExplorerRef.current?.collapseAll(),
    },
    mutation: {
      openUploadPicker: () => fileExplorerRef.current?.openUploadPicker(),
      mentionActiveFile: onMentionActiveFile,
      copyActiveFilePath: onCopyActiveFilePath,
      downloadActiveFile: onDownloadActiveFile,
    },
    refresh: { refreshExplorer: onExplorerRefresh },
  }), [
    activeFileTab, explorerCwd, explorerGitCount, explorerIsRepo, explorerRefreshing,
    explorerUploadBusy, fileExplorerRef, fileSearchOpen,
    fileTabs, onCloseAllFileTabs, onCloseFileTab, onCloseOtherFileTabs,
    onCopyActiveFilePath, onDownloadActiveFile, onExplorerRefresh,
    onMentionActiveFile, onRevealActiveFile, onSelectFileTab, onSelectView,
    onToggleFileSearch, revealPath, rightView,
  ]);

  return (
    <>
      {/* Resize handle — desktop only, hidden while the panel is closed */}
      {!isMobile && rightPanelOpen && (
        <div
          className="right-panel-resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label={t("appShell.resizeFilePanel")}
          tabIndex={0}
          onMouseDown={onRightPanelResizeStart}
          onDoubleClick={onResetRightPanelWidth}
          onKeyDown={onRightPanelResizeKey}
          title={t("appShell.resizeFilePanelTitle")}
          style={{
            width: 5,
            flexShrink: 0,
            marginRight: -5,
            cursor: "col-resize",
            background: "transparent",
            zIndex: 205,
            outline: "none",
            transition: "background var(--dur-fast) var(--ease-out-warm)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 35%, transparent)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          onFocus={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 35%, transparent)"; }}
          onBlur={(e) => { e.currentTarget.style.background = "transparent"; }}
        />
      )}
      {/* Right panel: file viewer — always mounted, width animated via CSS */}
      <aside
        id="workspace-file-panel"
        ref={rightPanelRef}
        className={`right-panel-container right-panel-workspace-shell${rightPanelOpen ? " right-panel-open" : " right-panel-closed"}${rightPanelResizing ? " right-panel-resizing" : ""}`}
        role={isCompactOverlay ? "dialog" : undefined}
        aria-modal={isCompactOverlay ? true : undefined}
        aria-label={t("appShell.filePanel")}
        aria-hidden={!rightPanelOpen}
        tabIndex={isCompactOverlay ? -1 : undefined}
        inert={!rightPanelOpen ? true : undefined}
        style={{
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid var(--border)",
          background: "var(--bg)",
          zIndex: isCompactOverlay ? 210 : undefined,
          ...(!isMobile && rightPanelWidth !== null ? { "--right-panel-width": `${rightPanelWidth}px` } : {}),
        }}
      >
        <RightPanelProvider value={panelModel}>
        <RightPanelToolbar />

        {/* Explorer tab view — kept mounted so expansion survives tab switches. */}
        <div id="workspace-file-panel-explorer" className="right-panel-view right-panel-explorer-view" role="tabpanel" aria-label={t("sessionSidebar.explorer")} style={{ display: rightView === "explorer" ? "flex" : "none" }}>
          {visitedViews.has("explorer") && (explorerCwd ? (
            <>
              <WorkspaceContext
                root={explorerCwd}
                changedCount={explorerGitCount}
                isRepository={explorerIsRepo}
                changedLabel={t("sessionSidebar.explorerChanged", { count: explorerGitCount })}
                cleanLabel={t("sessionSidebar.explorerClean")}
              />
              <div className="right-panel-view-body">
                <FileExplorer
                  ref={fileExplorerRef}
                  cwd={explorerCwd}
                  onOpenFile={(filePath, fileName) => onOpenFile(filePath, fileName, undefined, explorerCwd)}
                  refreshKey={explorerRefreshKey}
                  onAtMention={onAtMention}
                  onAtMentions={onAtMentions}
                  onUploadBusyChange={onUploadBusyChange}
                  onRefreshDone={onExplorerRefreshDone}
                  fileSearchOpen={fileSearchOpen}
                  onFileSearchOpenChange={onFileSearchOpenChange}
                  activeFilePath={activeFileTab?.filePath ?? null}
                  revealPath={revealPath}
                  onRevealDone={onRevealDone}
                  onGitStatusChange={onExplorerGitStatus}
                />
              </div>
            </>
          ) : (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 24, textAlign: "center" }}>
              <Folder size={26} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--text-dim)" }} />
              <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>{t("sessionSidebar.explorer")}</div>
              <div style={{ color: "var(--text-dim)", fontSize: 11, lineHeight: 1.6, maxWidth: 260 }}>{t("sessionSidebar.selectProjectFirst")}</div>
            </div>
          ))}
        </div>
        {/* Git changes tab view — kept mounted so selection survives tab switches. */}
        <div id="workspace-file-panel-git" className="right-panel-view right-panel-git-view" role="tabpanel" aria-label={t("tabBar.git")} style={{ display: rightView === "git" ? "flex" : "none" }}>
          {visitedViews.has("git") && (explorerCwd ? (
            <>
              <WorkspaceContext
                root={explorerCwd}
                changedCount={explorerGitCount}
                isRepository={explorerIsRepo}
                changedLabel={t("sessionSidebar.explorerChanged", { count: explorerGitCount })}
                cleanLabel={t("sessionSidebar.explorerClean")}
              />
              <GitChangesPanel
                cwd={explorerCwd}
                refreshKey={explorerRefreshKey}
                onOpenFile={(filePath, fileName) => onOpenFile(filePath, fileName, undefined, explorerCwd)}
                onAtMention={onAtMention}
                onRefreshDone={onExplorerRefreshDone}
              />
            </>
          ) : (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 24, textAlign: "center" }}>
              <GitBranch size={26} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--text-dim)" }} />
              <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>{t("tabBar.git")}</div>
              <div style={{ color: "var(--text-dim)", fontSize: 11, lineHeight: 1.6, maxWidth: 260 }}>{t("sessionSidebar.selectProjectFirst")}</div>
            </div>
          ))}
        </div>
        {/* Keep open viewers mounted so switching tabs preserves scroll and preview state. */}
        <div id="workspace-file-panel-file" className="right-panel-view right-panel-file-view" role="tabpanel" aria-label={activeFileTab?.filePath ?? t("appShell.filePanel")} style={{ display: rightView === "file" ? "flex" : "none" }}>
          {activeFileTab?.sourceCwd && (
            <WorkspaceContext
              root={activeFileTab.sourceCwd}
              changedCount={explorerGitCount}
              isRepository={explorerIsRepo && activeFileTab.sourceCwd === explorerCwd}
              changedLabel={t("sessionSidebar.explorerChanged", { count: explorerGitCount })}
              cleanLabel={t("sessionSidebar.explorerClean")}
            />
          )}
          {fileTabs.length > 0 ? fileTabs.map((tab) => (
            <div key={tab.id} className="right-panel-file-slot" style={{ display: tab.id === activeFileTabId ? "block" : "none" }}>
              <FileViewer
                filePath={tab.filePath}
                cwd={tab.sourceCwd ?? undefined}
                sourceSessionId={tab.sourceSessionId}
                gitRefreshKey={explorerRefreshKey}
                active={tab.id === activeFileTabId && rightPanelOpen && rightView === "file"}
                onMentionLines={tab.id === activeFileTabId && rightPanelOpen && rightView === "file" ? onMentionLines : undefined}
                onOpenFile={(filePath) => onOpenFile(
                  filePath,
                  getFileName(filePath),
                  tab.sourceSessionId,
                  tab.sourceCwd,
                )}
              />
            </div>
          )) : (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 24, textAlign: "center" }}>
              <Files size={26} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--text-dim)" }} />
              <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>{t("appShell.noFileOpen")}</div>
              <div style={{ color: "var(--text-dim)", fontSize: 11, lineHeight: 1.6, maxWidth: 260 }}>{t("appShell.noFileOpenHint")}</div>
            </div>
          )}
        </div>
        </RightPanelProvider>
      </aside>
    </>
  );
});
