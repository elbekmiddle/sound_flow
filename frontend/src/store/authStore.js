import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  auth,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from '../api/firebase.js';
import { authApi } from '../api/client.js';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:        null,
      profile:     null,
      loading:     true,
      initialized: false,

      // Called by onAuthStateChanged listener in App.jsx
      setUser: async (firebaseUser) => {
        if (!firebaseUser) {
          set({ user: null, profile: null, loading: false, initialized: true });
          return;
        }

        set({ user: firebaseUser, loading: true });

        try {
          // Sync to our backend + get full profile
          const idToken = await firebaseUser.getIdToken();
          const { user, token } = await authApi.syncUser(
            idToken,
            firebaseUser.displayName
          );
          localStorage.setItem('obsidian_token', token);
          set({ profile: user, loading: false, initialized: true });
        } catch {
          set({ loading: false, initialized: true });
        }
      },

      login: async (email, password) => {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return cred.user;
      },

      register: async (email, password, displayName) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        await sendEmailVerification(cred.user);
        return cred.user;
      },

      loginWithGoogle: async () => {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
      },

      logout: async () => {
        await signOut(auth);
        localStorage.removeItem('obsidian_token');
        set({ user: null, profile: null });
      },

      resetPassword: (email) => sendPasswordResetEmail(auth, email),

      updateProfile: async (data) => {
        const updated = await authApi.updateProfile(data);
        set({ profile: updated });
        return updated;
      },

      refreshProfile: async () => {
        try {
          const profile = await authApi.getMe();
          set({ profile });
        } catch {}
      },
    }),
    {
      name: 'obsidian-auth',
      partialize: (state) => ({ profile: state.profile }),
    }
  )
);

export default useAuthStore;
