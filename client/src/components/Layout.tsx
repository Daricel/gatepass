import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../lib/auth";
import { cx } from "./ui";

function NavItem({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cx(
          "border-b-2 py-1 font-mono text-xs uppercase tracking-[0.12em] transition-colors",
          isActive ? "border-accent text-ink" : "border-transparent text-ink-2 hover:text-ink",
        )
      }
    >
      {children}
    </NavLink>
  );
}

export function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="Gatepass home">
      <img src="/favicon.svg" alt="" className="h-6 w-6 transition-transform group-hover:-rotate-6" />
      <span className="font-serif text-[28px] leading-none tracking-tight">
        Gate<span className="italic">pass</span>
      </span>
    </Link>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = (
    <>
      <NavItem to="/">What's on</NavItem>
      {user?.role === "attendee" && <NavItem to="/tickets">My tickets</NavItem>}
      {user?.role === "organizer" && <NavItem to="/dashboard">Box office</NavItem>}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-10">
            <Logo />
            <nav className="hidden items-center gap-7 sm:flex">{links}</nav>
          </div>
          <div className="flex items-center gap-5">
            {user ? (
              <>
                <span className="hidden text-right leading-tight md:block">
                  <span className="block text-sm">{user.name}</span>
                  <span className="mono-label block !text-[10px]">{user.role}</span>
                </span>
                <button
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                  className="font-mono text-xs uppercase tracking-[0.12em] text-ink-2 hover:text-accent"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="font-mono text-xs uppercase tracking-[0.12em] text-ink-2 hover:text-ink">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-card hover:bg-accent"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
        {user && <nav className="flex gap-6 border-t border-line px-4 py-2.5 sm:hidden">{links}</nav>}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <Outlet />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-6 sm:px-6">
          <span className="mono-label">Gatepass · Admit one</span>
          <span className="mono-label">Tickets checked at the door</span>
        </div>
      </footer>
    </div>
  );
}
