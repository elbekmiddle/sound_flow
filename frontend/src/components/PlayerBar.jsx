import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Heart, Volume2, Volume1, VolumeX, Maximize2,
} from 'lucide-react';
import usePlayerStore from '../store/playerStore.js';
import ExpandedPlayer from './ExpandedPlayer.jsx';

const fmt = s => {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
};

function IBtn({ icon: Icon, active, onClick, title, size=20, style={} }) {
  return (
    <button onClick={onClick} title={title} className={`icon-btn${active?' active':''}`}
      style={{ color: active ? 'var(--color-primary)' : 'var(--color-on-surface-variant)', ...style }}>
      <Icon size={size} strokeWidth={active ? 2.5 : 2} />
    </button>
  );
}

export default function PlayerBar() {
  const [expanded, setExpanded] = useState(false);
  const {
    currentTrack, isPlaying, isLoading, progress, currentTime, duration,
    volume, shuffle, repeat, togglePlay, next, prev, seek, setVolume,
    toggleShuffle, toggleRepeat, toggleLike, isLiked,
  } = usePlayerStore();

  const liked = currentTrack ? isLiked(currentTrack.id) : false;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.4 ? Volume1 : Volume2;

  const onProgress = useCallback(e => seek(parseFloat(e.target.value)), [seek]);
  const onVolume   = useCallback(e => setVolume(e.target.value / 100), [setVolume]);

  return (
    <>
      <div className="glass" style={{
        flexShrink:0,
        borderTop:'1px solid rgba(72,72,71,0.12)',
        padding:'10px 16px',
        boxShadow:'0 -4px 40px rgba(199,153,255,0.05)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, maxWidth:1280, margin:'0 auto' }}>

          {/* ── Track info ────────────────── */}
          <div onClick={() => currentTrack && setExpanded(true)}
            style={{ display:'flex', alignItems:'center', gap:10, minWidth:0,
              flex:'0 0 220px', cursor: currentTrack ? 'pointer' : 'default' }}>
            <div style={{ width:44, height:44, borderRadius:8, flexShrink:0,
              background:'var(--color-surface-container-high)', overflow:'hidden',
              display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
              {currentTrack?.thumbnail
                ? <img src={currentTrack.thumbnail} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <Volume2 size={18} color="var(--color-on-surface-variant)" />
              }
              {isLoading && (
                <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:16, height:16, border:'2px solid rgba(199,153,255,0.3)',
                    borderTopColor:'var(--color-primary)', borderRadius:'50%',
                    animation:'spin 0.8s linear infinite' }}/>
                </div>
              )}
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <p style={{ fontSize:13, fontWeight:600, color:'var(--color-on-surface)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {currentTrack?.title || 'Not playing'}
              </p>
              <p style={{ fontSize:11, color:'var(--color-on-surface-variant)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>
                {currentTrack?.artist || 'Select a track'}
              </p>
            </div>
            {currentTrack && (
              <button onClick={e => { e.stopPropagation(); toggleLike(); }}
                className="icon-btn" style={{ flexShrink:0 }}>
                <Heart size={17} fill={liked ? 'var(--color-tertiary)' : 'none'}
                  color={liked ? 'var(--color-tertiary)' : 'var(--color-on-surface-variant)'} />
              </button>
            )}
          </div>

          {/* ── Controls + Progress ────────── */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <IBtn icon={Shuffle}    active={shuffle}          onClick={toggleShuffle} title="Shuffle" size={17} />
              <IBtn icon={SkipBack}   onClick={prev}            title="Previous" size={22} />
              <button onClick={togglePlay} disabled={!currentTrack}
                style={{
                  width:38, height:38, borderRadius:'50%',
                  background: currentTrack ? 'var(--color-on-surface)' : 'var(--color-surface-container-high)',
                  border:'none', cursor: currentTrack ? 'pointer' : 'not-allowed',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'transform 0.15s', flexShrink:0,
                }}
                onMouseEnter={e => { if(currentTrack) e.currentTarget.style.transform='scale(1.07)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; }}
              >
                {isPlaying
                  ? <Pause size={20} fill="var(--color-background)" color="var(--color-background)" />
                  : <Play  size={20} fill="var(--color-background)" color="var(--color-background)" style={{ marginLeft:2 }} />
                }
              </button>
              <IBtn icon={SkipForward} onClick={next}            title="Next" size={22} />
              <IBtn icon={repeat==='one' ? Repeat1 : Repeat}
                active={repeat!=='none'} onClick={toggleRepeat} title="Repeat" size={17} />
            </div>

            {/* Progress */}
            <div style={{ display:'flex', alignItems:'center', gap:10, width:'100%', maxWidth:480 }}>
              <span style={{ fontSize:11, color:'var(--color-on-surface-variant)', width:32, textAlign:'right' }}>
                {fmt(currentTime)}
              </span>
              <input type="range" min="0" max="100" value={progress} onChange={onProgress}
                className="range-track" style={{ flex:1, '--pct':`${progress}%` }} />
              <span style={{ fontSize:11, color:'var(--color-on-surface-variant)', width:32 }}>
                {fmt(duration)}
              </span>
            </div>
          </div>

          {/* ── Volume + Expand ────────────── */}
          <div style={{ display:'flex', alignItems:'center', gap:10,
            flex:'0 0 160px', justifyContent:'flex-end' }}>
            <IBtn icon={Maximize2} onClick={() => currentTrack && setExpanded(true)}
              title="Expand" size={15} style={{ display:'none', '@media(min-width:768px)':{ display:'flex' } }} />
            <button className="icon-btn" onClick={onVolume}>
              <VolumeIcon size={17} />
            </button>
            <input type="range" min="0" max="100" value={Math.round(volume*100)}
              onChange={onVolume} className="range-vol"
              style={{ width:72, '--vol':`${volume*100}%` }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 600px) {
          .player-volume { display: none !important; }
          .player-right  { flex: 0 0 40px !important; }
        }
      `}</style>

      <AnimatePresence>
        {expanded && <ExpandedPlayer onClose={() => setExpanded(false)} />}
      </AnimatePresence>
    </>
  );
}
