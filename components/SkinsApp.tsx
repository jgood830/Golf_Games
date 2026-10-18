"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { computeResults, type Round } from "@/lib/scoring";
import { defaultRound, loadRound, saveRound } from "@/lib/storage";
import { cx } from "./ui";
import SetupTab from "./SetupTab";
import ScorecardTab from "./ScorecardTab";
import CtpTab from "./CtpTab";
import ResultsTab from "./ResultsTab";

export type Tab = "setup" | "scorecard" | "ctp" | "results";
export type UpdateRound = (fn: (draft: Round) => void) => void;

const UI_KEY = "skins-tracker:ui";

interface UiState {
  tab: Tab;
  hole: number;
  view: "hole" | "grid";
}

function loadUi(): Partial<UiState> {
  try {
    return JSON.parse(window.localStorage.getItem(UI_KEY) ?? "{}") as Partial<UiState>;
  } catch {
    return {};
  }
}

function saveUi(ui: UiState) {
  try {
    window.localStorage.setItem(UI_KEY, JSON.stringify(ui));
  } catch {
    // ignore
  }
}

/** Players with blank names get a placeholder, for display and results. */
export function displayName(name: string, index: number): string {
  return name.trim() || `Player ${index + 1}`;
}

export default function SkinsApp() {
  const [round, setRound] = useState<Round | null>(null);
  const [ui, setUi] = useState<UiState>({ tab: "setup", hole: 1, view: "hole" });

  // Restore from storage after mount (localStorage isn't available during SSR).
  useEffect(() => {
    const saved = loadRound();
    setRound(saved ?? defaultRound());
    const savedUi = loadUi();
    setUi((u) => ({
      tab: savedUi.tab ?? (saved ? "scorecard" : "setup"),
      hole: typeof savedUi.hole === "number" && savedUi.hole >= 1 && savedUi.hole <= 18 ? savedUi.hole : u.hole,
      view: savedUi.view === "grid" ? "grid" : "hole",
    }));
  }, []);

  useEffect(() => {
    if (round) saveRound(round);
  }, [round]);

  useEffect(() => {
    if (round) saveUi(ui);
  }, [ui, round]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const update: UpdateRound = useCallback((fn) => {
    setRound((prev) => {
      if (!prev) return prev;
      const draft = structuredClone(prev);
      fn(draft);
      return draft;
    });
  }, []);

  const named = useMemo<Round | null>(
    () => (round ? { ...round, players: round.players.map((p, i) => ({ ...p, name: displayName(p.name, i) })) } : null),
    [round],
  );
  const results = useMemo(() => (named ? computeResults(named) : null), [named]);

  const setTab = (tab: Tab) => {
    setUi((u) => ({ ...u, tab }));
    window.scrollTo({ top: 0 });
  };

  if (!round || !named || !results) {
    return <div className="flex min-h-dvh items-center justify-center text-muted">Loading…</div>;
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="sticky top-0 z-10 bg-accent px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white dark:bg-surface dark:text-ink">
        <h1 className="text-xl font-extrabold tracking-tight">⛳ Skins Tracker</h1>
      </header>

      <main className="flex-1 space-y-4 px-4 pb-28 pt-4">
        {ui.tab === "setup" && <SetupTab round={round} update={update} setRound={setRound} goToScorecard={() => setTab("scorecard")} resetHole={(back9) => setUi((u) => ({ ...u, hole: back9 ? 10 : 1 }))} />}
        {ui.tab === "scorecard" && (
          <ScorecardTab
            round={named}
            results={results}
            update={update}
            hole={ui.hole}
            setHole={(hole) => setUi((u) => ({ ...u, hole }))}
            view={ui.view}
            setView={(view) => setUi((u) => ({ ...u, view }))}
          />
        )}
        {ui.tab === "ctp" && <CtpTab round={named} results={results} update={update} />}
        {ui.tab === "results" && <ResultsTab round={named} results={results} />}
      </main>

      <BottomNav tab={ui.tab} setTab={setTab} />
    </div>
  );
}

const NAV: { tab: Tab; label: string; icon: React.ReactNode }[] = [
  {
    tab: "setup",
    label: "Setup",
    icon: <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Zm7.4-2.5a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L15 3.5h-4l-.3 2.5a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1l.3 2.5h4l.3-2.5c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6Z" />,
  },
  {
    tab: "scorecard",
    label: "Scores",
    icon: <path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5" />,
  },
  {
    tab: "ctp",
    label: "CTP",
    icon: <path d="M8 21V3l9 4-9 4M4 21h12" />,
  },
  {
    tab: "results",
    label: "Results",
    icon: <path d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3" />,
  },
];

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-xl grid-cols-4">
        {NAV.map((n) => (
          <button
            key={n.tab}
            type="button"
            onClick={() => setTab(n.tab)}
            aria-current={tab === n.tab ? "page" : undefined}
            className={cx("flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold", tab === n.tab ? "text-accent" : "text-muted")}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={tab === n.tab ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {n.icon}
            </svg>
            {n.label}
            <span className={cx("h-1 w-8 rounded-full", tab === n.tab ? "bg-accent" : "bg-transparent")} />
          </button>
        ))}
      </div>
    </nav>
  );
}
