"use client";

import { memo } from "react";
import type { ManagedProject, SessionInfo } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { DirectoryPicker } from "./DirectoryPicker";
import { ProjectLaunchConfigDialog } from "./ProjectLaunchConfigDialog";
import { ProviderUsageBar } from "./ProviderUsageBar";
import { toast } from "./ui/toast";
import { comparableProjectPath } from "@/lib/comparable-path";
import { MAX_PROJECT_SESSIONS, buildSessionTree } from "./SessionSidebar-helpers";
import { ProjectRow, ProjectWorktreeSwitcher } from "./SessionSidebar-rows";
import { useSessionSidebarData } from "@/hooks/useSessionSidebarData";
import { SessionSidebarHeader, SessionSidebarWorkspaceHeader, SessionSidebarFooter, SessionSidebarStatus } from "./sidebar/SessionSidebarChrome";


interface Props {
  selectedSessionId: string | null;
  /** The active session can exist in memory before its JSONL file is flushed. */
  optimisticSession?: SessionInfo | null;
  onSelectSession: (session: SessionInfo, isRestore?: boolean) => void;
  onNewSession?: (sessionId: string, cwd: string) => void;
  initialSessionId?: string | null;
  skipInitialProjectSelection?: boolean;
  onInitialRestoreDone?: () => void;
  refreshKey?: number;
  onSessionDeleted?: (sessionId: string) => void;
  selectedCwd?: string | null;
  onCwdChange?: (cwd: string | null, projectRoot?: string | null) => void;
  onWorkspaceOptionsChange?: (projects: ManagedProject[], selectedProject: string | null, cwd: string | null) => void;
  addProjectOpen: boolean;
  setAddProjectOpen: (open: boolean) => void;
  /** Shows the provider usage bar above Settings; toggle lives in Settings. */
  usageVisible?: boolean;
  /** Opens the app settings (pinned sidebar footer row). */
  onOpenSettings?: () => void;
  /** True when an omp/ompweb update is available — shows a badge on the gear. */
  updateAvailable?: boolean;
  /** Opens the archived sessions browser. */
  onOpenArchive?: () => void;
  /** True when settings full-page view is currently open. */
  settingsOpen?: boolean;
}






export const SessionSidebar = memo(function SessionSidebar({ selectedSessionId, optimisticSession, onSelectSession, onNewSession, initialSessionId, skipInitialProjectSelection, onInitialRestoreDone, refreshKey, onSessionDeleted, selectedCwd: selectedCwdProp, onCwdChange, onWorkspaceOptionsChange, addProjectOpen, setAddProjectOpen, usageVisible = true, onOpenSettings, onOpenArchive, updateAvailable, settingsOpen = false }: Props) {


  const { t } = useI18n();
  const { loading, error, projectsError, selectedCwd, selectedProject, sortedProjects, visibleProjectEntries, treesByProject, projectActivity, expandedProjectKeys, filtersActive, runningSessionIds, unreadSessionIds, relativeTimeNow, homeDir, sessionRefreshDone, addProjectBusy, addProjectError, setAddProjectError, commitAddProject, launchConfigProject, setLaunchConfigProject, handleUpdateProjectPresentation, draggedProjectPath, setDraggedProjectPath, removeProjectPath, handleProjectDrop, handleMoveProject, handleRemoveProject, searchOpen, setSearchOpen, searchQuery, setSearchQuery, runningOnly, setRunningOnly, searchInputRef, importing, importInputRef, handleImportSession, activeGitState, showWorktreeSwitcher, worktreeBranchForProject, wtDropdownOpen, wtNewOpen, setWtNewOpen, wtNewBranch, setWtNewBranch, wtError, setWtError, wtBusy, wtConfirmRemove, setWtConfirmRemove, wtToggleRef, wtNewInputRef, handleCreateWorktree, handleRemoveWorktree, closeWorktreeDropdown, toggleWorktrees, setSelectedCwd, loadSessions, loadProjects, activateProject, toggleProjectExpanded, handleSelectSessionFromList, startNewSession, handleSessionDeleted } = useSessionSidebarData({ selectedSessionId, optimisticSession, onSelectSession, onNewSession, initialSessionId, skipInitialProjectSelection, onInitialRestoreDone, refreshKey, onSessionDeleted, selectedCwd: selectedCwdProp, onCwdChange, onWorkspaceOptionsChange, setAddProjectOpen });


  // row. Non-Git projects intentionally render no Git affordance at all. The
  // switcher shows the ACTIVE repo's own worktrees/branches only.
  const activeProjectSwitcher = showWorktreeSwitcher && activeGitState ? (
    <ProjectWorktreeSwitcher
      worktreeState={activeGitState}
      selectedCwd={selectedCwd}
      homeDir={homeDir}
      wtDropdownOpen={wtDropdownOpen}
      wtNewOpen={wtNewOpen}
      setWtNewOpen={setWtNewOpen}
      wtNewBranch={wtNewBranch}
      setWtNewBranch={setWtNewBranch}
      wtError={wtError}
      setWtError={setWtError}
      wtBusy={wtBusy}
      wtConfirmRemove={wtConfirmRemove}
      setWtConfirmRemove={setWtConfirmRemove}
      onSelectWorktree={(path) => {
        setSelectedCwd(path);
        closeWorktreeDropdown();
      }}
      onCreateWorktree={handleCreateWorktree}
      onRemoveWorktree={(path, force) => void handleRemoveWorktree(path, force)}
      anchorRef={wtToggleRef}
      newInputRef={wtNewInputRef}
      onClose={closeWorktreeDropdown}
    />
  ) : null;

  return (
    <div className="session-sidebar" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {addProjectOpen && (
        <DirectoryPicker
          busy={addProjectBusy}
          error={addProjectError}
          onCancel={() => {
            setAddProjectOpen(false);
            setAddProjectError(null);
          }}
          onSelect={(path, launchConfig) => void commitAddProject(path, launchConfig)}
        />
      )}
      {launchConfigProject && (
        <ProjectLaunchConfigDialog
          projectPath={launchConfigProject.path}
          initialConfig={launchConfigProject.launchConfig}
          onClose={() => setLaunchConfigProject(null)}
          onSave={async (launchConfig) => {
            await handleUpdateProjectPresentation(launchConfigProject.path, { launchConfig });
            toast.info(t("sessionSidebar.launchConfigSaved"));
          }}
        />
      )}
      <SessionSidebarHeader
        selectedCwd={selectedCwd}
        refreshing={sessionRefreshDone}
        importing={importing}
        importInputRef={importInputRef}
        onNewSession={() => startNewSession(selectedCwd)}
        onOpenArchive={onOpenArchive}
        onImport={(file) => void handleImportSession(file)}
        onRefresh={() => { loadSessions(false); void loadProjects(); }}
      />
      <SessionSidebarWorkspaceHeader
        searchOpen={searchOpen}
        runningOnly={runningOnly}
        searchQuery={searchQuery}
        searchInputRef={searchInputRef}
        onSearchOpenChange={setSearchOpen}
        onSearchQueryChange={setSearchQuery}
        onRunningOnlyChange={setRunningOnly}
        onAddProject={() => { setAddProjectOpen(true); setAddProjectError(null); }}
      />

      {/* Workspaces */}
        <div
          className="session-sidebar-scroll"
          style={{
            flex: "1 1 auto",
            overflowY: "auto",
            padding: "2px 10px 10px",
            minHeight: 80,
          }}
        >
          <SessionSidebarStatus
            loading={loading}
            projectsError={projectsError}
            sessionsError={error}
            hasProjects={sortedProjects.length > 0}
            hasMatches={visibleProjectEntries.length > 0}
            onRetry={() => { loadSessions(false); void loadProjects(); }}
          />

          {visibleProjectEntries.map(({ project, sessions }) => {
            const tree = treesByProject.get(project.path) ?? buildSessionTree(sessions);
            // Sessions group under a project through the case-folded comparable
            // form (see groupSessionsByProject), so the active highlight must
            // use the same comparison: a session whose cwd/projectRoot spells
            // the project folder with different casing (Windows/NTFS) lands in
            // this row — the row must light up for it too.
            const isActive = selectedProject !== null && comparableProjectPath(selectedProject) === comparableProjectPath(project.path);
            // Each project's own branch comes from its own cached Git state —
            // a project never inherits another repo's branch. Only the active
            // repo's row owns the single switcher anchor so the dropdown opens
            // against the correct row.
            const projectBranch = worktreeBranchForProject(project.path);
            return (
              <ProjectRow
                key={project.path}
                project={project}
                isActive={isActive}
                activity={projectActivity.get(comparableProjectPath(project.path))}
                tree={tree}
                isExpanded={expandedProjectKeys.has(comparableProjectPath(project.path))}
                hiddenCount={filtersActive ? 0 : Math.max(0, tree.length - MAX_PROJECT_SESSIONS)}
                selectedSessionId={selectedSessionId}
                runningSessionIds={runningSessionIds}
                unreadSessionIds={unreadSessionIds}
                relativeTimeNow={relativeTimeNow}
                onActivate={activateProject}
                onNewSession={startNewSession}
                onToggleExpand={toggleProjectExpanded}
                onRemoveProject={handleRemoveProject}
                onEditLaunchConfig={setLaunchConfigProject}
                onUpdatePresentation={handleUpdateProjectPresentation}
                onDragPathChange={setDraggedProjectPath}
                onDropProject={(path) => void handleProjectDrop(path)}
                onMoveProject={(path, delta) => void handleMoveProject(path, delta)}
                isDragTarget={draggedProjectPath !== null && draggedProjectPath !== project.path}
                removeBusy={removeProjectPath === project.path}
                onSelectSession={handleSelectSessionFromList}
                onRenamed={loadSessions}
                onSessionDeleted={handleSessionDeleted}
                activeWorktreeSwitcher={isActive ? activeProjectSwitcher : null}
                worktreeBranch={projectBranch}
                worktreeToggleRef={isActive && projectBranch ? wtToggleRef : undefined}
                worktreeOpen={isActive ? wtDropdownOpen : false}
                onToggleWorktrees={isActive ? toggleWorktrees : undefined}
                homeDir={homeDir}
              />
            );
          })}
        </div>

      {/* Provider usage bar — pinned above Settings */}
      {usageVisible && <ProviderUsageBar />}
      <SessionSidebarFooter active={settingsOpen} updateAvailable={updateAvailable} onOpenSettings={onOpenSettings} />
    </div>
  );
});







