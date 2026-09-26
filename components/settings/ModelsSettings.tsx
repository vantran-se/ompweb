"use client";

import type { NativeSettings } from "./settings-types";
import { NativeSetting, SettingsPanel, SettingsSelect, ToggleSwitch } from "./settings-primitives";

export type ModelsSettingsProps = {
  isMobile: boolean;
  t: (key: string) => string;
  nativeSettings: NativeSettings | null;
  patchSettings: (patch: Partial<NativeSettings>) => void;
};

export function ModelsSettings({ t, nativeSettings, patchSettings }: ModelsSettingsProps) {
  return (
    <SettingsPanel tab="models" title={t("settingsConfig.modelDefaults")} description={t("settingsConfig.modelDefaultsDesc")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        <NativeSetting searchId="reasoning" label={t("settingsConfig.reasoning")} description={t("settingsConfig.reasoningDesc")} scope="Native OMP"><SettingsSelect value={nativeSettings?.defaultThinkingLevel ?? "high"} onChange={(event) => patchSettings({ defaultThinkingLevel: event.target.value as NativeSettings["defaultThinkingLevel"] })}>{["auto", "minimal", "low", "medium", "high", "xhigh", "max"].map((level) => <option key={level} value={level}>{level}</option>)}</SettingsSelect></NativeSetting>
        <NativeSetting searchId="verbosity" label={t("settingsConfig.verbosity")} description={t("settingsConfig.verbosityDesc")} scope="Native OMP"><SettingsSelect value={nativeSettings?.textVerbosity ?? "medium"} onChange={(event) => patchSettings({ textVerbosity: event.target.value as NativeSettings["textVerbosity"] })}><option value="low">{t("settingsConfig.verbosityLow")}</option><option value="medium">{t("settingsConfig.verbosityMedium")}</option><option value="high">{t("settingsConfig.verbosityHigh")}</option></SettingsSelect></NativeSetting>
        <NativeSetting searchId="personality" label={t("settingsConfig.personality")} description={t("settingsConfig.personalityDesc")} scope="Native OMP"><SettingsSelect value={nativeSettings?.personality ?? "default"} onChange={(event) => patchSettings({ personality: event.target.value as NativeSettings["personality"] })}><option value="default">{t("settingsConfig.personalityDefault")}</option><option value="friendly">{t("settingsConfig.personalityFriendly")}</option><option value="pragmatic">{t("settingsConfig.personalityPragmatic")}</option><option value="none">{t("settingsConfig.personalityNone")}</option></SettingsSelect></NativeSetting>
        <NativeSetting searchId="thinking-blocks" label={t("settingsConfig.thinkingBlocks")} description={t("settingsConfig.thinkingBlocksDesc")} scope="Native OMP"><ToggleSwitch checked={nativeSettings?.hideThinkingBlock ?? false} onChange={(checked) => patchSettings({ hideThinkingBlock: checked })} /></NativeSetting>
        <NativeSetting searchId="external-thinking" label={t("settingsConfig.externalThinking")} description={t("settingsConfig.externalThinkingDesc")} scope="Native OMP"><ToggleSwitch checked={nativeSettings?.externalThinking ?? false} onChange={(checked) => patchSettings({ externalThinking: checked })} /></NativeSetting>
      </div>
    </SettingsPanel>
  );
}
