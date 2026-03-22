import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Music2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore.js';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const { login } = useAuthStore();
  const navigate  = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px' }}>
      <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.5, ease:[0.16,1,0.3,1] }}
        style={{ width:'100%', maxWidth:400, display:'flex', flexDirection:'column', alignItems:'center' }}>

        {/* Logo */}
        <motion.div initial={{ scale:0.8, opacity:0 }} animate={{ scale:1, opacity:1 }}
          transition={{ delay:0.1, duration:0.4 }}
          style={{ marginBottom:36, textAlign:'center' }}>
          <div style={{ width:60, height:60, background:'var(--color-surface-container)',
            borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 14px', boxShadow:'0 0 0 1px rgba(199,153,255,0.2)' }}>
            <Music2 size={28} color="var(--color-primary)" />
          </div>
          <h1 style={{ fontFamily:'var(--font-headline)', fontWeight:900, fontSize:30, letterSpacing:'-0.03em' }}>
            Obsidian
          </h1>
          <p style={{ color:'var(--color-on-surface-variant)', fontSize:12, letterSpacing:'0.18em',
            textTransform:'uppercase', marginTop:4 }}>Premium Audio</p>
        </motion.div>

        {/* Card */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
          style={{ width:'100%', background:'var(--color-surface-container)',
            borderRadius:16, padding:28, boxShadow:'0 24px 80px rgba(0,0,0,0.4)' }}>
          <h2 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:22, marginBottom:4 }}>
            Welcome back
          </h2>
          <p style={{ color:'var(--color-on-surface-variant)', fontSize:13, marginBottom:24 }}>
            Sign in to continue to your library.
          </p>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Email */}
            <div>
              <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.12em', color:'var(--color-on-surface-variant)', display:'block', marginBottom:6 }}>
                Email
              </label>
              <div style={{ position:'relative' }}>
                <Mail size={16} color="var(--color-on-surface-variant)" style={{
                  position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="name@example.com" className="input-field"
                  style={{ paddingLeft:38 }} autoComplete="email" />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase',
                  letterSpacing:'0.12em', color:'var(--color-on-surface-variant)' }}>Password</label>
                <Link to="/forgot" style={{ fontSize:12, fontWeight:600, color:'var(--color-primary)',
                  textDecoration:'none' }}>Forgot?</Link>
              </div>
              <div style={{ position:'relative' }}>
                <Lock size={16} color="var(--color-on-surface-variant)" style={{
                  position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="••••••••" className="input-field"
                  style={{ paddingLeft:38, paddingRight:40 }} autoComplete="current-password" />
                <button type="button" onClick={()=>setShowPw(!showPw)}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'var(--color-on-surface-variant)',
                    padding:2, display:'flex' }}>
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary"
              style={{ padding:'13px', fontSize:14, marginTop:4, width:'100%' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </motion.div>

        <p style={{ marginTop:24, color:'var(--color-on-surface-variant)', fontSize:13 }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color:'var(--color-primary)', fontWeight:700, textDecoration:'none' }}>
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
