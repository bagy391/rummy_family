import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import RoomPage from "@/pages/RoomPage"; // We will create this next
import { decodeCleanUTF8 } from "@/lib/utils";

function RoomRouteGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { roomCode } = useParams<{ roomCode: string }>();

  if (!isAuthenticated) {
    if (roomCode) {
      sessionStorage.setItem("redirect_to", `/room/${roomCode}`);
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * Main application component with routing.
 * Routes are split into public (auth) and protected (game) routes.
 */
export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [isLoading, setIsLoading] = useState(true);
  const setUser = useAuthStore((s) => s.setUser);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    let active = true;

    // Guard: set a safety timeout to disable loading state if auth check hangs (e.g. cold start, SW cache issues)
    const safetyTimeout = setTimeout(() => {
      if (active) {
        console.warn("Auth initialization timed out, forcing loading to false");
        setIsLoading(false);
      }
    }, 3500);

    // 1. Check current session on mount (once)
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;

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

          if (!active) return;

          if (profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              displayName: decodeCleanUTF8(profile.name),
              upiId: profile.upi_id || "",
              avatarUrl: profile.avatar_url || undefined,
              role: profile.role || "player",
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
        clearTimeout(safetyTimeout);
        if (active) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // 2. Listen to subsequent auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip initial session event if we are already fetching it in initAuth
        if (event === "INITIAL_SESSION") return;
        if (!active) return;

        try {
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

            if (!active) return;

            if (profile) {
              setUser({
                id: profile.id,
                email: profile.email,
                displayName: decodeCleanUTF8(profile.name),
                upiId: profile.upi_id || "",
                avatarUrl: profile.avatar_url || undefined,
                role: profile.role || "player",
              });
            }
          } else if (event === "SIGNED_OUT") {
            setUser(null);
            setSession(null);
          }
        } catch (err) {
          console.error("Auth state change query failed:", err);
        }
      }
    );

    return () => {
      active = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [setUser, setSession]);

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
        element={
          <RoomRouteGuard>
            <RoomPage />
          </RoomRouteGuard>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
