import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';
import usePlayerStore from '../store/playerStore.js';

export default function ProfilePage() {
  const { profile, logout, updateProfile } = useAuthStore();
  const { clearQueue } = usePlayerStore();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [saving, setSaving] = useState(false);
  const [audioQuality, setAudioQuality] = useState('high');
  const [crossfade, setCrossfade]       = useState(false);
  const [normalizeVol, setNormalizeVol] = useState(true);

  const name    = profile?.display_name || 'User';
  const initial = name[0]?.toUpperCase();
  const email   = profile?.email || '';

  async function handleSave() {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ displayName });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    clearQueue();
    await logout();
    navigate('/login');
    toast('Signed out');
  }

  const stats = [
    { label: 'Tracks played', value: profile?.plays_count  || 0 },
    { label: 'Playlists',     value: profile?.playlist_count || 0 },
    { label: 'Liked songs',   value: profile?.liked_count   || 0 },
  ];

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">

      {/* ── Profile Header ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-6 mb-10"
      >
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full
                        bg-gradient-to-br from-primary/50 to-purple-900
                        flex items-center justify-center text-3xl font-black text-primary
                        shadow-xl flex-shrink-0">
          {initial}
        </div>
        <div>
          <h1 className="font-headline font-black text-3xl tracking-tight">{name}</h1>
          <p className="text-on-surface-variant text-sm mt-0.5">{email}</p>
          {/* Stats row */}
          <div className="flex items-center gap-5 mt-3">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <p className="font-bold text-on-surface">{s.value}</p>
                <p className="text-[10px] text-on-surface-variant">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Account Settings ────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-surface-container rounded-lg p-6 mb-4"
      >
        <h3 className="font-headline font-bold text-lg mb-5">Account Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full mt-1.5 bg-surface-container-highest rounded py-2.5 px-3
                         text-sm text-on-surface border-none outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full mt-1.5 bg-surface-container-highest/50 rounded py-2.5 px-3
                         text-sm text-on-surface-variant border-none outline-none cursor-not-allowed"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || displayName === profile?.display_name}
            className="w-full bg-primary text-on-primary-container font-bold py-2.5 rounded
                       text-sm hover:bg-primary-container transition-all active:scale-95
                       disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>

      {/* ── Playback Preferences ────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="bg-surface-container rounded-lg p-6 mb-4"
      >
        <h3 className="font-headline font-bold text-lg mb-5">Playback</h3>
        <div className="space-y-1">
          {/* Audio Quality */}
          <div className="flex items-center justify-between py-3 border-b border-outline-variant/10">
            <div>
              <p className="font-medium text-sm">Audio Quality</p>
              <p className="text-xs text-on-surface-variant">Stream quality setting</p>
            </div>
            <select
              value={audioQuality}
              onChange={e => setAudioQuality(e.target.value)}
              className="bg-surface-container-highest text-sm rounded py-1.5 px-3
                         border-none outline-none text-on-surface"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Crossfade */}
          <div className="flex items-center justify-between py-3 border-b border-outline-variant/10">
            <div>
              <p className="font-medium text-sm">Crossfade</p>
              <p className="text-xs text-on-surface-variant">Smooth transitions between tracks</p>
            </div>
            <button
              onClick={() => setCrossfade(!crossfade)}
              className={`w-11 h-6 rounded-full relative transition-all duration-200
                ${crossfade ? 'bg-primary' : 'bg-surface-container-highest'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full
                               shadow transition-all duration-200
                               ${crossfade ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {/* Normalize Volume */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-sm">Normalize Volume</p>
              <p className="text-xs text-on-surface-variant">Consistent loudness across tracks</p>
            </div>
            <button
              onClick={() => setNormalizeVol(!normalizeVol)}
              className={`w-11 h-6 rounded-full relative transition-all duration-200
                ${normalizeVol ? 'bg-primary' : 'bg-surface-container-highest'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full
                               shadow transition-all duration-200
                               ${normalizeVol ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Danger Zone ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="flex items-center justify-between py-2"
      >
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-error hover:text-error/80
                     transition-colors text-sm font-semibold"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Sign Out
        </button>

        <p className="text-xs text-on-surface-variant/40">
          Obsidian Audio v1.0
        </p>
      </motion.div>
    </div>
  );
}
