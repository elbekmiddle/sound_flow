import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  Home, Search, Library, Podcast, Heart, ListMusic,
  PanelLeftClose, PanelLeftOpen, Music2, Plus, ChevronRight,
} from 'lucide-react';
import useAuthStore from '../store/authStore.js';
import { useSidebar } from './AppLayout.jsx';
import { playlistApi } from '../api/client.js';

const NAV = [
  { to: '/',         label: 'Home',     Icon: Home    },
  { to: '/search',   label: 'Search',   Icon: Search  },
  { to: '/library',  label: 'Library',  Icon: Library },
  { to: '/podcasts', label: 'Podcasts', Icon: Podcast },
];

const C = {
  bg:      'var(--color-surface-container-lowest)',
  muted:   'var(--color-on-surface-variant)',
  text:    'var(--color-on-surface)',
  primary: 'var(--color-primary)',
  surf:    'var(--color-surface-container)',
  tertiary:'var(--color-tertiary)',
  border:  'rgba(72,72,71,0.15)',
};

export default function Sidebar() {
  const { open, toggle } = useSidebar();
  const { profile } = useAuthStore();
  const [playlists, setPlaylists] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    playlistApi.getAll().then(setPlaylists).catch(() => {});
  }, []);

  const name    = profile?.display_name || 'User';
  const initial = name[0]?.toUpperCase() ?? '?';
  const w = open ? 240 : 64;

  return (
    <motion.nav
      className="desktop-sidebar"
      animate={{ width: w }}
      transition={{ duration: 0.25, ease: [0.16,1,0.3,1] }}
      style={{
        flexShrink: 0, height: '100%',
        background: C.bg,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', borderRight: `1px solid ${C.border}`,
      }}
    >
      {/* ── Logo + Toggle ─────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent: open ? 'space-between' : 'center',
        padding: open ? '20px 16px 16px' : '20px 0 16px', borderBottom:`1px solid ${C.border}` }}>
        {open && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, background:'rgba(199,153,255,0.15)',
              borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Music2 size={16} color={C.primary} />
            </div>
            <span style={{ fontFamily:'var(--font-headline)', fontWeight:900, fontSize:17,
              letterSpacing:'-0.03em', color:C.text }}>Obsidian</span>
          </div>
        )}
        <button onClick={toggle} className="icon-btn"
          style={{ color:C.muted, flexShrink:0 }} title={open ? 'Collapse' : 'Expand'}>
          {open ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
      </div>

      {/* ── Nav ───────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', padding:'8px 8px 0' }} className="no-scrollbar">
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {NAV.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
              style={{ justifyContent: open ? 'flex-start' : 'center', padding: open ? '10px 12px' : '10px 0' }}
              title={!open ? label : ''}
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <AnimatePresence>
                    {open && (
                      <motion.span initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                        transition={{ duration:0.15 }}
                        style={{ whiteSpace:'nowrap', fontSize:14, fontWeight: isActive ? 700 : 500 }}>
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Divider */}
        {open && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
            style={{ borderTop:`1px solid ${C.border}`, margin:'12px 4px', }}>
            <p style={{ padding:'8px 4px 6px', fontSize:10, fontWeight:700,
              textTransform:'uppercase', letterSpacing:'0.15em', color:C.muted }}>
              Playlists
            </p>
          </motion.div>
        )}

        {open && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.05 }}
            style={{ display:'flex', flexDirection:'column', gap:2 }}>

            <NavLink to="/library/liked"
              className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>
              {({ isActive }) => (
                <>
                  <Heart size={18} fill={isActive ? C.tertiary : 'none'} color={C.tertiary} strokeWidth={2} />
                  <span style={{ fontSize:13, fontWeight:500, flex:1 }}>Liked Songs</span>
                </>
              )}
            </NavLink>

            <div style={{ maxHeight:180, overflowY:'auto' }} className="no-scrollbar">
              {playlists.map(pl => (
                <NavLink key={pl.id} to={`/playlist/${pl.id}`}
                  className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>
                  <ListMusic size={16} style={{ flexShrink:0 }} />
                  <span style={{ fontSize:13, fontWeight:500, flex:1, overflow:'hidden',
                    textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pl.name}</span>
                </NavLink>
              ))}
            </div>

            <button onClick={() => navigate('/library')}
              className="nav-btn" style={{ color:C.muted }}>
              <Plus size={16} />
              <span style={{ fontSize:13 }}>New Playlist</span>
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Profile ───────────────────────────── */}
      <div style={{ borderTop:`1px solid ${C.border}`, padding:'8px' }}>
        <NavLink to="/profile"
          style={{
            display:'flex', alignItems:'center', gap:10,
            padding: open ? '10px 8px' : '10px 0',
            justifyContent: open ? 'flex-start' : 'center',
            borderRadius:8, textDecoration:'none',
            transition:'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.surf}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ width:30, height:30, borderRadius:'50%',
            background:'rgba(199,153,255,0.2)', flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            color:C.primary, fontWeight:800, fontSize:13 }}>
            {initial}
          </div>
          <AnimatePresence>
            {open && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                style={{ minWidth:0, flex:1 }}>
                <p style={{ fontSize:13, fontWeight:600, color:C.text,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</p>
                <p style={{ fontSize:11, color:C.muted }}>View Profile</p>
              </motion.div>
            )}
          </AnimatePresence>
        </NavLink>
      </div>
    </motion.nav>
  );
}
