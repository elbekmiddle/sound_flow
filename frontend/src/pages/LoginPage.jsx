import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Music2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore.js';
import useT from '../i18n/useT.js';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const { login } = useAuthStore();
  const navigate  = useNavigate();
  const t         = useT();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email||!password){ toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try { await login({ email, password }); navigate('/'); }
    catch (err) { toast.error(err.message||'Invalid email or password'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', padding:'24px 16px' }}>
      <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}}
        transition={{duration:0.45,ease:[0.16,1,0.3,1]}}
        style={{ width:'100%', maxWidth:380, display:'flex', flexDirection:'column', alignItems:'center' }}>

        <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}}
          transition={{delay:0.1}} style={{ marginBottom:32, textAlign:'center' }}>
          <div style={{ width:56, height:56, background:'var(--color-surface-container)',
            borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 12px', boxShadow:'0 0 0 1px rgba(199,153,255,0.2)' }}>
            <Music2 size={26} color="var(--color-primary)"/>
          </div>
          <h1 style={{ fontFamily:'var(--font-headline)', fontWeight:900, fontSize:22,
            letterSpacing:'-0.03em', color:'var(--color-on-surface)' }}>Sound Flow</h1>
        </motion.div>

        <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:0.14}}
          style={{ width:'100%', background:'var(--color-surface-container)',
            borderRadius:16, padding:24, boxShadow:'var(--shadow-lg)' }}>
          <h2 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:20,
            marginBottom:4, color:'var(--color-on-surface)' }}>{t('welcomeBack')}</h2>
          <p style={{ color:'var(--color-on-surface-variant)', fontSize:13, marginBottom:20 }}>
            {t('signInSubtitle')}
          </p>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ fontSize:9, fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.12em', color:'var(--color-on-surface-variant)', display:'block', marginBottom:5 }}>
                {t('email')}
              </label>
              <div style={{position:'relative'}}>
                <Mail size={15} color="var(--color-on-surface-variant)" style={{
                  position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}/>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="name@example.com" className="input-field"
                  style={{paddingLeft:34}} autoComplete="email"/>
              </div>
            </div>
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <label style={{ fontSize:9, fontWeight:700, textTransform:'uppercase',
                  letterSpacing:'0.12em', color:'var(--color-on-surface-variant)' }}>{t('password')}</label>
                <Link to="/forgot" style={{ fontSize:11, fontWeight:600, color:'var(--color-primary)',
                  textDecoration:'none' }}>{t('forgotPassword')}</Link>
              </div>
              <div style={{position:'relative'}}>
                <Lock size={15} color="var(--color-on-surface-variant)" style={{
                  position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}/>
                <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="••••••••" className="input-field" style={{paddingLeft:34,paddingRight:36}}
                  autoComplete="current-password"/>
                <button type="button" onClick={()=>setShowPw(!showPw)}
                  style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                    background:'none',border:'none',cursor:'pointer',color:'var(--color-on-surface-variant)',padding:2,display:'flex'}}>
                  {showPw?<EyeOff size={15}/>:<Eye size={15}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary"
              style={{padding:'12px',fontSize:13,marginTop:2,width:'100%'}}>
              {loading?'...':t('signInBtn')}
            </button>
          </form>
        </motion.div>

        <p style={{ marginTop:20, color:'var(--color-on-surface-variant)', fontSize:13 }}>
          {t('dontHaveAccount')}{' '}
          <Link to="/register" style={{color:'var(--color-primary)',fontWeight:700,textDecoration:'none'}}>
            {t('signUp')}
          </Link>
        </p>
        <p style={{marginTop:20,fontSize:10,color:'var(--color-on-surface-variant)',opacity:0.4}}>
          {t('createdBy')}
        </p>
      </motion.div>
    </div>
  );
}
