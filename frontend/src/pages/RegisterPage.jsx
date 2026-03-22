import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, Music2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore.js';
import useT from '../i18n/useT.js';

const SC=['#ff6e84','#f59e0b','#facc15','#4af8e3'];
const str = pw => [pw.length>=8,/[A-Z]/.test(pw),/[0-9]/.test(pw),/[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;

export default function RegisterPage() {
  const [name,setName]       = useState('');
  const [email,setEmail]     = useState('');
  const [pw,setPw]           = useState('');
  const [showPw,setShowPw]   = useState(false);
  const [loading,setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();
  const t = useT();
  const s = str(pw);

  async function handleSubmit(e) {
    e.preventDefault();
    if(!name||!email||!pw){toast.error('Please fill in all fields');return;}
    if(pw.length<8){toast.error('Password must be at least 8 characters');return;}
    setLoading(true);
    try { await register({displayName:name,email,password:pw}); toast.success('Account created!'); navigate('/'); }
    catch(err){ toast.error(err.message||'Registration failed'); }
    finally{setLoading(false);}
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 16px'}}>
      <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}}
        transition={{duration:0.45,ease:[0.16,1,0.3,1]}}
        style={{width:'100%',maxWidth:380,display:'flex',flexDirection:'column',alignItems:'center'}}>
        <div style={{marginBottom:24,textAlign:'center'}}>
          <div style={{width:50,height:50,background:'var(--color-surface-container)',
            borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}>
            <Music2 size={22} color="var(--color-primary)"/>
          </div>
          <h1 style={{fontFamily:'var(--font-headline)',fontWeight:900,fontSize:20,
            letterSpacing:'-0.03em',color:'var(--color-on-surface)'}}>Sound Flow</h1>
          <p style={{color:'var(--color-on-surface-variant)',fontSize:13,marginTop:4}}>{t('startJourney')}</p>
        </div>
        <div style={{width:'100%',background:'var(--color-surface-container)',borderRadius:16,padding:24,boxShadow:'var(--shadow-lg)'}}>
          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              {label:t('displayName'),type:'text',  val:name,  set:setName,  Icon:User, placeholder:'Your name'},
              {label:t('email'),      type:'email', val:email, set:setEmail, Icon:Mail, placeholder:'name@example.com'},
            ].map(({label,type,val,set,Icon,placeholder})=>(
              <div key={label}>
                <label style={{fontSize:9,fontWeight:700,textTransform:'uppercase',
                  letterSpacing:'0.12em',color:'var(--color-on-surface-variant)',display:'block',marginBottom:5}}>
                  {label}
                </label>
                <div style={{position:'relative'}}>
                  <Icon size={15} color="var(--color-on-surface-variant)"
                    style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}/>
                  <input type={type} value={val} onChange={e=>set(e.target.value)}
                    placeholder={placeholder} className="input-field" style={{paddingLeft:34}}/>
                </div>
              </div>
            ))}
            <div>
              <label style={{fontSize:9,fontWeight:700,textTransform:'uppercase',
                letterSpacing:'0.12em',color:'var(--color-on-surface-variant)',display:'block',marginBottom:5}}>
                {t('password')}
              </label>
              <div style={{position:'relative'}}>
                <Lock size={15} color="var(--color-on-surface-variant)"
                  style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}/>
                <input type={showPw?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)}
                  placeholder="Min. 8 characters" className="input-field" style={{paddingLeft:34,paddingRight:36}}/>
                <button type="button" onClick={()=>setShowPw(!showPw)}
                  style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                    background:'none',border:'none',cursor:'pointer',color:'var(--color-on-surface-variant)',padding:2,display:'flex'}}>
                  {showPw?<EyeOff size={15}/>:<Eye size={15}/>}
                </button>
              </div>
              {pw && (
                <div style={{display:'flex',gap:3,marginTop:6}}>
                  {[1,2,3,4].map(i=>(
                    <div key={i} style={{height:2,flex:1,borderRadius:99,
                      background:i<=s?SC[s-1]:'var(--color-surface-container-highest)',transition:'background 0.2s'}}/>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn-primary"
              style={{padding:'12px',fontSize:13,marginTop:4,width:'100%'}}>
              {loading?'...':t('createBtn')}
            </button>
          </form>
        </div>
        <p style={{marginTop:20,color:'var(--color-on-surface-variant)',fontSize:13}}>
          {t('alreadyHave')}{' '}
          <Link to="/login" style={{color:'var(--color-primary)',fontWeight:700,textDecoration:'none'}}>{t('signIn')}</Link>
        </p>
      </motion.div>
    </div>
  );
}
