"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { User } from "@/lib/types";
interface AuthState {
  user: User | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<User | null>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const currentUser = useRef<User | null>(null);
  const pending = useRef<Promise<User | null> | null>(null);
  const generation = useRef(0);
  const refresh = useCallback((): Promise<User | null> => {
    if (pending.current) return pending.current;
    const requestGeneration = generation.current;
    setLoading(!currentUser.current);
    setError("");
    const request = (async () => {
      try {
        const next = await api<User>("/auth/me");
        if (requestGeneration !== generation.current) return null;
        currentUser.current = next;
        setUser(next);
        return next;
      } catch (e) {
        if (requestGeneration !== generation.current) return null;
        currentUser.current = null;
        setUser(null);
        if (!(e instanceof ApiError && e.status === 401))
          setError(errorMessage(e));
        return null;
      } finally {
        if (requestGeneration === generation.current) {
          pending.current = null;
          setLoading(false);
        }
      }
    })();
    pending.current = request;
    return request;
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const logout = async () => {
    await api("/auth/logout", { method: "POST" });
    generation.current++;
    pending.current = null;
    currentUser.current = null;
    setUser(null);
    window.location.assign("/");
  };
  return (
    <AuthContext.Provider value={{ user, loading, error, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider requerido");
  return context;
}
