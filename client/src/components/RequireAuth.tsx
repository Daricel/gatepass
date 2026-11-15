import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../lib/auth";
import type { Role } from "../lib/types";
import { PageLoader } from "./ui";

export function RequireAuth({ role, children }: { role?: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}
