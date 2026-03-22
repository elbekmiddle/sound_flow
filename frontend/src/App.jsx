import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore.js';
import usePlayerStore from './store/playerStore.js';
import { libraryApi } from './api/client.js';

import AppLayout    from './components/AppLayout.jsx';
import AuthLayout   from './components/AuthLayout.jsx';
import LoginPage    from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import HomePage     from './pages/HomePage.jsx';
import SearchPage   from './pages/SearchPage.jsx';
import LibraryPage  from './pages/LibraryPage.jsx';
import PlaylistPage from './pages/PlaylistPage.jsx';
import PodcastPage  from './pages/PodcastPage.jsx';
import ProfilePage  from './pages/ProfilePage.jsx';

function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', background:'var(--color-background)' }}>
      <div style={{ width:34, height:34, border:'2px solid rgba(199,153,255,0.2)',
        borderTopColor:'var(--color-primary)', borderRadius:'50%',
        animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return <Spinner/>;
  return user ? children : <Navigate to="/login" replace/>;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return <Spinner/>;
  return user ? <Navigate to="/" replace/> : children;
}

export default function App() {
  const { init } = useAuthStore();
  const { initListeners, setLiked } = usePlayerStore();

  useEffect(() => {
    initListeners();
    init().then(() => {
      const { user } = useAuthStore.getState();
      if (user) {
        libraryApi.getLiked()
          .then(tracks => setLiked((tracks||[]).map(x=>x.id)))
          .catch(()=>{});
      }
    });
  }, []);

  return (
    <Routes>
      <Route element={<AuthLayout/>}>
        <Route path="/login"    element={<PublicRoute><LoginPage/></PublicRoute>}/>
        <Route path="/register" element={<PublicRoute><RegisterPage/></PublicRoute>}/>
        <Route path="/forgot"   element={<PublicRoute><ForgotPasswordPage/></PublicRoute>}/>
      </Route>
      <Route element={<PrivateRoute><AppLayout/></PrivateRoute>}>
        <Route index                element={<HomePage/>}/>
        <Route path="/search"       element={<SearchPage/>}/>
        <Route path="/library"      element={<LibraryPage/>}/>
        <Route path="/library/:tab" element={<LibraryPage/>}/>
        <Route path="/playlist/:id" element={<PlaylistPage/>}/>
        <Route path="/podcasts"     element={<PodcastPage/>}/>
        <Route path="/profile"      element={<ProfilePage/>}/>
        <Route path="*"             element={<Navigate to="/" replace/>}/>
      </Route>
    </Routes>
  );
}
