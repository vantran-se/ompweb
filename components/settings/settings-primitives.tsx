"use client";

import { cloneElement, createContext, forwardRef, isValidElement, useContext, useEffect, useRef, type CSSProperties, type HTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { SettingsScope } from "./settings-types";

const selectStyle: CSSProperties = {
  width: "100%", minWidth: 0, maxWidth: "100%", minHeight: "var(--control-height)", padding: "4px 28px 4px var(--control-padding-inline)", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", backgroundColor: "var(--bg)", color: "var(--text)", fontSize: "var(--text-sm)", cursor: "pointer", appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", outline: "none", colorScheme: "dark light",
};
export const settingsOptionStyle: CSSProperties = { background: "var(--bg-panel)", color: "var(--text)" };

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const SettingsHighlightContext = createContext<string | null>(null);

export function SettingsLayout({ header, navigation, children, searchResults, ariaLabel }: { header: ReactNode; navigation?: ReactNode; children: ReactNode; searchResults?: ReactNode; ariaLabel?: string }) {
  return <div className="settings-view" role="region" aria-label={ariaLabel}>{header}<div className="settings-body">{searchResults ?? <>{navigation}<div className="settings-content">{children}</div></>}</div></div>;
}

export function SettingsSearch({ value, onChange, onEscape, placeholder, clearLabel, className }: { value: string; onChange: (value: string) => void; onEscape?: () => void; placeholder: string; clearLabel: string; className?: string }) {
  return <div className={["settings-search", className].filter(Boolean).join(" ")}>
    <Search size={14} aria-hidden="true" className="settings-search-icon" />
    <input type="text" aria-label={placeholder} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key !== "Escape") return; event.stopPropagation(); if (value) onChange(""); else onEscape?.(); event.currentTarget.blur(); }} />
    {value && <button type="button" onClick={() => onChange("")} className="settings-search-clear ui-focus-ring" aria-label={clearLabel}><X size={13} aria-hidden="true" /></button>}
  </div>;
}

export function SettingsPanel({ tab, title, description, children, className, style }: { tab: string; title?: ReactNode; description?: ReactNode; children: ReactNode; className?: string; style?: CSSProperties }) {
  return <div role="tabpanel" id={`settings-panel-${tab}`} aria-labelledby={`settings-tab-${tab}`} className={["settings-panel-inner", className].filter(Boolean).join(" ")} style={style}>
    {(title || description) && <div className="settings-panel-intro">{title && <h2 className="display-serif">{title}</h2>}{description && <p className="settings-content-subtitle">{description}</p>}</div>}
    {children}
  </div>;
}

export function SettingsSection({ title, description, children, className, style }: { title?: ReactNode; description?: ReactNode; children: ReactNode; className?: string; style?: CSSProperties }) {
  return <section className={["settings-section", className].filter(Boolean).join(" ")} style={style}>
    {(title || description) && <header className="settings-section-header">{title && <div className="settings-section-title">{title}</div>}{description && <p>{description}</p>}</header>}
    <div className="settings-section-content">{children}</div>
  </section>;
}

export const SettingsCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function SettingsCard({ children, className, style, ...props }, ref) {
  return <div ref={ref} className={["settings-card", className].filter(Boolean).join(" ")} style={{ minWidth: 0, width: "100%", boxSizing: "border-box", ...style }} {...props}>{children}</div>;
});

type EnhancedChildProps = { id?: string; "aria-labelledby"?: string; "aria-describedby"?: string; "aria-label"?: string };

export function NativeSetting({ label, description, scope, searchId, children }: { label: string; description: string; scope?: SettingsScope; searchId?: string; children: ReactNode }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const highlightId = useContext(SettingsHighlightContext);
  const settingSlug = searchId || slugify(label);
  const highlighted = highlightId !== null && (highlightId === settingSlug || highlightId === slugify(label));
  const settingId = `setting-${settingSlug}`;
  const labelId = `setting-label-${settingSlug}`;
  const descId = `setting-desc-${settingSlug}`;
  const scopeLabel = scope === "UI" ? t("settingsConfig.chipUI") : scope === "Native OMP" ? t("settingsConfig.chipNativeOMP") : scope === "Workspace" ? t("settingsConfig.chipWorkspace") : scope;
  useEffect(() => { if (highlighted) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [highlighted]);
  let control = children;
  if (isValidElement(children)) {
    const child = children as ReactElement<EnhancedChildProps>;
    control = cloneElement(child, { id: child.props.id || settingId, "aria-labelledby": child.props["aria-labelledby"] || labelId, "aria-describedby": child.props["aria-describedby"] || descId, "aria-label": child.props["aria-label"] || label });
  }
  return <SettingsCard ref={ref} data-search-id={settingSlug} className={highlighted ? "is-highlighted" : undefined}>
    <div className="settings-card-text"><div className="settings-card-heading"><label id={labelId} htmlFor={settingId} className="settings-card-title">{label}</label>{scope && <span className="settings-scope-chip">{scopeLabel}</span>}</div><span id={descId} className="settings-card-desc">{description}</span></div>
    <span className="settings-card-control">{control}</span>
  </SettingsCard>;
}

export function SettingsSelect({ style, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select style={{ ...selectStyle, ...style }} {...props}>{children}</select>;
}

export function UpdateCard({ label, status, updateAvailable = false, updateAvailableLabel, actions, children, className }: { label: ReactNode; status: ReactNode; updateAvailable?: boolean; updateAvailableLabel?: string; actions?: ReactNode; children?: ReactNode; className?: string }) {
  return <section className={className} style={{ padding: 14, border: updateAvailable ? "1px solid color-mix(in srgb, var(--accent) 45%, var(--border))" : "1px solid var(--border)", borderRadius: "var(--radius-card)", background: "var(--bg-panel)", display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><div style={{ minWidth: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>{updateAvailable && <span role={updateAvailableLabel ? "status" : undefined} aria-label={updateAvailableLabel} title={updateAvailableLabel} aria-hidden={updateAvailableLabel ? undefined : "true"} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />}</div><div style={{ minWidth: 0, marginTop: 4, color: updateAvailable ? "var(--accent)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12, overflowWrap: "anywhere" }}>{status}</div></div>{actions}</div>
    {children}
  </section>;
}

export function ToggleSwitch({ checked, onChange, disabled, id, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; id?: string; "aria-label"?: string; "aria-labelledby"?: string; "aria-describedby"?: string }) {
  return <button id={id} type="button" role="switch" aria-checked={checked} aria-label={ariaLabel} aria-labelledby={ariaLabelledBy} aria-describedby={ariaDescribedBy} disabled={disabled} onClick={() => onChange(!checked)} className="settings-toggle-switch ui-focus-ring" style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, padding: 2, border: "none", background: "transparent", cursor: disabled ? "not-allowed" : "pointer", flexShrink: 0 }}>
    <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", width: 40, height: 24, boxSizing: "border-box", flexShrink: 0, overflow: "hidden", padding: 2, borderRadius: 12, background: checked ? "var(--accent-strong)" : "var(--border)", transition: "background var(--dur-fast)" }}><span style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 10, background: "#fff", transform: checked ? "translateX(16px)" : "translateX(0px)", transition: "transform var(--dur-fast)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} /></span>
  </button>;
}
