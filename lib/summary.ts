import { formatMoney, formatSigned, playerStatus, type Round, type RoundResults } from "./scoring";

/** Plain-text round summary for sharing. */
export function buildSummary(round: Round, results: RoundResults): string {
  const nameOf = (id: string) => round.players.find((p) => p.id === id)?.name || "Player";
  const lines: string[] = [];
  const { skinValue, ctpValue, carryover, ctpCarryover } = round.settings;

  lines.push("⛳ Skins results");
  if (round.course?.name) lines.push(round.course.name);
  lines.push(`${formatMoney(skinValue)}/skin · ${formatMoney(ctpValue)}/CTP · skin carryover ${carryover ? "on" : "off"} · CTP carryover ${ctpCarryover ? "on" : "off"}`);
  lines.push("");

  for (const r of results.players) {
    const parts = [`${r.skins} skin${r.skins === 1 ? "" : "s"}`];
    if (results.totalCtps > 0) parts.push(`${r.ctps} CTP`);
    lines.push(`${r.name || "Player"}: ${formatSigned(r.totalNet)} (${parts.join(", ")}) — ${playerStatus(r.totalNet)}`);
  }

  lines.push("");
  lines.push("Who pays whom:");
  if (results.payments.length === 0) {
    lines.push("Nobody owes anything.");
  } else {
    for (const p of results.payments) {
      lines.push(`${nameOf(p.fromId)} pays ${nameOf(p.toId)} ${formatMoney(p.amount)}`);
    }
  }

  const won = results.holes.filter((h) => h.status === "won");
  if (won.length > 0) {
    lines.push("");
    lines.push("Skins:");
    for (const h of won) {
      lines.push(`#${h.hole} ${nameOf(h.winnerId!)}${h.skinsAwarded > 1 ? ` (×${h.skinsAwarded})` : ""}`);
    }
  }

  if (results.unclaimedCarryover > 0) {
    lines.push("");
    lines.push(`Unclaimed carryover: ${results.unclaimedCarryover} skin${results.unclaimedCarryover === 1 ? "" : "s"}`);
  }

  if (results.unclaimedCtpCarryover > 0) {
    if (results.unclaimedCarryover === 0) lines.push("");
    lines.push(`Unclaimed CTP carryover: ${results.unclaimedCtpCarryover} CTP${results.unclaimedCtpCarryover === 1 ? "" : "s"}`);
  }

  return lines.join("\n");
}
