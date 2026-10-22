"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { computeResults, type Round } from "@/lib/scoring";
import { clearRound, defaultRound, emptyScoresFor, loadRound, saveRound } from "@/lib/storage";
import RoundScreen from "./round/RoundScreen";
import SettingsSheet from "./sheets/SettingsSheet";
import SettleSheet from "./sheets/SettleSheet";
import Wizard from "./Wizard";

export type UpdateRound = (fn: (draft: Round) => void) => void;

const UI_KEY = "skins-tracker:ui";

interface UiState {
  screen: "wizard" | "round";
  sheet: "settings" | "settle" | null;
  hole: number;
  view: "hole" | "card";
}

function loadUi(): Partial<Omit<UiState, "view">> & { view?: string } {
  try {
    return JSON.parse(window.localStorage.getItem(UI_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveUi({ screen, hole, view }: UiState) {
  try {
    window.localStorage.setItem(UI_KEY, JSON.stringify({ screen, hole, view }));
  } catch {
    // ignore
  }
}

/** Players with blank names get a placeholder, for display and results. */
export function displayName(name: string, index: number): string {
  return name.trim() || `Player ${index + 1}`;
}

const firstHole = (round: Round) => (round.settings.startOnBack9 ? 10 : 1);

export default function SkinsApp() {
  const [round, setRound] = useState<Round | null>(null);
  const [ui, setUi] = useState<UiState>({ screen: "wizard", sheet: null, hole: 1, view: "hole" });

  // Restore from storage after mount (localStorage isn't available during SSR).
  useEffect(() => {
    const saved = loadRound();
    setRound(saved ?? defaultRound());
    const savedUi = loadUi();
    setUi((u) => ({
      ...u,
      // First visit starts with the new-round wizard; after that, the scorecard.
      screen: saved ? (savedUi.screen === "wizard" ? "wizard" : "round") : "wizard",
      hole: typeof savedUi.hole === "number" && savedUi.hole >= 1 && savedUi.hole <= 18 ? savedUi.hole : u.hole,
      view: savedUi.view === "card" || savedUi.view === "grid" ? "card" : "hole",
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
  const closeSheet = useCallback(() => setUi((u) => ({ ...u, sheet: null })), []);

  if (!round || !named || !results) {
    return <div className="flex min-h-dvh items-center justify-center font-serif text-muted">Loading…</div>;
  }

  const hasScores = Object.values(round.scores).some((row) => row.some((v) => v != null)) || round.ctps.length > 0;
  const resetHole = (back9: boolean) => setUi((u) => ({ ...u, hole: back9 ? 10 : 1 }));

  const newRound = () => {
    if (hasScores && !window.confirm("Start a new round? This clears all scores and closest-to-the-pin, but keeps players, game and course.")) return;
    update((d) => {
      d.scores = emptyScoresFor(d.players);
      d.ctps = [];
    });
    setUi((u) => ({ ...u, screen: "wizard", sheet: null, hole: firstHole(round), view: "hole" }));
  };

  const resetAll = () => {
    if (!window.confirm("Reset everything? Players, settings, handicaps and scores will all be cleared. Saved courses are kept.")) return;
    clearRound();
    setRound(defaultRound());
    setUi({ screen: "wizard", sheet: null, hole: 1, view: "hole" });
  };

  if (ui.screen === "wizard") {
    return (
      <Wizard
        round={round}
        update={update}
        resetHole={resetHole}
        onTeeOff={() => {
          setUi((u) => ({ ...u, screen: "round", hole: firstHole(round), view: "hole" }));
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl bg-paper">
      <RoundScreen
        round={named}
        results={results}
        update={update}
        hole={ui.hole}
        setHole={(hole) => setUi((u) => ({ ...u, hole }))}
        view={ui.view}
        setView={(view) => setUi((u) => ({ ...u, view }))}
        openSettings={() => setUi((u) => ({ ...u, sheet: "settings" }))}
        openSettle={() => setUi((u) => ({ ...u, sheet: "settle" }))}
      />
      {ui.sheet === "settings" && (
        <SettingsSheet
          round={round}
          update={update}
          hasScores={hasScores}
          resetHole={resetHole}
          onNewRound={newRound}
          onResetAll={resetAll}
          onClose={closeSheet}
        />
      )}
      {ui.sheet === "settle" && (
        <SettleSheet
          round={named}
          results={results}
          onClose={closeSheet}
          goToHole={(hole) => setUi((u) => ({ ...u, sheet: null, hole, view: "hole" }))}
        />
      )}
    </div>
  );
}
