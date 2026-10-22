"use client";

import type { Round } from "@/lib/scoring";
import type { UpdateRound } from "../SkinsApp";
import { NumberInput, Row, Toggle } from "../ui";

export default function GameEditor({
  round,
  update,
  hasScores,
  resetHole,
}: {
  round: Round;
  update: UpdateRound;
  hasScores: boolean;
  /** Jump the scorecard to the first hole played. */
  resetHole: (startOnBack9: boolean) => void;
}) {
  const s = round.settings;
  return (
    <div className="border-y border-rule">
      <Row title="Per skin" hint="Paid by each other player">
        <Money label="Value per skin" value={s.skinValue} onChange={(v) => update((d) => void (d.settings.skinValue = v))} />
      </Row>
      <Row title="Per closest to the pin" hint="Paid by each other player">
        <Money label="Value per CTP" value={s.ctpValue} onChange={(v) => update((d) => void (d.settings.ctpValue = v))} />
      </Row>
      <Row title="Carry over skins" hint="Tied skins roll to the next hole">
        <Toggle label="Carry over tied holes" checked={s.carryover} onChange={(v) => update((d) => void (d.settings.carryover = v))} />
      </Row>
      <Row title="Carry over CTPs" hint="An unwon CTP rolls to the next CTP hole">
        <Toggle label="Carry over closest to the pin" checked={s.ctpCarryover} onChange={(v) => update((d) => void (d.settings.ctpCarryover = v))} />
      </Row>
      <Row title="Start on the back 9" hint="Play 10–18, then 1–9. Carryovers follow that order.">
        <Toggle
          label="Start on the back 9"
          checked={!!s.startOnBack9}
          onChange={(v) => {
            update((d) => void (d.settings.startOnBack9 = v));
            if (!hasScores) resetHole(v);
          }}
        />
      </Row>
    </div>
  );
}

function Money({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1 font-serif text-xl">
      <span className="text-muted">$</span>
      <NumberInput decimal aria-label={label} value={value} invalid={!(value >= 0)} onChange={(v) => onChange(v ?? 0)} className="h-12 w-20 font-serif text-xl" />
    </div>
  );
}
