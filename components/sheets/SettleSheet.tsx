"use client";

import { useState } from "react";
import { formatMoney, formatSigned, playOrder, playerStatus, type Round, type RoundResults } from "@/lib/scoring";
import { buildSummary } from "@/lib/summary";
import { Button, Section, Sheet, cx } from "../ui";

const tone = (amount: number) => {
  const cents = Math.round(amount * 100);
  return cents > 0 ? "text-good" : cents < 0 ? "text-bad" : "text-muted";
};
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function SettleSheet({
  round,
  results,
  onClose,
  goToHole,
}: {
  round: Round;
  results: RoundResults;
  onClose: () => void;
  goToHole: (hole: number) => void;
}) {
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const nameOf = (id: string | null) => round.players.find((p) => p.id === id)?.name ?? "";
  const completed = results.holes.filter((h) => h.status !== "incomplete").length;
  const balanced = Math.round(results.balance * 100) === 0;

  // CTP entries in play order, with their resolved result.
  const position = new Map(playOrder(round.settings).map((holeIndex, pos) => [holeIndex + 1, pos]));
  const ctpLog = round.ctps
    .map((c, idx) => ({ c, res: results.ctpResults[idx] }))
    .sort((a, b) => (position.get(a.c.hole) ?? 0) - (position.get(b.c.hole) ?? 0));

  const share = async () => {
    const text = buildSummary(round, results);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Skins results", text });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareMsg("Summary copied to clipboard");
    } catch {
      window.prompt("Copy the summary:", text);
    }
    setTimeout(() => setShareMsg(null), 2500);
  };

  return (
    <Sheet
      title="Settle up"
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" className="min-h-12 w-full text-lg" onClick={share}>
            Share results
          </Button>
          {shareMsg && (
            <p role="status" className="mt-2 text-center text-sm font-semibold text-good">
              {shareMsg}
            </p>
          )}
        </>
      }
    >
      <p className="mb-3 text-sm text-muted">
        {completed} of 18 holes · {plural(results.totalSkins, "skin")} won · {results.totalCtps} CTP{results.totalCtps === 1 ? "" : "s"}
      </p>

      {/* Ledger, laid out like the totals box on a scorecard. */}
      <table className="w-full border-collapse border border-rule text-left">
        <thead>
          <tr className="bg-green text-green-ink">
            <th className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-widest">Player</th>
            <th className="px-1 py-1.5 text-right text-[11px] font-bold uppercase tracking-widest">Skins</th>
            <th className="px-1 py-1.5 text-right text-[11px] font-bold uppercase tracking-widest">CTP</th>
            <th className="px-2 py-1.5 text-right text-[11px] font-bold uppercase tracking-widest">Net</th>
          </tr>
        </thead>
        <tbody>
          {results.players.map((r) => (
            <tr key={r.playerId} className="border-t border-rule/70 align-top">
              <td className="px-2 py-2">
                <div className="font-serif text-lg leading-tight">{r.name}</div>
                <div className={cx("text-xs font-semibold", tone(r.totalNet))}>{playerStatus(r.totalNet)}</div>
                <div className="text-[11px] text-muted">{plural(r.strokes, "stroke")}</div>
              </td>
              <td className="tabular px-1 py-2 text-right">
                <div className="font-serif text-lg">{r.skins}</div>
                <div className={cx("text-[11px]", tone(r.skinsNet))}>{formatSigned(r.skinsNet)}</div>
              </td>
              <td className="tabular px-1 py-2 text-right">
                <div className="font-serif text-lg">{r.ctps}</div>
                <div className={cx("text-[11px]", tone(r.ctpNet))}>{formatSigned(r.ctpNet)}</div>
              </td>
              <td className={cx("tabular px-2 py-2 text-right font-serif text-xl font-semibold", tone(r.totalNet))}>{formatSigned(r.totalNet)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={cx("mt-2 text-sm font-semibold", balanced ? "text-good" : "text-bad")}>
        {balanced ? "✓ Balanced — totals sum to $0.00" : `⚠ Totals are off by ${formatSigned(results.balance)}`}
      </p>

      <Section title="Who pays whom" className="mt-5">
        {results.payments.length === 0 ? (
          <p className="text-muted">Nobody owes anything yet.</p>
        ) : (
          <ul className="divide-y divide-rule/70">
            {results.payments.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-2 py-3">
                <span className="font-serif text-lg">
                  {nameOf(p.fromId)} <span className="text-brass">→</span> {nameOf(p.toId)}
                </span>
                <span className="tabular font-serif text-xl font-semibold">{formatMoney(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {(results.unclaimedCarryover > 0 || results.unclaimedCtpCarryover > 0) && (
        <div className="mt-4 rounded-md bg-warn-soft p-3 text-sm font-semibold text-warn">
          {results.unclaimedCarryover > 0 && (
            <p>
              Unclaimed carryover: {plural(results.unclaimedCarryover, "skin")} (hole {round.settings.startOnBack9 ? 9 : 18} halved — not paid to anyone)
            </p>
          )}
          {results.unclaimedCtpCarryover > 0 && <p>Unclaimed CTP carryover: {plural(results.unclaimedCtpCarryover, "CTP")} (not paid to anyone)</p>}
        </div>
      )}

      <Section title="Closest to the pin" className="mt-5">
        {ctpLog.length === 0 ? (
          <p className="text-sm text-muted">None yet. Add one from the hole it happens on.</p>
        ) : (
          <ul className="divide-y divide-rule/70">
            {ctpLog.map(({ c, res }) => (
              <li key={c.id}>
                <button type="button" onClick={() => goToHole(c.hole)} className="flex min-h-12 w-full items-center gap-3 py-2 text-left">
                  <span className="tabular w-10 font-serif text-lg text-muted">#{c.hole}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cx("block font-serif text-lg", !c.winnerId && "text-muted")}>
                      {c.winnerId ? nameOf(c.winnerId) : c.noWinner ? "No one" : "Winner not picked"}
                      {res && res.ctpsAwarded > 1 && <span className="text-brass"> ×{res.ctpsAwarded}</span>}
                    </span>
                    {c.notes && <span className="block truncate text-sm text-muted">{c.notes}</span>}
                  </span>
                  <span className="text-green" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Sheet>
  );
}
