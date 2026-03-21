import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore.js';

function getStrength(pw) {
  let s = 0;
  if (pw.length >= 8)            s++;
  if (/[A-Z]/.test(pw))         s++;
  if (/[0-9]/.test(pw))         s++;
  if (/[^A-Za-z0-9]/.test(pw))  s++;
  return s;
}

const STRENGTH_COLOR = ['bg-error', 'bg-amber-500', 'bg-yellow-400', 'bg-secondary'];

export default function RegisterPage() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();
  const strength = getStrength(password);

  async function handleRegister(e) {
    e.preventDefault();
    if (!name || !email || !password) { toast.error('Please fill in all fields'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await register(email, password, name);
      toast.success('Account created! Check your email to verify.');
      navigate('/');
    } catch (err) {
      toast.error(
        err.message.includes('email-already-in-use') ? 'This email is already registered'
        : err.message.includes('weak-password') ? 'Password is too weak'
        : 'Registration failed'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md flex flex-col items-center"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-surface-container mb-3">
            <span className="material-symbols-outlined text-primary"
              style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>graphic_eq</span>
          </div>
          <h1 className="font-headline font-black text-3xl tracking-tighter">Create account</h1>
          <p className="text-on-surface-variant text-sm mt-1">Start your musical journey.</p>
        </div>

        <div className="w-full bg-surface-container p-8 rounded-lg shadow-2xl">
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Display Name</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2
                                 text-on-surface-variant group-focus-within:text-primary transition-colors text-[20px]">person</span>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-surface-container-highest rounded py-3 pl-12 pr-4
                             text-on-surface placeholder:text-outline outline-none text-sm" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Email</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2
                                 text-on-surface-variant group-focus-within:text-primary transition-colors text-[20px]">mail</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-surface-container-highest rounded py-3 pl-12 pr-4
                             text-on-surface placeholder:text-outline outline-none text-sm" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Password</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2
                                 text-on-surface-variant group-focus-within:text-primary transition-colors text-[20px]">lock</span>
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"
                  className="w-full bg-surface-container-highest rounded py-3 pl-12 pr-12
                             text-on-surface placeholder:text-outline outline-none text-sm" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 icon-btn">
                  <span className="material-symbols-outlined text-[20px]">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>

              {/* Strength bars */}
              {password && (
                <div className="flex gap-1 mt-1.5">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
                      ${i <= strength ? STRENGTH_COLOR[strength - 1] : 'bg-surface-container-highest'}`} />
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-primary-container text-on-primary-container
                         font-headline font-extrabold py-3.5 rounded transition-all
                         active:scale-[0.98] text-sm tracking-wide disabled:opacity-60 mt-2">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-on-surface-variant text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline underline-offset-4 ml-1">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
