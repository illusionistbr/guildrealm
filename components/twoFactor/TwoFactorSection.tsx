'use client';
import { useEffect, useState } from 'react';
import { getFirebaseAuth } from '@/lib/admin/firebase/client';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { toast } from 'sonner';
import { getTwoFactorStatus, startTotpEnrollment, verifyTotpEnrollment, disableTotp, regenerateRecoveryCodes } from '@/lib/twoFactor/hooks';
import { Loader2, ShieldCheck, ShieldOff, Copy, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import QRCode from 'qrcode';

export function TwoFactorSection() {
  const [status, setStatus] = useState<{ enabled: boolean; hasRecoveryCodes?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [step, setStep] = useState<1|2|3>(1);
  const [enrollmentId, setEnrollmentId] = useState<string>('');
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [savedChecked, setSavedChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [showReauth, setShowReauth] = useState(false);
  const [action, setAction] = useState<'enroll'|'disable'|'regen'>('enroll');
  const [copied, setCopied] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [regenCode, setRegenCode] = useState('');

  const loadStatus = async () => {
    try { const s = await getTwoFactorStatus(); setStatus(s); } catch { setStatus({ enabled: false }); }
    setLoading(false);
  };
  useEffect(()=>{ loadStatus(); }, []);

  const handleReauth = async (cb: ()=>Promise<void>) => {
    const user = getFirebaseAuth().currentUser;
    if(!user || !user.email) { toast.error('Reautenticação necessária'); return; }
    if(!password) { toast.error('Digite sua senha'); return; }
    try{
      const cred = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, cred);
      await cb();
      setShowReauth(false); setPassword('');
    } catch{ toast.error('Senha incorreta ou sessão expirada'); }
  };

  const startEnroll = async () => {
    setEnrolling(true);
    try{
      const res = await startTotpEnrollment();
      setEnrollmentId(res.enrollmentId); setSecret(res.secret); setOtpauthUrl(res.otpauthUrl);
      const dataUrl = await QRCode.toDataURL(res.otpauthUrl, { width: 220, margin: 1 });
      setQrDataUrl(dataUrl);
      setStep(1); setEnrolling(false);
    } catch(e:any){ toast.error(e.message || 'Erro ao iniciar'); setEnrolling(false); }
  };

  const handleStartClick = () => {
    setAction('enroll');
    setShowReauth(true);
  };

  const confirmEnroll = async () => {
    if(!showReauth) {
      // actually need reauth before start, so after reauth we already started
    }
  };

  const onReauthEnroll = async () => await handleReauth(async ()=>{ await startEnroll(); });

  const verifyEnroll = async () => {
    if(!/^\d{6}$/.test(code)) return toast.error('Código deve ter 6 dígitos');
    setVerifying(true);
    try{
      const res = await verifyTotpEnrollment(enrollmentId, code);
      setRecoveryCodes(res.recoveryCodes);
      setStep(3);
      toast.success('2FA ativado!');
      setStatus({ enabled:true });
    } catch(e:any){ toast.error(e.message || 'Código inválido'); }
    setVerifying(false);
  };

  const handleDisable = async () => {
    if(!code || !/^\d{6}$/.test(code)) return toast.error('Digite código de 6 dígitos');
    setDisabling(true);
    try{
      // need reauth
      const user=getFirebaseAuth().currentUser;
      if(user && user.email && password){
        const cred=EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, cred);
      }
      await disableTotp(code);
      toast.success('2FA desativado');
      setStatus({ enabled:false });
      setCode(''); setPassword('');
    } catch(e:any){ toast.error(e.message||'Erro ao desativar'); }
    setDisabling(false);
  };

  const handleRegen = async () => {
    if(!/^\d{6}$/.test(regenCode)) return toast.error('Código 6 dígitos necessário');
    try{
      // need reauth handled inside? regenerateRecoveryCodes requires recent auth, we do reauth if password provided
      const user=getFirebaseAuth().currentUser;
      if(password && user?.email){
        const cred=EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, cred);
      }
      const res = await regenerateRecoveryCodes(regenCode);
      setRecoveryCodes(res.recoveryCodes);
      setStep(3);
      toast.success('Novos códigos gerados!');
    } catch(e:any){ toast.error(e.message||'Erro'); }
  };

  const copy = async (text:string, id:string)=>{
    await navigator.clipboard.writeText(text);
    setCopied(id); setTimeout(()=>setCopied(null),2000);
  };

  if(loading) return <div className="flex items-center gap-2 text-muted text-sm"><Loader2 size={16} className="animate-spin"/> Carregando...</div>;

  if(!status?.enabled){
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm"><ShieldOff size={16} className="text-muted"/> Status: <span className="font-bold text-muted">Desativada</span></div>
        <p className="text-xs text-muted">Proteja sua conta com app autenticador. Compatível com Google Authenticator, Microsoft Authenticator, Authy, 1Password.</p>
        <button onClick={handleStartClick} className="w-full h-10 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover">CONFIGURAR 2FA</button>

        {showReauth && action==='enroll' && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={()=>setShowReauth(false)}>
            <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-xl p-6 max-w-sm w-full" onClick={e=>e.stopPropagation()}>
              <h3 className="text-white font-bold mb-2">Confirme sua identidade</h3>
              <p className="text-xs text-muted mb-3">Para continuar, confirme sua senha.</p>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha" className="w-full h-10 px-3 bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white mb-3" />
              <div className="flex gap-2">
                <button onClick={()=>setShowReauth(false)} className="flex-1 h-10 rounded-lg border border-[rgba(38,51,86,0.5)] text-muted text-sm">Cancelar</button>
                <button onClick={onReauthEnroll} className="flex-1 h-10 rounded-lg bg-accent text-white text-sm">Continuar</button>
              </div>
            </div>
          </div>
        )}

        {enrollmentId && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-auto" onClick={()=>{}}>
            <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-xl p-6 max-w-md w-full" onClick={e=>e.stopPropagation()}>
              <p className="text-xs text-accent font-bold mb-2">ETAPA {step} DE 3</p>
              {step===1 && (
                <div className="space-y-3">
                  <p className="text-sm text-white font-medium">Abra seu app autenticador e escaneie:</p>
                  {qrDataUrl && <img src={qrDataUrl} alt="QR" className="mx-auto bg-white p-2 rounded-lg" />}
                  <button onClick={()=>setShowKey(!showKey)} className="text-xs text-accent flex items-center gap-1 mx-auto">{showKey ? <EyeOff size={12}/> : <Eye size={12}/>} {showKey ? 'Ocultar' : 'Exibir chave manual'}</button>
                  {showKey && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-300 mb-1">⚠️ Esta chave é extremamente sensível. Não compartilhe.</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs font-mono text-white break-all">{secret.match(/.{1,4}/g)?.join(' ')}</code>
                        <button onClick={()=>copy(secret, 'secret')} className="p-1.5 rounded border border-[rgba(38,51,86,0.5)] text-muted hover:text-white">{copied==='secret' ? <Check size={14} className="text-emerald-400"/> : <Copy size={14}/>}</button>
                      </div>
                    </div>
                  )}
                  <button onClick={()=>setStep(2)} className="w-full h-10 rounded-lg bg-accent text-white text-sm">Próximo</button>
                </div>
              )}
              {step===2 && (
                <div className="space-y-3">
                  <p className="text-sm text-white">Digite o código de 6 dígitos do app:</p>
                  <input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" placeholder="123456" className="w-full h-12 text-center text-xl tracking-widest bg-[#050912] border border-[rgba(38,51,86,0.5)] rounded-lg text-white" />
                  <button onClick={verifyEnroll} disabled={verifying} className="w-full h-10 rounded-lg bg-accent text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2">{verifying && <Loader2 size={14} className="animate-spin"/>} Confirmar</button>
                </div>
              )}
              {step===3 && (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-white">🔑 Códigos de recuperação</p>
                  <p className="text-xs text-muted">Guarde em local seguro. Cada código só pode ser usado uma vez.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {recoveryCodes.map(c=> <div key={c} className="p-2 rounded bg-[#050912] border border-[rgba(38,51,86,0.3)] text-xs font-mono text-white flex items-center justify-between">{c}<button onClick={()=>copy(c, c)} className="ml-1">{copied===c ? <Check size={12} className="text-emerald-400"/> : <Copy size={12}/>}</button></div>)}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={savedChecked} onChange={e=>setSavedChecked(e.target.checked)}/> Eu salvei meus códigos em local seguro.</label>
                  <button onClick={()=>{ setEnrollmentId(''); setStep(1); setCode(''); setSavedChecked(false); loadStatus(); }} disabled={!savedChecked} className="w-full h-10 rounded-lg bg-accent text-white text-sm disabled:opacity-40">Concluir</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // enabled view
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm"><ShieldCheck size={16} className="text-emerald-400"/> Status: <span className="font-bold text-emerald-400">Ativada</span> <span className="text-xs text-muted">• App autenticador (SHA256 / 30s)</span></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-2 p-3 rounded-lg bg-[#050912] border border-[rgba(38,51,86,0.3)]">
          <p className="text-xs font-bold text-white">Gerar novos códigos</p>
          <input value={regenCode} onChange={e=>setRegenCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="Código TOTP atual" className="w-full h-9 px-2 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded text-sm text-white" />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha (reauth)" className="w-full h-9 px-2 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded text-sm text-white" />
          <button onClick={handleRegen} className="w-full h-9 rounded-lg bg-accent/15 border border-accent/30 text-accent text-xs hover:bg-accent hover:text-white">Gerar Novos Códigos</button>
        </div>
        <div className="space-y-2 p-3 rounded-lg bg-[#050912] border border-red-500/20">
          <p className="text-xs font-bold text-red-400">Desativar 2FA</p>
          <input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="Código atual" className="w-full h-9 px-2 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded text-sm text-white" />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha" className="w-full h-9 px-2 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded text-sm text-white" />
          <button onClick={handleDisable} disabled={disabling} className="w-full h-9 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 disabled:opacity-50 flex items-center justify-center gap-1">{disabling && <Loader2 size={12} className="animate-spin"/>} Desativar 2FA</button>
        </div>
      </div>
      {recoveryCodes.length>0 && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs font-bold text-white mb-2">Novos códigos:</p>
          <div className="grid grid-cols-2 gap-2">{recoveryCodes.map(c=> <div key={c} className="text-xs font-mono text-white bg-[#050912] p-2 rounded flex justify-between">{c}<button onClick={()=>copy(c,c)}>{copied===c ? <Check size={12} className="text-emerald-400"/> : <Copy size={12}/>}</button></div>)}</div>
        </div>
      )}
    </div>
  );
}
