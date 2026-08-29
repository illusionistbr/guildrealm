'use client';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from '@/lib/admin/firebase/client';

export async function getTwoFactorStatus(){
  const fn=httpsCallable(getFunctions(getFirebaseApp()),'getTwoFactorStatus');
  const res=await fn({});
  return res.data as any;
}
export async function startTotpEnrollment(){
  const fn=httpsCallable(getFunctions(getFirebaseApp()),'startTotpEnrollment');
  const res=await fn({});
  return res.data as any;
}
export async function verifyTotpEnrollment(enrollmentId:string, code:string){
  const fn=httpsCallable(getFunctions(getFirebaseApp()),'verifyTotpEnrollment');
  const res=await fn({ enrollmentId, code });
  return res.data as { recoveryCodes:string[] };
}
export async function createTotpChallenge(){
  const fn=httpsCallable(getFunctions(getFirebaseApp()),'createTotpChallenge');
  const res=await fn({});
  return res.data as any;
}
export async function verifyTotpLogin(challengeId:string, code:string){
  const fn=httpsCallable(getFunctions(getFirebaseApp()),'verifyTotpLogin');
  await fn({ challengeId, code });
}
export async function verifyRecoveryCode(challengeId:string, code:string){
  const fn=httpsCallable(getFunctions(getFirebaseApp()),'verifyRecoveryCode');
  await fn({ challengeId, code });
}
export async function disableTotp(code?:string, recoveryCode?:string){
  const fn=httpsCallable(getFunctions(getFirebaseApp()),'disableTotp');
  await fn({ code, recoveryCode });
}
export async function regenerateRecoveryCodes(code:string){
  const fn=httpsCallable(getFunctions(getFirebaseApp()),'regenerateRecoveryCodes');
  const res=await fn({ code });
  return res.data as { recoveryCodes:string[] };
}
