"use client";

import { Copy, Download, ExternalLink, Monitor, Play, RefreshCw, RotateCcw, Square, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { copyText } from "@/lib/clipboard";
import { useI18n } from "@/lib/i18n";
import type { UpdateState, WindowsServiceStatus } from "./settings-types";
import { ToggleSwitch } from "./settings-primitives";

export type WindowsServiceAction = "install" | "uninstall" | "toggle-autostart" | "start" | "stop" | "restart";

export interface SystemSettingsProps {
  isMobile: boolean;
  appUpdate: UpdateState | null;
  update: UpdateState | null;
  appUpdateIsAvailable: boolean;
  ompUpdateIsAvailable: boolean;
  appUpdatesDisabled: boolean;
  ompUpdateDisabled: boolean;
  checkingAppUpdate: boolean;
  checking: boolean;
  hasCheckedUpdates: boolean;
  ompUpdating: boolean;
  restarting: boolean;
  appUpdateMessage: string | null;
  message: string | null;
  windowsService: WindowsServiceStatus | null;
  loadingWindowsService: boolean;
  windowsServiceActionPending: boolean;
  onCheckAppUpdate: (force?: boolean) => void | Promise<unknown>;
  onCheckOmpUpdate: (force?: boolean) => void | Promise<unknown>;
  onRequestAppUpdate: () => void;
  onOmpUpdateNow: () => void | Promise<unknown>;
  onRestartSessions: () => void | Promise<unknown>;
  onDismissAppUpdateMessage: () => void;
  onDismissMessage: () => void;
  onRefreshWindowsService: () => void | Promise<unknown>;
  onWindowsServiceAction: (action: WindowsServiceAction, payload?: object) => void | Promise<unknown>;
}

function isErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("fail") || normalized.includes("error");
}


const cardStyle = {
  padding: 14,
  borderRadius: "var(--radius-card)",
  background: "var(--bg-panel)",
  display: "flex",
  flexDirection: "column",
  gap: 10,
} as const;

const actionStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-control)",
  background: "var(--bg-subtle)",
  color: "var(--text)",
  fontSize: 12,
} as const;

export function SystemSettings({
  isMobile,
  appUpdate,
  update,
  appUpdateIsAvailable,
  ompUpdateIsAvailable,
  appUpdatesDisabled,
  ompUpdateDisabled,
  checkingAppUpdate,
  checking,
  hasCheckedUpdates,
  ompUpdating,
  restarting,
  appUpdateMessage,
  message,
  windowsService,
  loadingWindowsService,
  windowsServiceActionPending,
  onCheckAppUpdate,
  onCheckOmpUpdate,
  onRequestAppUpdate,
  onOmpUpdateNow,
  onRestartSessions,
  onDismissAppUpdateMessage,
  onDismissMessage,
  onRefreshWindowsService,
  onWindowsServiceAction,
}: SystemSettingsProps) {
  const { t } = useI18n();
  const copyCommand = (command: string) => {
    void copyText(command)
      .then(() => toast.success(t("appShell.commandCopied")))
      .catch(() => toast.error(t("appShell.commandCopyFailed")));
  };

  return (
    <div role="tabpanel" id="settings-panel-system" aria-labelledby="settings-tab-system" className="settings-panel-inner" style={{ padding: isMobile ? "16px 14px 32px" : "32px 24px 64px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ marginBottom: 4 }}>
        <h2 className="display-serif" style={{ fontSize: 22, fontWeight: 600, margin: 0, color: "var(--text)", letterSpacing: "-0.01em" }}>{t("settingsConfig.systemUpdates")}</h2>
        <p className="settings-content-subtitle" style={{ margin: "4px 0 16px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>{t("settingsConfig.systemUpdatesDescription")}</p>
      </div>

      <section style={{ ...cardStyle, border: appUpdateIsAvailable ? "1px solid color-mix(in srgb, var(--accent) 45%, var(--border))" : "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{t("settingsConfig.appLabel")}</span>
              {appUpdateIsAvailable && <span role="status" aria-label={t("settingsTabs.updateAvailable")} title={t("settingsTabs.updateAvailable")} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />}
            </div>
            <div style={{ minWidth: 0, marginTop: 4, color: appUpdateIsAvailable ? "var(--accent)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12, overflowWrap: "anywhere" }}>
              {appUpdatesDisabled ? t("settingsConfig.updatesDisabled") : checkingAppUpdate ? t("settingsConfig.checkingUpdates") : appUpdate?.updateAvailable ? t("appShell.updateVersion", { current: appUpdate.currentVersion ?? "?", available: appUpdate.availableVersion ?? "?" }) : appUpdate?.currentVersion ? t("settingsConfig.upToDate", { version: appUpdate.currentVersion }) : t("settingsConfig.versionUnavailable")}
            </div>
          </div>
          <button type="button" onClick={() => void onCheckAppUpdate(true)} disabled={checkingAppUpdate || appUpdatesDisabled} aria-label={t("settingsConfig.checkAppUpdates")} style={{ flexShrink: 0, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: "transparent", color: "var(--text)", cursor: checkingAppUpdate || appUpdatesDisabled ? "not-allowed" : "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <RefreshCw size={13} aria-hidden="true" /> {t("settingsConfig.refresh")}
          </button>
        </div>
        {appUpdate?.updateAvailable && (
          <div style={{ marginTop: 6, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 8 }}>
            {appUpdate.selfUpdateSupported ? (
              <button type="button" onClick={onRequestAppUpdate} style={{ ...actionStyle, alignSelf: "flex-start", border: "1px solid var(--accent-strong)", background: "var(--accent-strong)", color: "var(--on-accent)", cursor: "pointer", fontWeight: 600 }}>
                <Download size={13} aria-hidden="true" /> {t("settingsConfig.appUpdateAction")}
              </button>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("settingsConfig.runAppUpdateCommand")}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <code style={{ minWidth: 0, flex: "1 1 12rem", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)", wordBreak: "break-all" }}>{appUpdate.updateCommand || "curl -fsSL https://github.com/vantran-se/ompweb/releases/latest/download/install.sh | sh"}</code>
                  <button type="button" onClick={() => copyCommand(appUpdate.updateCommand || "curl -fsSL https://github.com/vantran-se/ompweb/releases/latest/download/install.sh | sh")} style={{ ...actionStyle, gap: 5, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>
                    <Copy size={12} aria-hidden="true" /> {t("appShell.copyCommand")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {appUpdateMessage && <Alert variant={isErrorMessage(appUpdateMessage) ? "error" : "info"} description={appUpdateMessage} onDismiss={onDismissAppUpdateMessage} dismissLabel={t("chatWindow.close")} />}
      </section>

      <section style={{ ...cardStyle, border: ompUpdateIsAvailable ? "1px solid color-mix(in srgb, var(--accent) 45%, var(--border))" : "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{t("settingsConfig.ompLabel")}</span>
              {ompUpdateIsAvailable && <span role="status" aria-label={t("settingsTabs.updateAvailable")} title={t("settingsTabs.updateAvailable")} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />}
            </div>
            <div style={{ minWidth: 0, marginTop: 4, color: ompUpdateIsAvailable ? "var(--accent)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12, overflowWrap: "anywhere" }}>
              {ompUpdateDisabled ? t("settingsConfig.updatesDisabled") : checking || (!hasCheckedUpdates && !update) ? t("settingsConfig.checkingUpdates") : update?.updateAvailable ? t("appShell.updateVersion", { current: update.currentVersion ?? "?", available: update.availableVersion ?? "?" }) : update?.currentVersion ? t("settingsConfig.upToDate", { version: update.currentVersion }) : t("settingsConfig.versionUnavailable")}
            </div>
          </div>
          <button type="button" onClick={() => void onCheckOmpUpdate(true)} disabled={checking || ompUpdateDisabled} aria-label={t("settingsConfig.checkOmpUpdates")} style={{ flexShrink: 0, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: "transparent", color: "var(--text)", cursor: checking || ompUpdateDisabled ? "not-allowed" : "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <RefreshCw size={13} aria-hidden="true" /> {t("settingsConfig.refresh")}
          </button>
        </div>
        {update?.updateAvailable && (
          <div style={{ marginTop: 6, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("settingsConfig.runOmpUpdateCommand")}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <code style={{ minWidth: 0, flex: "1 1 12rem", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)", wordBreak: "break-all" }}>{update.updateCommand || "omp update"}</code>
              <button type="button" onClick={() => void onOmpUpdateNow()} disabled={ompUpdating} style={{ ...actionStyle, gap: 5, padding: "4px 8px", border: "1px solid var(--accent-strong)", background: "var(--accent-strong)", color: "var(--on-accent)", cursor: ompUpdating ? "wait" : "pointer", fontSize: 11, fontWeight: 600 }}>
                <Download size={12} aria-hidden="true" /> {ompUpdating ? t("settingsConfig.updating") : t("settingsConfig.ompUpdateAction")}
              </button>
              <button type="button" onClick={() => copyCommand(update.updateCommand || "omp update")} style={{ ...actionStyle, gap: 5, padding: "4px 8px", cursor: "pointer", fontSize: 11 }}>
                <Copy size={12} aria-hidden="true" /> {t("appShell.copyCommand")}
              </button>
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          <button type="button" onClick={() => void onRestartSessions()} disabled={restarting} style={{ ...actionStyle, cursor: restarting ? "wait" : "pointer" }}>
            <RotateCcw size={13} aria-hidden="true" /> {restarting ? t("settingsConfig.restarting") : t("settingsConfig.restartSessions")}
          </button>
          <a href="https://github.com/can1357/oh-my-pi/releases" target="_blank" rel="noreferrer" style={{ ...actionStyle, background: undefined, color: "var(--text-muted)", textDecoration: "none" }}>
            <ExternalLink size={13} aria-hidden="true" /> {t("settingsConfig.changelog")}
          </a>
        </div>
        {message && <Alert variant={isErrorMessage(message) ? "error" : "info"} description={message} onDismiss={onDismissMessage} dismissLabel={t("chatWindow.close")} />}
      </section>

      {windowsService?.isWindows && (
        <section style={{ ...cardStyle, border: "1px solid var(--border)", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Monitor size={15} aria-hidden="true" />{t("settingsConfig.windowsServiceTitle")}</div>
              <p style={{ minWidth: 0, margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4, overflowWrap: "anywhere" }}>{t("settingsConfig.windowsServiceDesc")}</p>
            </div>
            <button type="button" onClick={() => void onRefreshWindowsService()} disabled={loadingWindowsService} aria-label={t("settingsConfig.refresh")} style={{ flexShrink: 0, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: "transparent", color: "var(--text)", cursor: loadingWindowsService ? "wait" : "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}><RefreshCw size={13} aria-hidden="true" /> {t("settingsConfig.refresh")}</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <div style={{ padding: 10, border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("settingsConfig.windowsServiceStatus")}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: windowsService.isRunning ? "var(--accent)" : "var(--text-muted)" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: windowsService.isRunning ? "var(--accent)" : "var(--border)" }} />{windowsService.isRunning ? t("settingsConfig.windowsServiceRunning", { port: windowsService.port }) : t("settingsConfig.windowsServiceStopped")}</div>
            </div>
            <div style={{ padding: 10, border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("settingsConfig.windowsServiceDesktopShortcut", { status: "" }).replace(/:\s*$/, "")}</div>
              <div style={{ fontSize: 12, color: windowsService.desktopShortcutExists ? "var(--text)" : "var(--text-muted)" }}>{windowsService.desktopShortcutExists ? t("settingsConfig.windowsServicePresent") : t("settingsConfig.windowsServiceMissing")}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: "var(--bg)" }}>
            <div><div style={{ fontSize: 12, fontWeight: 500 }}>{t("settingsConfig.windowsServiceAutostart")}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("settingsConfig.windowsServiceAutostartDesc")}</div></div>
            <ToggleSwitch id="windows-service-autostart-toggle" checked={windowsService.autostart} disabled={windowsServiceActionPending} onChange={(checked) => void onWindowsServiceAction("toggle-autostart", { autostart: checked })} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" onClick={() => void onWindowsServiceAction("install", { startImmediately: false })} disabled={windowsServiceActionPending} style={{ ...actionStyle, cursor: windowsServiceActionPending ? "wait" : "pointer" }}><Monitor size={13} aria-hidden="true" />{windowsService.isInstalled ? t("settingsConfig.windowsServiceReinstallBtn") : t("settingsConfig.windowsServiceInstallBtn")}</button>
            {windowsService.isRunning ? (
              <>
                <button type="button" onClick={() => void onWindowsServiceAction("restart")} disabled={windowsServiceActionPending} style={{ ...actionStyle, cursor: windowsServiceActionPending ? "wait" : "pointer" }}><RotateCcw size={13} aria-hidden="true" /> {t("settingsConfig.windowsServiceRestartBtn")}</button>
                <button type="button" onClick={() => void onWindowsServiceAction("stop")} disabled={windowsServiceActionPending} style={{ ...actionStyle, cursor: windowsServiceActionPending ? "wait" : "pointer" }}><Square size={13} aria-hidden="true" /> {t("settingsConfig.windowsServiceStopBtn")}</button>
              </>
            ) : (
              <button type="button" onClick={() => void onWindowsServiceAction("start")} disabled={windowsServiceActionPending} style={{ ...actionStyle, cursor: windowsServiceActionPending ? "wait" : "pointer" }}><Play size={13} aria-hidden="true" /> {t("settingsConfig.windowsServiceStartBtn")}</button>
            )}
            {windowsService.isInstalled && <button type="button" onClick={() => void onWindowsServiceAction("uninstall", { cleanConfig: false })} disabled={windowsServiceActionPending} style={{ ...actionStyle, background: "transparent", color: "var(--text-muted)", cursor: windowsServiceActionPending ? "wait" : "pointer" }}><Trash2 size={13} aria-hidden="true" /> {t("settingsConfig.windowsServiceUninstallBtn")}</button>}
          </div>
        </section>
      )}
    </div>
  );
}
