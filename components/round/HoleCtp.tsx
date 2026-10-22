"use client";

import type { Round, RoundResults } from "@/lib/scoring";
import { newId } from "@/lib/storage";
import type { UpdateRound } from "../SkinsApp";
import { Button, cx } from "../ui";

const ctpLabel = (n: number) => `${n} CTP${n === 1 ? "" : "s"}`;

/** Closest-to-the-pin entries for one hole, edited right on the scorecard. */
export default function HoleCtp({ round, results, update, hole }: { round: Round; results: RoundResults; update: UpdateRound; hole: number }) {
  const entries = round.ctps.map((c, idx) => ({ c, idx, res: results.ctpResults[idx] })).filter((e) => e.c.hole === hole);

  const add = () => update((d) => void d.ctps.push({ id: newId(), hole, winnerId: null, noWinner: false, notes: "" }));

  if (entries.length === 0) {
    return (
      <Button variant="ghost" className="w-full border-dashed border-rule text-muted" onClick={add}>
        <span className="text-brass">⚑</span> Closest to the pin on this hole
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(({ c, idx, res }) => {
        const pending = !c.winnerId && !c.noWinner;
        const choose = (winnerId: string | null, noWinner: boolean) =>
          update((d) => {
            d.ctps[idx].winnerId = winnerId;
            d.ctps[idx].noWinner = noWinner;
          });
        return (
          <div key={c.id} className="rounded-md border border-brass/40 bg-brass-soft/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="eyebrow text-ink">
                <span className="text-brass">⚑</span> Closest to the pin
                {res && res.worth > 1 && <span className="ml-1 normal-case tracking-normal text-brass">· worth {ctpLabel(res.worth)}</span>}
              </h3>
              <button
                type="button"
                className="min-h-9 px-1 text-sm text-muted underline"
                onClick={() => update((d) => void d.ctps.splice(idx, 1))}
                aria-label={`Remove closest to the pin on hole ${hole}`}
              >
                Remove
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Closest to the pin winner">
              {round.players.map((p) => (
                <Chip key={p.id} selected={c.winnerId === p.id} onClick={() => choose(p.id, false)}>
                  {p.name}
                </Chip>
              ))}
              <Chip selected={c.noWinner} onClick={() => choose(null, true)} muted>
                No one
              </Chip>
            </div>
            <input
              type="text"
              value={c.notes}
              placeholder="Distance / notes"
              aria-label={`Notes for closest to the pin on hole ${hole}`}
              onChange={(e) => update((d) => void (d.ctps[idx].notes = e.target.value))}
              className="mt-2 h-11 w-full border-b border-rule bg-transparent px-1 outline-none focus:border-green"
            />
            {pending && <p className="mt-1 text-sm text-warn">Pick a winner, or “No one”.</p>}
            {res?.status === "none" && (
              <p className="mt-1 text-sm text-muted">
                {round.settings.ctpCarryover ? `${ctpLabel(res.worth)} ${res.worth === 1 ? "carries" : "carry"} to the next CTP hole` : "No winner — CTP lost"}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Chip({ selected, muted, onClick, children }: { selected: boolean; muted?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cx(
        "min-h-11 max-w-full truncate rounded-full border px-4 font-semibold",
        selected ? "border-green bg-green text-green-ink" : cx("border-rule bg-paper", muted ? "text-muted" : "text-ink"),
      )}
    >
      {children}
    </button>
  );
}
