"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, RefreshCw, X } from "lucide-react";
import { Alert } from "@/components/ui/field";
import { getSubmitDuringRunBehavior, type SubmitDuringRunBehavior } from "@/lib/composer-prefs";
import { useFontSize } from "@/hooks/useFontSize";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSettingsController } from "@/hooks/useSettingsController";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useUiScale } from "@/hooks/useUiScale";
import type { AppUpdateInfo } from "./AppUpdateDialog";
import { SETTINGS_CATEGORIES, SettingsTabs, type SettingsTab } from "./SettingsTabs";
import { GeneralSettings } from "./settings/GeneralSettings";
import { IntelligenceSettings } from "./settings/IntelligenceSettings";
import { AgentsSettings, ExtensionsSettings, ProvidersSettings, UsageSettings } from "./settings/ManagedSettingsPanels";
import { ModelsSettings } from "./settings/ModelsSettings";
import { SafetySettings } from "./settings/SafetySettings";
import { SETTING_INDEX } from "./settings/settings-index";
import { SettingsHighlightContext, SettingsLayout, SettingsSearch } from "./settings/settings-primitives";
import { SettingsSearchResults } from "./settings/SettingsSearchResults";
import { SystemSettings } from "./settings/SystemSettings";

export interface SettingsConfigProps {
  activeTab: SettingsTab;
  toolCallsDefaultCollapsed: boolean;
  onToolCallsDefaultCollapsedChange: (collapsed: boolean) => void;
  providerUsageVisible: boolean;
  onProviderUsageVisibleChange: (visible: boolean) => void;
  scopeNativeSelectAll: boolean;
  onScopeNativeSelectAllChange: (enabled: boolean) => void;
  cwd: string | null;
  sessionId: string | null;
  onModelsSaved: () => void;
  onPluginsReloaded: () => void;
  appUpdate: AppUpdateInfo | null;
  ompUpdateAvailable?: boolean;
  ompUpdatesDisabled?: boolean;
  onRefreshAppUpdate: (force?: boolean) => Promise<AppUpdateInfo | null>;
  onOmpUpdateAvailabilityChange: (available: boolean) => void;
  onRequestAppUpdate: () => void;
  onSelectTab: (tab: SettingsTab) => void;
  onClose: () => void;
}

function readSoundPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const value = window.localStorage.getItem("omp-sound-enabled");
    return value === null ? true : value === "true";
  } catch {
    return true;
  }
}

export function SettingsConfig(props: SettingsConfigProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { fontSize, setFontSize } = useFontSize();
  const { uiScale, setUiScale } = useUiScale();
  const speech = useSpeechSynthesis();
  const [soundEnabled, setSoundEnabled] = useState(readSoundPreference);
  const [submitBehavior, setSubmitBehavior] = useState<SubmitDuringRunBehavior>(getSubmitDuringRunBehavior);
  const controller = useSettingsController({
    activeTab: props.activeTab,
    workspaceReady: props.cwd !== null,
    appUpdate: props.appUpdate,
    ompUpdateAvailable: props.ompUpdateAvailable,
    ompUpdatesDisabled: props.ompUpdatesDisabled,
    onRefreshAppUpdate: props.onRefreshAppUpdate,
    onOmpUpdateAvailabilityChange: props.onOmpUpdateAvailabilityChange,
    onSelectTab: props.onSelectTab,
    t,
    categories: SETTINGS_CATEGORIES,
    settingIndex: SETTING_INDEX,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing || event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof HTMLTextAreaElement) return;
      if (target instanceof HTMLInputElement && target.value.length > 0) return;
      if (target instanceof HTMLElement && target.closest("[contenteditable]:not([contenteditable='false'])")) return;
      props.onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [props.onClose]);

  const header: ReactNode = (
    <header className="settings-header">
      <div className="settings-header-identity">
        <button type="button" className="settings-back ui-focus-ring" onClick={props.onClose} aria-label={t("settingsConfig.back")} title={`${t("settingsConfig.back")} (Esc)`}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{t("settingsConfig.back")}</span>
        </button>
        <span className="settings-header-divider" aria-hidden="true" />
        <div className="settings-header-title-group">
          <h1>{t("settingsConfig.title")}</h1>
          {controller.nativeSavesInFlight > 0 ? (
            <span className="settings-save-status is-saving"><RefreshCw size={11} className="spin" aria-hidden="true" /> {t("settingsConfig.saving")}</span>
          ) : controller.nativeSettingsLoading ? (
            <span className="settings-save-status">{t("appShell.loading")}</span>
          ) : !controller.nativeSettingsError && (
            <span className="settings-save-status">{t("settingsConfig.saved")}</span>
          )}
        </div>
      </div>
      <div className="settings-header-actions">
        <SettingsSearch className="settings-header-search" value={controller.searchQuery} onChange={(query) => { controller.setSearchQuery(query); if (!query) controller.setHighlightId(null); }} onEscape={props.onClose} placeholder={t("settingsConfig.searchPlaceholder")} clearLabel={t("fileExplorer.clearSearch")} />
        <button type="button" onClick={props.onClose} aria-label={t("settingsConfig.closeSettings")} title={`${t("settingsConfig.closeSettings")} (Esc)`} className="settings-close-btn ui-focus-ring"><X size={17} aria-hidden="true" /></button>
      </div>
    </header>
  );

  let panel = null;
  if (controller.currentTab === "general") panel = <GeneralSettings isMobile={isMobile} t={t} toolCallsDefaultCollapsed={props.toolCallsDefaultCollapsed} onToolCallsDefaultCollapsedChange={props.onToolCallsDefaultCollapsedChange} scopeNativeSelectAll={props.scopeNativeSelectAll} onScopeNativeSelectAllChange={props.onScopeNativeSelectAllChange} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} ttsSupported={speech.isSupported} ttsAutoPlay={speech.autoPlayEnabled} setTtsAutoPlay={speech.setAutoPlay} ttsVoices={speech.voices} ttsVoiceURI={speech.selectedVoiceURI} setTtsVoiceURI={speech.setSelectedVoiceURI} providerUsageVisible={props.providerUsageVisible} onProviderUsageVisibleChange={props.onProviderUsageVisibleChange} fontSize={fontSize} setFontSize={setFontSize} uiScale={uiScale} setUiScale={setUiScale} submitBehavior={submitBehavior} setSubmitBehavior={setSubmitBehavior} />;
  if (controller.currentTab === "safety") panel = <SafetySettings isMobile={isMobile} t={t} nativeSettings={controller.nativeSettings} patchSection={controller.patchSection} patchApproval={controller.patchApproval} />;
  if (controller.currentTab === "models") panel = <ModelsSettings isMobile={isMobile} t={t} nativeSettings={controller.nativeSettings} patchSettings={controller.patchSettings} />;
  if (controller.currentTab === "providers") panel = <ProvidersSettings onClose={props.onClose} onSaved={props.onModelsSaved} />;
  if (controller.currentTab === "usage") panel = <UsageSettings />;
  if (controller.currentTab === "intelligence") panel = <IntelligenceSettings isMobile={isMobile} t={t} nativeSettings={controller.nativeSettings} patchSection={controller.patchSection} />;
  if (controller.currentTab === "agents") panel = <AgentsSettings cwd={props.cwd} highlighted={Boolean(controller.highlightId && ["agent-roster", "agent-model", "agent-tools"].includes(controller.highlightId))} />;
  if (controller.currentTab === "mcp") panel = <ExtensionsSettings cwd={props.cwd} sessionId={props.sessionId} nativeSettings={controller.nativeSettings} patchMcp={(patch) => controller.patchSection("mcp", patch)} />;
  if (controller.currentTab === "system") panel = <SystemSettings isMobile={isMobile} appUpdate={props.appUpdate} update={controller.update} appUpdateIsAvailable={controller.appUpdateIsAvailable} ompUpdateIsAvailable={controller.ompUpdateIsAvailable} appUpdatesDisabled={controller.appUpdatesDisabled} ompUpdateDisabled={controller.ompUpdateDisabled} checkingAppUpdate={controller.checkingAppUpdate} checking={controller.checking} hasCheckedUpdates={controller.hasCheckedUpdates} ompUpdating={controller.ompUpdating} restarting={controller.restarting} appUpdateMessage={controller.appUpdateMessage} message={controller.message} windowsService={controller.windowsService} loadingWindowsService={controller.loadingWindowsService} windowsServiceActionPending={controller.windowsServiceActionPending} onCheckAppUpdate={controller.checkForAppUpdate} onCheckOmpUpdate={controller.checkForUpdate} onRequestAppUpdate={props.onRequestAppUpdate} onOmpUpdateNow={controller.handleOmpUpdateNow} onRestartSessions={controller.restartSessions} onDismissAppUpdateMessage={controller.dismissAppUpdateMessage} onDismissMessage={controller.dismissMessage} onRefreshWindowsService={controller.fetchWindowsServiceStatus} onWindowsServiceAction={controller.performWindowsServiceAction} />;

  const content = controller.nativeSettingsRequired && controller.nativeSettingsLoading ? <div className="settings-loading-state" role="status" aria-live="polite" aria-busy="true" aria-label={t("appShell.loading")}><div className="skeleton settings-loading-row" /><div className="skeleton settings-loading-row" /><div className="skeleton settings-loading-row" /></div> : <SettingsHighlightContext.Provider value={controller.highlightId}>{controller.nativeSettingsRequired && controller.nativeSettingsError && <div style={{ margin: 16 }}><Alert variant="error" description={controller.nativeSettingsError} onDismiss={controller.dismissNativeSettingsError} dismissLabel={t("chatWindow.close")} /></div>}{controller.nativeSettingsRequired && controller.nativeSettingsError && <div style={{ margin: "0 16px 16px", display: "flex", justifyContent: "flex-end" }}><button type="button" onClick={controller.retryNativeSettingsSave}>{t("chatWindow.retry")}</button></div>}<div style={{ opacity: controller.isPending ? 0.92 : 1, transition: controller.isPending ? "opacity 80ms ease-out" : "opacity 120ms ease-out" }}>{panel}</div></SettingsHighlightContext.Provider>;

  return <SettingsLayout ariaLabel={t("settingsConfig.title")} header={header} navigation={<SettingsTabs active={controller.currentTab} onSelect={controller.handleSelectTab} workspaceReady={props.cwd !== null} layout={isMobile ? "horizontal" : "vertical"} attentionTabs={controller.attentionTabs} />} searchResults={controller.searchActive ? <SettingsSearchResults results={controller.searchResults} query={controller.searchQuery.trim()} onSelect={controller.openSearchResult} /> : undefined}>{content}</SettingsLayout>;
}
