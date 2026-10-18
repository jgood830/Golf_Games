"use client";

import { HOLES, formatMoney, type Round, type RoundResults } from "@/lib/scoring";
import { newId } from "@/lib/storage";
import type { UpdateRound } from "./SkinsApp";
import { Button, Card, cx } from "./ui";

const selectClass = "h-12 w-full rounded-lg border-2 border-line bg-surface px-2 text-lg font-semibold outline-none focus:border-accent";

export default function CtpTab({ round, results, update }: { round: Round; results: RoundResults; update: UpdateRound }) {
  const addEntry = () =>
    update((d) => {
      const used = new Set(d.ctps.map((c) => c.hole));
      const nextHole = Array.from({ length: HOLES }, (_, i) => i + 1).find((h) => !used.has(h)) ?? 1;
      d.ctps.push({ id: newId(), hole: nextHole, winnerId: null, notes: "" });
    });

  const holeCounts = new Map<number, number>();
  for (const c of round.ctps) holeCounts.set(c.hole, (holeCounts.get(c.hole) ?? 0) + 1);

  return (
    <>
      <Card title="Closest to the pin" action={<Button variant="primary" onClick={addEntry} className="px-3">+ Add</Button>}>
        <p className="mb-3 text-sm text-muted">{formatMoney(round.settings.ctpValue)} from each other player per CTP.</p>
        {round.ctps.length === 0 ? (
          <p className="rounded-xl bg-surface-2 p-4 text-center text-muted">No CTPs yet. Tap “+ Add” on a par 3.</p>
        ) : (
          <ul className="space-y-3">
            {round.ctps.map((c, idx) => (
              <li key={c.id} className="rounded-xl border border-line bg-surface-2 p-3">
                <div className="grid grid-cols-[6rem_1fr_auto] items-end gap-2">
                  <label className="text-xs font-bold text-muted">
                    Hole
                    <select
                      className={cx(selectClass, (holeCounts.get(c.hole) ?? 0) > 1 && "border-warn")}
                      value={c.hole}
                      onChange={(e) => update((d) => void (d.ctps[idx].hole = Number(e.target.value)))}
                    >
                      {Array.from({ length: HOLES }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          #{i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-muted">
                    Winner
                    <select
                      className={cx(selectClass, !c.winnerId && "border-warn")}
                      value={c.winnerId ?? ""}
                      onChange={(e) => update((d) => void (d.ctps[idx].winnerId = e.target.value || null))}
                    >
                      <option value="">— pick —</option>
                      {round.players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button
                    variant="ghost"
                    aria-label={`Delete CTP on hole ${c.hole}`}
                    className="h-12 px-2 text-2xl text-bad"
                    onClick={() => update((d) => void d.ctps.splice(idx, 1))}
                  >
                    ×
                  </Button>
                </div>
                <input
                  type="text"
                  value={c.notes}
                  placeholder="Distance / notes (optional)"
                  aria-label={`Notes for CTP on hole ${c.hole}`}
                  onChange={(e) => update((d) => void (d.ctps[idx].notes = e.target.value))}
                  className="mt-2 h-11 w-full rounded-lg border-2 border-line bg-surface px-3 outline-none focus:border-accent"
                />
                {(holeCounts.get(c.hole) ?? 0) > 1 && <p className="mt-1 text-sm text-warn">More than one CTP on hole {c.hole}.</p>}
                {!c.winnerId && <p className="mt-1 text-sm text-warn">Pick a winner — this CTP doesn’t count yet.</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {results.totalCtps > 0 && (
        <Card title="CTPs won">
          <ul className="divide-y divide-line">
            {results.players.map((r, i) => (
              <li key={r.playerId} className="flex justify-between py-2 text-lg">
                <span className="font-semibold">{round.players[i].name}</span>
                <span className="tabular font-extrabold">{r.ctps}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
