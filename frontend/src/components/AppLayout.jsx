import { Outlet } from 'react-router-dom';
import { useState, createContext, useContext } from 'react';
import Sidebar   from './Sidebar.jsx';
import PlayerBar from './PlayerBar.jsx';
import MobileNav from './MobileNav.jsx';

export const SidebarCtx = createContext({ open: true, toggle: () => {} });
export const useSidebar = () => useContext(SidebarCtx);

export default function AppLayout() {
  const [open, setOpen] = useState(true);
  const toggle = () => setOpen(v => !v);

  return (
    <SidebarCtx.Provider value={{ open, toggle }}>
      <div style={{ display:'flex', height:'100vh', background:'var(--color-background)', overflow:'hidden' }}>
        {/* Sidebar — hidden on mobile via CSS, collapsible on desktop */}
        <Sidebar />

        {/* Main column */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
          <main style={{ flex:1, overflowY:'auto', paddingBottom: 90 }}>
            <Outlet />
          </main>
          <PlayerBar />
        </div>

        {/* Mobile bottom nav */}
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
