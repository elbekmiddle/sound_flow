import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import PlayerBar from './PlayerBar.jsx';
import MobileNav from './MobileNav.jsx';

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Sidebar (desktop) ─────────────────────── */}
      <Sidebar />

      {/* ── Main column ───────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-[80px] md:pb-[88px]">
          <Outlet />
        </main>

        {/* Player bar */}
        <PlayerBar />
      </div>

      {/* ── Mobile bottom nav ─────────────────────── */}
      <MobileNav />
    </div>
  );
}
