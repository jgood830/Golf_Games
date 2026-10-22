"use client";

import { useState } from "react";
import type { Round } from "@/lib/scoring";
import type { UpdateRound } from "./SkinsApp";
import CourseEditor from "./editors/CourseEditor";
import GameEditor from "./editors/GameEditor";
import PlayersEditor from "./editors/PlayersEditor";
import { Button, cx } from "./ui";

const STEPS = [
  { title: "Who’s playing?", hint: "2 to 6 players. Strokes are each player’s handicap strokes for the round." },
  { title: "The game", hint: "What each skin and closest-to-the-pin is worth, and how ties carry." },
  { title: "The course", hint: "Pick a saved course or enter the hole handicaps from the card." },
] as const;

/** New-round setup, one step at a time. Edits apply to the round as you go. */
export default function Wizard({
  round,
  update,
  resetHole,
  onTeeOff,
}: {
  round: Round;
  update: UpdateRound;
  resetHole: (startOnBack9: boolean) => void;
  onTeeOff: () => void;
}) {
  const [step, setStep] = useState(0);
  const missingNames = round.players.filter((p) => !p.name.trim()).length;
  const last = step === STEPS.length - 1;

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col bg-paper">
      <header className="rule-double px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="eyebrow">
          New round · Step {step + 1} of {STEPS.length}
        </div>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={cx("h-1 flex-1 rounded-full", i <= step ? "bg-brass" : "bg-rule")} />
          ))}
        </div>
        <h1 className="mt-3 font-serif text-3xl font-semibold">{STEPS[step].title}</h1>
        <p className="mt-1 text-sm text-muted">{STEPS[step].hint}</p>
      </header>

      <main className="flex-1 px-4 py-4">
        {step === 0 && <PlayersEditor round={round} update={update} />}
        {step === 1 && <GameEditor round={round} update={update} hasScores={false} resetHole={resetHole} />}
        {step === 2 && <CourseEditor round={round} update={update} hasScores={false} />}
      </main>

      <footer className="sticky bottom-0 border-t border-rule bg-paper px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        {step === 0 && missingNames > 0 && (
          <p className="mb-2 text-center text-sm text-warn">
            {missingNames} player{missingNames > 1 ? "s need" : " needs"} a name (or they’ll show as “Player N”).
          </p>
        )}
        <div className="flex gap-2">
          {step > 0 && (
            <Button className="min-h-12 flex-1" onClick={() => setStep((s) => s - 1)}>
              ‹ Back
            </Button>
          )}
          <Button
            variant="primary"
            className="min-h-12 flex-[2] text-lg"
            onClick={() => {
              if (last) onTeeOff();
              else setStep((s) => s + 1);
            }}
          >
            {last ? "Tee off ›" : "Next ›"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
