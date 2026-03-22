import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, Music2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore.js';

function strength(pw) {
  let s=0;
  if(pw.length>=8) s++;
  if(/[A-Z]/.test(pw)) s++;
  if(/[0-9]/.test(pw)) s++;
  if(/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const SC=['#ff6e84','#f59e0b','#facc15','#4af8e3'];

export default function RegisterPage() {
  const [name,setName]         = useState('');
  const [email,setEmail]       = useState('');
  const [password,setPassword] = useState('');
  const [showPw,setShowPw]     = useState(false);
  const [loading,setLoading]   = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();
  const s = strength(password);

  async function handleSubmit(e) {
    e.preventDefault();
    if(!name||!email||!password){ toast.error('Please fill in all fields'); return; }
    if(password.length<8){ toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await register({ displayName:name, email, password });
      toast.success('Account created!');
      navigate('/');
    } catch(err) {
      toast.error(err.message||'Registration failed');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px' }}>
      <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.5, ease:[0.16,1,0.3,1] }}
        style={{ width:'100%', maxWidth:400, display:'flex', flexDirection:'column', alignItems:'center' }}>

        <div style={{ marginBottom:28, textAlign:'center' }}>
          <div style={{ width:56, height:56, background:'var(--color-surface-container)',
            borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
            <Music2 size={24} color="var(--color-primary)" />
          </div>
          <h1 style={{ fontFamily:'var(--font-headline)', fontWeight:900, fontSize:26, letterSpacing:'-0.03em' }}>
            Create account
          </h1>
          <p style={{ color:'var(--color-on-surface-variant)', fontSize:13, marginTop:4 }}>
            Start your musical journey.
          </p>
        </div>

        <div style={{ width:'100%', background:'var(--color-surface-container)', borderRadius:16, padding:28 }}>
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Name */}
            <div>
              <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em',
                color:'var(--color-on-surface-variant)', display:'block', marginBottom:6 }}>Display Name</label>
              <div style={{ position:'relative' }}>
                <User size={16} color="var(--color-on-surface-variant)" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                <input type="text" value={name} onChange={e=>setName(e.target.value)}
                  placeholder="Your name" className="input-field" style={{ paddingLeft:38 }} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em',
                color:'var(--color-on-surface-variant)', display:'block', marginBottom:6 }}>Email</label>
              <div style={{ position:'relative' }}>
                <Mail size={16} color="var(--color-on-surface-variant)" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="name@example.com" className="input-field" style={{ paddingLeft:38 }} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em',
                color:'var(--color-on-surface-variant)', display:'block', marginBottom:6 }}>Password</label>
              <div style={{ position:'relative' }}>
                <Lock size={16} color="var(--color-on-surface-variant)" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="Min. 8 characters" className="input-field" style={{ paddingLeft:38, paddingRight:40 }} />
                <button type="button" onClick={()=>setShowPw(!showPw)}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'var(--color-on-surface-variant)', padding:2, display:'flex' }}>
                  {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
              {password && (
                <div style={{ display:'flex', gap:4, marginTop:8 }}>
                  {[1,2,3,4].map(i=>(
                    <div key={i} style={{ height:3, flex:1, borderRadius:99,
                      background: i<=s ? SC[s-1] : 'var(--color-surface-container-highest)',
                      transition:'background 0.2s' }} />
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary"
              style={{ padding:'13px', fontSize:14, marginTop:4, width:'100%' }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ marginTop:24, color:'var(--color-on-surface-variant)', fontSize:13 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'var(--color-primary)', fontWeight:700, textDecoration:'none' }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
