import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Save, Volume2, Shuffle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';
import usePlayerStore from '../store/playerStore.js';

function Toggle({ on, onChange }) {
  return (
    <button onClick={()=>onChange(!on)}
      style={{ width:42, height:24, borderRadius:99, border:'none', cursor:'pointer',
        background: on ? 'var(--color-primary)' : 'var(--color-surface-container-highest)',
        position:'relative', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:3, width:18, height:18, background:'#fff',
        borderRadius:'50%', boxShadow:'0 1px 4px rgba(0,0,0,0.3)',
        transition:'left 0.2s', left: on ? 'calc(100% - 21px)' : 3 }} />
    </button>
  );
}

export default function ProfilePage() {
  const { profile, updateProfile, logout } = useAuthStore();
  const { clearQueue } = usePlayerStore();
  const navigate = useNavigate();

  const [displayName, setName]  = useState(profile?.display_name||'');
  const [saving, setSaving]     = useState(false);
  const [quality, setQuality]   = useState('high');
  const [crossfade, setCross]   = useState(false);
  const [normalize, setNorm]    = useState(true);

  const name    = profile?.display_name || 'User';
  const initial = name[0]?.toUpperCase() ?? '?';

  async function handleSave() {
    if (!displayName.trim()) return;
    setSaving(true);
    try { await updateProfile({ displayName }); toast.success('Profile updated'); }
    catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  }

  async function handleSignOut() {
    clearQueue(); logout(); navigate('/login'); toast('Signed out');
  }

  const C = { text:'var(--color-on-surface)', muted:'var(--color-on-surface-variant)',
    surf:'var(--color-surface-container)', surfH:'var(--color-surface-container-high)',
    prim:'var(--color-primary)' };

  const stats = [
    { label:'Played', val: profile?.plays_count||0 },
    { label:'Playlists', val: profile?.playlist_count||0 },
    { label:'Liked', val: profile?.liked_count||0 },
  ];

  return (
    <div style={{ padding:'24px 16px 0', maxWidth:640, margin:'0 auto' }}>
      {/* Profile header */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        style={{ display:'flex', alignItems:'center', gap:20, marginBottom:32, flexWrap:'wrap' }}>
        <div style={{ width:80, height:80, borderRadius:'50%', flexShrink:0,
          background:'linear-gradient(135deg,rgba(199,153,255,.5),#1e0342)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:28, fontWeight:900, color:C.prim,
          boxShadow:'0 8px 32px rgba(199,153,255,0.2)' }}>
          {initial}
        </div>
        <div>
          <h1 style={{ fontFamily:'var(--font-headline)', fontWeight:900, fontSize:26, letterSpacing:'-0.03em' }}>{name}</h1>
          <p style={{ color:C.muted, fontSize:13, marginTop:2 }}>{profile?.email}</p>
          <div style={{ display:'flex', gap:20, marginTop:10 }}>
            {stats.map(s=>(
              <div key={s.label} style={{ textAlign:'center' }}>
                <p style={{ fontWeight:700, fontSize:16 }}>{s.val}</p>
                <p style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:'0.1em' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Account settings */}
      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.07 }}
        style={{ background:C.surf, borderRadius:14, padding:22, marginBottom:14 }}>
        <h3 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:17, marginBottom:18 }}>Account Settings</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em',
              color:C.muted, display:'block', marginBottom:6 }}>Display Name</label>
            <input type="text" value={displayName} onChange={e=>setName(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleSave()}
              className="input-field" />
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em',
              color:C.muted, display:'block', marginBottom:6 }}>Email</label>
            <input type="email" value={profile?.email||''} disabled
              className="input-field" style={{ opacity:0.5, cursor:'not-allowed' }} />
          </div>
          <button onClick={handleSave} disabled={saving||displayName===profile?.display_name}
            className="btn-primary"
            style={{ padding:'11px', fontSize:14, width:'100%', display:'flex',
              alignItems:'center', justifyContent:'center', gap:8 }}>
            <Save size={16}/>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>

      {/* Playback preferences */}
      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
        style={{ background:C.surf, borderRadius:14, padding:22, marginBottom:14 }}>
        <h3 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:17, marginBottom:16 }}>Playback</h3>
        <div style={{ display:'flex', flexDirection:'column' }}>
          {/* Audio Quality */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'12px 0', borderBottom:'1px solid rgba(72,72,71,0.12)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Volume2 size={18} color={C.muted} />
              <div>
                <p style={{ fontWeight:500, fontSize:14 }}>Audio Quality</p>
                <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>Stream quality</p>
              </div>
            </div>
            <select value={quality} onChange={e=>setQuality(e.target.value)}
              style={{ background:'var(--color-surface-container-highest)', border:'none',
                borderRadius:8, padding:'6px 10px', fontSize:13, color:C.text, outline:'none', cursor:'pointer' }}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Crossfade */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'12px 0', borderBottom:'1px solid rgba(72,72,71,0.12)' }}>
            <div>
              <p style={{ fontWeight:500, fontSize:14 }}>Crossfade</p>
              <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>Smooth transitions between tracks</p>
            </div>
            <Toggle on={crossfade} onChange={setCross} />
          </div>

          {/* Normalize */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0' }}>
            <div>
              <p style={{ fontWeight:500, fontSize:14 }}>Normalize Volume</p>
              <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>Consistent loudness across tracks</p>
            </div>
            <Toggle on={normalize} onChange={setNorm} />
          </div>
        </div>
      </motion.div>

      {/* Sign out */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.13 }}
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 4px', marginBottom:32 }}>
        <button onClick={handleSignOut}
          style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none',
            cursor:'pointer', color:'var(--color-error)', fontSize:13, fontWeight:600,
            transition:'opacity 0.15s' }}
          onMouseEnter={e=>e.currentTarget.style.opacity='0.75'}
          onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
          <LogOut size={17}/> Sign Out
        </button>
        <p style={{ fontSize:11, color:'rgba(173,170,170,0.35)' }}>Obsidian Audio v3.0</p>
      </motion.div>
    </div>
  );
}
