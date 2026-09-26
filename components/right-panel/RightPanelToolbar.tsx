"use client";

import type { ReactNode } from "react";
import { AtSign, ChevronsDownUp, Copy, Download, LocateFixed, RefreshCw, Search, Upload, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { TabBar } from "../TabBar";
import { useRightPanel } from "./RightPanelContext";
import { PanelActionGroup, PanelActions, PanelHeader, PanelIconAction, PanelTextAction } from "./PanelHeader";

export function RightPanelToolbar() {
  const { t } = useI18n();
  const panel = useRightPanel();
  const { activeFile, explorerRoot } = panel.workspace;
  const badge = panel.status.isRepository ? panel.status.changedFileCount : 0;

  let actions: ReactNode;
  if (panel.view === "explorer" && explorerRoot) {
    actions = (
      <PanelActions label={t("sessionSidebar.explorer")}>
        <PanelActionGroup>
          <PanelIconAction label={t("fileExplorer.searchFiles")} onClick={panel.discovery.toggleSearch} active={panel.status.searchOpen} pressed={panel.status.searchOpen}>
            <Search size={13} strokeWidth={2} aria-hidden="true" />
          </PanelIconAction>
          <PanelIconAction label={t("sessionSidebar.collapseExplorer")} onClick={panel.discovery.collapseExplorer}>
            <ChevronsDownUp size={13} strokeWidth={2} aria-hidden="true" />
          </PanelIconAction>
        </PanelActionGroup>
        <PanelActionGroup>
          <PanelIconAction label={t("sessionSidebar.uploadFilesTitle")} onClick={panel.mutation.openUploadPicker} disabled={panel.status.uploadBusy}>
            <Upload size={13} strokeWidth={2} aria-hidden="true" />
          </PanelIconAction>
        </PanelActionGroup>
        <PanelActionGroup>
          <PanelIconAction label={t("sessionSidebar.refreshExplorer")} onClick={panel.refresh.refreshExplorer} active={panel.status.refreshing}>
            <RefreshCw size={13} strokeWidth={2} aria-hidden="true" className={panel.status.refreshing ? "icon-spin" : undefined} />
          </PanelIconAction>
        </PanelActionGroup>
      </PanelActions>
    );
  } else if (panel.view === "git" && explorerRoot) {
    actions = (
      <PanelActions label={t("tabBar.git")}>
        <PanelActionGroup>
          <PanelIconAction label={t("gitChanges.refreshChanges")} onClick={panel.refresh.refreshExplorer} active={panel.status.refreshing}>
            <RefreshCw size={13} strokeWidth={2} aria-hidden="true" className={panel.status.refreshing ? "icon-spin" : undefined} />
          </PanelIconAction>
        </PanelActionGroup>
      </PanelActions>
    );
  } else if (panel.view === "file" && activeFile) {
    actions = (
      <PanelActions label={activeFile.filePath}>
        <PanelActionGroup>
          <PanelIconAction label={t("appShell.mentionFileInChat")} onClick={panel.mutation.mentionActiveFile} primary>
            <AtSign size={13} strokeWidth={2.2} aria-hidden="true" />
          </PanelIconAction>
        </PanelActionGroup>
        <PanelActionGroup>
          <PanelIconAction label={t("appShell.copyFilePath")} onClick={panel.mutation.copyActiveFilePath}>
            <Copy size={13} strokeWidth={2} aria-hidden="true" />
          </PanelIconAction>
          <PanelIconAction label={t("appShell.revealInExplorer")} onClick={panel.discovery.revealActiveFile} active={Boolean(panel.status.revealPath)}>
            <LocateFixed size={13} strokeWidth={2} aria-hidden="true" />
          </PanelIconAction>
          <PanelIconAction label={t("fileExplorer.downloadFile")} onClick={panel.mutation.downloadActiveFile}>
            <Download size={13} strokeWidth={2} aria-hidden="true" />
          </PanelIconAction>
        </PanelActionGroup>
        <PanelActionGroup>
          {panel.tabs.length > 1 && <PanelTextAction label={t("appShell.closeOthers")} accessibleLabel={t("appShell.closeOtherTabs")} onClick={panel.navigation.closeOtherFileTabs} />}
          <PanelIconAction label={t("appShell.closeAllTabs")} onClick={panel.navigation.closeAllFileTabs}>
            <X size={13} strokeWidth={2} aria-hidden="true" />
          </PanelIconAction>
        </PanelActionGroup>
      </PanelActions>
    );
  }

  return (
    <PanelHeader
      tabs={(
        <TabBar
          tabs={panel.tabs}
          activeTabId={panel.view === "file" ? activeFile?.id ?? "" : ""}
          onSelectTab={panel.navigation.selectFileTab}
          onCloseTab={panel.navigation.closeFileTab}
          explorerSelected={panel.view === "explorer"}
          onSelectExplorer={() => panel.navigation.selectView("explorer")}
          explorerBadge={badge}
          gitSelected={panel.view === "git"}
          onSelectGit={() => panel.navigation.selectView("git")}
          gitBadge={badge}
        />
      )}
      actions={actions}
    />
  );
}
