import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, setToken, clearToken, getToken } from '../api/client.js';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:    null,
      token:   null,
      loading: true,

      // Called on app mount — validate stored token
      init: async () => {
        const t = getToken();
        if (!t) { set({ loading: false }); return; }
        try {
          const user = await authApi.me();
          set({ user, token: t, loading: false });
        } catch {
          clearToken();
          set({ user: null, token: null, loading: false });
        }
      },

      register: async ({ displayName, email, password }) => {
        const { user, token } = await authApi.register({ displayName, email, password });
        setToken(token);
        set({ user, token });
        return user;
      },

      login: async ({ email, password }) => {
        const { user, token } = await authApi.login({ email, password });
        setToken(token);
        set({ user, token });
        return user;
      },

      logout: () => {
        clearToken();
        set({ user: null, token: null });
      },

      forgotPassword: (email) => authApi.forgotPassword(email),

      updateProfile: async (data) => {
        const updated = await authApi.update(data);
        set({ user: updated });
        return updated;
      },

      refreshUser: async () => {
        try {
          const user = await authApi.me();
          set({ user });
        } catch {}
      },
    }),
    {
      name: 'obsidian-auth',
      partialize: (s) => ({ user: s.user, token: s.token }),
    }
  )
);

export default useAuthStore;
