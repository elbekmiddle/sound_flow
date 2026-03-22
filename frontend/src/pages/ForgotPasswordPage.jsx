import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore.js';

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuthStore();

  async function handleSubmit(e) {
    e.preventDefault();
    if(!email) return;
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch(err) {
      toast.error(err.message || 'Failed to send reset email');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px' }}>
      <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.5, ease:[0.16,1,0.3,1] }}
        style={{ width:'100%', maxWidth:400, display:'flex', flexDirection:'column', alignItems:'center' }}>

        <div style={{ marginBottom:28, textAlign:'center' }}>
          <h1 style={{ fontFamily:'var(--font-headline)', fontWeight:900, fontSize:26, letterSpacing:'-0.03em' }}>
            Reset password
          </h1>
          <p style={{ color:'var(--color-on-surface-variant)', fontSize:13, marginTop:6 }}>
            We'll send a reset link to your email.
          </p>
        </div>

        <div style={{ width:'100%', background:'var(--color-surface-container)', borderRadius:16, padding:28 }}>
          {sent ? (
            <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
              style={{ textAlign:'center', padding:'16px 0' }}>
              <CheckCircle size={48} color="var(--color-secondary)" style={{ margin:'0 auto 16px' }} />
              <p style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>Email sent!</p>
              <p style={{ color:'var(--color-on-surface-variant)', fontSize:13 }}>
                Check <strong>{email}</strong> for the reset link.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em',
                  color:'var(--color-on-surface-variant)', display:'block', marginBottom:6 }}>Email</label>
                <div style={{ position:'relative' }}>
                  <Mail size={16} color="var(--color-on-surface-variant)" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                    placeholder="name@example.com" className="input-field" style={{ paddingLeft:38 }} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary"
                style={{ padding:'13px', fontSize:14, width:'100%' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <Link to="/login" style={{ marginTop:24, display:'flex', alignItems:'center', gap:8,
          color:'var(--color-on-surface-variant)', fontSize:13, textDecoration:'none', transition:'color 0.15s' }}
          onMouseEnter={e=> { e.currentTarget.style.color='var(--color-on-surface)'; }}
          onMouseLeave={e=> { e.currentTarget.style.color='var(--color-on-surface-variant)'; }}>
          <ArrowLeft size={16}/> Back to login
        </Link>
      </motion.div>
    </div>
  );
}
