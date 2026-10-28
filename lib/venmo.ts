/**
 * Venmo deep links. The app scheme opens Venmo directly with the person,
 * amount and note filled in; the web link is the fallback when the app
 * isn't installed (or on a computer).
 */

export type VenmoAction = "charge" | "pay";

/** Strip a leading @, spaces and anything Venmo usernames can't contain. */
export function normalizeVenmo(handle: string | undefined | null): string {
  return (handle ?? "").trim().replace(/^@+/, "").replace(/[^A-Za-z0-9_-]/g, "");
}

export function venmoLinks({
  action,
  handle,
  amount,
  note,
}: {
  action: VenmoAction;
  /** The other person's username; empty lets the user pick them in Venmo. */
  handle?: string | null;
  amount: number;
  note: string;
}): { app: string; web: string } {
  const params = new URLSearchParams({ txn: action, audience: "private", amount: (Math.round(amount * 100) / 100).toFixed(2), note });
  const user = normalizeVenmo(handle);
  if (user) params.set("recipients", user);
  const query = params.toString().replace(/\+/g, "%20");
  return { app: `venmo://paycharge?${query}`, web: `https://venmo.com/?${query}` };
}

export function venmoNote(courseName: string | null | undefined): string {
  return `⛳ Skins${courseName ? ` – ${courseName}` : ""}`;
}
