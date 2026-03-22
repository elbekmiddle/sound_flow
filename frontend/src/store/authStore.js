import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, setToken, clearToken, getToken } from '../api/client.js';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:    null,
      profile: null,
      token:   null,
      loading: true,

      // On mount: sync token from zustand persist → sf_token localStorage
      init: async () => {
        // First sync: if zustand has token but sf_token localStorage is empty, write it
        const zustandToken = get().token;
        const lsToken = getToken();
        const activeToken = lsToken || zustandToken;

        if (!activeToken) {
          set({ loading: false });
          return;
        }

        // Ensure sf_token is set so axios interceptor picks it up
        if (!lsToken && zustandToken) setToken(zustandToken);

        try {
          const profile = await authApi.me();
          set({ user: profile, profile, token: activeToken, loading: false });
        } catch {
          clearToken();
          set({ user: null, profile: null, token: null, loading: false });
        }
      },

      register: async ({ displayName, email, password }) => {
        const { user, token } = await authApi.register({ displayName, email, password });
        setToken(token);
        set({ token });
        const profile = await authApi.me().catch(() => user);
        set({ user: profile, profile });
        return profile;
      },

      login: async ({ email, password }) => {
        const { user, token } = await authApi.login({ email, password });
        setToken(token);
        set({ token });
        const profile = await authApi.me().catch(() => user);
        set({ user: profile, profile });
        return profile;
      },

      logout: () => {
        clearToken();
        set({ user: null, profile: null, token: null });
      },

      forgotPassword: (email) => authApi.forgotPassword(email),

      updateProfile: async (data) => {
        const updated = await authApi.update(data);
        set({ user: updated, profile: updated });
        return updated;
      },

      refreshUser: async () => {
        try {
          const profile = await authApi.me();
          set({ user: profile, profile });
        } catch {}
      },
    }),
    {
      name: 'sf-auth',  // Changed key so old 'obsidian-auth' doesn't conflict
      partialize: (s) => ({ user: s.user, profile: s.profile, token: s.token }),
      // Sync token to localStorage whenever state rehydrates from storage
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setToken(state.token);
        }
      },
    }
  )
);

export default useAuthStore;
