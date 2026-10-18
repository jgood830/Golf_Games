"use client";

import { DEFAULT_HOLE_HANDICAPS, HOLES, duplicateHandicaps, type Round } from "@/lib/scoring";
import { clearRound, defaultRound, emptyScoresFor, newId } from "@/lib/storage";
import type { UpdateRound } from "./SkinsApp";
import { Button, Card, NumberInput, Stepper, Toggle, cx } from "./ui";

const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;

const validStrokes = (s: number) => Number.isInteger(s) && s >= 0 && s <= 36;
const validHcp = (h: number | null) => h == null || (Number.isInteger(h) && h >= 1 && h <= 18);

export default function SetupTab({
  round,
  update,
  setRound,
  goToScorecard,
  onNewRound,
}: {
  round: Round;
  update: UpdateRound;
  setRound: (r: Round) => void;
  goToScorecard: () => void;
  onNewRound: () => void;
}) {
  const dupes = duplicateHandicaps(round.holeHandicaps);
  const missingHcp = round.holeHandicaps.filter((h) => h == null).length;
  const hasScores = Object.values(round.scores).some((row) => row.some((v) => v != null)) || round.ctps.length > 0;

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

  const newRound = () => {
    if (hasScores && !window.confirm("Start a new round? This clears all scores and CTPs but keeps players and course.")) return;
    update((d) => {
      d.scores = emptyScoresFor(d.players);
      d.ctps = [];
    });
    onNewRound();
    goToScorecard();
  };

  const resetAll = () => {
    if (!window.confirm("Reset everything? Players, settings, course and scores will all be cleared.")) return;
    clearRound();
    setRound(defaultRound());
    onNewRound();
  };

  return (
    <>
      <Card
        title={`Players (${round.players.length})`}
        action={
          <Button onClick={addPlayer} disabled={round.players.length >= MAX_PLAYERS} variant="primary" className="px-3">
            + Add
          </Button>
        }
      >
        <ul className="space-y-3">
          {round.players.map((p, i) => {
            const nameMissing = p.name.trim() === "";
            return (
              <li key={p.id} className="rounded-xl border border-line bg-surface-2 p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={p.name}
                    placeholder={`Player ${i + 1} name`}
                    aria-label={`Player ${i + 1} name`}
                    aria-invalid={nameMissing || undefined}
                    autoCapitalize="words"
                    enterKeyHint="next"
                    onChange={(e) => update((d) => void (d.players[i].name = e.target.value))}
                    className={cx(
                      "h-12 min-w-0 flex-1 rounded-lg border-2 bg-surface px-3 text-lg font-semibold outline-none focus:border-accent",
                      nameMissing ? "border-warn" : "border-line",
                    )}
                  />
                  <Button
                    variant="ghost"
                    aria-label={`Remove player ${i + 1}`}
                    disabled={round.players.length <= MIN_PLAYERS}
                    onClick={() => removePlayer(p.id)}
                    className="px-2 text-2xl text-bad"
                  >
                    ×
                  </Button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-muted">Strokes given</span>
                  <Stepper
                    label={`strokes for player ${i + 1}`}
                    value={p.strokes}
                    min={0}
                    max={36}
                    invalid={!validStrokes(p.strokes)}
                    onChange={(v) => update((d) => void (d.players[i].strokes = v ?? 0))}
                  />
                </div>
                {nameMissing && <p className="mt-1 text-sm text-warn">Name required</p>}
                {!validStrokes(p.strokes) && <p className="mt-1 text-sm text-warn">Strokes should be a whole number 0–36</p>}
              </li>
            );
          })}
        </ul>
        {round.players.length >= MAX_PLAYERS && <p className="mt-2 text-sm text-muted">Maximum of {MAX_PLAYERS} players.</p>}
      </Card>

      <Card title="Game">
        <div className="space-y-3">
          <MoneyRow label="Value per skin" hint="Paid by each other player" value={round.settings.skinValue} onChange={(v) => update((d) => void (d.settings.skinValue = v))} />
          <MoneyRow label="Value per CTP" hint="Closest to the pin" value={round.settings.ctpValue} onChange={(v) => update((d) => void (d.settings.ctpValue = v))} />
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Carry over skins</div>
              <div className="text-sm text-muted">Tied skins roll to the next hole</div>
            </div>
            <Toggle label="Carry over tied holes" checked={round.settings.carryover} onChange={(v) => update((d) => void (d.settings.carryover = v))} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Carry over CTPs</div>
              <div className="text-sm text-muted">An unwon CTP rolls to the next CTP hole</div>
            </div>
            <Toggle label="Carry over closest to the pin" checked={round.settings.ctpCarryover} onChange={(v) => update((d) => void (d.settings.ctpCarryover = v))} />
          </div>
        </div>
      </Card>

      <Card
        title="Course hole handicaps"
        action={
          <Button
            className="px-3 text-sm"
            onClick={() => update((d) => void (d.holeHandicaps = [...DEFAULT_HOLE_HANDICAPS]))}
          >
            Default
          </Button>
        }
      >
        <p className="mb-3 text-sm text-muted">1 = hardest hole. Each value 1–18 should be used once.</p>
        <div className="grid grid-cols-6 gap-2">
          {round.holeHandicaps.map((h, i) => {
            const bad = !validHcp(h) || (h != null && dupes.has(h));
            return (
              <label key={i} className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-muted">#{i + 1}</span>
                <NumberInput
                  aria-label={`Handicap for hole ${i + 1}`}
                  value={h}
                  invalid={bad}
                  onChange={(v) => update((d) => void (d.holeHandicaps[i] = v))}
                  className="h-11 w-full text-lg"
                />
              </label>
            );
          })}
        </div>
        {dupes.size > 0 && (
          <p className="mt-3 rounded-lg bg-warn-soft p-2 text-sm font-semibold text-warn">
            Duplicate handicap{dupes.size > 1 ? "s" : ""}: {[...dupes].sort((a, b) => a - b).join(", ")}
          </p>
        )}
        {missingHcp > 0 && (
          <p className="mt-2 text-sm text-warn">
            {missingHcp} hole{missingHcp > 1 ? "s have" : " has"} no handicap — no strokes are given there.
          </p>
        )}
      </Card>

      <div className="grid gap-3">
        <Button variant="primary" className="min-h-14 text-lg" onClick={newRound}>
          Start new round
        </Button>
        <Button variant="danger" onClick={resetAll}>
          Reset everything
        </Button>
      </div>
    </>
  );
}

function MoneyRow({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  const invalid = !(value >= 0);
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-sm text-muted">{hint}</div>
      </div>
      <div className="flex items-center gap-1 text-xl font-bold">
        $
        <NumberInput decimal aria-label={label} value={value} invalid={invalid} onChange={(v) => onChange(v ?? 0)} className="h-12 w-20 text-xl" />
      </div>
    </div>
  );
}
