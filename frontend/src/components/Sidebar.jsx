import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import useAuthStore from '../store/authStore.js';
import { playlistApi } from '../api/client.js';

const NAV = [
  { to: '/',         label: 'Home',     icon: 'home'          },
  { to: '/search',   label: 'Search',   icon: 'search'        },
  { to: '/library',  label: 'Library',  icon: 'library_music' },
  { to: '/podcasts', label: 'Podcasts', icon: 'podcasts'      },
];

export default function Sidebar() {
  const { profile } = useAuthStore();
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    playlistApi.getAll().then(setPlaylists).catch(() => {});
  }, []);

  const name    = profile?.display_name || 'User';
  const initial = name[0]?.toUpperCase() ?? '?';

  return (
    <motion.nav
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        width: '240px',
        flexShrink: 0,
        background: 'var(--color-surface-container-lowest)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 12px',
      }}
      className="hidden md:flex"
    >
      {/* ── Logo ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 12px', marginBottom: '32px' }}>
        <span
          className="material-symbols-outlined ms-fill"
          style={{ color: 'var(--color-primary)', fontSize: 28 }}
        >
          graphic_eq
        </span>
        <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 900, fontSize: 20, letterSpacing: '-0.03em' }}>
          Obsidian
        </span>
      </div>

      {/* ── Nav items ─────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 22,
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {item.icon}
                </span>
                <span style={{ fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(72,72,71,0.15)', margin: '16px 0 12px' }} />

        <p style={{
          padding: '0 12px',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: 'var(--color-on-surface-variant)',
          marginBottom: 8,
        }}>
          Your Playlists
        </p>

        <NavLink
          to="/library/liked"
          className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
        >
          <span
            className="material-symbols-outlined ms-fill"
            style={{ fontSize: 20, color: 'var(--color-tertiary)' }}
          >
            favorite
          </span>
          <span style={{ fontWeight: 500 }}>Liked Songs</span>
        </NavLink>

        {/* User playlists */}
        <div style={{ overflowY: 'auto', maxHeight: '200px' }} className="no-scrollbar">
          {playlists.map((pl) => (
            <NavLink
              key={pl.id}
              to={`/playlist/${pl.id}`}
              className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>queue_music</span>
              <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pl.name}
              </span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* ── User card ─────────────────────────────── */}
      <NavLink
        to="/profile"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 12px',
          borderRadius: 8,
          textDecoration: 'none',
          transition: 'background 0.15s',
          marginTop: 'auto',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-container)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{
          width: 32, height: 32,
          borderRadius: '50%',
          background: 'rgba(199,153,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-primary)',
          fontWeight: 700,
          fontSize: 14,
          flexShrink: 0,
        }}>
          {initial}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-on-surface)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {name}
          </p>
          <p style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>View Profile</p>
        </div>
      </NavLink>
    </motion.nav>
  );
}
