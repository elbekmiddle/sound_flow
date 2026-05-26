import { Outlet, useLocation } from 'react-router-dom';
import { useState, createContext, useContext, useEffect } from 'react';
import Sidebar   from './Sidebar.jsx';
import PlayerBar from './PlayerBar.jsx';
import MobileNav from './MobileNav.jsx';
import usePlayerStore from '../store/playerStore.js';

export const SidebarCtx = createContext({ open:true, toggle:()=>{}});
export const useSidebar = () => useContext(SidebarCtx);

export default function AppLayout() {
  const [open, setOpen] = useState(() => {
    // Auto-close if viewport is narrow (200% zoom = narrow effective viewport)
    return window.innerWidth > 900;
  });

  const toggle = () => setOpen(v => !v);
  const { togglePlay, next, prev, toggleShuffle, toggleRepeat, toggleLike } = usePlayerStore();

  // Close sidebar on small/zoomed screens
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth <= 900) setOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      // Don't trigger when typing in inputs
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;

      switch(e.key) {
        case ' ':           e.preventDefault(); togglePlay(); break;
        case 'ArrowRight':  if (e.altKey) { e.preventDefault(); next(); } break;
        case 'ArrowLeft':   if (e.altKey) { e.preventDefault(); prev(); } break;
        case 's': case 'S': if (e.ctrlKey||e.metaKey) { e.preventDefault(); toggleShuffle(); } break;
        case 'r': case 'R': if (e.ctrlKey||e.metaKey) { e.preventDefault(); toggleRepeat(); } break;
        case 'l': case 'L': if (e.ctrlKey||e.metaKey) { e.preventDefault(); toggleLike(); } break;
        case '[':           if (e.ctrlKey||e.metaKey) { e.preventDefault(); setOpen(v=>!v); } break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, next, prev, toggleShuffle, toggleRepeat, toggleLike]);

  return (
    <SidebarCtx.Provider value={{ open, toggle }}>
      <div style={{ display:'flex', height:'100vh', background:'var(--color-background)', overflow:'hidden' }}>
        <Sidebar />
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
          <main style={{ flex:1, overflowY:'auto', paddingBottom:88 }}>
            <Outlet />
          </main>
          <PlayerBar />
        </div>
        <MobileNav />
      </div>
      <style>{`
        @media (max-width: 767px) {
          .desktop-sidebar { display: none !important; }
          .mobile-nav { display: flex !important; }
          main { padding-bottom: 140px !important; }
        }
      `}</style>
    </SidebarCtx.Provider>
  );
}
