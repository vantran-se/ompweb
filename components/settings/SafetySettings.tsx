"use client";

import type { NativeSettings } from "./settings-types";
import { NativeSetting, SettingsPanel, SettingsSelect } from "./settings-primitives";

type Tools = NonNullable<NativeSettings["tools"]>;
type Approval = NonNullable<Tools["approval"]>;

export type SafetySettingsProps = {
  isMobile: boolean;
  t: (key: string) => string;
  nativeSettings: NativeSettings | null;
  patchSection: <K extends keyof NativeSettings>(key: K, patch: Partial<NonNullable<NativeSettings[K]>>) => void;
  patchApproval: (patch: Partial<Approval>) => void;
};

export function SafetySettings({ t, nativeSettings, patchSection, patchApproval }: SafetySettingsProps) {
  return (
    <SettingsPanel tab="safety" title={t("settingsConfig.toolSafetyApprovals")} description={t("settingsConfig.toolSafetyApprovalsDesc")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        <NativeSetting searchId="approval-mode" label={t("settingsConfig.approvalMode")} description={t("settingsConfig.approvalModeDesc")} scope="Native OMP"><SettingsSelect value={nativeSettings?.tools?.approvalMode ?? "yolo"} onChange={(event) => patchSection("tools", { approvalMode: event.target.value as Tools["approvalMode"] })}><option value="always-ask">{t("settingsConfig.alwaysAsk")}</option><option value="write">{t("settingsConfig.allowWrites")}</option><option value="yolo">{t("settingsConfig.autoApproveYolo")}</option></SettingsSelect></NativeSetting>
        <NativeSetting searchId="bash-override" label={t("settingsConfig.bashOverride")} description={t("settingsConfig.bashOverrideDesc")} scope="Native OMP"><SettingsSelect value={nativeSettings?.tools?.approval?.bash ?? "prompt"} onChange={(event) => patchApproval({ bash: event.target.value as Approval["bash"] })}><option value="allow">{t("settingsConfig.allow")}</option><option value="prompt">{t("settingsConfig.alwaysAsk")}</option><option value="deny">{t("settingsConfig.deny")}</option></SettingsSelect></NativeSetting>
        <NativeSetting searchId="extension-tool-requests" label={t("settingsConfig.extensionToolRequests")} description={t("settingsConfig.extensionToolRequestsDesc")} scope="Native OMP"><SettingsSelect value={nativeSettings?.tools?.approval?.extension ?? "prompt"} onChange={(event) => patchApproval({ extension: event.target.value as Approval["extension"] })}><option value="prompt">{t("settingsConfig.askEveryTime")}</option><option value="allow">{t("settingsConfig.autoApprove")}</option></SettingsSelect></NativeSetting>
      </div>
    </SettingsPanel>
  );
}
