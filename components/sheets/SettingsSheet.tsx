"use client";

import type { Round } from "@/lib/scoring";
import type { UpdateRound } from "../SkinsApp";
import CourseEditor from "../editors/CourseEditor";
import GameEditor from "../editors/GameEditor";
import PlayersEditor from "../editors/PlayersEditor";
import { Button, Section, Sheet } from "../ui";

export default function SettingsSheet({
  round,
  update,
  hasScores,
  resetHole,
  onNewRound,
  onResetAll,
  onClose,
}: {
  round: Round;
  update: UpdateRound;
  hasScores: boolean;
  resetHole: (startOnBack9: boolean) => void;
  onNewRound: () => void;
  onResetAll: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Round settings" onClose={onClose}>
      <Section title="Players" className="border-t-0 pt-2">
        <PlayersEditor round={round} update={update} />
      </Section>
      <Section title="The game" className="mt-6">
        <GameEditor round={round} update={update} hasScores={hasScores} resetHole={resetHole} />
      </Section>
      <Section title="Course" className="mt-6">
        <CourseEditor round={round} update={update} hasScores={hasScores} />
      </Section>
      <Section title="Round" className="mt-6">
        <div className="grid gap-2">
          <Button variant="primary" className="min-h-12" onClick={onNewRound}>
            Start a new round
          </Button>
          <p className="text-sm text-muted">Clears scores and closest-to-the-pin; keeps players, game and course.</p>
          <Button variant="danger" className="mt-2" onClick={onResetAll}>
            Reset everything
          </Button>
        </div>
      </Section>
    </Sheet>
  );
}
