import { describe, expect, it } from "vitest";
import { normalizeVenmo, venmoLinks, venmoNote } from "./venmo";

describe("Venmo links", () => {
  it("builds a request with the person, amount and note", () => {
    const { app, web } = venmoLinks({ action: "charge", handle: "@Bob-Smith", amount: 6, note: venmoNote("Pine Valley") });
    expect(app.startsWith("venmo://paycharge?")).toBe(true);
    expect(web.startsWith("https://venmo.com/?")).toBe(true);
    const q = new URLSearchParams(app.split("?")[1]);
    expect(q.get("txn")).toBe("charge");
    expect(q.get("recipients")).toBe("Bob-Smith");
    expect(q.get("amount")).toBe("6.00");
    expect(q.get("note")).toBe("⛳ Skins – Pine Valley");
    expect(app).not.toContain("+"); // spaces encoded as %20 for the app
  });

  it("leaves out the recipient when no username is known", () => {
    const { app } = venmoLinks({ action: "pay", handle: "", amount: 12.345, note: venmoNote(null) });
    const q = new URLSearchParams(app.split("?")[1]);
    expect(q.get("txn")).toBe("pay");
    expect(q.has("recipients")).toBe(false);
    expect(q.get("amount")).toBe("12.35");
    expect(q.get("note")).toBe("⛳ Skins");
  });

  it("normalizes usernames", () => {
    expect(normalizeVenmo("  @@alice_g ")).toBe("alice_g");
    expect(normalizeVenmo("bob smith!")).toBe("bobsmith");
    expect(normalizeVenmo(undefined)).toBe("");
  });
});
