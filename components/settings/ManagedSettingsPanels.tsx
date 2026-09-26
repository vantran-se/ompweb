"use client";

import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";
import type { NativeSettings } from "./settings-types";
import { NativeSetting, SettingsPanel, ToggleSwitch } from "./settings-primitives";

const SettingsTabLoading = () => {
  const { t } = useI18n();
  return <div role="status" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>{t("settingsConfig.loadingSettings")}</div>;
};

const ModelsConfig = dynamic(() => import("../ModelsConfig").then((module) => module.ModelsConfig), { loading: SettingsTabLoading, ssr: false });
const McpConfig = dynamic(() => import("../McpConfig").then((module) => module.McpConfig), { loading: SettingsTabLoading, ssr: false });
const AgentsConfig = dynamic(() => import("../AgentsConfig").then((module) => module.AgentsConfig), { loading: SettingsTabLoading, ssr: false });
const UsageConfig = dynamic(() => import("../UsageConfig").then((module) => module.UsageConfig), { loading: SettingsTabLoading, ssr: false });

export function ProvidersSettings({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  return <SettingsPanel tab="providers" title={t("settingsTabs.providers.label")} description={t("settingsTabs.providers.description")}><ModelsConfig embedded onClose={onClose} onSaved={onSaved} /></SettingsPanel>;
}

export function UsageSettings() {
  return <SettingsPanel tab="usage"><UsageConfig /></SettingsPanel>;
}

export function AgentsSettings({ cwd, highlighted }: { cwd: string | null; highlighted: boolean }) {
  const { t } = useI18n();
  return (
    <SettingsPanel tab="agents" title={t("settingsConfig.agentsTitle")} description={t("settingsConfig.agentsDesc")} style={highlighted ? { border: "1px solid var(--accent)", boxShadow: "0 0 0 2px var(--accent)" } : undefined}>
      <AgentsConfig cwd={cwd} />
    </SettingsPanel>
  );
}

export function ExtensionsSettings({ cwd, sessionId, nativeSettings, patchMcp }: {
  cwd: string | null;
  sessionId: string | null;
  nativeSettings: NativeSettings | null;
  patchMcp: (patch: Partial<NonNullable<NativeSettings["mcp"]>>) => void;
}) {
  const { t } = useI18n();
  return (
    <SettingsPanel tab="mcp" title={t("settingsConfig.extensionsTools")} description={t("settingsConfig.extensionsToolsDesc")}>
      {cwd && <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        <NativeSetting searchId="load-project-mcp-servers" label={t("settingsConfig.loadProjectMcp")} description={t("settingsConfig.loadProjectMcpDesc")} scope="Native OMP"><ToggleSwitch checked={nativeSettings?.mcp?.enableProjectConfig ?? true} onChange={(checked) => patchMcp({ enableProjectConfig: checked })} /></NativeSetting>
        <NativeSetting searchId="render-mcp-markdown" label={t("settingsConfig.renderMcpMarkdown")} description={t("settingsConfig.renderMcpMarkdownDesc")} scope="Native OMP"><ToggleSwitch checked={nativeSettings?.mcp?.renderMarkdownResults ?? true} onChange={(checked) => patchMcp({ renderMarkdownResults: checked })} /></NativeSetting>
        <NativeSetting searchId="mcp-resource-updates" label={t("settingsConfig.mcpResourceUpdates")} description={t("settingsConfig.mcpResourceUpdatesDesc")} scope="Native OMP"><ToggleSwitch checked={nativeSettings?.mcp?.notifications ?? false} onChange={(checked) => patchMcp({ notifications: checked })} /></NativeSetting>
      </div>}
      <McpConfig cwd={cwd} sessionId={sessionId} />
      {!cwd && <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 12 }}>{t("settingsConfig.selectWorkspaceForMcp")}</p>}
    </SettingsPanel>
  );
}
