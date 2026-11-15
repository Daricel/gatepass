import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { Logo } from "../components/Layout";
import { Alert, Button, Card, Field, cx } from "../components/ui";
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

function AuthShell({ title, children, footer }: { title: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-8">
      <div className="mb-6 flex justify-center">
        <Logo />
      </div>
      <Card>
        <h1 className="mb-6 text-xl font-bold">{title}</h1>
        {children}
      </Card>
      <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
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
      title="Welcome back"
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        <Button type="submit" loading={busy} className="w-full">
          Log in
        </Button>
      </form>
      <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
        <p className="font-semibold text-slate-600">Demo accounts (password: password123)</p>
        <p>organizer@demo.dev · attendee@demo.dev</p>
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
    ["attendee", "I'm attending", "Register for events, get QR tickets"],
    ["organizer", "I'm organizing", "Create events, check people in"],
  ];

  return (
    <AuthShell
      title="Create your account"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="sr-only">Account type</legend>
          {roles.map(([value, label, desc]) => (
            <label
              key={value}
              className={cx(
                "cursor-pointer rounded-xl p-3 ring-1 transition",
                role === value ? "bg-indigo-50 ring-2 ring-indigo-600" : "ring-slate-200 hover:bg-slate-50",
              )}
            >
              <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
              <span className="block text-sm font-semibold">{label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{desc}</span>
            </label>
          ))}
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
