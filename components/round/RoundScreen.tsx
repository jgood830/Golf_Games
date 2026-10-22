"use client";

import { useEffect, useState } from "react";
import { HOLES, formatSigned, playOrder, type HoleResult, type Round, type RoundResults } from "@/lib/scoring";
import type { UpdateRound } from "../SkinsApp";
import { IconButton, NumberInput, StrokeDots, cx } from "../ui";
import HoleCtp from "./HoleCtp";
import Keypad from "./Keypad";

const validGross = (g: number | null) => g == null || (Number.isInteger(g) && g >= 1 && g <= 15);
const skinsLabel = (n: number) => `${n} skin${n === 1 ? "" : "s"}`;
const tone = (amount: number) => {
  const cents = Math.round(amount * 100);
  return cents > 0 ? "text-good" : cents < 0 ? "text-bad" : "text-muted";
};

export default function RoundScreen({
  round,
  results,
  update,
  hole,
  setHole,
  view,
  setView,
  openSettings,
  openSettle,
}: {
  round: Round;
  results: RoundResults;
  update: UpdateRound;
  hole: number;
  setHole: (h: number) => void;
  view: "hole" | "card";
  setView: (v: "hole" | "card") => void;
  openSettings: () => void;
  openSettle: () => void;
}) {
  const setGross = (playerId: string, holeIndex: number, v: number | null) =>
    update((d) => {
      d.scores[playerId] ??= Array(HOLES).fill(null);
      d.scores[playerId][holeIndex] = v;
    });

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="rule-double sticky top-0 z-20 bg-paper/95 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="eyebrow">
              Skins{round.settings.startOnBack9 ? " · Back 9 start" : ""}
            </div>
            <h1 className="truncate font-serif text-2xl font-semibold leading-tight">{round.course?.name || "The Skins Game"}</h1>
          </div>
          <div className="flex shrink-0 items-center">
            <IconButton label={view === "hole" ? "Show full card" : "Show hole by hole"} onClick={() => setView(view === "hole" ? "card" : "hole")}>
              {view === "hole" ? <path d="M4 5h16v14H4zM4 10h16M4 15h16M10 5v14M15 5v14" /> : <path d="M6 4h12v16H6zM9 9h6M9 13h6" />}
            </IconButton>
            <IconButton label="Round settings" onClick={openSettings}>
              <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
              <circle cx="16" cy="7" r="2" />
              <circle cx="10" cy="17" r="2" />
            </IconButton>
          </div>
        </div>
        <Leaderboard round={round} results={results} openSettle={openSettle} />
      </header>

      {view === "hole" ? (
        <HoleView round={round} results={results} update={update} hole={hole} setHole={setHole} setGross={setGross} openSettle={openSettle} />
      ) : (
        <CardView
          round={round}
          results={results}
          setGross={setGross}
          onPickHole={(h) => {
            setHole(h);
            setView("hole");
          }}
        />
      )}
    </div>
  );
}

function Leaderboard({ round, results, openSettle }: { round: Round; results: RoundResults; openSettle: () => void }) {
  return (
    <button
      type="button"
      onClick={openSettle}
      aria-label="Open settle up"
      className="-mx-1 mt-2 flex w-[calc(100%+0.5rem)] items-stretch gap-1 overflow-x-auto px-1 text-left"
    >
      {results.players.map((r, i) => (
        <span key={r.playerId} className="min-w-0 flex-1 basis-0 rounded-md border border-rule bg-paper-2 px-2 py-1">
          <span className="block truncate text-xs font-semibold text-muted">{round.players[i].name}</span>
          <span className="flex items-baseline justify-between gap-1">
            <span className={cx("tabular font-serif text-base font-semibold", tone(r.totalNet))}>{formatSigned(r.totalNet).replace(".00", "")}</span>
            <span className="tabular text-[11px] text-muted">{r.skins}s</span>
          </span>
        </span>
      ))}
      <span className="flex shrink-0 items-center px-1 text-xl text-green" aria-hidden>
        ›
      </span>
    </button>
  );
}

export function ResultLine({ h, round }: { h: HoleResult; round: Round }) {
  const name = (id: string | null) => round.players.find((p) => p.id === id)?.name ?? "";
  if (h.status === "won") {
    return (
      <p className="font-serif text-xl">
        <span className="text-brass">★</span> Skin to <strong className="font-semibold">{name(h.winnerId)}</strong>
        {h.skinsAwarded > 1 && <span className="text-brass"> ×{h.skinsAwarded}</span>}
      </p>
    );
  }
  if (h.status === "tie") {
    return <p className="font-serif text-xl text-warn">{round.settings.carryover ? "Halved — skin carries" : "Halved — skin lost"}</p>;
  }
  return <p className="font-serif text-lg text-muted">In progress{h.carriedIn > 0 ? ` · ${skinsLabel(h.carriedIn)} carried in` : ""}</p>;
}

function HoleView({
  round,
  results,
  update,
  hole,
  setHole,
  setGross,
  openSettle,
}: {
  round: Round;
  results: RoundResults;
  update: UpdateRound;
  hole: number;
  setHole: (h: number) => void;
  setGross: (playerId: string, holeIndex: number, v: number | null) => void;
  openSettle: () => void;
}) {
  const i = hole - 1;
  const h = results.holes[i];
  const order = playOrder(round.settings).map((x) => x + 1);
  const pos = order.indexOf(hole);
  const prevHole = pos > 0 ? order[pos - 1] : null;
  const nextHole = pos < order.length - 1 ? order[pos + 1] : null;
  const [picking, setPicking] = useState(false);

  const gross = (playerId: string) => round.scores[playerId]?.[i] ?? null;
  const firstMissing = (after = -1) => {
    const ps = round.players;
    for (let k = after + 1; k < ps.length; k++) if (gross(ps[k].id) == null) return ps[k].id;
    return null;
  };

  const [active, setActive] = useState<string | null>(() => firstMissing());
  // New hole: start with the first player who still needs a score.
  useEffect(() => {
    setActive(firstMissing());
    setPicking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hole]);

  const activeIdx = round.players.findIndex((p) => p.id === active);
  const activePlayer = activeIdx >= 0 ? round.players[activeIdx] : null;

  const onDigit = (n: number) => {
    if (!activePlayer) return;
    setGross(activePlayer.id, i, n);
    // Move to the next player still missing a score (scores update async, so skip the one just set).
    const ps = round.players;
    let next: string | null = null;
    for (let k = 1; k < ps.length && !next; k++) {
      const cand = ps[(activeIdx + k) % ps.length];
      if (gross(cand.id) == null) next = cand.id;
    }
    setActive(next);
  };

  const onClear = () => {
    if (activePlayer) setGross(activePlayer.id, i, null);
  };

  const goNext = () => {
    if (nextHole != null) setHole(nextHole);
    else openSettle();
  };

  return (
    <>
      <main className="flex-1 px-4 pb-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          <NavButton label="Previous hole" disabled={prevHole == null} onClick={() => prevHole && setHole(prevHole)}>
            ‹
          </NavButton>
          <button type="button" onClick={() => setPicking((p) => !p)} aria-expanded={picking} className="min-h-14 flex-1 text-center">
            <span className="eyebrow block">Hole {picking ? "▴" : "▾"}</span>
            <span className="tabular block font-serif text-5xl font-semibold leading-none">{hole}</span>
          </button>
          <NavButton label="Next hole" disabled={nextHole == null} onClick={() => nextHole && setHole(nextHole)}>
            ›
          </NavButton>
        </div>
        <p className="mt-1 text-center text-sm text-muted">
          Handicap {h.handicap ?? "—"} · <span className={cx(h.worth > 1 && "font-semibold text-brass")}>worth {skinsLabel(h.worth)}</span>
        </p>

        {picking && <HolePicker results={results} order={order} hole={hole} setHole={setHole} />}

        <ol className="mt-3 divide-y divide-rule/70 border-y border-rule" aria-label={`Scores for hole ${hole}`}>
          {round.players.map((p) => {
            const g = gross(p.id);
            const net = h.net[p.id];
            const isActive = active === p.id;
            const isWinner = h.winnerId === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setActive(p.id)}
                  aria-pressed={isActive}
                  aria-label={`${p.name}: gross ${g ?? "not entered"}${net != null ? `, net ${net}` : ""}`}
                  className={cx(
                    "flex min-h-14 w-full items-center gap-3 border-l-4 px-2 py-1.5 text-left",
                    isActive ? "border-brass bg-brass-soft/70" : "border-transparent",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-xl">
                      {p.name}
                      {isWinner && <span className="ml-1 text-brass">★</span>}
                    </span>
                    <StrokeDots count={h.strokes[p.id]} />
                  </span>
                  <span className="w-12 text-right text-sm text-muted">{net != null ? <>net <strong className="tabular text-base text-ink">{net}</strong></> : ""}</span>
                  <span
                    className={cx(
                      "tabular flex h-12 w-12 items-center justify-center rounded-md border font-serif text-2xl",
                      isActive ? "border-brass bg-paper" : "border-rule bg-paper",
                      !validGross(g) && "border-warn bg-warn-soft",
                      isWinner && "ring-2 ring-brass",
                    )}
                  >
                    {g ?? <span className="text-muted">·</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-3 min-h-8 text-center" aria-live="polite">
          <ResultLine h={h} round={round} />
        </div>

        <div className="mt-3">
          <HoleCtp round={round} results={results} update={update} hole={hole} />
        </div>
      </main>

      <div className="sticky bottom-0 z-10">
        <Keypad
          activeName={activePlayer?.name ?? null}
          onDigit={onDigit}
          onClear={onClear}
          onNext={goNext}
          nextLabel={nextHole != null ? `Hole ${nextHole} ›` : "Settle up"}
        />
      </div>
    </>
  );
}

function NavButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-14 w-14 items-center justify-center rounded-full border border-rule bg-paper font-serif text-3xl disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function HolePicker({ results, order, hole, setHole }: { results: RoundResults; order: number[]; hole: number; setHole: (h: number) => void }) {
  return (
    <div className="mt-3 grid grid-cols-9 gap-1" aria-label="Choose hole">
      {order.map((n) => results.holes[n - 1]).map((h) => (
        <button
          key={h.hole}
          type="button"
          onClick={() => setHole(h.hole)}
          aria-label={`Hole ${h.hole}, ${h.status}`}
          aria-current={h.hole === hole || undefined}
          className={cx(
            "tabular flex h-11 flex-col items-center justify-center rounded-md border font-serif text-base",
            h.hole === hole ? "border-green bg-green text-green-ink" : "border-rule bg-paper",
          )}
        >
          {h.hole}
          <span
            className={cx(
              "mt-0.5 h-1 w-1 rounded-full",
              h.status === "won" ? "bg-good" : h.status === "tie" ? "bg-warn" : "bg-transparent",
              h.hole === hole && h.status !== "incomplete" && "bg-green-ink",
            )}
          />
        </button>
      ))}
    </div>
  );
}

function CardView({
  round,
  results,
  setGross,
  onPickHole,
}: {
  round: Round;
  results: RoundResults;
  setGross: (playerId: string, holeIndex: number, v: number | null) => void;
  onPickHole: (h: number) => void;
}) {
  const name = (id: string | null) => round.players.find((p) => p.id === id)?.name ?? "";
  return (
    <main className="flex-1 px-2 pb-8 pt-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-rule bg-paper text-center">
          <thead>
            <tr className="bg-green text-green-ink">
              <th className="sticky left-0 bg-green px-2 py-2 text-left text-[11px] font-bold uppercase tracking-widest">Hole</th>
              {round.players.map((p) => (
                <th key={p.id} className="max-w-16 truncate border-l border-green-ink/20 px-1 py-2 font-serif text-sm font-semibold">
                  {p.name}
                </th>
              ))}
              <th className="border-l border-green-ink/20 px-2 py-2 text-[11px] font-bold uppercase tracking-widest">Skin</th>
            </tr>
          </thead>
          <tbody>
            {playOrder(round.settings)
              .map((i) => results.holes[i])
              .map((h, pos) => (
                <tr key={h.hole} className={cx("border-t border-rule/70", pos === 9 && "border-t-4 border-double border-rule")}>
                  <td className="sticky left-0 bg-paper-2 px-2 py-0.5 text-left">
                    <button type="button" onClick={() => onPickHole(h.hole)} className="min-h-11 text-left" aria-label={`Open hole ${h.hole}`}>
                      <span className="block font-serif text-lg leading-none">{h.hole}</span>
                      <span className="block text-[10px] text-muted">hcp {h.handicap ?? "—"}</span>
                    </button>
                  </td>
                  {round.players.map((p) => {
                    const gross = round.scores[p.id]?.[h.hole - 1] ?? null;
                    const strokes = h.strokes[p.id];
                    const net = h.net[p.id];
                    return (
                      <td key={p.id} className={cx("border-l border-rule/70 px-0.5 py-0.5", h.winnerId === p.id && "bg-brass-soft")}>
                        <NumberInput
                          aria-label={`Gross for ${p.name} on hole ${h.hole}`}
                          value={gross}
                          invalid={!validGross(gross)}
                          onChange={(v) => setGross(p.id, h.hole - 1, v)}
                          className="h-10 w-11 border-transparent bg-transparent font-serif text-lg"
                        />
                        <div className="flex h-3 items-center justify-center gap-1 text-[10px] text-muted">
                          <StrokeDots count={strokes} />
                          {strokes > 0 && net != null && <span className="tabular">{net}</span>}
                        </div>
                      </td>
                    );
                  })}
                  <td className="border-l border-rule/70 px-1 text-xs">
                    {h.status === "won" ? (
                      <span className="font-semibold text-good">
                        {name(h.winnerId)}
                        {h.skinsAwarded > 1 && <span className="text-brass"> ×{h.skinsAwarded}</span>}
                      </span>
                    ) : h.status === "tie" ? (
                      <span className="font-semibold text-warn">Halved</span>
                    ) : (
                      <span className="text-muted">·</span>
                    )}
                  </td>
                </tr>
              ))}
            <tr className="border-t-4 border-double border-rule bg-paper-2">
              <td className="sticky left-0 bg-paper-2 px-2 py-2 text-left text-[11px] font-bold uppercase tracking-widest">Skins</td>
              {results.players.map((r) => (
                <td key={r.playerId} className="tabular border-l border-rule/70 py-2 font-serif text-lg font-semibold">
                  {r.skins}
                </td>
              ))}
              <td className="border-l border-rule/70 px-1 text-[10px] text-muted">{results.unclaimedCarryover > 0 ? `${results.unclaimedCarryover} unclaimed` : ""}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 px-2 text-xs text-muted">Dots = strokes received; small number = net. Tap a hole number to open it.</p>
    </main>
  );
}
