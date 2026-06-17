import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import RoomPage from "@/pages/RoomPage"; // We will create this next

/**
 * Main application component with routing.
 * Routes are split into public (auth) and protected (game) routes.
 */
export default function App() {
  const { isAuthenticated, isLoading, setUser, setSession, setLoading } = useAuthStore();

  useEffect(() => {
    // 1. Check current session on mount (once)
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSession({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          });
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              displayName: profile.name,
              upiId: profile.upi_id || "",
              avatarUrl: profile.avatar_url || undefined,
            });
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
          setSession(null);
        }
      } catch (err) {
        console.error("Initial auth check failed:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // 2. Listen to subsequent auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setSession({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          });
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              displayName: profile.name,
              upiId: profile.upi_id || "",
              avatarUrl: profile.avatar_url || undefined,
            });
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setSession(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setSession, setLoading]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-[var(--color-text-secondary)] font-semibold font-[Outfit] text-sm animate-pulse">
          Loading Family Rummy...
        </p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
      />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/room/:roomCode"
        element={isAuthenticated ? <RoomPage /> : <Navigate to="/login" />}
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
