import { useState, useRef, useContext } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Save, Camera, Globe, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';
import usePlayerStore from '../store/playerStore.js';
import { authApi } from '../api/client.js';
import { LangContext } from '../contexts/LangContext.jsx';
import { ThemeContext } from '../contexts/ThemeContext.jsx';
import useT from '../i18n/useT.js';

function Toggle({ on, onChange }) {
  return (
    <button onClick={()=>onChange(!on)} style={{
      width:40, height:22, borderRadius:99, border:'none', cursor:'pointer',
      background:on?'var(--color-primary)':'var(--color-surface-container-highest)',
      position:'relative', transition:'background 0.2s', flexShrink:0,
    }}>
      <div style={{ position:'absolute', top:3, width:16, height:16, background:'#fff',
        borderRadius:'50%', boxShadow:'0 1px 4px rgba(0,0,0,0.3)',
        left:on?'calc(100% - 19px)':3, transition:'left 0.2s' }}/>
    </button>
  );
}

export default function ProfilePage() {
  const { profile, updateProfile, logout, refreshUser } = useAuthStore();
  const { clearQueue } = usePlayerStore();
  const { lang, setLang } = useContext(LangContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const t = useT();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [displayName, setName]   = useState(profile?.display_name || '');
  const [saving,  setSaving]     = useState(false);
  const [uploading, setUploading]= useState(false);
  const [quality, setQuality]    = useState('high');
  const [crossfade, setCross]    = useState(false);
  const [normalize, setNorm]     = useState(true);

  const name    = profile?.display_name || '';
  const initial = name[0]?.toUpperCase() || '?';
  const avatar  = profile?.avatar_url;

  const stats = [
    { label: t('played'),   val: profile?.plays_count    || 0 },
    { label: t('playlists'),val: profile?.playlist_count || 0 },
    { label: t('liked_'),   val: profile?.liked_count    || 0 },
  ];

  async function handleSave() {
    if (!displayName.trim()) return;
    setSaving(true);
    try { await updateProfile({ displayName }); toast.success(t('profileUpdated')); }
    catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5 MB'); return; }
    setUploading(true);
    try {
      await authApi.uploadAvatar(file);
      await refreshUser();
      toast.success(t('profileUpdated'));
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally { setUploading(false); }
  }

  async function handleSignOut() {
    clearQueue(); logout(); navigate('/login'); toast(t('signOut'));
  }

  const C = { text:'var(--color-on-surface)', muted:'var(--color-on-surface-variant)',
    surf:'var(--color-surface-container)', surfH:'var(--color-surface-container-high)', prim:'var(--color-primary)' };

  return (
    <div style={{ padding:'20px 16px 0', maxWidth:580, margin:'0 auto' }}>

      {/* Profile header */}
      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}}
        style={{ display:'flex', alignItems:'center', gap:18, marginBottom:28, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:76, height:76, borderRadius:'50%',
            background:'linear-gradient(135deg,rgba(199,153,255,.5),#1e0342)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:26, fontWeight:900, color:C.prim, overflow:'hidden',
            boxShadow:'0 8px 32px rgba(199,153,255,0.18)' }}>
            {avatar
              ? <img src={avatar} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : initial
            }
          </div>
          {/* Upload button overlay */}
          <button onClick={()=>fileRef.current?.click()} disabled={uploading}
            style={{ position:'absolute', bottom:0, right:0,
              width:24, height:24, borderRadius:'50%', border:'2px solid var(--color-background)',
              background:'var(--color-primary)', display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', transition:'transform 0.15s' }}
            onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
            title={t('changePhoto')}
          >
            {uploading
              ? <div style={{width:10,height:10,border:'1.5px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
              : <Camera size={11} color="var(--color-on-primary-container)"/>
            }
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleAvatarChange}/>
        </div>

        <div>
          <h1 style={{ fontFamily:'var(--font-headline)', fontWeight:900, fontSize:24,
            letterSpacing:'-0.03em', color:C.text }}>{name || '...'}</h1>
          <p style={{ color:C.muted, fontSize:12, marginTop:2 }}>{profile?.email}</p>
          <div style={{ display:'flex', gap:18, marginTop:10 }}>
            {stats.map(s=>(
              <div key={s.label} style={{textAlign:'center'}}>
                <p style={{fontWeight:700,fontSize:15,color:C.text}}>{s.val}</p>
                <p style={{fontSize:9,color:C.muted,textTransform:'uppercase',letterSpacing:'0.1em'}}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Account settings */}
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.07}}
        style={{ background:C.surf, borderRadius:14, padding:20, marginBottom:12 }}>
        <h3 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:16,
          marginBottom:16, color:C.text }}>{t('accountSettings')}</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em',
              color:C.muted, display:'block', marginBottom:5 }}>{t('displayName')}</label>
            <input type="text" value={displayName} onChange={e=>setName(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleSave()}
              className="input-field" style={{fontSize:13}}/>
          </div>
          <div>
            <label style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em',
              color:C.muted, display:'block', marginBottom:5 }}>{t('email')}</label>
            <input type="email" value={profile?.email||''} disabled
              className="input-field" style={{opacity:0.5,cursor:'not-allowed',fontSize:13}}/>
          </div>
          <button onClick={handleSave} disabled={saving||displayName===profile?.display_name}
            className="btn-primary" style={{padding:'11px',fontSize:13,width:'100%',
              display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
            <Save size={14}/> {saving?'...':t('saveChanges')}
          </button>
        </div>
      </motion.div>

      {/* Language + Theme */}
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
        style={{ background:C.surf, borderRadius:14, padding:20, marginBottom:12 }}>
        <h3 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:16,
          marginBottom:14, color:C.text }}>{t('language')} & {t(theme==='dark'?'darkMode':'lightMode')}</h3>

        {/* Language */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'10px 0', borderBottom:'1px solid var(--color-outline-variant)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Globe size={16} color={C.muted}/>
            <p style={{fontWeight:500,fontSize:13,color:C.text}}>{t('language')}</p>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {['uz','ru','en'].map(l=>(
              <button key={l} onClick={()=>setLang(l)}
                style={{
                  background: lang===l?'var(--color-primary)':'var(--color-surface-container-highest)',
                  color: lang===l?'var(--color-on-primary-container)':C.muted,
                  border:'none', borderRadius:6, padding:'4px 10px',
                  fontSize:11, fontWeight:700, cursor:'pointer', transition:'all 0.15s',
                }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {theme==='dark'?<Moon size={16} color={C.muted}/>:<Sun size={16} color={C.muted}/>}
            <p style={{fontWeight:500,fontSize:13,color:C.text}}>{t(theme==='dark'?'darkMode':'lightMode')}</p>
          </div>
          <Toggle on={theme==='dark'} onChange={toggleTheme}/>
        </div>
      </motion.div>

      {/* Playback */}
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.12}}
        style={{ background:C.surf, borderRadius:14, padding:20, marginBottom:12 }}>
        <h3 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:16,
          marginBottom:14, color:C.text }}>{t('playbackSettings')}</h3>
        {[
          { label:t('audioQuality'), sub:'Stream quality', content:(
            <select value={quality} onChange={e=>setQuality(e.target.value)}
              style={{ background:'var(--color-surface-container-highest)', border:'none',
                borderRadius:7, padding:'5px 10px', fontSize:12, color:C.text, outline:'none', cursor:'pointer' }}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          )},
          { label:t('crossfade'), sub:t('crossfade'), content:<Toggle on={crossfade} onChange={setCross}/> },
          { label:t('normalizeVolume'), sub:t('normalizeVolume'), content:<Toggle on={normalize} onChange={setNorm}/> },
        ].map((item,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'10px 0', borderBottom: i<2?'1px solid var(--color-outline-variant)':'none' }}>
            <p style={{fontWeight:500,fontSize:13,color:C.text}}>{item.label}</p>
            {item.content}
          </div>
        ))}
      </motion.div>

      {/* Sign out + footer */}
      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.14}}
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'10px 4px', marginBottom:32 }}>
        <button onClick={handleSignOut}
          style={{ display:'flex', alignItems:'center', gap:7, background:'none', border:'none',
            cursor:'pointer', color:'var(--color-error)', fontSize:13, fontWeight:600 }}>
          <LogOut size={15}/> {t('signOut')}
        </button>
        <p style={{ fontSize:10, color:C.muted, opacity:0.4 }}>{t('createdBy')}</p>
      </motion.div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
