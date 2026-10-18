"use client";

import { HOLES, type HoleResult, type Round, type RoundResults } from "@/lib/scoring";
import type { UpdateRound } from "./SkinsApp";
import { Button, Card, NumberInput, Segmented, Stepper, StrokeDots, cx } from "./ui";

const validGross = (g: number | null) => g == null || (Number.isInteger(g) && g >= 1 && g <= 15);
const skinsLabel = (n: number) => `${n} skin${n === 1 ? "" : "s"}`;

export default function ScorecardTab({
  round,
  results,
  update,
  hole,
  setHole,
  view,
  setView,
}: {
  round: Round;
  results: RoundResults;
  update: UpdateRound;
  hole: number;
  setHole: (h: number) => void;
  view: "hole" | "grid";
  setView: (v: "hole" | "grid") => void;
}) {
  const setGross = (playerId: string, holeIndex: number, v: number | null) =>
    update((d) => {
      d.scores[playerId] ??= Array(HOLES).fill(null);
      d.scores[playerId][holeIndex] = v;
    });

  return (
    <>
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: "hole", label: "Hole by hole" },
          { value: "grid", label: "Full card" },
        ]}
      />
      <SkinsChips round={round} results={results} />
      {view === "hole" ? (
        <HoleView round={round} results={results} hole={hole} setHole={setHole} setGross={setGross} />
      ) : (
        <GridView round={round} results={results} setGross={setGross} onPickHole={(h) => { setHole(h); setView("hole"); }} />
      )}
    </>
  );
}

function SkinsChips({ round, results }: { round: Round; results: RoundResults }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Skins so far">
      {results.players.map((r, i) => (
        <div key={r.playerId} className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5">
          <span className="max-w-28 truncate font-semibold">{round.players[i].name}</span>
          <span className={cx("tabular rounded-full px-2 text-sm font-extrabold", r.skins > 0 ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted")}>{r.skins}</span>
        </div>
      ))}
    </div>
  );
}

export function ResultText({ h, round, short }: { h: HoleResult; round: Round; short?: boolean }) {
  const name = (id: string | null) => round.players.find((p) => p.id === id)?.name ?? "";
  if (h.status === "won") {
    if (short) return <span className="font-bold text-good">{name(h.winnerId)}{h.skinsAwarded > 1 ? ` ×${h.skinsAwarded}` : ""}</span>;
    return (
      <span>
        <span className="font-bold text-good">Skin → {name(h.winnerId)}</span>
        <span className="text-muted"> (worth {skinsLabel(h.skinsAwarded)})</span>
      </span>
    );
  }
  if (h.status === "tie") {
    return <span className="font-bold text-warn">{short ? "Tie" : round.settings.carryover ? "Tie (carries)" : "Tie (skin lost)"}</span>;
  }
  return <span className="text-muted">{short ? "–" : "Incomplete"}</span>;
}

function HoleView({
  round,
  results,
  hole,
  setHole,
  setGross,
}: {
  round: Round;
  results: RoundResults;
  hole: number;
  setHole: (h: number) => void;
  setGross: (playerId: string, holeIndex: number, v: number | null) => void;
}) {
  const i = hole - 1;
  const h = results.holes[i];

  return (
    <>
      <HolePicker results={results} hole={hole} setHole={setHole} />

      <Card>
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button aria-label="Previous hole" disabled={hole <= 1} onClick={() => setHole(hole - 1)} className="h-14 w-14 text-2xl">
            ‹
          </Button>
          <div className="text-center">
            <div className="text-3xl font-extrabold">Hole {hole}</div>
            <div className="text-sm font-semibold text-muted">
              Hcp {h.handicap ?? "—"} · worth {skinsLabel(h.worth)}
            </div>
          </div>
          <Button aria-label="Next hole" disabled={hole >= HOLES} onClick={() => setHole(hole + 1)} className="h-14 w-14 text-2xl">
            ›
          </Button>
        </div>

        <ul className="divide-y divide-line">
          {round.players.map((p) => {
            const gross = round.scores[p.id]?.[i] ?? null;
            const net = h.net[p.id];
            const isWinner = h.winnerId === p.id;
            return (
              <li key={p.id} className={cx("flex items-center gap-2 py-3", isWinner && "-mx-2 rounded-xl bg-accent-soft px-2")}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-bold">
                    {isWinner && "🏆 "}
                    {p.name}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <StrokeDots count={h.strokes[p.id]} />
                    <span className="tabular">
                      Net <strong className="text-base text-ink">{net ?? "–"}</strong>
                    </span>
                  </div>
                </div>
                <Stepper
                  size="lg"
                  label={`gross score for ${p.name} on hole ${hole}`}
                  value={gross}
                  min={1}
                  max={15}
                  emptyStart={4}
                  invalid={!validGross(gross)}
                  onChange={(v) => setGross(p.id, i, v)}
                />
              </li>
            );
          })}
        </ul>

        <div className="mt-3 rounded-xl bg-surface-2 p-3 text-center text-lg">
          <ResultText h={h} round={round} />
        </div>
        {h.status === "incomplete" && h.carriedIn > 0 && (
          <p className="mt-2 text-center text-sm text-muted">{skinsLabel(h.carriedIn)} carried into this hole</p>
        )}
      </Card>

      {hole < HOLES && h.status !== "incomplete" && (
        <Button variant="primary" className="min-h-14 w-full text-lg" onClick={() => setHole(hole + 1)}>
          Next: Hole {hole + 1} →
        </Button>
      )}
    </>
  );
}

function HolePicker({ results, hole, setHole }: { results: RoundResults; hole: number; setHole: (h: number) => void }) {
  return (
    <div className="grid grid-cols-9 gap-1" aria-label="Choose hole">
      {results.holes.map((h) => (
        <button
          key={h.hole}
          type="button"
          onClick={() => setHole(h.hole)}
          aria-label={`Hole ${h.hole}, ${h.status}`}
          aria-current={h.hole === hole || undefined}
          className={cx(
            "tabular flex h-11 items-center justify-center rounded-lg border-2 text-sm font-bold",
            h.hole === hole ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface",
            h.hole !== hole && h.status === "won" && "text-good",
            h.hole !== hole && h.status === "tie" && "text-warn",
            h.hole !== hole && h.status === "incomplete" && "text-muted",
          )}
        >
          {h.hole}
        </button>
      ))}
    </div>
  );
}

function GridView({
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
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-line bg-surface text-center">
        <thead>
          <tr className="bg-surface-2 text-xs font-bold text-muted">
            <th className="sticky left-0 bg-surface-2 px-2 py-2 text-left">Hole</th>
            {round.players.map((p) => (
              <th key={p.id} className="max-w-16 truncate px-1 py-2 text-ink">
                {p.name}
              </th>
            ))}
            <th className="px-2 py-2">Result</th>
          </tr>
        </thead>
        <tbody>
          {results.holes.map((h) => (
            <tr key={h.hole} className={cx(h.hole === 10 && "[&>td]:border-t-4", "[&>td]:border-t [&>td]:border-line")}>
              <td className="sticky left-0 bg-surface px-2 py-1 text-left">
                <button type="button" onClick={() => onPickHole(h.hole)} className="min-h-11 text-left">
                  <div className="font-extrabold">{h.hole}</div>
                  <div className="text-[11px] text-muted">hcp {h.handicap ?? "—"}</div>
                </button>
              </td>
              {round.players.map((p) => {
                const gross = round.scores[p.id]?.[h.hole - 1] ?? null;
                const net = h.net[p.id];
                const strokes = h.strokes[p.id];
                return (
                  <td key={p.id} className={cx("px-1 py-1", h.winnerId === p.id && "bg-accent-soft")}>
                    <div className="flex flex-col items-center">
                      <NumberInput
                        aria-label={`Gross for ${p.name} on hole ${h.hole}`}
                        value={gross}
                        invalid={!validGross(gross)}
                        onChange={(v) => setGross(p.id, h.hole - 1, v)}
                        className="h-11 w-12 text-lg"
                      />
                      <div className="flex h-4 items-center gap-1 text-[11px] text-muted">
                        <StrokeDots count={strokes} />
                        {strokes > 0 && net != null && <span className="tabular">{net}</span>}
                      </div>
                    </div>
                  </td>
                );
              })}
              <td className="px-2 py-1 text-sm">
                <ResultText h={h} round={round} short />
              </td>
            </tr>
          ))}
          <tr className="bg-surface-2 font-extrabold [&>td]:border-t-4 [&>td]:border-line">
            <td className="sticky left-0 bg-surface-2 px-2 py-2 text-left text-xs">Skins</td>
            {results.players.map((r) => (
              <td key={r.playerId} className="tabular px-1 py-2">
                {r.skins}
              </td>
            ))}
            <td className="px-2 py-2 text-xs text-muted">{results.unclaimedCarryover > 0 ? `${results.unclaimedCarryover} unclaimed` : ""}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">Dots = strokes received; small number = net. Tap a hole number to open it.</p>
    </div>
  );
}
