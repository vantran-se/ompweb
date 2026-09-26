"use client";

import { useI18n } from "@/lib/i18n";
import type { SearchResult } from "./settings-types";


export function SettingsSearchResults({ results, query, onSelect }: { results: SearchResult[]; query: string; onSelect: (result: SearchResult) => void }) {
  const { t, tn } = useI18n();
  const scopeLabel = (scope?: string) => scope === "UI" ? t("settingsConfig.chipUI") : scope === "Native OMP" ? t("settingsConfig.chipNativeOMP") : scope === "Workspace" ? t("settingsConfig.chipWorkspace") : scope;
  return (
    <div className="settings-search-results">
      <div className="settings-panel-inner">
        <div className="settings-search-summary">{results.length === 0 ? t("settingsConfig.noSettingsMatch", { query }) : tn("settingsConfig.searchResults", results.length, { count: results.length, query })}</div>
        <div className="settings-search-list">
          {results.map((result) => <button key={result.id} type="button" onClick={() => onSelect(result)} className="settings-search-result ui-focus-ring">
            <div className="settings-search-result-heading"><span className="settings-search-result-title">{result.label}</span>{result.kind === "category" && <span className="settings-scope-chip">{t("settingsConfig.chipSection")}</span>}{result.scope && <span className="settings-scope-chip">{scopeLabel(result.scope)}</span>}</div>
            <div className="settings-search-result-description">{result.description}</div>
            {result.section && <div className="settings-search-result-section">{result.section}</div>}
          </button>)}
        </div>
      </div>
    </div>
  );
}
