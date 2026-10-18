"use client";

import { useState } from "react";
import { formatMoney, formatSigned, playerStatus, type Round, type RoundResults } from "@/lib/scoring";
import { buildSummary } from "@/lib/summary";
import { Button, Card, cx } from "./ui";

const tone = (amount: number) => {
  const cents = Math.round(amount * 100);
  return cents > 0 ? "text-good" : cents < 0 ? "text-bad" : "text-muted";
};

export default function ResultsTab({ round, results }: { round: Round; results: RoundResults }) {
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const nameOf = (id: string) => round.players.find((p) => p.id === id)?.name ?? "";
  const completed = results.holes.filter((h) => h.status !== "incomplete").length;
  const balanced = Math.round(results.balance * 100) === 0;

  const share = async () => {
    const text = buildSummary(round, results);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Skins results", text });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      // Fall through to clipboard.
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
    <>
      <p className="text-sm font-semibold text-muted">
        {completed} of 18 holes complete · {results.totalSkins} skin{results.totalSkins === 1 ? "" : "s"} won · {results.totalCtps} CTP
        {results.totalCtps === 1 ? "" : "s"}
      </p>

      <div className="space-y-3">
        {results.players.map((r) => (
          <Card key={r.playerId}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-xl font-extrabold">{r.name}</div>
                <div className="text-sm text-muted">
                  {r.strokes} stroke{r.strokes === 1 ? "" : "s"}
                </div>
              </div>
              <div className="text-right">
                <div className={cx("tabular text-2xl font-extrabold", tone(r.totalNet))}>{formatSigned(r.totalNet)}</div>
                <div className={cx("text-sm font-bold", tone(r.totalNet))}>{playerStatus(r.totalNet)}</div>
              </div>
            </div>
            <dl className="tabular mt-3 grid grid-cols-4 gap-2 rounded-xl bg-surface-2 p-2 text-center">
              <Stat label="Skins" value={String(r.skins)} />
              <Stat label="Skins $" value={formatSigned(r.skinsNet)} className={tone(r.skinsNet)} />
              <Stat label="CTPs" value={String(r.ctps)} />
              <Stat label="CTP $" value={formatSigned(r.ctpNet)} className={tone(r.ctpNet)} />
            </dl>
          </Card>
        ))}
      </div>

      <Card title="Who pays whom">
        {results.payments.length === 0 ? (
          <p className="text-muted">Nobody owes anything yet.</p>
        ) : (
          <ul className="space-y-2">
            {results.payments.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-3 text-lg">
                <span>
                  <strong>{nameOf(p.fromId)}</strong> <span className="text-muted">pays</span> <strong>{nameOf(p.toId)}</strong>
                </span>
                <span className="tabular font-extrabold">{formatMoney(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className={cx("mt-3 text-sm font-semibold", balanced ? "text-good" : "text-bad")}>
          {balanced ? "✓ Balanced: totals sum to $0.00" : `⚠ Totals are off by ${formatSigned(results.balance)}`}
        </div>
      </Card>

      {results.unclaimedCarryover > 0 && (
        <Card>
          <p className="font-semibold text-warn">
            Unclaimed carryover: {results.unclaimedCarryover} skin{results.unclaimedCarryover === 1 ? "" : "s"} (hole 18 tied — not paid to anyone)
          </p>
        </Card>
      )}

      {results.unclaimedCtpCarryover > 0 && (
        <Card>
          <p className="font-semibold text-warn">
            Unclaimed CTP carryover: {results.unclaimedCtpCarryover} CTP{results.unclaimedCtpCarryover === 1 ? "" : "s"} (not paid to anyone)
          </p>
        </Card>
      )}

      <Button variant="primary" className="min-h-14 w-full text-lg" onClick={share}>
        Share results
      </Button>
      {shareMsg && (
        <p role="status" className="text-center font-semibold text-good">
          {shareMsg}
        </p>
      )}
    </>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className={cx("text-base font-extrabold", className)}>{value}</dd>
    </div>
  );
}
