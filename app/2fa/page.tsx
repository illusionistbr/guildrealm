'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/admin/firebase/client';
import { getTwoFactorStatus, createTotpChallenge, verifyTotpLogin, verifyRecoveryCode } from '@/lib/twoFactor/hooks';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, KeyRound } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function TwoFactorPage(){
  const router=useRouter();
  const [uid,setUid]=useState<string|null>(null);
  const [challengeId,setChallengeId]=useState<string>('');
  const [code,setCode]=useState('');
  const [useRecovery,setUseRecovery]=useState(false);
  const [recoveryInput,setRecoveryInput]=useState('');
  const [loading,setLoading]=useState(true);
  const [verifying,setVerifying]=useState(false);

  useEffect(()=>{
    const unsub=onAuthStateChanged(getFirebaseAuth(), async (user)=>{
      if(!user){ router.replace('/login'); return; }
      setUid(user.uid);
      try{
        const status=await getTwoFactorStatus();
        if(!status.enabled){ router.replace('/app/dashboard'); return; }
        // check if already verified recently? For simplicity always require
        const stored=sessionStorage.getItem('totp_challenge');
        if(stored){ setChallengeId(stored); setLoading(false); return; }
        const ch=await createTotpChallenge();
        sessionStorage.setItem('totp_challenge', ch.challengeId);
        setChallengeId(ch.challengeId);
      }catch(e:any){ toast.error(e.message); }
      setLoading(false);
    });
    return unsub;
  },[router]);

  const handleVerify=async()=>{
    if(!challengeId) return;
    if(!useRecovery && !/^\d{6}$/.test(code)) return toast.error('Código 6 dígitos');
    if(useRecovery && !recoveryInput) return toast.error('Código de recuperação necessário');
    setVerifying(true);
    try{
      if(useRecovery) await verifyRecoveryCode(challengeId, recoveryInput);
      else await verifyTotpLogin(challengeId, code);
      sessionStorage.removeItem('totp_challenge');
      toast.success('Verificado! Acesso liberado.');
      router.replace('/app/dashboard');
    }catch(e:any){ toast.error(e.message || 'Código inválido'); }
    setVerifying(false);
  };

  if(loading) return <div className="min-h-screen bg-[#050912] flex items-center justify-center text-muted"><Loader2 className="animate-spin mr-2"/>Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#050912] flex items-center justify-center p-4">
      <Toaster richColors theme="dark"/>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="w-full max-w-md rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-3"><ShieldCheck className="text-accent"/></div>
          <h1 className="text-xl font-bold text-white">Verificação em Duas Etapas</h1>
          <p className="text-sm text-muted mt-1">Abra seu app autenticador e digite o código de 6 dígitos.</p>
        </div>
        {!useRecovery ? (
          <div className="space-y-4">
            <input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" placeholder="123456" className="w-full h-14 text-center text-2xl tracking-[0.5em] bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-white" />
            <button onClick={handleVerify} disabled={verifying} className="w-full h-11 rounded-lg bg-accent text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">{verifying && <Loader2 size={16} className="animate-spin"/>} Verificar</button>
            <button onClick={()=>setUseRecovery(true)} className="w-full text-xs text-accent hover:underline">Usar código de recuperação</button>
          </div>
        ) : (
          <div className="space-y-4">
            <input value={recoveryInput} onChange={e=>setRecoveryInput(e.target.value)} placeholder="ABCD-EFGH-JKLM" className="w-full h-11 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white font-mono" />
            <button onClick={handleVerify} disabled={verifying} className="w-full h-11 rounded-lg bg-accent text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">{verifying && <Loader2 size={16} className="animate-spin"/>} Continuar</button>
            <button onClick={()=>setUseRecovery(false)} className="w-full text-xs text-muted hover:text-white">Voltar ao TOTP</button>
          </div>
        )}
        <button onClick={async()=>{ const {signOut}=await import('firebase/auth'); await signOut(getFirebaseAuth()); sessionStorage.removeItem('totp_challenge'); router.replace('/login'); }} className="w-full mt-4 text-xs text-muted hover:text-white">Voltar ao login</button>
      </motion.div>
    </div>
  );
}
