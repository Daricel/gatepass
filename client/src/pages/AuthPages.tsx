import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { Alert, Button, Field, Overprint, cx } from "../components/ui";
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

function AuthShell({ title, children, footer }: { title: ReactNode; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl items-start gap-10 md:grid-cols-[1fr_1fr] md:gap-16">
      <div className="relative md:pt-4">
        <div aria-hidden className="grain absolute -left-6 top-6 -z-10 size-48 rounded-full bg-yellow" />
        <h1 className="display text-[clamp(3.5rem,8vw,6.5rem)]">{title}</h1>
        <p className="mt-8 text-sm text-ink-2">{footer}</p>
      </div>
      <div className="border-2 border-ink bg-white p-6 shadow-[10px_10px_0_0_var(--color-blue)] sm:p-8">{children}</div>
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
      title={
        <>
          <Overprint>Back</Overprint>
          <br />
          <Overprint base="text-pink" over="text-blue">
            again?
          </Overprint>
        </>
      }
      footer={
        <>
          No account yet?{" "}
          <Link to="/register" className="font-semibold text-ink underline decoration-pink decoration-2 underline-offset-4">
            Make one
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
      <div className="mt-8 border-t-2 border-dashed border-ink pt-5">
        <p className="mono-label mb-2 font-semibold">Demo accounts · password123</p>
        <p className="font-mono text-xs leading-relaxed">
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

  const roles: [Role, string, string, string][] = [
    ["attendee", "I'm going", "Take tickets, show them at the door", "bg-pink"],
    ["organizer", "I'm hosting", "Put up events, check people in", "bg-blue text-white"],
  ];

  return (
    <AuthShell
      title={
        <>
          <Overprint>Get on</Overprint>
          <br />
          <Overprint base="text-pink" over="text-blue">
            the list.
          </Overprint>
        </>
      }
      footer={
        <>
          Already on it?{" "}
          <Link to="/login" className="font-semibold text-ink underline decoration-pink decoration-2 underline-offset-4">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <fieldset>
          <legend className="mono-label mb-1.5 font-semibold">Account type</legend>
          <div className="grid grid-cols-2 gap-3">
            {roles.map(([value, label, desc, active]) => (
              <label
                key={value}
                className={cx(
                  "cursor-pointer border-2 border-ink p-3 transition-transform",
                  role === value ? cx(active, "-rotate-1") : "bg-white hover:bg-yellow",
                )}
              >
                <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
                <span className="display block text-lg">{label}</span>
                <span className="mt-1 block text-xs font-medium">{desc}</span>
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
