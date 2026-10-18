"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-2xl border border-line bg-surface p-4 shadow-sm", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-accent text-accent-ink border-accent",
    secondary: "bg-surface text-ink border-line",
    danger: "bg-surface text-bad border-bad",
    ghost: "bg-transparent text-ink border-transparent",
  };
  return (
    <button
      type="button"
      className={cx(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border-2 px-4 font-semibold transition active:scale-[0.97] disabled:opacity-40",
        styles[variant],
        className,
      )}
      {...props}
    />
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
        "tabular rounded-lg border-2 bg-surface text-center font-bold text-ink outline-none focus:border-accent",
        invalid ? "border-warn bg-warn-soft" : "border-line",
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
  size = "md",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  /** Value used when +/− is tapped on an empty field. */
  emptyStart?: number;
  invalid?: boolean;
  label: string;
  size?: "md" | "lg";
}) {
  const step = (delta: number) => {
    if (value == null) {
      onChange(emptyStart ?? min);
      return;
    }
    onChange(Math.min(max, Math.max(min, Math.round(value) + delta)));
  };
  const btn = size === "lg" ? "h-14 w-14 text-3xl" : "h-11 w-11 text-2xl";
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => step(-1)}
        className={cx(btn, "flex items-center justify-center rounded-xl border-2 border-line bg-surface-2 font-bold leading-none active:scale-95")}
      >
        −
      </button>
      <NumberInput
        aria-label={label}
        value={value}
        onChange={onChange}
        invalid={invalid}
        className={size === "lg" ? "h-14 w-16 text-3xl" : "h-11 w-14 text-xl"}
        placeholder="–"
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => step(1)}
        className={cx(btn, "flex items-center justify-center rounded-xl border-2 border-line bg-surface-2 font-bold leading-none active:scale-95")}
      >
        +
      </button>
    </div>
  );
}

export function StrokeDots({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={cx("inline-flex gap-0.5 align-middle", className)} aria-label={`${count} stroke${count === 1 ? "" : "s"}`} title={`${count} stroke${count === 1 ? "" : "s"}`}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="block h-2 w-2 rounded-full bg-accent" />
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
      className={cx("relative h-8 w-14 shrink-0 rounded-full border-2 transition", checked ? "border-accent bg-accent" : "border-line bg-surface-2")}
    >
      <span className={cx("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all", checked ? "left-[26px]" : "left-0.5")} />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl border-2 border-line bg-surface-2 p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx("min-h-10 flex-1 rounded-lg px-3 font-semibold", value === o.value ? "bg-accent text-accent-ink" : "text-muted")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
