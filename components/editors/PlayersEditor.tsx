"use client";

import { HOLES, type Round } from "@/lib/scoring";
import { newId } from "@/lib/storage";
import type { UpdateRound } from "../SkinsApp";
import { Button, Stepper, cx } from "../ui";

export const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;

const validStrokes = (s: number) => Number.isInteger(s) && s >= 0 && s <= 36;

export default function PlayersEditor({ round, update }: { round: Round; update: UpdateRound }) {
  const addPlayer = () =>
    update((d) => {
      const id = newId();
      d.players.push({ id, name: "", strokes: 0 });
      d.scores[id] = Array(HOLES).fill(null);
    });

  const removePlayer = (id: string) => {
    const p = round.players.find((x) => x.id === id);
    const hasData = round.scores[id]?.some((v) => v != null);
    if (hasData && !window.confirm(`Remove ${p?.name || "this player"} and their scores?`)) return;
    update((d) => {
      d.players = d.players.filter((x) => x.id !== id);
      delete d.scores[id];
      for (const c of d.ctps) if (c.winnerId === id) c.winnerId = null;
    });
  };

  return (
    <div>
      <ol className="divide-y divide-rule/70 border-y border-rule">
        {round.players.map((p, i) => {
          const nameMissing = p.name.trim() === "";
          const badStrokes = !validStrokes(p.strokes);
          return (
            <li key={p.id} className="py-3">
              <div className="flex items-center gap-2">
                <span className="w-5 shrink-0 font-serif text-lg text-muted">{i + 1}</span>
                <input
                  type="text"
                  value={p.name}
                  placeholder="Name"
                  aria-label={`Player ${i + 1} name`}
                  aria-invalid={nameMissing || undefined}
                  autoCapitalize="words"
                  enterKeyHint="next"
                  onChange={(e) => update((d) => void (d.players[i].name = e.target.value))}
                  className={cx(
                    "h-12 min-w-0 flex-1 border-b-2 bg-transparent px-1 font-serif text-xl outline-none focus:border-green",
                    nameMissing ? "border-warn" : "border-rule",
                  )}
                />
                <Button
                  variant="ghost"
                  aria-label={`Remove player ${i + 1}`}
                  disabled={round.players.length <= MIN_PLAYERS}
                  onClick={() => removePlayer(p.id)}
                  className="px-2 text-2xl text-muted"
                >
                  ×
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 pl-7">
                <span className="text-sm text-muted">Strokes given</span>
                <Stepper
                  label={`strokes for player ${i + 1}`}
                  value={p.strokes}
                  min={0}
                  max={36}
                  invalid={badStrokes}
                  onChange={(v) => update((d) => void (d.players[i].strokes = v ?? 0))}
                />
              </div>
              {(nameMissing || badStrokes) && (
                <p className="mt-1 pl-7 text-sm text-warn">{nameMissing ? "Name required" : "Strokes should be a whole number 0–36"}</p>
              )}
            </li>
          );
        })}
      </ol>
      <Button className="mt-3 w-full border-dashed" onClick={addPlayer} disabled={round.players.length >= MAX_PLAYERS}>
        {round.players.length >= MAX_PLAYERS ? `Maximum of ${MAX_PLAYERS} players` : "+ Add player"}
      </Button>
    </div>
  );
}
