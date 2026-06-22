import { create } from 'zustand';

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (token: string) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
  setError: (err: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Read token from localStorage on initialization
  const initialToken = localStorage.getItem("placementgpt_token");

  return {
    token: initialToken,
    user: null,
    isAuthenticated: !!initialToken,
    isLoading: false,
    error: null,

    login: (token: string) => {
      localStorage.setItem("placementgpt_token", token);
      set({ token, isAuthenticated: true, error: null });
    },

    setUser: (user: UserProfile) => {
      set({ user, isAuthenticated: true });
    },

    logout: () => {
      localStorage.removeItem("placementgpt_token");
      set({ token: null, user: null, isAuthenticated: false, error: null });
    },

    setError: (error: string | null) => set({ error }),
    setLoading: (isLoading: boolean) => set({ isLoading }),
  };
});
