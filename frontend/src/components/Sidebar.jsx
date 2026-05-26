import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useContext } from 'react';
import {
  Home, Search, Library, Podcast, Heart, ListMusic,
  PanelLeftClose, PanelLeftOpen, Music2, Plus,
  Sun, Moon, Globe, Keyboard,
} from 'lucide-react';
import useAuthStore from '../store/authStore.js';
import { useSidebar } from './AppLayout.jsx';
import { playlistApi } from '../api/client.js';
import { LangContext } from '../contexts/LangContext.jsx';
import { ThemeContext } from '../contexts/ThemeContext.jsx';
import useT from '../i18n/useT.js';

export default function Sidebar() {
  const { open, toggle } = useSidebar();
  const { profile }      = useAuthStore();
  const { lang, setLang } = useContext(LangContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const t = useT();
  const [playlists, setPlaylists] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    playlistApi.getAll().then(setPlaylists).catch(() => {});
  }, []);

  const name    = profile?.display_name || '';
  const initial = name[0]?.toUpperCase() || '?';
  const avatar  = profile?.avatar_url;
  const w = open ? 220 : 56;

  const NAV = [
    { to:'/',         label: t('home'),     Icon: Home    },
    { to:'/search',   label: t('search'),   Icon: Search  },
    { to:'/library',  label: t('library'),  Icon: Library },
    { to:'/podcasts', label: t('podcasts'), Icon: Podcast },
  ];

  const C = {
    bg:   'var(--color-surface-container-lowest)',
    bdr:  'var(--color-outline-variant)',
    muted:'var(--color-on-surface-variant)',
    text: 'var(--color-on-surface)',
    surf: 'var(--color-surface-container)',
    prim: 'var(--color-primary)',
    tert: 'var(--color-tertiary)',
  };

  return (
    <motion.nav
      className="desktop-sidebar"
      animate={{ width: w }}
      transition={{ duration: 0.22, ease: [0.16,1,0.3,1] }}
      style={{
        flexShrink:0, height:'100%', background: C.bg,
        display:'flex', flexDirection:'column', overflow:'hidden',
        borderRight:`1px solid ${C.bdr}`,
      }}
    >
      {/* ── Logo + Toggle ─────────────── */}
      <div style={{
        display:'flex', alignItems:'center',
        justifyContent: open ? 'space-between' : 'center',
        padding: open ? '16px 12px 12px' : '16px 0 12px',
        borderBottom:`1px solid ${C.bdr}`,
      }}>
        {open && (
          <div style={{ display:'flex', alignItems:'center', gap:7, paddingLeft:2 }}>
            <div style={{ width:26, height:26, background:'rgba(199,153,255,0.15)',
              borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Music2 size={14} color={C.prim} />
            </div>
            <span style={{ fontFamily:'var(--font-headline)', fontWeight:900, fontSize:15,
              letterSpacing:'-0.03em', color:C.text }}>Sound Flow</span>
          </div>
        )}
        <button onClick={toggle} className="icon-btn" style={{ color:C.muted, flexShrink:0 }}>
          {open ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
      </div>

      {/* ── Nav ───────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', padding:'6px 6px 0' }} className="no-scrollbar">
        <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
          {NAV.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to==='/'}
              className={({ isActive }) => `nav-btn${isActive?' active':''}`}
              style={{ justifyContent: open?'flex-start':'center', padding: open?'8px 10px':'8px 0' }}
              title={!open ? label : ''}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={isActive?2.5:2} />
                  <AnimatePresence>
                    {open && (
                      <motion.span initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                        transition={{duration:0.12}}
                        style={{ whiteSpace:'nowrap', fontSize:13, fontWeight:isActive?700:500 }}>
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Playlists section */}
        {open && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.05}}>
            <div style={{ borderTop:`1px solid ${C.bdr}`, margin:'10px 4px 6px' }}>
              <p style={{ padding:'6px 4px 4px', fontSize:9, fontWeight:700,
                textTransform:'uppercase', letterSpacing:'0.15em', color:C.muted }}>
                {t('playlists')}
              </p>
            </div>
            <NavLink to="/library/liked"
              className={({ isActive }) => `nav-btn${isActive?' active':''}`}
              style={{ padding:'7px 10px' }}>
              {({ isActive }) => (
                <>
                  <Heart size={15} fill={isActive?C.tert:'none'} color={C.tert} strokeWidth={2} />
                  <span style={{ fontSize:12, fontWeight:500, flex:1 }}>{t('likedSongs')}</span>
                </>
              )}
            </NavLink>
            <div style={{ maxHeight:160, overflowY:'auto' }} className="no-scrollbar">
              {playlists.map(pl => (
                <NavLink key={pl.id} to={`/playlist/${pl.id}`}
                  className={({ isActive }) => `nav-btn${isActive?' active':''}`}
                  style={{ padding:'7px 10px' }}>
                  <ListMusic size={14} style={{ flexShrink:0 }} />
                  <span style={{ fontSize:12, fontWeight:500, flex:1, overflow:'hidden',
                    textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pl.name}</span>
                </NavLink>
              ))}
            </div>
            <button onClick={()=>navigate('/library')} className="nav-btn"
              style={{ color:C.muted, padding:'7px 10px' }}>
              <Plus size={14} />
              <span style={{ fontSize:12 }}>{t('newPlaylist')}</span>
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Footer: theme + lang + profile ─ */}
      <div style={{ borderTop:`1px solid ${C.bdr}`, padding:'6px 6px 8px' }}>
        {/* Theme + Lang row */}
        <div style={{ display:'flex', justifyContent: open?'flex-start':'center',
          gap:4, marginBottom:4, paddingLeft: open?4:0 }}>
          <button onClick={toggleTheme} className="icon-btn" title={t(theme==='dark'?'lightMode':'darkMode')}>
            {theme==='dark' ? <Sun size={15}/> : <Moon size={15}/>}
          </button>
          {open && ['uz','ru','en'].map(l => (
            <button key={l} onClick={()=>setLang(l)}
              style={{
                background: lang===l ? 'var(--color-primary)' : 'transparent',
                color:      lang===l ? 'var(--color-on-primary-container)' : C.muted,
                border:'none', borderRadius:4, padding:'2px 6px',
                fontSize:10, fontWeight:700, cursor:'pointer', transition:'all 0.15s',
              }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* User */}
        <NavLink to="/profile" style={{
          display:'flex', alignItems:'center', gap:8,
          padding: open?'7px 8px':'7px 0', justifyContent: open?'flex-start':'center',
          borderRadius:8, textDecoration:'none', transition:'background 0.15s',
        }}
        onMouseEnter={e=>e.currentTarget.style.background=C.surf}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
        >
          <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0,
            background: avatar ? 'transparent' : 'rgba(199,153,255,0.2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:C.prim, fontWeight:800, fontSize:11, overflow:'hidden' }}>
            {avatar ? <img src={avatar} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : initial}
          </div>
          <AnimatePresence>
            {open && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{minWidth:0,flex:1}}>
                <p style={{ fontSize:12, fontWeight:600, color:C.text,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name || '...'}</p>
                <p style={{ fontSize:10, color:C.muted }}>{t('viewProfile')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </NavLink>

        {/* Created by */}
        {open && (
          <p style={{ fontSize:9, color:C.muted, textAlign:'center', marginTop:4, opacity:0.5 }}>
            {t('createdBy')}
          </p>
        )}
      </div>
    </motion.nav>
  );
}
