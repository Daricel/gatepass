import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { Link } from "react-router";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/**
 * Text printed twice, blue then pink, slightly out of register.
 * The pink layer multiplies over the blue, so the overlap prints violet.
 */
export function Overprint({
  children,
  className,
  base = "text-blue",
  over = "text-pink",
}: {
  children: ReactNode;
  className?: string;
  base?: string;
  over?: string;
}) {
  return (
    <span className={cx("relative inline-block isolate", className)}>
      <span className={base}>{children}</span>
      <span
        aria-hidden
        className={cx("pointer-events-none absolute inset-0 translate-x-[0.045em] translate-y-[0.035em] select-none mix-blend-multiply", over)}
      >
        {children}
      </span>
    </span>
  );
}

/** Light text on a coloured ground, with the second ink printed underneath it, off register. */
export function OffsetText({ children, shadow = "var(--color-pink)", className }: { children: ReactNode; shadow?: string; className?: string }) {
  return (
    <span className={className} style={{ textShadow: `0.05em 0.04em 0 ${shadow}` }}>
      {children}
    </span>
  );
}

type Variant = "primary" | "secondary" | "danger" | "ghost";

const btnBase =
  "relative isolate inline-flex items-center justify-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] transition-transform disabled:cursor-not-allowed disabled:opacity-50";

// Primary buttons sit on a pink plate printed slightly off register; pressing lines them up.
// Both plates are pseudo-elements: negative z-index children of a stacking context paint
// above the element's own background, so a real bg-blue would end up under the pink plate.
const variants: Record<Variant, string> = {
  primary:
    "h-11 px-6 text-white after:absolute after:inset-0 after:-z-10 after:bg-blue before:absolute before:inset-0 before:-z-20 before:translate-x-[5px] before:translate-y-[5px] before:bg-pink before:transition-transform hover:before:translate-x-[2px] hover:before:translate-y-[2px] active:translate-x-[3px] active:translate-y-[3px] active:before:translate-x-0 active:before:translate-y-0",
  secondary: "h-11 px-6 border-2 border-ink text-ink hover:bg-yellow",
  danger: "h-11 px-6 border-2 border-ink bg-pink text-ink hover:bg-ink hover:text-pink",
  ghost: "py-1 text-ink-2 underline decoration-2 underline-offset-4 decoration-transparent hover:text-ink hover:decoration-pink",
};

export function Button({
  variant = "primary",
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button {...props} disabled={props.disabled || loading} className={cx(btnBase, variants[variant], className)}>
      {loading && <Spinner className="size-3.5" />}
      {children}
    </button>
  );
}

export function ButtonLink({ to, variant = "primary", className, children }: { to: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={cx(btnBase, variants[variant], className)}>
      {children}
    </Link>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
}

const inputClass = (error?: string) =>
  cx(
    "block w-full border-2 bg-white px-3 py-2.5 text-[15px] text-ink outline-none transition-shadow placeholder:text-ink-2/60",
    "focus:shadow-[5px_5px_0_0_var(--color-pink)]",
    error ? "border-pink" : "border-ink",
  );

function FieldMeta({ error, hint }: { error?: string; hint?: string }) {
  if (error)
    return (
      <p className="mt-2 inline-block bg-pink px-1.5 py-0.5 font-mono text-[11px] text-ink">
        {error}
      </p>
    );
  if (hint) return <p className="mt-1.5 font-mono text-[11px] text-ink-2">{hint}</p>;
  return null;
}

export function Field({ label, error, hint, id, ...props }: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const inputId = id ?? props.name;
  return (
    <div>
      <label htmlFor={inputId} className="mono-label mb-1.5 block font-semibold">
        {label}
      </label>
      <input id={inputId} {...props} aria-invalid={!!error} className={inputClass(error)} />
      <FieldMeta error={error} hint={hint} />
    </div>
  );
}

export function TextArea({ label, error, id, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  const inputId = id ?? props.name;
  return (
    <div>
      <label htmlFor={inputId} className="mono-label mb-1.5 block font-semibold">
        {label}
      </label>
      <textarea id={inputId} rows={4} {...props} aria-invalid={!!error} className={inputClass(error)} />
      <FieldMeta error={error} />
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("border-2 border-ink bg-white p-6 sm:p-8", className)}>{children}</div>;
}

export function Spinner({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center gap-3 py-32" role="status">
      <span className="size-4 animate-ping rounded-full bg-pink" />
      <span className="mono-label">Printing…</span>
    </div>
  );
}

export function Alert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" | "info" }) {
  const tones = { error: "bg-pink", success: "bg-yellow", info: "bg-white" };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("border-2 border-ink px-4 py-3 text-sm font-medium text-ink", tones[tone])}>
      {children}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden border-2 border-dashed border-ink px-6 py-16 text-center">
      <div aria-hidden className="halftone absolute -right-10 -top-10 size-40 rounded-full text-pink/60" />
      <p className="display relative text-3xl sm:text-4xl">{title}</p>
      {children && <div className="relative mt-4 text-sm text-ink-2">{children}</div>}
    </div>
  );
}

export function Progress({ value, max, tone = "blue" }: { value: number; max: number; tone?: "blue" | "pink" | "ink" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const fill = { blue: "bg-blue", pink: "bg-pink", ink: "bg-ink" }[tone];
  return (
    <div className="halftone h-2.5 w-full text-ink/25" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={cx("h-full transition-[width] duration-500", fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

type TagTone = "pink" | "blue" | "yellow" | "white";
export function Tag({ children, tone = "white" }: { children: ReactNode; tone?: TagTone }) {
  const tones: Record<TagTone, string> = {
    pink: "bg-pink text-ink",
    blue: "bg-blue text-white",
    yellow: "bg-yellow text-ink",
    white: "bg-white text-ink",
  };
  return (
    <span className={cx("inline-flex items-center border-2 border-ink px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.05em]", tones[tone])}>
      {children}
    </span>
  );
}

/** Big poster headline, overprinted, with optional caption above. */
export function PageTitle({ kicker, children, sub }: { kicker?: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      {kicker && <p className="mono-label mb-3 font-semibold">{kicker}</p>}
      <h1 className="display text-5xl sm:text-7xl">
        <Overprint>{children}</Overprint>
      </h1>
      {sub && <p className="mt-4 max-w-xl text-ink-2">{sub}</p>}
    </div>
  );
}

/** Label/value pair as printed on a ticket. */
export function TicketField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="mono-label text-ink-2">{label}</dt>
      <dd className="mt-1 text-[15px] font-semibold text-ink">{children}</dd>
    </div>
  );
}

/** Dashed tear line between ticket body and stub, with punched notches. */
export function Perforation({ orientation }: { orientation: "vertical" | "horizontal" }) {
  if (orientation === "horizontal") {
    return (
      <div className="relative h-0 border-t-2 border-dashed border-ink" aria-hidden>
        <span className="absolute -left-[14px] -top-[13px] size-6 rounded-full border-2 border-ink bg-stock" />
        <span className="absolute -right-[14px] -top-[13px] size-6 rounded-full border-2 border-ink bg-stock" />
      </div>
    );
  }
  return (
    <div className="relative w-0 border-l-2 border-dashed border-ink" aria-hidden>
      <span className="absolute -left-[13px] -top-[14px] size-6 rounded-full border-2 border-ink bg-stock" />
      <span className="absolute -bottom-[14px] -left-[13px] size-6 rounded-full border-2 border-ink bg-stock" />
    </div>
  );
}

/** Poster colourways, cycled through the event grid. */
export const POSTER_INKS = [
  { bg: "bg-pink", text: "text-violet", sub: "text-ink", shape: "text-blue" },
  { bg: "bg-blue", text: "text-white", sub: "text-white/85", shape: "text-pink" },
  { bg: "bg-yellow", text: "text-blue", sub: "text-ink", shape: "text-pink" },
] as const;
