"use client";

import { useState } from "react";
import { cx } from "../ui";

const keyBase = "flex h-12 items-center justify-center rounded-md border shadow-[0_1px_0_var(--rule)] active:translate-y-px disabled:opacity-30";
const key = cx(keyBase, "border-rule bg-paper font-serif text-2xl text-ink active:bg-paper-2");

/**
 * Score keypad: 1–9, a "10+" key that swaps the top keys to 10–15,
 * backspace to clear, and a confirm key that moves on.
 */
export default function Keypad({
  activeName,
  onDigit,
  onClear,
  onNext,
  nextLabel,
}: {
  activeName: string | null;
  onDigit: (n: number) => void;
  onClear: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  const [tens, setTens] = useState(false);
  const digits = tens ? [10, 11, 12, 13, 14, 15, null, null, null] : [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="rule-double border-t border-rule bg-paper-2/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-muted">
          {activeName ? (
            <>
              Score for <strong className="font-serif text-base text-ink">{activeName}</strong>
            </>
          ) : (
            "Tap a player to enter a score"
          )}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {digits.map((n, i) =>
          n == null ? (
            <span key={`blank-${i}`} />
          ) : (
            <button
              key={n}
              type="button"
              className={key}
              disabled={!activeName}
              onClick={() => {
                onDigit(n);
                setTens(false);
              }}
            >
              {n}
            </button>
          ),
        )}
        <button type="button" className={cx(key, "text-lg")} aria-label="Clear score" disabled={!activeName} onClick={onClear}>
          ⌫
        </button>
        <button
          type="button"
          className={cx(keyBase, "font-sans text-base font-bold text-ink", tens ? "border-brass bg-brass-soft" : "border-rule bg-paper")}
          aria-pressed={tens}
          disabled={!activeName}
          onClick={() => setTens((t) => !t)}
        >
          {tens ? "1–9" : "10+"}
        </button>
        <button type="button" className={cx(keyBase, "border-green bg-green font-sans text-base font-bold text-green-ink")} onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
