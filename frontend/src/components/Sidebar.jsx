import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import useAuthStore from '../store/authStore.js';
import { playlistApi } from '../api/client.js';

const NAV_ITEMS = [
  { to: '/',         label: 'Home',     icon: 'home'          },
  { to: '/search',   label: 'Search',   icon: 'search'        },
  { to: '/library',  label: 'Library',  icon: 'library_music' },
  { to: '/podcasts', label: 'Podcasts', icon: 'podcasts'      },
];

export default function Sidebar() {
  const { profile, logout } = useAuthStore();
  const [playlists, setPlaylists] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    playlistApi.getAll().then(setPlaylists).catch(() => {});
  }, []);

  const name   = profile?.display_name || 'User';
  const initial = name[0]?.toUpperCase();

  return (
    <motion.nav
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="hidden md:flex w-60 flex-shrink-0 flex-col bg-surface-container-lowest py-6 px-3"
    >
      {/* ── Logo ──────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <span className="material-symbols-outlined text-primary text-[28px]"
          style={{ fontVariationSettings: "'FILL' 1" }}>graphic_eq</span>
        <span className="font-headline font-black text-xl tracking-tighter">Obsidian</span>
      </div>

      {/* ── Nav links ─────────────────────────────── */}
      <div className="space-y-0.5 flex-1">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `nav-btn ${isActive ? 'active' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* ── Divider ─────────────────────────────── */}
        <div className="border-t border-outline-variant/10 my-4" />

        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-2">
          Your Playlists
        </p>

        {/* ── Liked / Mix ─────────────────────────── */}
        <NavLink
          to="/library/liked"
          className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined text-[22px] text-tertiary"
            style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          <span className="font-medium truncate">Liked Songs</span>
        </NavLink>

        {/* ── User playlists ──────────────────────── */}
        <div className="space-y-0.5 max-h-48 overflow-y-auto no-scrollbar">
          {playlists.map(pl => (
            <NavLink
              key={pl.id}
              to={`/playlist/${pl.id}`}
              className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined text-[20px]">queue_music</span>
              <span className="font-medium truncate">{pl.name}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* ── User card ─────────────────────────────── */}
      <div className="mt-auto">
        <NavLink
          to="/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-surface-container transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center
                          text-primary font-bold text-sm flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{name}</p>
            <p className="text-xs text-on-surface-variant">View Profile</p>
          </div>
        </NavLink>
      </div>
    </motion.nav>
  );
}
