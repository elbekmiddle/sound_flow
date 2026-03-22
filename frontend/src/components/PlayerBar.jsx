import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Heart, Volume2, Volume1, VolumeX, Maximize2, Keyboard,
} from 'lucide-react';
import usePlayerStore from '../store/playerStore.js';
import useT from '../i18n/useT.js';
import ExpandedPlayer from './ExpandedPlayer.jsx';

const fmt = s => (!s||isNaN(s)) ? '0:00' : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

function ShortcutsTooltip({ onClose }) {
  const shortcuts = [
    ['Space',     'Play / Pause'],
    ['Alt + →',   'Next track'],
    ['Alt + ←',   'Previous track'],
    ['Ctrl + S',  'Shuffle toggle'],
    ['Ctrl + R',  'Repeat toggle'],
    ['Ctrl + L',  'Like toggle'],
    ['Ctrl + [',  'Toggle sidebar'],
  ];
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}
      style={{
        position:'fixed', bottom:92, left:'50%', transform:'translateX(-50%)',
        background:'var(--color-surface-container-high)',
        border:'1px solid var(--color-outline-variant)',
        borderRadius:12, padding:'12px 16px', zIndex:300,
        boxShadow:'var(--shadow-lg)', minWidth:260,
      }}
      onClick={onClose}
    >
      <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
        letterSpacing:'0.1em', color:'var(--color-on-surface-variant)', marginBottom:8 }}>
        Keyboard Shortcuts
      </p>
      {shortcuts.map(([k,v]) => (
        <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'3px 0', gap:16 }}>
          <span className="kbd">{k}</span>
          <span style={{ fontSize:12, color:'var(--color-on-surface-variant)' }}>{v}</span>
        </div>
      ))}
    </motion.div>
  );
}

function IBtn({ icon:Icon, active, onClick, title, size=18, style={} }) {
  return (
    <button onClick={onClick} title={title} className={`icon-btn${active?' active':''}`}
      style={{ color:active?'var(--color-primary)':'var(--color-on-surface-variant)',...style }}>
      <Icon size={size} strokeWidth={active?2.5:2} />
    </button>
  );
}

export default function PlayerBar() {
  const [expanded,  setExpanded]  = useState(false);
  const [showKeys,  setShowKeys]  = useState(false);
  const t = useT();

  const {
    currentTrack, isPlaying, isLoading, progress, currentTime, duration,
    volume, shuffle, repeat, togglePlay, next, prev, seek, setVolume,
    toggleShuffle, toggleRepeat, toggleLike, isLiked,
  } = usePlayerStore();

  const liked = currentTrack ? isLiked(currentTrack.id) : false;
  const VIcon = volume===0 ? VolumeX : volume<0.4 ? Volume1 : Volume2;

  return (
    <>
      <div className="glass" style={{
        flexShrink:0, height:80,
        borderTop:'1px solid var(--color-outline-variant)',
        display:'flex', alignItems:'center',
        padding:'0 16px',
        boxShadow:'0 -2px 20px rgba(199,153,255,0.04)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12,
          maxWidth:1280, margin:'0 auto', width:'100%' }}>

          {/* ── Track ─────────────── */}
          <div onClick={()=>currentTrack&&setExpanded(true)}
            style={{ display:'flex', alignItems:'center', gap:10,
              flex:'0 0 200px', cursor:currentTrack?'pointer':'default', minWidth:0 }}>
            <div style={{ width:42, height:42, borderRadius:7, flexShrink:0,
              background:'var(--color-surface-container-high)', overflow:'hidden',
              display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
              {currentTrack?.thumbnail
                ? <img src={currentTrack.thumbnail} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : <Volume2 size={16} color="var(--color-on-surface-variant)"/>
              }
              {isLoading && (
                <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.5)',
                  display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <div style={{ width:14,height:14,border:'2px solid rgba(199,153,255,0.3)',
                    borderTopColor:'var(--color-primary)',borderRadius:'50%',
                    animation:'spin 0.8s linear infinite' }}/>
                </div>
              )}
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <p style={{ fontSize:12, fontWeight:600, color:'var(--color-on-surface)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {currentTrack?.title || t('notPlaying')}
              </p>
              <p style={{ fontSize:11, color:'var(--color-on-surface-variant)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>
                {currentTrack?.artist || t('selectTrack')}
              </p>
            </div>
            {currentTrack && (
              <button onClick={e=>{e.stopPropagation();toggleLike();}} className="icon-btn">
                <Heart size={15} fill={liked?'var(--color-tertiary)':'none'}
                  color={liked?'var(--color-tertiary)':'var(--color-on-surface-variant)'} />
              </button>
            )}
          </div>

          {/* ── Controls + Progress ─ */}
          <div style={{ flex:1, display:'flex', flexDirection:'column',
            alignItems:'center', gap:5, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <IBtn icon={Shuffle}  active={shuffle}       onClick={toggleShuffle} title={t('shuffle')} size={16}/>
              <IBtn icon={SkipBack} onClick={prev}         title={t('previous')} size={20}/>
              <button onClick={togglePlay} disabled={!currentTrack}
                style={{
                  width:36, height:36, borderRadius:'50%',
                  background:currentTrack?'var(--color-on-surface)':'var(--color-surface-container-high)',
                  border:'none', cursor:currentTrack?'pointer':'not-allowed',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'transform 0.15s', flexShrink:0,
                }}
                onMouseEnter={e=>{if(currentTrack)e.currentTarget.style.transform='scale(1.07)';}}
                onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
              >
                {isPlaying
                  ? <Pause size={18} fill="var(--color-background)" color="var(--color-background)"/>
                  : <Play  size={18} fill="var(--color-background)" color="var(--color-background)" style={{marginLeft:2}}/>
                }
              </button>
              <IBtn icon={SkipForward} onClick={next}          title={t('next')} size={20}/>
              <IBtn icon={repeat==='one'?Repeat1:Repeat}
                active={repeat!=='none'} onClick={toggleRepeat} title={t('repeat')} size={16}/>
            </div>

            {/* Progress bar */}
            <div style={{ display:'flex', alignItems:'center', gap:8, width:'100%', maxWidth:440 }}>
              <span style={{ fontSize:10, color:'var(--color-on-surface-variant)', width:32, textAlign:'right' }}>
                {fmt(currentTime)}
              </span>
              <input type="range" min="0" max="100" value={progress}
                onChange={e=>seek(parseFloat(e.target.value))}
                className="range-track" style={{ flex:1, '--pct':`${progress}%` }}/>
              <span style={{ fontSize:10, color:'var(--color-on-surface-variant)', width:32 }}>
                {fmt(duration)}
              </span>
            </div>
          </div>

          {/* ── Right: volume + extras ─ */}
          <div style={{ display:'flex', alignItems:'center', gap:8,
            flex:'0 0 180px', justifyContent:'flex-end' }}>
            <button onClick={()=>setShowKeys(v=>!v)} className="icon-btn" title="Keyboard shortcuts">
              <Keyboard size={14}/>
            </button>
            <IBtn icon={Maximize2} onClick={()=>currentTrack&&setExpanded(true)} title={t('expand')} size={14}/>
            <VIcon size={15} color="var(--color-on-surface-variant)"/>
            <input type="range" min="0" max="100" value={Math.round(volume*100)}
              onChange={e=>setVolume(e.target.value/100)}
              className="range-vol" style={{ width:72, '--vol':`${volume*100}%` }}/>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <AnimatePresence>
        {showKeys && <ShortcutsTooltip onClose={()=>setShowKeys(false)}/>}
      </AnimatePresence>
      <AnimatePresence>
        {expanded && <ExpandedPlayer onClose={()=>setExpanded(false)}/>}
      </AnimatePresence>
    </>
  );
}
