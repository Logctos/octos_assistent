import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

/** Wraps "/" and "/login" — sends already-authenticated users to /app. */
export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) return <Navigate to="/app" replace />;

  return <>{children}</>;
}
