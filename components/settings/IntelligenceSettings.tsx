"use client";

import type { NativeSettings } from "./settings-types";
import { NativeSetting, SettingsPanel, SettingsSection, SettingsSelect, ToggleSwitch } from "./settings-primitives";

type SectionKey = "compaction" | "memory" | "autolearn" | "mnemopi" | "retry";
type SectionPatch<K extends SectionKey> = Partial<NonNullable<NativeSettings[K]>>;

export type IntelligenceSettingsProps = {
  isMobile: boolean;
  t: (key: string) => string;
  nativeSettings: NativeSettings | null;
  patchSection: <K extends SectionKey>(key: K, patch: SectionPatch<K>) => void;
};

export function IntelligenceSettings({ t, nativeSettings, patchSection }: IntelligenceSettingsProps) {
  return (
    <SettingsPanel tab="intelligence" title={t("settingsTabs.intelligence.label")} description={t("settingsTabs.intelligence.description")} style={{ gap: 20 }}>
      <SettingsSection title={t("settingsConfig.contextCompaction")} description={t("settingsConfig.contextCompactionDesc")}>
        <NativeSetting searchId="automatic-compaction" label={t("settingsConfig.automaticCompaction")} description={t("settingsConfig.automaticCompactionDesc")} scope="Native OMP"><ToggleSwitch checked={nativeSettings?.compaction?.enabled ?? true} onChange={(checked) => patchSection("compaction", { enabled: checked })} /></NativeSetting>
        <NativeSetting searchId="continue-after-compaction" label={t("settingsConfig.continueAfterCompaction")} description={t("settingsConfig.continueAfterCompactionDesc")} scope="Native OMP"><ToggleSwitch checked={nativeSettings?.compaction?.autoContinue ?? true} onChange={(checked) => patchSection("compaction", { autoContinue: checked })} /></NativeSetting>
        <NativeSetting searchId="maintenance-strategy" label={t("settingsConfig.maintenanceStrategy")} description={t("settingsConfig.maintenanceStrategyDesc")} scope="Native OMP"><SettingsSelect value={nativeSettings?.compaction?.strategy ?? "snapcompact"} onChange={(event) => patchSection("compaction", { strategy: event.target.value as NonNullable<NativeSettings["compaction"]>["strategy"] })}><option value="snapcompact">{t("settingsConfig.strategySnapcompact")}</option><option value="handoff">{t("settingsConfig.strategyHandoff")}</option><option value="context-full">{t("settingsConfig.strategyContextFull")}</option><option value="shake">{t("settingsConfig.strategyShake")}</option><option value="off">{t("settingsConfig.strategyOff")}</option></SettingsSelect></NativeSetting>
        <NativeSetting searchId="compact-mid-turn" label={t("settingsConfig.compactMidTurn")} description={t("settingsConfig.compactMidTurnDesc")} scope="Native OMP"><ToggleSwitch checked={nativeSettings?.compaction?.midTurnEnabled ?? true} onChange={(checked) => patchSection("compaction", { midTurnEnabled: checked })} /></NativeSetting>
      </SettingsSection>
      <SettingsSection title={t("settingsConfig.memoryAutoLearn")} description={t("settingsConfig.memoryAutoLearnDesc")}>
        <NativeSetting searchId="memory-backend" label={t("settingsConfig.memoryBackend")} description={t("settingsConfig.memoryBackendDesc")} scope="Native OMP"><SettingsSelect value={nativeSettings?.memory?.backend ?? "mnemopi"} onChange={(event) => patchSection("memory", { backend: event.target.value as NonNullable<NativeSettings["memory"]>["backend"] })}><option value="off">{t("settingsConfig.memoryBackendOff")}</option><option value="local">{t("settingsConfig.memoryBackendLocal")}</option><option value="mnemopi">{t("settingsConfig.memoryBackendMnemopi")}</option><option value="hindsight">{t("settingsConfig.memoryBackendHindsight")}</option></SettingsSelect></NativeSetting>
        <NativeSetting searchId="enable-auto-learn" label={t("settingsConfig.enableAutoLearn")} description={t("settingsConfig.enableAutoLearnDesc")} scope="Native OMP"><ToggleSwitch checked={nativeSettings?.autolearn?.enabled ?? true} onChange={(checked) => patchSection("autolearn", { enabled: checked })} /></NativeSetting>
        <NativeSetting searchId="private-capture-turn" label={t("settingsConfig.privateCaptureTurn")} description={t("settingsConfig.privateCaptureTurnDesc")} scope="Native OMP"><ToggleSwitch checked={nativeSettings?.autolearn?.autoContinue ?? true} onChange={(checked) => patchSection("autolearn", { autoContinue: checked })} /></NativeSetting>
        <NativeSetting searchId="memory-scope" label={t("settingsConfig.memoryScope")} description={t("settingsConfig.memoryScopeDesc")} scope="Native OMP"><SettingsSelect value={nativeSettings?.mnemopi?.scoping ?? "per-project"} onChange={(event) => patchSection("mnemopi", { scoping: event.target.value as NonNullable<NativeSettings["mnemopi"]>["scoping"] })}><option value="per-project">{t("settingsConfig.memoryScopePerProject")}</option><option value="per-project-tagged">{t("settingsConfig.memoryScopePerProjectTagged")}</option><option value="global">{t("settingsConfig.memoryScopeGlobal")}</option></SettingsSelect></NativeSetting>
        <NativeSetting searchId="recall-on-session-start" label={t("settingsConfig.recallOnSessionStart")} description={t("settingsConfig.recallOnSessionStartDesc")} scope="Native OMP"><ToggleSwitch checked={nativeSettings?.mnemopi?.autoRecall ?? true} onChange={(checked) => patchSection("mnemopi", { autoRecall: checked })} /></NativeSetting>
        <NativeSetting searchId="retain-completed-turns" label={t("settingsConfig.retainCompletedTurns")} description={t("settingsConfig.retainCompletedTurnsDesc")} scope="Native OMP"><ToggleSwitch checked={nativeSettings?.mnemopi?.autoRetain ?? true} onChange={(checked) => patchSection("mnemopi", { autoRetain: checked })} /></NativeSetting>
      </SettingsSection>
      <SettingsSection title={t("settingsConfig.automaticRetry")} description={t("settingsConfig.automaticRetryDesc")}>
        <NativeSetting searchId="automatic-retry" label={t("settingsConfig.retryToggle")} description={t("settingsConfig.retryToggleDesc")} scope="Native OMP"><ToggleSwitch checked={nativeSettings?.retry?.enabled ?? true} onChange={(checked) => patchSection("retry", { enabled: checked })} /></NativeSetting>
        <NativeSetting searchId="max-attempts" label={t("settingsConfig.maxAttempts")} description={t("settingsConfig.maxAttemptsDesc")} scope="Native OMP"><SettingsSelect value={String(nativeSettings?.retry?.maxRetries ?? 2)} onChange={(event) => patchSection("retry", { maxRetries: Number(event.target.value) })}>{[0, 1, 2, 3, 4, 5].map((attempts) => <option key={attempts} value={attempts}>{attempts}</option>)}</SettingsSelect></NativeSetting>
        <NativeSetting searchId="model-fallback" label={t("settingsConfig.modelFallback")} description={t("settingsConfig.modelFallbackDesc")} scope="Native OMP"><ToggleSwitch checked={nativeSettings?.retry?.modelFallback ?? false} onChange={(checked) => patchSection("retry", { modelFallback: checked })} /></NativeSetting>
      </SettingsSection>
    </SettingsPanel>
  );
}
