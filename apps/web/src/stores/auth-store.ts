import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  displayName: string;
  upiId: string;
  avatarUrl?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  session: { accessToken: string; refreshToken: string } | null;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setSession: (session: { accessToken: string; refreshToken: string } | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isAuthenticated: false,

      setUser: (user) =>
        set({ user, isAuthenticated: !!user }),

      setSession: (session) =>
        set({ session }),

      logout: () =>
        set({ user: null, session: null, isAuthenticated: false }),
    }),
    {
      name: "rummy-auth",
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
