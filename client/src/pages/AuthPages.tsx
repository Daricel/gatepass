import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { Alert, Button, Field, cx } from "../components/ui";
import { fieldErrors } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Role, User } from "../lib/types";

function useAfterAuth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next");
  // Only follow same-site relative paths, to avoid an open redirect.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  return (user: User) => navigate(safeNext ?? (user.role === "organizer" ? "/dashboard" : "/"), { replace: true });
}

function AuthShell({ kicker, title, children, footer }: { kicker: string; title: ReactNode; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-[1fr_1.1fr] md:gap-16">
      <div className="md:pt-6">
        <p className="mono-label mb-3">{kicker}</p>
        <h1 className="font-serif text-6xl leading-[0.9] tracking-tight">{title}</h1>
        <p className="mt-6 text-sm text-ink-2">{footer}</p>
      </div>
      <div className="border border-ink bg-card p-6 sm:p-8">{children}</div>
    </div>
  );
}

export function LoginPage() {
  const { login, user } = useAuth();
  const afterAuth = useAfterAuth();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(undefined);
    try {
      afterAuth(await login(String(form.get("email")), String(form.get("password"))));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      kicker="Log in"
      title={
        <>
          Welcome
          <br />
          <span className="italic">back.</span>
        </>
      }
      footer={
        <>
          No account yet?{" "}
          <Link to="/register" className="text-ink underline underline-offset-4 hover:text-accent">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        <Button type="submit" loading={busy} className="w-full">
          Log in
        </Button>
      </form>
      <div className="mt-8 border-t border-dashed border-ink-3 pt-5">
        <p className="mono-label mb-2">Demo accounts · password123</p>
        <p className="font-mono text-xs leading-relaxed text-ink">
          organizer@demo.dev
          <br />
          attendee@demo.dev
        </p>
      </div>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register, user } = useAuth();
  const afterAuth = useAfterAuth();
  const [role, setRole] = useState<Role>("attendee");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setErrors({});
    setError(undefined);
    try {
      afterAuth(
        await register({
          name: String(form.get("name")),
          email: String(form.get("email")),
          password: String(form.get("password")),
          role,
        }),
      );
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      else setError((err as Error).message);
      setBusy(false);
    }
  }

  const roles: [Role, string, string][] = [
    ["attendee", "I'm going", "Take tickets, show them at the door"],
    ["organizer", "I'm hosting", "Publish events, check people in"],
  ];

  return (
    <AuthShell
      kicker="Sign up"
      title={
        <>
          Get on
          <br />
          the <span className="italic text-accent">list.</span>
        </>
      }
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="text-ink underline underline-offset-4 hover:text-accent">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <fieldset>
          <legend className="mono-label mb-1.5">Account type</legend>
          <div className="grid grid-cols-2">
            {roles.map(([value, label, desc], i) => (
              <label
                key={value}
                className={cx(
                  "cursor-pointer border p-3 transition-colors",
                  i === 1 && "-ml-px",
                  role === value ? "relative z-10 border-ink bg-ink text-card" : "border-line hover:border-ink-3",
                )}
              >
                <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
                <span className="block font-serif text-2xl leading-tight">{label}</span>
                <span className={cx("mt-1 block text-xs", role === value ? "text-card/75" : "text-ink-2")}>{desc}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Full name" name="name" autoComplete="name" required error={errors.name} />
        <Field label="Email" name="email" type="email" autoComplete="email" required error={errors.email} />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters"
          error={errors.password}
        />
        <Button type="submit" loading={busy} className="w-full">
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
