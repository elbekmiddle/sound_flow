import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore.js';
import useT from '../i18n/useT.js';

export default function ForgotPasswordPage() {
  const [email,setEmail]   = useState('');
  const [sent,setSent]     = useState(false);
  const [loading,setLoad]  = useState(false);
  const { forgotPassword } = useAuthStore();
  const t = useT();

  async function handleSubmit(e) {
    e.preventDefault();
    if(!email)return;
    setLoad(true);
    try { await forgotPassword(email); setSent(true); }
    catch(err){ toast.error(err.message||'Failed'); }
    finally{setLoad(false);}
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 16px'}}>
      <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}}
        style={{width:'100%',maxWidth:360,display:'flex',flexDirection:'column',alignItems:'center'}}>
        <div style={{marginBottom:24,textAlign:'center'}}>
          <h1 style={{fontFamily:'var(--font-headline)',fontWeight:900,fontSize:22,
            letterSpacing:'-0.03em',color:'var(--color-on-surface)'}}>{t('resetPassword')}</h1>
        </div>
        <div style={{width:'100%',background:'var(--color-surface-container)',borderRadius:16,padding:24,boxShadow:'var(--shadow-lg)'}}>
          {sent ? (
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} style={{textAlign:'center',padding:'12px 0'}}>
              <CheckCircle size={44} color="var(--color-secondary)" style={{margin:'0 auto 14px'}}/>
              <p style={{fontWeight:700,fontSize:15,marginBottom:6,color:'var(--color-on-surface)'}}>Email sent!</p>
              <p style={{color:'var(--color-on-surface-variant)',fontSize:13}}>Check <strong>{email}</strong></p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={{fontSize:9,fontWeight:700,textTransform:'uppercase',
                  letterSpacing:'0.12em',color:'var(--color-on-surface-variant)',display:'block',marginBottom:5}}>
                  {t('email')}
                </label>
                <div style={{position:'relative'}}>
                  <Mail size={15} color="var(--color-on-surface-variant)"
                    style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}/>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                    placeholder="name@example.com" className="input-field" style={{paddingLeft:34}}/>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={{padding:'12px',fontSize:13,width:'100%'}}>
                {loading?'...':t('sendResetLink')}
              </button>
            </form>
          )}
        </div>
        <Link to="/login" style={{marginTop:20,display:'flex',alignItems:'center',gap:7,
          color:'var(--color-on-surface-variant)',fontSize:13,textDecoration:'none'}}>
          <ArrowLeft size={15}/> {t('backToLogin')}
        </Link>
      </motion.div>
    </div>
  );
}
