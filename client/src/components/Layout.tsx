import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../lib/auth";
import { Overprint, cx } from "./ui";

function NavItem({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cx("px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.05em]", isActive ? "bg-yellow text-ink" : "text-ink-2 hover:text-ink")
      }
    >
      {children}
    </NavLink>
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Gatepass home">
      <img src="/favicon.svg" alt="" className="size-7" />
      <span className="display text-[22px]">
        <Overprint>Gatepass</Overprint>
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
      {user?.role === "organizer" && <NavItem to="/dashboard">Organizer</NavItem>}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-2 border-ink bg-stock">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-4 sm:flex">{links}</nav>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="hidden items-center gap-2 md:flex">
                  <span className="text-sm font-semibold">{user.name}</span>
                  <span className={cx("border-2 border-ink px-1 font-mono text-[9px] font-semibold uppercase", user.role === "organizer" ? "bg-blue text-white" : "bg-pink text-ink")}>
                    {user.role}
                  </span>
                </span>
                <button
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                  className="font-mono text-[11px] font-semibold uppercase text-ink-2 hover:text-ink"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="font-mono text-[11px] font-semibold uppercase text-ink-2 hover:text-ink">
                  Log in
                </Link>
                <Link to="/register" className="border-2 border-ink bg-pink px-3 py-1.5 font-mono text-[11px] font-semibold uppercase text-ink hover:bg-yellow">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
        {user && <nav className="flex gap-3 border-t-2 border-ink px-4 py-2 sm:hidden">{links}</nav>}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <Outlet />
      </main>

      <footer className="border-t-2 border-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <span className="mono-label flex items-center gap-2">
            <span className="size-3 rounded-full bg-pink" />
            <span className="-ml-3.5 size-3 bg-blue mix-blend-multiply" />
            Printed in two colours: pink + blue
          </span>
          <span className="mono-label text-ink-2">Gatepass · admit one</span>
        </div>
      </footer>
    </div>
  );
}
