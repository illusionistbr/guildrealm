'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from 'firebase/storage';
import {
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseStorage,
} from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import { useUserPlan } from '@/lib/premium/use-user-plan';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ImagePlus,
  ShieldCheck,
  X,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export default function CreateCommunityPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [ownedCount, setOwnedCount] = useState<number | null>(null);
  const planState = useUserPlan(uid);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setUid(user.uid);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!uid) return;
    let disposed = false;
    getDocs(
      query(collection(getFirebaseDb(), COLLECTIONS.COMMUNITIES), where('ownerId', '==', uid)),
    )
      .then((snap) => {
        if (!disposed) setOwnedCount(snap.size);
      })
      .catch(() => {
        if (!disposed) setOwnedCount(null);
      });
    return () => {
      disposed = true;
    };
  }, [uid]);

  const limitHit = ownedCount !== null && ownedCount >= planState.plan.maxCommunities;
  const limitMessage = `Você já tem ${ownedCount}/${planState.plan.maxCommunities} comunidade(s). Cada usuário pode criar apenas ${planState.plan.maxCommunities === 1 ? '1 comunidade' : `${planState.plan.maxCommunities} comunidades`}. Exclua a atual para criar outra.`;

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLogoError('');
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setLogoError('Formato inválido. Use PNG, JPEG ou WebP.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('Imagem muito grande. Máximo 2MB.');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoError('');
    if (logoInput.current) logoInput.current.value = '';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setError('');
    if (limitHit) {
      setError(limitMessage);
      return;
    }
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Dê um nome para a comunidade.');
      return;
    }
    const cleanTag = tag.trim().toUpperCase().slice(0, 6);
    setCreating(true);
    try {
      // Revalida o limite no momento da criação
      const snap = await getDocs(
        query(collection(getFirebaseDb(), COLLECTIONS.COMMUNITIES), where('ownerId', '==', uid)),
      );
      setOwnedCount(snap.size);
      if (snap.size >= planState.plan.maxCommunities) {
        setError(limitMessage);
        setCreating(false);
        return;
      }

      const db = getFirebaseDb();
      const ref = doc(collection(db, COLLECTIONS.COMMUNITIES));

      let logoUrl: string | null = null;
      if (logoFile) {
        const ext = logoFile.name.split('.').pop() ?? 'png';
        const fileRef = storageRef(getFirebaseStorage(), `community-logos/${ref.id}/logo.${ext}`);
        await uploadBytes(fileRef, logoFile, { contentType: logoFile.type });
        logoUrl = await getDownloadURL(fileRef);
      }

      await setDoc(ref, {
        ownerId: uid,
        ownerName: getFirebaseAuth().currentUser?.displayName?.trim() || null,
        name: cleanName.slice(0, 60),
        tag: cleanTag || null,
        description: description.trim().slice(0, 500) || null,
        logoUrl,
        bannerUrl: null,
        guildIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.replace(`/app/communities/${ref.id}`);
    } catch {
      setError('Não foi possível criar a comunidade. Tente novamente.');
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-2xl mx-auto"
    >
      <motion.div variants={fadeUp}>
        <Link
          href="/app/communities"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors"
        >
          <ChevronLeft size={18} /> Voltar
        </Link>
      </motion.div>

      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-heading font-bold text-white mt-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
            <ShieldCheck size={20} className="text-accent" />
          </span>
          Criar Comunidade
        </h1>
        <p className="text-muted mt-1">
          A comunidade agrega as guilds do seu clã em vários jogos. Depois vincule suas guilds a ela.
        </p>
      </motion.div>

      {limitHit ? (
        <motion.div variants={fadeUp} className="mt-6 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          <AlertCircle size={17} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Limite de comunidades atingido ({ownedCount}/{planState.plan.maxCommunities})</p>
            <p className="text-xs mt-1 text-amber-200/80">{limitMessage}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link
                href="/app/dashboard"
                className="inline-flex items-center px-3 h-9 rounded-lg border border-amber-500/30 text-amber-200 text-xs hover:bg-amber-500/10 transition-colors"
              >
                Ver minha comunidade
              </Link>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          variants={fadeUp}
          className="mt-6 rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">Nome da comunidade</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Shadowborn"
                maxLength={60}
                className="w-full h-11 px-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">Tag (opcional, até 6 letras)</label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="Ex.: SHDW"
                maxLength={6}
                className="w-full h-11 px-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors uppercase"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">Descrição (opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Conte sobre o clã, os jogos e o estilo de jogo..."
                maxLength={500}
                rows={4}
                className="w-full px-3 py-2.5 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">Logo (opcional)</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border border-[rgba(38,51,86,0.5)] bg-[#0a1122] flex items-center justify-center overflow-hidden shrink-0">
                  {logoPreview ? (
                    <img src={logoPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus size={22} className="text-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    ref={logoInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleLogoSelect}
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => logoInput.current?.click()}
                      className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-[rgba(38,51,86,0.5)] bg-[#0a1122] text-white text-xs hover:border-accent/40 transition-colors"
                    >
                      <ImagePlus size={14} /> {logoFile ? 'Trocar' : 'Enviar logo'}
                    </button>
                    {logoFile && (
                      <button
                        type="button"
                        onClick={handleLogoRemove}
                        className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors"
                      >
                        <X size={14} /> Remover
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1.5">PNG, JPEG ou WebP até 2MB.</p>
                  {logoError && <p className="text-xs text-red-400 mt-1.5">{logoError}</p>}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating || !uid}
              className="w-full h-11 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <CheckCircle2 size={17} /> Criar comunidade
                </>
              )}
            </button>
          </form>
        </motion.div>
      )}
    </motion.div>
  );
}
