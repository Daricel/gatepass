import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { Link } from "react-router";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "danger" | "ghost";
const variants: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm",
  secondary: "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50",
  danger: "bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50",
  ghost: "text-slate-600 hover:bg-slate-100",
};

export function Button({
  variant = "primary",
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function ButtonLink({ to, variant = "primary", children }: { to: string; variant?: Variant; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={cx("inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition", variants[variant])}
    >
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
    "block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset placeholder:text-slate-400",
    "focus:ring-2 focus:ring-inset focus:ring-indigo-600 outline-none",
    error ? "ring-red-400" : "ring-slate-300",
  );

export function Field({ label, error, hint, id, ...props }: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const inputId = id ?? props.name;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input id={inputId} {...props} aria-invalid={!!error} className={inputClass(error)} />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function TextArea({ label, error, id, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  const inputId = id ?? props.name;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea id={inputId} rows={4} {...props} className={inputClass(error)} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200", className)}>{children}</div>;
}

export function Spinner({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function PageLoader() {
  return (
    <div className="flex justify-center py-24 text-indigo-600" role="status" aria-label="Loading">
      <Spinner />
    </div>
  );
}

export function Alert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" | "info" }) {
  const tones = {
    error: "bg-red-50 text-red-700 ring-red-200",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    info: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-lg px-4 py-3 text-sm ring-1", tones[tone])}>
      {children}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 px-6 py-16 text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Progress({ value, max, tone = "indigo" }: { value: number; max: number; tone?: "indigo" | "emerald" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div
        className={cx("h-full rounded-full transition-all duration-500", tone === "emerald" ? "bg-emerald-500" : "bg-indigo-500")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "indigo" | "red" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    indigo: "bg-indigo-100 text-indigo-800",
    red: "bg-red-100 text-red-700",
  };
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export { cx };
