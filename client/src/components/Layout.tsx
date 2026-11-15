import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../lib/auth";
import { cx } from "./ui";

function NavItem({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cx("rounded-md px-3 py-2 text-sm font-medium", isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:text-slate-900")
      }
    >
      {children}
    </NavLink>
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold tracking-tight text-slate-900">
      <img src="/favicon.svg" alt="" className="size-7" />
      Gatepass
    </Link>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden items-center gap-1 sm:flex">
              <NavItem to="/">Events</NavItem>
              {user?.role === "attendee" && <NavItem to="/tickets">My tickets</NavItem>}
              {user?.role === "organizer" && <NavItem to="/dashboard">Dashboard</NavItem>}
            </nav>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {user ? (
              <>
                <span className="hidden text-slate-500 md:inline">
                  {user.name} · <span className="capitalize">{user.role}</span>
                </span>
                <button
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                  className="rounded-md px-3 py-2 font-medium text-slate-600 hover:bg-slate-100"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-md px-3 py-2 font-medium text-slate-600 hover:bg-slate-100">
                  Log in
                </Link>
                <Link to="/register" className="rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white hover:bg-indigo-500">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
        {/* Mobile nav */}
        {user && (
          <nav className="flex gap-1 border-t border-slate-100 px-4 py-2 sm:hidden">
            <NavItem to="/">Events</NavItem>
            {user.role === "attendee" && <NavItem to="/tickets">My tickets</NavItem>}
            {user.role === "organizer" && <NavItem to="/dashboard">Dashboard</NavItem>}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
