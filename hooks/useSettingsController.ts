"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { AppUpdateInfo } from "@/components/AppUpdateDialog";
import type {
  NativeSettings,
  SearchResult,
  SettingIndexEntry,
  SettingsTab,
  UpdateState,
  WindowsServiceStatus,
} from "@/components/settings/settings-types";

export type SettingsCategoryMetadata = {
  id: SettingsTab;
  label: string;
  description: string;
};

export type SettingsTranslation = (key: string, values?: Record<string, string | number>) => string;
export type WindowsServiceAction = "install" | "uninstall" | "toggle-autostart" | "start" | "stop" | "restart";

export interface UseSettingsControllerOptions {
  activeTab: SettingsTab;
  workspaceReady: boolean;
  appUpdate: AppUpdateInfo | null;
  ompUpdateAvailable?: boolean;
  ompUpdatesDisabled?: boolean;
  onRefreshAppUpdate: (force?: boolean) => Promise<AppUpdateInfo | null>;
  onOmpUpdateAvailabilityChange: (available: boolean) => void;
  onSelectTab: (tab: SettingsTab) => void;
  t: SettingsTranslation;
  categories: readonly SettingsCategoryMetadata[];
  settingIndex: readonly SettingIndexEntry[];
}

export interface SettingsController {
  currentTab: SettingsTab;
  nativeSettingsRequired: boolean;
  nativeSettings: NativeSettings | null;
  nativeSettingsError: string | null;
  nativeSettingsLoading: boolean;
  nativeSavesInFlight: number;
  loadNativeSettings: () => void;
  retryNativeSettingsSave: () => void;
  saveNativeSettings: (next: NativeSettings) => void;
  patchSettings: (patch: Partial<NativeSettings>) => void;
  patchSection: <K extends keyof NativeSettings>(key: K, patch: Partial<NonNullable<NativeSettings[K]>>) => void;
  dismissNativeSettingsError: () => void;
  patchApproval: (patch: Partial<NonNullable<NonNullable<NativeSettings["tools"]>["approval"]>>) => void;

  update: UpdateState | null;
  checking: boolean;
  checkingAppUpdate: boolean;
  appUpdateMessage: string | null;
  ompUpdating: boolean;
  restarting: boolean;
  message: string | null;
  ompUpdateIsAvailable: boolean;
  hasCheckedUpdates: boolean;
  appUpdateIsAvailable: boolean;
  appUpdatesDisabled: boolean;
  ompUpdateDisabled: boolean;
  systemNeedsAttention: boolean;
  attentionTabs: Partial<Record<SettingsTab, boolean | string>>;
  checkForUpdate: (force?: boolean) => Promise<void>;
  checkForAppUpdate: (force?: boolean) => Promise<void>;
  handleOmpUpdateNow: () => Promise<void>;
  restartSessions: () => Promise<void>;

  windowsService: WindowsServiceStatus | null;
  loadingWindowsService: boolean;
  windowsServiceActionPending: boolean;
  dismissAppUpdateMessage: () => void;
  dismissMessage: () => void;
  fetchWindowsServiceStatus: () => Promise<void>;
  performWindowsServiceAction: (action: WindowsServiceAction, payload?: object) => Promise<void>;

  searchQuery: string;
  setSearchQuery: (query: string) => void;
  highlightId: string | null;
  setHighlightId: (id: string | null) => void;
  trimmedQuery: string;
  searchActive: boolean;
  searchResults: SearchResult[];
  clearSearch: () => void;
  openSearchResult: (result: SearchResult) => void;
  handleSelectTab: (tab: SettingsTab) => void;
  isPending: boolean;
}

function normalizeTab(tab: SettingsTab): SettingsTab {
  return tab === "skills" || tab === "plugins" || tab === "extensions" ? "mcp" : tab;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useSettingsController({
  activeTab,
  workspaceReady,
  appUpdate,
  ompUpdateAvailable,
  ompUpdatesDisabled,
  onRefreshAppUpdate,
  onOmpUpdateAvailabilityChange,
  onSelectTab,
  t,
  categories,
  settingIndex,
}: UseSettingsControllerOptions): SettingsController {
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [update, setUpdate] = useState<UpdateState | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkingAppUpdate, setCheckingAppUpdate] = useState(false);
  const [appUpdateMessage, setAppUpdateMessage] = useState<string | null>(null);
  const [hasCheckedUpdates, setHasCheckedUpdates] = useState(false);
  const [ompUpdating, setOmpUpdating] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [windowsService, setWindowsService] = useState<WindowsServiceStatus | null>(null);
  const [loadingWindowsService, setLoadingWindowsService] = useState(false);
  const [windowsServiceActionPending, setWindowsServiceActionPending] = useState(false);
  const [nativeSettings, setNativeSettings] = useState<NativeSettings | null>(null);
  const [nativeSettingsError, setNativeSettingsError] = useState<string | null>(null);
  const [nativeSettingsLoading, setNativeSettingsLoading] = useState(true);
  const [nativeSavesInFlight, setNativeSavesInFlight] = useState(0);
  const [isPending, startTransition] = useTransition();
  const latestNativeSettingsRef = useRef<NativeSettings | null>(null);
  const nativeSaveDrainingRef = useRef(false);
  const nativeSettingsMutatedRef = useRef(false);

  const ompUpdateIsAvailable = Boolean(ompUpdateAvailable || update?.updateAvailable);
  const appUpdateIsAvailable = Boolean(appUpdate?.updateAvailable);
  const appUpdatesDisabled = Boolean(appUpdate?.updatesDisabled);
  const ompUpdateDisabled = Boolean(ompUpdatesDisabled || update?.updatesDisabled);
  const systemNeedsAttention = appUpdateIsAvailable || ompUpdateIsAvailable;
  const currentTab = normalizeTab(activeTab);
  const nativeSettingsRequired = currentTab === "general" || currentTab === "safety" || currentTab === "models" || currentTab === "intelligence" || currentTab === "mcp";

  const attentionTabs = useMemo<Partial<Record<SettingsTab, boolean | string>>>(() => {
    const tabs: Partial<Record<SettingsTab, boolean | string>> = {};
    if (systemNeedsAttention) tabs.system = t("settingsTabs.updateAvailable");
    return tabs;
  }, [systemNeedsAttention, t]);

  const loadNativeSettings = useCallback(() => {
    nativeSettingsMutatedRef.current = false;
    setNativeSettingsLoading(true);
    setNativeSettingsError(null);
    fetch("/api/omp-settings", { signal: AbortSignal.timeout(12000) })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then((data: { settings?: NativeSettings }) => {
        if (!nativeSettingsMutatedRef.current) setNativeSettings(data.settings ?? {});
      })
      .catch((error: unknown) => setNativeSettingsError(errorMessage(error)))
      .finally(() => setNativeSettingsLoading(false));
  }, []);

  useEffect(() => {
    loadNativeSettings();
  }, [loadNativeSettings]);

  const drainNativeSettings = useCallback(() => {
    if (nativeSaveDrainingRef.current || latestNativeSettingsRef.current === null) return;
    nativeSaveDrainingRef.current = true;
    setNativeSavesInFlight((count) => count + 1);

    void (async () => {
      try {
        while (latestNativeSettingsRef.current !== null) {
          const snapshot = latestNativeSettingsRef.current;
          latestNativeSettingsRef.current = null;
          try {
            const response = await fetch("/api/omp-settings", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ settings: snapshot }),
            });
            const data = (await response.json()) as { settings?: NativeSettings; error?: string };
            if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);
            if (latestNativeSettingsRef.current === null) setNativeSettings(data.settings ?? snapshot);
          } catch (error) {
            if (latestNativeSettingsRef.current === null) latestNativeSettingsRef.current = snapshot;
            setNativeSettingsError(errorMessage(error));
            break;
          }
        }
      } finally {
        nativeSaveDrainingRef.current = false;
        setNativeSavesInFlight((count) => Math.max(0, count - 1));
      }
    })();
  }, []);

  const saveNativeSettings = useCallback((next: NativeSettings) => {
    nativeSettingsMutatedRef.current = true;
    setNativeSettings(next);
    setNativeSettingsError(null);
    latestNativeSettingsRef.current = next;
    drainNativeSettings();
  }, [drainNativeSettings]);

  const retryNativeSettingsSave = useCallback(() => {
    setNativeSettingsError(null);
    if (latestNativeSettingsRef.current === null) {
      loadNativeSettings();
      return;
    }
    drainNativeSettings();
  }, [drainNativeSettings, loadNativeSettings]);

  const currentSettings = useCallback(
    (): NativeSettings => latestNativeSettingsRef.current ?? nativeSettings ?? {},
    [nativeSettings],
  );

  const patchSettings = useCallback((patch: Partial<NativeSettings>) => {
    saveNativeSettings({ ...currentSettings(), ...patch });
  }, [currentSettings, saveNativeSettings]);

  const patchSection = useCallback(<K extends keyof NativeSettings>(key: K, patch: Partial<NonNullable<NativeSettings[K]>>) => {
    const base = latestNativeSettingsRef.current;
    const section = (base?.[key] ?? nativeSettings?.[key] ?? {}) as object;
    saveNativeSettings({ ...currentSettings(), [key]: { ...section, ...patch } });
  }, [currentSettings, nativeSettings, saveNativeSettings]);

  const patchApproval = useCallback((patch: Partial<NonNullable<NonNullable<NativeSettings["tools"]>["approval"]>>) => {
    const base = latestNativeSettingsRef.current ?? nativeSettings ?? {};
    const tools = base.tools ?? {};
    saveNativeSettings({ ...base, tools: { ...tools, approval: { ...(tools.approval ?? {}), ...patch } } });
  }, [nativeSettings, saveNativeSettings]);

  const fetchWindowsServiceStatus = useCallback(async () => {
    try {
      setLoadingWindowsService(true);
      const response = await fetch("/api/windows-service");
      if (response.ok) setWindowsService((await response.json()) as WindowsServiceStatus);
    } catch {
      // Status is optional on non-Windows hosts.
    } finally {
      setLoadingWindowsService(false);
    }
  }, []);

  const performWindowsServiceAction = useCallback(async (action: WindowsServiceAction, payload: object = {}) => {
    try {
      setWindowsServiceActionPending(true);
      setMessage(null);
      const response = await fetch("/api/windows-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = (await response.json()) as { error?: string; status?: WindowsServiceStatus; message?: string };
      if (!response.ok || data.error) {
        setMessage(data.error || t("settingsConfig.windowsServiceActionFailed"));
      } else {
        if (data.status) setWindowsService(data.status);
        setMessage(data.message || t("settingsConfig.windowsServiceActionSuccess"));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("settingsConfig.windowsServiceActionFailed"));
    } finally {
      setWindowsServiceActionPending(false);
    }
  }, [t]);

  const checkForUpdate = useCallback(async (force = false) => {
    if (ompUpdateDisabled) return;
    setChecking(true);
    setMessage(null);
    try {
      const response = await fetch("/api/omp-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", ...(force ? { force: true } : {}) }),
      });
      const data = (await response.json()) as UpdateState & { error?: string };
      if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);
      setUpdate(data);
      onOmpUpdateAvailabilityChange(data.updateAvailable);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setChecking(false);
    }
  }, [ompUpdateDisabled, onOmpUpdateAvailabilityChange]);

  const checkForAppUpdate = useCallback(async (force = false) => {
    if (appUpdatesDisabled) return;
    setCheckingAppUpdate(true);
    setAppUpdateMessage(null);
    try {
      await onRefreshAppUpdate(force);
    } catch (error) {
      setAppUpdateMessage(errorMessage(error));
    } finally {
      setCheckingAppUpdate(false);
    }
  }, [appUpdatesDisabled, onRefreshAppUpdate]);

  const restartSessions = useCallback(async () => {
    setRestarting(true);
    try {
      const response = await fetch("/api/omp-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart" }),
      });
      const data = (await response.json()) as { error?: string; sessionsRestarted?: number };
      if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);
      setMessage(t("settingsConfig.restartSuccess", { count: data.sessionsRestarted ?? 0 }));
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setRestarting(false);
    }
  }, [t]);

  const handleOmpUpdateNow = useCallback(async () => {
    if (ompUpdating) return;
    setOmpUpdating(true);
    setMessage(null);
    try {
      const prepareResponse = await fetch("/api/omp-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update" }),
      });
      const prepareData = (await prepareResponse.json()) as { attemptId?: string; error?: string };
      if (!prepareResponse.ok || !prepareData.attemptId) throw new Error(prepareData.error || `HTTP ${prepareResponse.status}`);
      const commitResponse = await fetch("/api/omp-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit", attemptId: prepareData.attemptId }),
      });
      const commitData = (await commitResponse.json()) as { error?: string };
      if (!commitResponse.ok) throw new Error(commitData.error || `HTTP ${commitResponse.status}`);
      const deadline = Date.now() + 5 * 60 * 1000;
      while (true) {
        if (Date.now() > deadline) throw new Error(t("settingsConfig.ompUpdateFailed"));
        const { promise, resolve } = Promise.withResolvers<void>();
        setTimeout(resolve, 500);
        await promise;
        const statusResponse = await fetch("/api/omp-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status" }),
        });
        const status = (await statusResponse.json()) as { state?: string; error?: string } | null;
        if (!status) break;
        if (status.state === "succeeded") {
          setMessage(t("settingsConfig.ompUpdateSuccess"));
          await checkForUpdate(true);
          try { await restartSessions(); } catch { /* restart reports its own failure */ }
          break;
        }
        if (status.state === "failed") throw new Error(status.error || t("settingsConfig.ompUpdateFailed"));
      }
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setOmpUpdating(false);
    }
  }, [ompUpdating, t, checkForUpdate, restartSessions]);

  useEffect(() => {
    if (currentTab === "system") void fetchWindowsServiceStatus();
  }, [currentTab, fetchWindowsServiceStatus]);

  useEffect(() => {
    if (currentTab !== "system" || hasCheckedUpdates || ompUpdateDisabled) return;
    setHasCheckedUpdates(true);
    void checkForUpdate();
  }, [currentTab, hasCheckedUpdates, ompUpdateDisabled, checkForUpdate]);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const searchActive = trimmedQuery.length > 0;
  const searchResults = useMemo<SearchResult[]>(() => {
    if (!trimmedQuery) return [];
    const results: SearchResult[] = [];
    for (const category of categories) {
      const labelKey = `settingsTabs.${category.id}.label`;
      const descriptionKey = `settingsTabs.${category.id}.description`;
      const translatedLabel = t(labelKey);
      const translatedDescription = t(descriptionKey);
      const label = translatedLabel !== labelKey ? translatedLabel : category.label;
      const description = translatedDescription !== descriptionKey ? translatedDescription : category.description;
      const haystack = `${label} ${description} ${category.label} ${category.description}`.toLowerCase();
      if (haystack.includes(trimmedQuery)) results.push({ id: `tab-${category.id}`, kind: "category", tab: category.id, label, description });
    }
    for (const setting of settingIndex) {
      if (!workspaceReady && setting.tab === "mcp") continue;
      const translatedLabel = t(setting.labelKey);
      const translatedDescription = t(setting.descKey);
      const translatedSection = t(setting.sectionKey);
      const label = translatedLabel !== setting.labelKey ? translatedLabel : setting.fallbackLabel;
      const description = translatedDescription !== setting.descKey ? translatedDescription : setting.fallbackDesc;
      const section = translatedSection !== setting.sectionKey ? translatedSection : setting.fallbackSection;
      const haystack = `${label} ${description} ${section} ${setting.fallbackLabel} ${setting.fallbackDesc} ${setting.fallbackSection}`.toLowerCase();
      if (haystack.includes(trimmedQuery)) results.push({ id: setting.id, kind: "setting", tab: setting.tab, label, description, scope: setting.scope, section });
    }
    return results;
  }, [categories, settingIndex, t, trimmedQuery, workspaceReady]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setHighlightId(null);
  }, []);

  const dismissNativeSettingsError = useCallback(() => setNativeSettingsError(null), []);
  const dismissAppUpdateMessage = useCallback(() => setAppUpdateMessage(null), []);
  const dismissMessage = useCallback(() => setMessage(null), []);

  const openSearchResult = useCallback((result: SearchResult) => {
    startTransition(() => onSelectTab(result.tab));
    setHighlightId(result.kind === "setting" ? result.id : null);
    setSearchQuery("");
  }, [onSelectTab]);

  const handleSelectTab = useCallback((tab: SettingsTab) => {
    startTransition(() => onSelectTab(tab));
  }, [onSelectTab]);

  return {
    currentTab, nativeSettingsRequired,
    nativeSettings, nativeSettingsError, nativeSettingsLoading, nativeSavesInFlight,
    loadNativeSettings, retryNativeSettingsSave, saveNativeSettings, patchSettings, patchSection, patchApproval,
    dismissNativeSettingsError,
    update, checking, checkingAppUpdate, appUpdateMessage, hasCheckedUpdates, ompUpdating, restarting, message,
    ompUpdateIsAvailable, appUpdateIsAvailable, appUpdatesDisabled, ompUpdateDisabled,
    systemNeedsAttention, attentionTabs, checkForUpdate, checkForAppUpdate, handleOmpUpdateNow, restartSessions,
    dismissAppUpdateMessage, dismissMessage,
    windowsService, loadingWindowsService, windowsServiceActionPending,
    fetchWindowsServiceStatus, performWindowsServiceAction,
    searchQuery, setSearchQuery, highlightId, setHighlightId, trimmedQuery, searchActive,
    searchResults, clearSearch, openSearchResult, handleSelectTab, isPending,
  };
}
