"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Tab } from "../TabBar";
export type RightPanelView = "explorer" | "git" | "file";

export interface RightPanelWorkspaceModel {
  /** Root currently browsed by Explorer and Git. */
  explorerRoot: string | null;
  /** Root associated with the active session. */
  activeRoot: string | null;
  /** The active file, when the file view is selected. */
  activeFile: Tab | null;
}

export interface RightPanelStatusModel {
  searchOpen: boolean;
  uploadBusy: boolean;
  changedFileCount: number;
  isRepository: boolean;
  refreshing: boolean;
  revealPath: string | null;
}

export interface RightPanelNavigationActions {
  selectView: (view: RightPanelView) => void;
  selectFileTab: (id: string) => void;
  closeFileTab: (id: string) => void;
  closeOtherFileTabs: () => void;
  closeAllFileTabs: () => void;
}

export interface RightPanelDiscoveryActions {
  toggleSearch: () => void;
  revealActiveFile: () => void;
  collapseExplorer: () => void;
}

export interface RightPanelMutationActions {
  openUploadPicker: () => void;
  mentionActiveFile: () => void;
  copyActiveFilePath: () => void;
  downloadActiveFile: () => void;
}

export interface RightPanelRefreshActions {
  refreshExplorer: () => void;
}

export interface RightPanelViewModel {
  view: RightPanelView;
  tabs: Tab[];
  workspace: RightPanelWorkspaceModel;
  status: RightPanelStatusModel;
  navigation: RightPanelNavigationActions;
  discovery: RightPanelDiscoveryActions;
  mutation: RightPanelMutationActions;
  refresh: RightPanelRefreshActions;
}

const RightPanelContext = createContext<RightPanelViewModel | null>(null);

export function RightPanelProvider({ value, children }: { value: RightPanelViewModel; children: ReactNode }) {
  return <RightPanelContext.Provider value={value}>{children}</RightPanelContext.Provider>;
}

export function useRightPanel(): RightPanelViewModel {
  const value = useContext(RightPanelContext);
  if (!value) throw new Error("useRightPanel must be used within RightPanelProvider");
  return value;
}
