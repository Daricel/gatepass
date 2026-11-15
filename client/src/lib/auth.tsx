import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "./api";
import type { Role, User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login(email: string, password: string): Promise<User>;
  register(input: { email: string; name: string; password: string; role: Role }): Promise<User>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ user: User }>("/api/auth/me")
      .then((r) => setUser(r.user))
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) console.error(e);
      })
      .finally(() => setLoading(false));
  }, []);

  const value: AuthState = {
    user,
    loading,
    async login(email, password) {
      const { user } = await api.post<{ user: User }>("/api/auth/login", { email, password });
      setUser(user);
      return user;
    },
    async register(input) {
      const { user } = await api.post<{ user: User }>("/api/auth/register", input);
      setUser(user);
      return user;
    },
    async logout() {
      await api.post("/api/auth/logout");
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
