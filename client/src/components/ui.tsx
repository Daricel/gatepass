import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { Link } from "react-router";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "danger" | "ghost";
const base =
  "inline-flex items-center justify-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "h-10 px-5 bg-accent text-card hover:bg-accent-dark",
  secondary: "h-10 px-5 border border-ink text-ink hover:bg-ink hover:text-card",
  danger: "h-10 px-5 border border-accent text-accent hover:bg-accent hover:text-card",
  ghost: "py-1 text-ink-2 underline-offset-4 hover:text-ink hover:underline",
};

export function Button({
  variant = "primary",
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button {...props} disabled={props.disabled || loading} className={cx(base, variants[variant], className)}>
      {loading && <Spinner className="size-3.5" />}
      {children}
    </button>
  );
}

export function ButtonLink({ to, variant = "primary", className, children }: { to: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={cx(base, variants[variant], className)}>
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
    "block w-full border bg-card px-3 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-3",
    "focus:border-ink focus:bg-white",
    error ? "border-accent" : "border-line",
  );

function FieldMeta({ error, hint }: { error?: string; hint?: string }) {
  if (error) return <p className="mt-1.5 font-mono text-xs text-accent">{error}</p>;
  if (hint) return <p className="mt-1.5 font-mono text-xs text-ink-3">{hint}</p>;
  return null;
}

export function Field({ label, error, hint, id, ...props }: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const inputId = id ?? props.name;
  return (
    <div>
      <label htmlFor={inputId} className="mono-label mb-1.5 block">
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
      <label htmlFor={inputId} className="mono-label mb-1.5 block">
        {label}
      </label>
      <textarea id={inputId} rows={4} {...props} aria-invalid={!!error} className={inputClass(error)} />
      <FieldMeta error={error} />
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("border border-line bg-card p-6 sm:p-8", className)}>{children}</div>;
}

export function Spinner({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center gap-3 py-32 text-ink-2" role="status">
      <Spinner className="size-4" />
      <span className="mono-label">Loading</span>
    </div>
  );
}

export function Alert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" | "info" }) {
  const tones = { error: "border-accent", success: "border-go", info: "border-ink" };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("border-l-[3px] bg-card px-4 py-3 text-sm text-ink", tones[tone])}>
      {children}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border border-dashed border-ink-3 px-6 py-16 text-center">
      <p className="font-serif text-3xl italic">{title}</p>
      {children && <div className="mt-3 text-sm text-ink-2">{children}</div>}
    </div>
  );
}

export function Progress({ value, max, tone = "ink" }: { value: number; max: number; tone?: "ink" | "go" | "accent" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const fill = { ink: "bg-ink", go: "bg-go", accent: "bg-accent" }[tone];
  return (
    <div className="h-[3px] w-full bg-line" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={cx("h-full transition-[width] duration-500", fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

type TagTone = "ink" | "go" | "warn" | "accent" | "muted";
export function Tag({ children, tone = "ink" }: { children: ReactNode; tone?: TagTone }) {
  const tones: Record<TagTone, string> = {
    ink: "border-ink text-ink",
    go: "border-go text-go",
    warn: "border-warn text-[#8a5c0c]",
    accent: "border-accent text-accent",
    muted: "border-line text-ink-2",
  };
  return (
    <span className={cx("inline-flex items-center rounded-tag border px-1.5 py-px font-mono text-[10.5px] uppercase tracking-[0.1em]", tones[tone])}>
      {children}
    </span>
  );
}

/** Big serif page heading with an optional mono kicker above it. */
export function PageTitle({ kicker, children, sub }: { kicker?: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      {kicker && <p className="mono-label mb-2">{kicker}</p>}
      <h1 className="font-serif text-5xl leading-[0.95] tracking-tight sm:text-6xl">{children}</h1>
      {sub && <p className="mt-3 max-w-xl text-ink-2">{sub}</p>}
    </div>
  );
}

/** Ticket-style label/value pair. */
export function TicketField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="mono-label">{label}</dt>
      <dd className="mt-1 text-[15px] text-ink">{children}</dd>
    </div>
  );
}

/** The dashed perforation between a ticket's body and its stub, with punched notches. */
export function Perforation({ orientation }: { orientation: "vertical" | "horizontal" }) {
  if (orientation === "horizontal") {
    return (
      <div className="relative h-0 border-t border-dashed border-ink-3" aria-hidden>
        <span className="absolute -left-[13px] -top-[12px] size-6 rounded-full border border-line bg-paper" />
        <span className="absolute -right-[13px] -top-[12px] size-6 rounded-full border border-line bg-paper" />
      </div>
    );
  }
  return (
    <div className="relative w-0 border-l border-dashed border-ink-3" aria-hidden>
      <span className="absolute -left-[12px] -top-[13px] size-6 rounded-full border border-line bg-paper" />
      <span className="absolute -bottom-[13px] -left-[12px] size-6 rounded-full border border-line bg-paper" />
    </div>
  );
}
