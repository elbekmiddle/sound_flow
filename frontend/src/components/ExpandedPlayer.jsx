import { motion } from 'framer-motion';
import {
  ChevronDown, Heart, MoreHorizontal, Shuffle, SkipBack, SkipForward,
  Play, Pause, Repeat, Repeat1, Volume2, Volume1, VolumeX, Disc3,
} from 'lucide-react';
import usePlayerStore from '../store/playerStore.js';

const fmt = s => (!s||isNaN(s)) ? '0:00' : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

export default function ExpandedPlayer({ onClose }) {
  const {
    currentTrack, isPlaying, progress, currentTime, duration,
    volume, shuffle, repeat,
    togglePlay, next, prev, seek, setVolume,
    toggleShuffle, toggleRepeat, toggleLike, isLiked,
  } = usePlayerStore();

  const liked = currentTrack ? isLiked(currentTrack.id) : false;
  const VIcon = volume===0 ? VolumeX : volume<0.4 ? Volume1 : Volume2;

  return (
    <motion.div
      initial={{ y:'100%' }}
      animate={{ y:0 }}
      exit={{ y:'100%' }}
      transition={{ type:'spring', damping:30, stiffness:300 }}
      style={{
        position:'fixed', inset:0, zIndex:200,
        background:'var(--color-background)',
        display:'flex', flexDirection:'column',
      }}
    >
      {/* Background blur art */}
      {currentTrack?.thumbnail && (
        <div style={{ position:'absolute', inset:0, overflow:'hidden', zIndex:0 }}>
          <img src={currentTrack.thumbnail} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', transform:'scale(1.3)', filter:'blur(40px)', opacity:0.12 }} />
          <div style={{ position:'absolute', inset:0, background:'rgba(14,14,14,0.7)' }} />
        </div>
      )}

      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column',
        height:'100%', maxWidth:420, margin:'0 auto', width:'100%', padding:'20px 24px 32px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
          <button onClick={onClose} className="icon-btn"><ChevronDown size={26} /></button>
          <p style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.15em',
            color:'var(--color-on-surface-variant)' }}>Now Playing</p>
          <button className="icon-btn"><MoreHorizontal size={22} /></button>
        </div>

        {/* Art */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:28 }}>
          <motion.div key={currentTrack?.id}
            initial={{ scale:0.88, opacity:0 }} animate={{ scale:1, opacity:1 }}
            transition={{ duration:0.4, ease:[0.16,1,0.3,1] }}
            style={{
              width:280, height:280, borderRadius:16, overflow:'hidden',
              boxShadow:'0 24px 80px rgba(199,153,255,0.18)',
              background:'linear-gradient(135deg,rgba(199,153,255,0.2),#0a0a0a)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}
          >
            {currentTrack?.thumbnail
              ? <img src={currentTrack.thumbnail} alt={currentTrack.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <Disc3 size={80} color="rgba(199,153,255,0.3)" />
            }
          </motion.div>
        </div>

        {/* Track info */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ minWidth:0, flex:1 }}>
            <motion.p key={currentTrack?.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              style={{ fontFamily:'var(--font-headline)', fontWeight:900, fontSize:22,
                letterSpacing:'-0.02em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {currentTrack?.title || 'Not playing'}
            </motion.p>
            <p style={{ color:'var(--color-on-surface-variant)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {currentTrack?.artist || ''}
            </p>
          </div>
          <button onClick={toggleLike} className="icon-btn" style={{ flexShrink:0, marginLeft:16 }}>
            <Heart size={26} fill={liked ? 'var(--color-tertiary)' : 'none'}
              color={liked ? 'var(--color-tertiary)' : 'var(--color-on-surface-variant)'} />
          </button>
        </div>

        {/* Progress */}
        <div style={{ marginBottom:16 }}>
          <input type="range" min="0" max="100" value={progress}
            onChange={e => seek(parseFloat(e.target.value))}
            className="range-track" style={{ width:'100%', marginBottom:8, '--pct':`${progress}%` }} />
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:11, color:'var(--color-on-surface-variant)' }}>{fmt(currentTime)}</span>
            <span style={{ fontSize:11, color:'var(--color-on-surface-variant)' }}>{fmt(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <button onClick={toggleShuffle} className={`icon-btn${shuffle?' active':''}`}>
            <Shuffle size={22} strokeWidth={shuffle?2.5:2} />
          </button>
          <button onClick={prev} className="icon-btn"><SkipBack size={36} /></button>
          <button onClick={togglePlay} style={{
            width:64, height:64, borderRadius:'50%',
            background:'var(--color-primary)', border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all 0.15s', boxShadow:'0 8px 32px rgba(199,153,255,0.25)',
          }}
          onMouseEnter={e => e.currentTarget.style.background='var(--color-primary-container)'}
          onMouseLeave={e => e.currentTarget.style.background='var(--color-primary)'}
          >
            {isPlaying
              ? <Pause size={30} fill="var(--color-on-primary)" color="var(--color-on-primary)" />
              : <Play  size={30} fill="var(--color-on-primary)" color="var(--color-on-primary)" style={{ marginLeft:3 }} />
            }
          </button>
          <button onClick={next} className="icon-btn"><SkipForward size={36} /></button>
          <button onClick={toggleRepeat} className={`icon-btn${repeat!=='none'?' active':''}`}>
            {repeat==='one' ? <Repeat1 size={22} strokeWidth={2.5} /> : <Repeat size={22} />}
          </button>
        </div>

        {/* Volume */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <VIcon size={17} color="var(--color-on-surface-variant)" />
          <input type="range" min="0" max="100" value={Math.round(volume*100)}
            onChange={e => setVolume(e.target.value/100)}
            className="range-vol" style={{ flex:1, '--vol':`${volume*100}%` }} />
          <Volume2 size={17} color="var(--color-on-surface-variant)" />
        </div>
      </div>
    </motion.div>
  );
}
