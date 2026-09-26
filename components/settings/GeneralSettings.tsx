"use client";

import type { Dispatch, SetStateAction } from "react";
import { setSubmitDuringRunBehavior, type SubmitDuringRunBehavior } from "@/lib/composer-prefs";
import type { FontSizePreference } from "@/hooks/useFontSize";
import type { UiScalePreference } from "@/hooks/useUiScale";
import { NativeSetting, SettingsPanel, SettingsSelect, ToggleSwitch } from "./settings-primitives";

export type GeneralSettingsProps = {
  isMobile: boolean;
  t: (key: string) => string;
  toolCallsDefaultCollapsed: boolean;
  onToolCallsDefaultCollapsedChange: (checked: boolean) => void;
  scopeNativeSelectAll: boolean;
  onScopeNativeSelectAllChange: (checked: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: Dispatch<SetStateAction<boolean>>;
  ttsSupported: boolean;
  ttsAutoPlay: boolean;
  setTtsAutoPlay: (checked: boolean) => void;
  ttsVoices: SpeechSynthesisVoice[];
  ttsVoiceURI: string | null;
  setTtsVoiceURI: (voiceURI: string | null) => void;
  providerUsageVisible: boolean;
  onProviderUsageVisibleChange: (checked: boolean) => void;
  fontSize: FontSizePreference;
  setFontSize: (preference: FontSizePreference) => void;
  uiScale: UiScalePreference;
  setUiScale: (preference: UiScalePreference) => void;
  submitBehavior: SubmitDuringRunBehavior;
  setSubmitBehavior: Dispatch<SetStateAction<SubmitDuringRunBehavior>>;
};

export function GeneralSettings(props: GeneralSettingsProps) {
  const { t } = props;
  return (
    <SettingsPanel tab="general" title={t("settingsConfig.interfaceBehavior")} description={t("settingsConfig.interfaceBehaviorDesc")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        <NativeSetting searchId="keep-tool-calls-collapsed" label={t("settingsConfig.keepToolCallsCollapsed")} description={t("settingsConfig.keepToolCallsCollapsedDesc")} scope="UI"><ToggleSwitch checked={props.toolCallsDefaultCollapsed} onChange={props.onToolCallsDefaultCollapsedChange} /></NativeSetting>
        <NativeSetting searchId="scope-native-select-all" label={t("settingsConfig.scopeNativeSelectAll")} description={t("settingsConfig.scopeNativeSelectAllDesc")} scope="UI"><ToggleSwitch checked={props.scopeNativeSelectAll} onChange={props.onScopeNativeSelectAllChange} /></NativeSetting>
        <NativeSetting searchId="completion-sound" label={t("settingsConfig.completionSound")} description={t("settingsConfig.completionSoundDesc")} scope="UI"><ToggleSwitch checked={props.soundEnabled} onChange={(next) => { props.setSoundEnabled(next); try { localStorage.setItem("omp-sound-enabled", String(next)); } catch { /* storage fallback */ } window.dispatchEvent(new CustomEvent("omp-sound-pref-change", { detail: next })); }} /></NativeSetting>
        <NativeSetting searchId="tts-autoplay" label={t("settingsConfig.ttsAutoplay") || "Auto-read assistant responses"} description={props.ttsSupported ? (t("settingsConfig.ttsAutoplayDesc") || "Automatically read aloud new assistant replies when completed.") : `${t("settingsConfig.ttsAutoplayDesc") || "Automatically read aloud new assistant replies when completed."} (${t("settingsConfig.ttsNotSupported") || "Not supported in this browser"})`} scope="UI"><ToggleSwitch checked={props.ttsSupported ? props.ttsAutoPlay : false} disabled={!props.ttsSupported} onChange={props.setTtsAutoPlay} /></NativeSetting>
        <NativeSetting searchId="tts-voice" label={t("settingsConfig.ttsVoice") || "Speech Voice"} description={props.ttsSupported ? (t("settingsConfig.ttsVoiceDesc") || "Select the browser voice for text-to-speech reading.") : `${t("settingsConfig.ttsVoiceDesc") || "Select the browser voice for text-to-speech reading."} (${t("settingsConfig.ttsNotSupported") || "Not supported in this browser"})`} scope="UI"><SettingsSelect value={props.ttsVoiceURI || ""} disabled={!props.ttsSupported || props.ttsVoices.length === 0} onChange={(event) => props.setTtsVoiceURI(event.target.value || null)}><option value="">{t("settingsConfig.defaultVoice") || "Default system voice"}</option>{props.ttsVoices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}</SettingsSelect></NativeSetting>
        <NativeSetting searchId="provider-usage" label={t("settingsConfig.providerUsage")} description={t("settingsConfig.providerUsageDesc")} scope="UI"><ToggleSwitch checked={props.providerUsageVisible} onChange={props.onProviderUsageVisibleChange} /></NativeSetting>
        <NativeSetting searchId="chat-font-size" label={t("settingsConfig.chatFontSize")} description={t("settingsConfig.chatFontSizeDesc")} scope="UI"><SettingsSelect value={props.fontSize} onChange={(event) => props.setFontSize(event.target.value as FontSizePreference)}><option value="sm">{t("settingsConfig.fontSizeSmall")}</option><option value="md">{t("settingsConfig.fontSizeMedium")}</option><option value="lg">{t("settingsConfig.fontSizeLarge")}</option><option value="xl">{t("settingsConfig.fontSizeXLarge")}</option></SettingsSelect></NativeSetting>
        <NativeSetting searchId="ui-scale" label={t("settingsConfig.uiScale")} description={t("settingsConfig.uiScaleDesc")} scope="UI"><SettingsSelect value={props.uiScale} onChange={(event) => props.setUiScale(event.target.value as UiScalePreference)}><option value="compact">{t("settingsConfig.uiScaleCompact")}</option><option value="standard">{t("settingsConfig.uiScaleStandard")}</option><option value="comfortable">{t("settingsConfig.uiScaleComfortable")}</option><option value="large">{t("settingsConfig.uiScaleLarge")}</option></SettingsSelect></NativeSetting>
        <NativeSetting searchId="message-during-active-run" label={t("settingsConfig.messageDuringActiveRun")} description={t("settingsConfig.messageDuringActiveRunDesc")} scope="UI"><SettingsSelect value={props.submitBehavior} onChange={(event) => { const next = event.target.value as SubmitDuringRunBehavior; setSubmitDuringRunBehavior(next); props.setSubmitBehavior(next); }}><option value="steer">{t("settingsConfig.steerCurrentRun")}</option><option value="queue">{t("settingsConfig.queueFollowUp")}</option></SettingsSelect></NativeSetting>
      </div>
    </SettingsPanel>
  );
}
