"use client";

import { useI18n } from "@/lib/i18n";
import { BarChart3, Bot, Cable, Cpu, KeyRound, RefreshCw, Settings2, ShieldCheck, Sparkles } from "lucide-react";
import type { ComponentType, CSSProperties } from "react";

export type SettingsTab =
  | "general"
  | "safety"
  | "models"
  | "providers"
  | "usage"
  | "intelligence"
  | "agents"
  | "extensions"
  | "mcp"
  | "skills"
  | "plugins"
  | "system";

export interface TabItem {
  id: SettingsTab;
  label: string;
  description: string;
  Icon: ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean | "true" | "false"; style?: CSSProperties }>;
  needsWorkspace?: boolean;
}

export const SETTINGS_CATEGORIES: TabItem[] = [
  { id: "general", label: "Interface & Behavior", description: "UI preferences, completion sound, submission mode", Icon: Settings2 },
  { id: "safety", label: "Safety & Approvals", description: "Tool safety rules, YOLO mode, terminal permissions", Icon: ShieldCheck },
  { id: "models", label: "AI Model Defaults", description: "Reasoning budget, verbosity, personality, scratchpad", Icon: Cpu },
  { id: "providers", label: "API Keys & Providers", description: "Connected OAuth accounts, API keys, and model registry", Icon: KeyRound },
  { id: "usage", label: "Usage", description: "Tokens, costs, cache analytics, and model breakdown", Icon: BarChart3 },
  { id: "intelligence", label: "Agent & Intelligence", description: "Advisor, memory, autolearn, compaction and retry", Icon: Sparkles },
  { id: "agents", label: "Agents", description: "Task agents, model settings, and tool policy", Icon: Bot },
  { id: "mcp", label: "Extensions & Tools", description: "MCP servers, managed skills, and OMP plugins", Icon: Cable },
  { id: "system", label: "System & Updates", description: "App updates, runtime version, and active session restart", Icon: RefreshCw },
];

export const getNormalizedActive = (tab: SettingsTab): SettingsTab => {
  if (tab === "skills" || tab === "plugins" || tab === "extensions") return "mcp";
  return tab;
};

export function SettingsTabs({
  active,
  onSelect,
  workspaceReady = true,
  layout = "vertical",
  attentionTabs,
}: {
  active: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
  workspaceReady?: boolean;
  layout?: "horizontal" | "vertical";
  attentionTabs?: Partial<Record<SettingsTab, boolean | string>>;
}) {
  const { t } = useI18n();
  const currentActive = getNormalizedActive(active);

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const enabled = SETTINGS_CATEGORIES.filter((tab) => !(tab.needsWorkspace && !workspaceReady));
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = index + 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = index - 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = enabled.length - 1;
    if (nextIndex !== null) {
      event.preventDefault();
      const next = enabled[nextIndex] ?? enabled[index];
      if (next) {
        onSelect(next.id);
        const targetBtn = document.getElementById("settings-tab-" + next.id);
        targetBtn?.focus();
      }
    }
  };

  if (layout === "vertical") {
    return (
      <nav
        aria-label={t("settingsTabs.ariaLabel")}
        role="tablist"
        aria-orientation="vertical"
        className="settings-nav"
      >
        {SETTINGS_CATEGORIES.map(({ id, label, description, Icon, needsWorkspace }, index) => {
          const labelKey = `settingsTabs.${id}.label`;
          const descKey = `settingsTabs.${id}.description`;
          const trLabel = t(labelKey);
          const trDesc = t(descKey);
          const displayLabel = trLabel !== labelKey ? trLabel : label;
          const displayDescription = trDesc !== descKey ? trDesc : description;
          const selected = id === currentActive;
          const disabled = Boolean(needsWorkspace && !workspaceReady);
          const attention = attentionTabs?.[id];
          const hasAttention = Boolean(attention);
          const attentionLabel = typeof attention === "string" ? attention : t("settingsTabs.attentionRequired");
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`settings-tab-${id}`}
              aria-selected={selected}
              aria-controls={`settings-panel-${id}`}
              aria-label={hasAttention ? `${displayLabel}: ${displayDescription} (${attentionLabel})` : undefined}
              title={hasAttention ? `${displayDescription} (${attentionLabel})` : displayDescription}
              tabIndex={selected ? 0 : -1}
              disabled={disabled}
              onClick={() => onSelect(id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`settings-nav-item${selected ? " active" : ""}`}
              style={{
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              <span className="settings-nav-icon">
                <Icon size={16} aria-hidden="true" />
                {hasAttention && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: -3,
                      right: -4,
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      border: "1px solid var(--bg-panel)",
                    }}
                  />
                )}
              </span>
              <div className="settings-nav-copy">
                <div className="settings-nav-label">{displayLabel}</div>
                <div className="settings-nav-description">{displayDescription}</div>
              </div>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="settings-nav-horizontal" aria-label={t("settingsTabs.ariaLabel")} role="tablist">
      {SETTINGS_CATEGORIES.map(({ id, label, description, Icon, needsWorkspace }, index) => {
        const labelKey = `settingsTabs.${id}.label`;
        const descKey = `settingsTabs.${id}.description`;
        const trLabel = t(labelKey);
        const trDesc = t(descKey);
        const displayLabel = trLabel !== labelKey ? trLabel : label;
        const displayDescription = trDesc !== descKey ? trDesc : description;
        const selected = id === currentActive;
        const disabled = Boolean(needsWorkspace && !workspaceReady);
        const attention = attentionTabs?.[id];
        const hasAttention = Boolean(attention);
        const attentionLabel = typeof attention === "string" ? attention : t("settingsTabs.attentionRequired");
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`settings-tab-${id}`}
            aria-selected={selected}
            aria-controls={`settings-panel-${id}`}
            aria-label={hasAttention ? `${displayLabel}: ${displayDescription} (${attentionLabel})` : `${displayLabel}: ${displayDescription}`}
            title={hasAttention ? `${displayDescription} (${attentionLabel})` : displayDescription}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => onSelect(id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`settings-nav-horizontal-item${selected ? " active" : ""}`}
            style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1 }}
          >
            <span className="settings-nav-horizontal-icon">
              <Icon size={13} aria-hidden="true" />
              {hasAttention && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -4,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    border: "1px solid var(--bg-panel)",
                  }}
                />
              )}
            </span>
            <span className="settings-nav-horizontal-label">{displayLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}
