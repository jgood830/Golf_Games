"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Ruled section with a small-caps title, like a block on a printed card. */
export function Section({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("border-t border-rule pt-4", className)}>
      {(title || action) && (
        <div className="mb-3 flex min-h-8 items-center justify-between gap-2">
          {title && <h2 className="eyebrow">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "brass";

export function Button({
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-green text-green-ink border-green",
    secondary: "bg-paper text-ink border-rule",
    danger: "bg-paper text-bad border-bad/60",
    ghost: "bg-transparent text-ink border-transparent",
    brass: "bg-brass-soft text-ink border-brass/50",
  };
  return (
    <button
      type="button"
      className={cx(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md border px-4 font-semibold transition active:scale-[0.97] disabled:opacity-40",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({ label, children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx("flex h-11 w-11 items-center justify-center rounded-full text-ink active:bg-paper-2", className)}
      {...props}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}

/** Parse a text field: empty → null, otherwise a finite number or NaN. */
function parse(text: string): number | null {
  const t = text.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Text-backed number input so partially typed values ("2.", "") don't fight
 * React. Commits null for empty and ignores unparsable text.
 */
export function NumberInput({
  value,
  onChange,
  invalid,
  decimal,
  className,
  ...rest
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  invalid?: boolean;
  decimal?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [text, setText] = useState(value == null ? "" : String(value));
  const ref = useRef<HTMLInputElement>(null);
  const sync = () => setText((prev) => (parse(prev) === value ? prev : value == null ? "" : String(value)));

  useEffect(() => {
    // Sync when the value changes from outside (steppers, reset), but not
    // while the user is mid-edit in this field.
    if (document.activeElement !== ref.current) sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      ref={ref}
      onBlur={sync}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      pattern={decimal ? "[0-9]*[.]?[0-9]*" : "[0-9]*"}
      autoComplete="off"
      value={text}
      aria-invalid={invalid || undefined}
      onChange={(e) => {
        setText(e.target.value);
        const n = parse(e.target.value);
        if (n === null || !Number.isNaN(n)) onChange(n);
      }}
      onFocus={(e) => e.target.select()}
      className={cx(
        "tabular rounded-md border bg-paper text-center font-semibold text-ink outline-none focus:border-green focus:ring-2 focus:ring-green/30",
        invalid ? "border-warn bg-warn-soft" : "border-rule",
        className,
      )}
      {...rest}
    />
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  emptyStart,
  invalid,
  label,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  /** Value used when +/− is tapped on an empty field. */
  emptyStart?: number;
  invalid?: boolean;
  label: string;
}) {
  const step = (delta: number) => {
    if (value == null) {
      onChange(emptyStart ?? min);
      return;
    }
    onChange(Math.min(max, Math.max(min, Math.round(value) + delta)));
  };
  const btn = "flex h-11 w-11 items-center justify-center rounded-md border border-rule bg-paper-2 text-2xl leading-none active:scale-95";
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => step(-1)} className={btn}>
        −
      </button>
      <NumberInput aria-label={label} value={value} onChange={onChange} invalid={invalid} className="h-11 w-14 font-serif text-xl" placeholder="–" />
      <button type="button" aria-label={`Increase ${label}`} onClick={() => step(1)} className={btn}>
        +
      </button>
    </div>
  );
}

export function StrokeDots({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cx("inline-flex gap-0.5 align-middle", className)}
      aria-label={`${count} stroke${count === 1 ? "" : "s"}`}
      title={`${count} stroke${count === 1 ? "" : "s"}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="block h-1.5 w-1.5 rounded-full bg-brass" />
      ))}
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx("relative h-8 w-14 shrink-0 rounded-full border transition", checked ? "border-green bg-green" : "border-rule bg-paper-2")}
    >
      <span className={cx("absolute top-[3px] h-6 w-6 rounded-full shadow transition-all", checked ? "left-[27px] bg-green-ink" : "left-[3px] bg-paper")} />
    </button>
  );
}

/** A labelled settings row: title + hint on the left, control on the right. */
export function Row({ title, hint, children }: { title: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 border-b border-rule/70 py-2 last:border-b-0">
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        {hint && <div className="text-sm text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

/** Full-height panel that slides up over the scorecard. */
export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex justify-center bg-black/40" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div
        className="animate-sheet mt-[max(0.75rem,env(safe-area-inset-top))] flex w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-paper shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="rule-double flex items-center justify-between gap-2 px-4 py-2">
          <h2 className="font-serif text-2xl font-semibold">{title}</h2>
          <Button variant="ghost" className="px-2 text-green" onClick={onClose}>
            Done
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">{children}</div>
        {footer && <div className="border-t border-rule px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">{footer}</div>}
      </div>
    </div>
  );
}
