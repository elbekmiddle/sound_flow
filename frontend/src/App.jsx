import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from './api/firebase.js';
import { auth } from './api/firebase.js';
import useAuthStore from './store/authStore.js';
import usePlayerStore from './store/playerStore.js';
import { libraryApi } from './api/client.js';

// Layouts
import AppLayout from './components/AppLayout.jsx';
import AuthLayout from './components/AuthLayout.jsx';

// Auth pages
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';

// App pages
import HomePage from './pages/HomePage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import LibraryPage from './pages/LibraryPage.jsx';
import PlaylistPage from './pages/PlaylistPage.jsx';
import PodcastPage from './pages/PodcastPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

// Auth guard
function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-on-surface-variant text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  const { setUser } = useAuthStore();
  const { initListeners, setLiked } = usePlayerStore();

  // Firebase auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      // Load liked tracks for player store
      if (firebaseUser) {
        libraryApi.getLiked()
          .then(tracks => setLiked(tracks.map(t => t.id)))
          .catch(() => {});
      }
    });

    // Init audio engine listeners once
    initListeners();

    return () => unsub();
  }, []);

  return (
    <Routes>
      {/* Public auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login"   element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
        <Route path="/forgot"   element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
      </Route>

      {/* Protected app routes */}
      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index        element={<HomePage />} />
        <Route path="/search"       element={<SearchPage />} />
        <Route path="/library"      element={<LibraryPage />} />
        <Route path="/library/:tab" element={<LibraryPage />} />
        <Route path="/playlist/:id" element={<PlaylistPage />} />
        <Route path="/podcasts"     element={<PodcastPage />} />
        <Route path="/profile"      element={<ProfilePage />} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
