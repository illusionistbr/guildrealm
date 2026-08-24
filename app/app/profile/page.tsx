'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { onAuthStateChanged, updateProfile, type User as FirebaseUser } from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseStorage,
} from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';
import {
  DEFAULT_VISIBILITY,
  type ProfileVisibility,
} from '@/lib/app/use-current-user-profile';
import { cn } from '@/lib/admin/utils/cn';
import { ProfileMural } from '@/components/app/profile-mural';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  Eye,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Lock,
  MessageCircle,
  Save,
  Trash2,
  User,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const COVER_MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

type SocialPlatform = {
  id: string;
  label: string;
  placeholder: string;
};

const socialPlatforms: SocialPlatform[] = [
  { id: 'discord', label: 'Discord', placeholder: 'usuario#0000' },
  { id: 'instagram', label: 'Instagram', placeholder: '@usuario' },
  { id: 'twitter', label: 'X / Twitter', placeholder: '@usuario' },
  { id: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { id: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
  { id: 'twitch', label: 'Twitch', placeholder: 'https://twitch.tv/...' },
  { id: 'steam', label: 'Steam', placeholder: 'https://steamcommunity.com/...' },
  { id: 'website', label: 'Website', placeholder: 'https://...' },
];

function SocialIcon({ platform, size = 14 }: { platform: string; size?: number }) {
  const s = size;
  const icons: Record<string, React.ReactNode> = {
    discord: <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>,
    instagram: <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
    twitter: <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    facebook: <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    youtube: <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
    twitch: <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>,
    steam: <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 12.001-5.373 12.001-12S18.606 0 11.979 0z"/></svg>,
  };
  return icons[platform] || null;
}

type UserDocData = {
  displayName?: string;
  nickname?: string;
  nicknameChanged?: boolean;
  bio?: string;
  socialLinks?: Record<string, string>;
  visibility?: Partial<ProfileVisibility>;
  photoURL?: string | null;
  coverUrl?: string | null;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);
}

function sanitizeSocialLinks(
  links: Record<string, string> | undefined,
): Record<string, string> {
  const validIds = new Set(socialPlatforms.map((p) => p.id));
  const out: Record<string, string> = {};
  Object.entries(links ?? {}).forEach(([key, value]) => {
    if (validIds.has(key) && typeof value === 'string' && value.trim()) {
      out[key] = value.trim().slice(0, 200);
    }
  });
  return out;
}

export default function ProfilePage() {
  const router = useRouter();

  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Campos do formulário
  const [displayName, setDisplayName] = useState('');
  const [nickname, setNickname] = useState('');
  const [originalNickname, setOriginalNickname] = useState('');
  const [nicknameChanged, setNicknameChanged] = useState(false);
  const [bio, setBio] = useState('');
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [visibility, setVisibility] =
    useState<ProfileVisibility>(DEFAULT_VISIBILITY);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // Alterações de imagem pendentes (aplicadas ao salvar)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Estado de salvamento
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState('');

  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const savedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    const unsub = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      if (disposed) return;
      if (!user) {
        router.replace('/login');
        return;
      }
      setAuthUser(user);

      try {
        const snap = await getDoc(
          doc(getFirebaseDb(), COLLECTIONS.USERS, user.uid),
        );
        if (disposed) return;
        const data: UserDocData = snap.exists()
          ? (snap.data() as UserDocData)
          : {};

        const name =
          data.displayName?.trim() ||
          user.displayName?.trim() ||
          user.email?.split('@')[0] ||
          '';
        const currentNick = data.nickname?.trim() || slugify(name);
        setDisplayName(name);
        setNickname(currentNick);
        setOriginalNickname(currentNick);
        setNicknameChanged(data.nicknameChanged === true);
        setBio(data.bio ?? '');
        setSocialLinks(sanitizeSocialLinks(data.socialLinks));
        setVisibility({ ...DEFAULT_VISIBILITY, ...(data.visibility ?? {}) });
        setAvatarUrl(data.photoURL ?? null);
        setCoverUrl(data.coverUrl ?? null);
        setLoadError(false);
      } catch {
        if (!disposed) setLoadError(true);
      } finally {
        if (!disposed) setLoading(false);
      }
    });

    return () => {
      disposed = true;
      unsub();
    };
  }, [router, reloadKey]);

  const trackObjectUrl = (url: string) => {
    objectUrlsRef.current.push(url);
    return url;
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'avatar' | 'cover',
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setSaveError('Formato não aceito. Use JPEG, PNG ou GIF.');
      return;
    }

    const maxBytes = type === 'avatar' ? AVATAR_MAX_BYTES : COVER_MAX_BYTES;
    if (file.size > maxBytes) {
      setSaveError(
        `Imagem muito grande (máx. ${type === 'avatar' ? '2' : '4'} MB).`,
      );
      return;
    }

    setSaveError('');
    const preview = trackObjectUrl(URL.createObjectURL(file));
    if (type === 'avatar') {
      setPendingAvatarFile(file);
      setAvatarPreview(preview);
    } else {
      setPendingCoverFile(file);
      setCoverPreview(preview);
    }
  };

  const handleRemoveImage = (type: 'avatar' | 'cover') => {
    if (type === 'avatar') {
      setPendingAvatarFile(null);
      setAvatarPreview(null);
      setAvatarUrl(null);
    } else {
      setPendingCoverFile(null);
      setCoverPreview(null);
      setCoverUrl(null);
    }
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const fileRef = storageRef(getFirebaseStorage(), path);
    await uploadBytes(fileRef, file, { contentType: file.type });
    return getDownloadURL(fileRef);
  };

  const handleSave = async () => {
    if (!authUser || saving) return;
    setSaveError('');

    const name = displayName.trim().slice(0, 50);
    if (name.length < 2) {
      setSaveError('O nome de exibição precisa ter ao menos 2 caracteres.');
      return;
    }

    // Validação de nickname se foi alterado
    const trimmedNickname = nickname.trim().toLowerCase();
    const nicknameDirty = trimmedNickname !== originalNickname;
    if (nicknameDirty) {
      if (nicknameChanged) {
        setSaveError('A URL do perfil só pode ser alterada uma única vez.');
        return;
      }
      if (!/^[a-z0-9_-]{3,32}$/.test(trimmedNickname)) {
        setSaveError('Nickname deve ter 3-32 caracteres: letras minúsculas, números, _ ou -.');
        return;
      }
    }

    setSaving(true);
    try {
      let finalPhotoURL: string | null = avatarUrl;
      if (pendingAvatarFile) {
        const ext =
          (pendingAvatarFile.name.split('.').pop() ?? 'png').toLowerCase() ||
          'png';
        finalPhotoURL = await uploadImage(
          pendingAvatarFile,
          `user-avatars/${authUser.uid}/avatar.${ext}`,
        );
      }

      let finalCoverUrl: string | null = coverUrl;
      if (pendingCoverFile) {
        const ext =
          (pendingCoverFile.name.split('.').pop() ?? 'png').toLowerCase() ||
          'png';
        finalCoverUrl = await uploadImage(
          pendingCoverFile,
          `user-covers/${authUser.uid}/cover.${ext}`,
        );
      }

      // Se nickname mudou, chama Cloud Function primeiro (valida unicidade + single-change no servidor)
      if (nicknameDirty) {
        const fn = httpsCallable<{ nickname: string }, { success: boolean; nickname: string }>(
          getFunctions(getFirebaseApp()),
          'updateProfileNickname',
        );
        try {
          await fn({ nickname: trimmedNickname });
        } catch (nickErr: unknown) {
          const errObj = nickErr as { code?: string; message?: string };
          // Mapeia erros da Function para mensagem amigável
          if (errObj.code === 'functions/already-exists' || /already/i.test(errObj.message ?? '')) {
            if (/taken/i.test(errObj.message ?? '')) {
              throw Object.assign(new Error('Este nickname já está em uso. Escolha outro.'), { code: 'nickname-taken' });
            }
            if (/already your nickname/i.test(errObj.message ?? '')) {
              // não é erro real, segue
            } else {
              throw Object.assign(new Error('Este nickname já está em uso. Escolha outro.'), { code: 'nickname-taken' });
            }
          } else if (errObj.code === 'functions/failed-precondition' || /once/i.test(errObj.message ?? '')) {
            throw Object.assign(new Error('A URL do perfil só pode ser alterada uma única vez.'), { code: 'nickname-once' });
          } else if (errObj.code === 'functions/invalid-argument') {
            throw Object.assign(new Error('Nickname inválido. Use 3-32 caracteres: a-z, 0-9, _ ou -.'), { code: 'nickname-invalid' });
          }
          throw nickErr;
        }
      }

      await setDoc(
        doc(getFirebaseDb(), COLLECTIONS.USERS, authUser.uid),
        {
          displayName: name,
          bio: bio.trim().slice(0, 300),
          socialLinks: sanitizeSocialLinks(socialLinks),
          visibility,
          photoURL: finalPhotoURL,
          coverUrl: finalCoverUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      // Mantém o displayName do Auth sincronizado (usado como fallback no app)
      const authCurrentUser = getFirebaseAuth().currentUser;
      if (authCurrentUser && authCurrentUser.displayName !== name) {
        try {
          await updateProfile(authCurrentUser, { displayName: name });
        } catch {
          // Falha na sincronização do Auth não invalida o salvamento
        }
      }

      setPendingAvatarFile(null);
      setPendingCoverFile(null);
      setAvatarUrl(finalPhotoURL);
      setCoverUrl(finalCoverUrl);
      if (nicknameDirty) {
        setNickname(trimmedNickname);
        setOriginalNickname(trimmedNickname);
        setNicknameChanged(true);
      }
      setSavedFlash(true);
      if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
      savedFlashTimer.current = setTimeout(() => setSavedFlash(false), 2500);
    } catch (err) {
      console.error('[profile save] error:', err);
      const code = (err as { code?: string })?.code ?? '';
      const msg = (err as { message?: string })?.message ?? '';
      if (code.startsWith('storage/')) {
        setSaveError(
          'Falha no envio da imagem. Verifique formato/tamanho e tente novamente.',
        );
      } else if (code === 'nickname-taken' || code === 'nickname-once' || code === 'nickname-invalid') {
        setSaveError(msg);
      } else if (code === 'permission-denied' || /permission/i.test(msg)) {
        setSaveError('Permissão negada ao salvar. Recarregue a página e tente novamente.');
      } else if (code === 'not-found' || /not-found/i.test(code)) {
        setSaveError('Perfil não encontrado. Recarregue a página.');
      } else {
        setSaveError(msg && msg.length < 120 ? msg : 'Não foi possível salvar o perfil. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-40 rounded bg-[rgba(38,51,86,0.4)] animate-pulse" />
            <div className="h-4 w-64 rounded bg-[rgba(38,51,86,0.3)] animate-pulse" />
          </div>
          <div className="h-10 w-28 rounded-lg bg-[rgba(38,51,86,0.4)] animate-pulse" />
        </div>
        <div className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6 space-y-4">
          <div className="h-48 rounded-lg bg-[rgba(38,51,86,0.3)] animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="h-16 rounded-lg bg-[rgba(38,51,86,0.3)] animate-pulse" />
            <div className="h-16 rounded-lg bg-[rgba(38,51,86,0.3)] animate-pulse" />
          </div>
          <div className="h-24 rounded-lg bg-[rgba(38,51,86,0.3)] animate-pulse" />
        </div>
      </div>
    );
  }

  if (loadError || !authUser) {
    return (
      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 flex flex-col items-center justify-center text-center"
      >
        <p className="text-sm text-red-400 max-w-xs">
          Não foi possível carregar seu perfil.
        </p>
        <button
          onClick={() => {
            setLoading(true);
            setLoadError(false);
            setReloadKey((k) => k + 1);
          }}
          className="mt-4 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
        >
          Tentar novamente
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-6"
    >
      <motion.div variants={fadeUp}>
        <button
          onClick={() => router.push('/app/dashboard')}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors mb-3"
        >
          <ArrowLeft size={16} /> Voltar ao dashboard
        </button>
      </motion.div>
      <motion.div variants={fadeUp} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Perfil</h1>
          <p className="text-muted mt-1">
            Gerencie sua aparência, links sociais e visibilidade.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Salvando...
            </>
          ) : savedFlash ? (
            <>
              <Check size={16} /> Salvo!
            </>
          ) : (
            <>
              <Save size={16} /> Salvar
            </>
          )}
        </button>
      </motion.div>

      {saveError && (
        <motion.div
          variants={fadeUp}
          className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
        >
          <AlertTriangle size={16} /> {saveError}
        </motion.div>
      )}

      {/* Cover + Avatar */}
      <motion.div
        variants={fadeUp}
        className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] overflow-hidden"
      >
        {/* Cover */}
        <div className="relative h-48 md:h-56 bg-[#0a1122]">
          {coverPreview ? (
            <img src={coverPreview} alt="Capa" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted">
              <ImageIcon size={32} className="mb-2 opacity-40" />
              <p className="text-sm">Nenhuma capa definida</p>
              <p className="text-xs mt-1 opacity-60">1500 × 500 px recomendado</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(5,9,18,0.8)] to-transparent pointer-events-none" />
          <div className="absolute bottom-3 right-3 flex gap-2">
            <input
              ref={coverInput}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'cover')}
            />
            <button
              onClick={() => coverInput.current?.click()}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(5,9,18,0.7)] border border-[rgba(38,51,86,0.5)] text-white text-xs backdrop-blur-md hover:border-accent/30 transition-colors disabled:opacity-50"
            >
              <Camera size={14} /> {coverPreview ? 'Trocar capa' : 'Adicionar capa'}
            </button>
            {coverPreview && (
              <button
                onClick={() => handleRemoveImage('cover')}
                disabled={saving}
                title="Remover capa"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs backdrop-blur-md hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <p className="absolute top-3 right-3 text-[10px] text-muted/60 bg-[rgba(5,9,18,0.6)] px-2 py-1 rounded backdrop-blur-md">
            JPEG, PNG ou GIF · máx. 4 MB
          </p>
        </div>

        {/* Avatar */}
        <div className="px-6 pb-6 -mt-12 relative z-10">
          <div className="flex items-end gap-5">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-[#050912] bg-accent/20 flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={36} className="text-accent" />
                )}
              </div>
              <input
                ref={avatarInput}
                type="file"
                accept="image/jpeg,image/png,image/gif"
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'avatar')}
              />
              <button
                onClick={() => avatarInput.current?.click()}
                disabled={saving}
                title={avatarPreview ? 'Trocar avatar' : 'Adicionar avatar'}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-hover transition-colors border-2 border-[#050912] disabled:opacity-50"
              >
                <Camera size={14} />
              </button>
              {avatarPreview && (
                <button
                  onClick={() => handleRemoveImage('avatar')}
                  disabled={saving}
                  title="Remover avatar"
                  className="absolute bottom-0 left-0 w-8 h-8 rounded-full bg-[#0a1122] text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors border-2 border-[#050912] disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="pb-1 min-w-0">
              <p className="text-white font-heading font-bold text-lg truncate">
                {displayName.trim() || 'Sem nome'}
              </p>
              <p className="text-muted text-sm">@{nickname}</p>
            </div>
          </div>

          {/* Info fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-sm text-muted mb-1.5">
                Nome de exibição
              </label>
              <input
                type="text"
                value={displayName}
                maxLength={50}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-10 px-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm text-muted mb-1.5">
                Nickname (URL do perfil)
                <span className="group relative inline-flex">
                  <Lock size={12} className={nicknameChanged ? 'text-red-400' : 'text-amber-300'} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg max-w-[260px] leading-snug"
                    style={{ color: nicknameChanged ? '#fca5a5' : '#fde68a' }}>
                    {nicknameChanged
                      ? 'Você já alterou sua URL uma vez. Não pode alterar novamente.'
                      : 'Você pode alterar sua URL uma única vez. Use 3-32 caracteres: a-z, 0-9, _ ou -.'}
                  </span>
                </span>
                {nicknameChanged && <span className="text-[11px] text-red-400">· já alterado</span>}
                {!nicknameChanged && nickname.trim().toLowerCase() !== originalNickname && <span className="text-[11px] text-amber-300">· será alterado ao salvar</span>}
              </label>
              <div className="flex items-center h-10">
                <span className="text-muted text-sm bg-[#0a1122] border border-r-0 border-[rgba(38,51,86,0.5)] rounded-l-lg px-3 h-full flex items-center whitespace-nowrap">
                  /profile/
                </span>
                <input
                  type="text"
                  value={nickname}
                  readOnly={nicknameChanged}
                  disabled={nicknameChanged}
                  maxLength={32}
                  placeholder="seu-nickname"
                  onChange={(e) => setNickname(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className={cn(
                    'flex-1 h-10 px-3 border rounded-r-lg text-sm focus:outline-none transition-colors',
                    nicknameChanged
                      ? 'bg-[#0a1122] border-[rgba(38,51,86,0.5)] text-muted cursor-not-allowed'
                      : 'bg-[#0a1122] border-[rgba(38,51,86,0.5)] text-white focus:border-accent/50 placeholder-muted',
                  )}
                />
              </div>
              {!nicknameChanged && (
                <p className="text-[11px] text-muted/70 mt-1.5">
                  Pode alterar <b className="text-amber-300">uma única vez</b>. Após salvar, a alteração não poderá ser desfeita.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm text-muted mb-1.5">Biografia</label>
            <textarea
              rows={3}
              maxLength={300}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre você..."
              className="w-full px-3 py-2 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
            />
            <p className="text-xs text-muted mt-1 text-right">{bio.length}/300</p>
          </div>
        </div>
      </motion.div>

      {/* Social Links */}
      <motion.div
        variants={fadeUp}
        className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6"
      >
        <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2 mb-5">
          <LinkIcon size={18} className="text-accent" /> Links Sociais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {socialPlatforms.map((p) => (
            <div key={p.id}>
              <label className="flex items-center gap-2 text-sm text-muted mb-1.5">
                <SocialIcon platform={p.id} /> {p.label}
              </label>
              <input
                type="text"
                placeholder={p.placeholder}
                maxLength={200}
                value={socialLinks[p.id] || ''}
                onChange={(e) =>
                  setSocialLinks((prev) => ({ ...prev, [p.id]: e.target.value }))
                }
                className="w-full h-10 px-3 bg-[#0a1122] border border-[rgba(38,51,86,0.5)] rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Visibility */}
      <motion.div
        variants={fadeUp}
        className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6"
      >
        <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2 mb-5">
          <Eye size={18} className="text-accent" /> Visibilidade do Perfil
        </h2>
        <p className="text-sm text-muted mb-4">
          Escolha o que outros jogadores podem ver no seu perfil público.
        </p>
        <div className="space-y-3">
          {([
            { key: 'showBio' as const, label: 'Exibir biografia' },
            { key: 'showGuilds' as const, label: 'Exibir guildas' },
            { key: 'showAchievements' as const, label: 'Exibir conquistas' },
            { key: 'showFriends' as const, label: 'Exibir lista de amigos' },
          ] as const).map((opt) => (
            <div
              key={opt.key}
              className="flex items-center justify-between py-2 border-b border-[rgba(38,51,86,0.3)] last:border-0"
            >
              <span className="text-sm text-white">{opt.label}</span>
              <button
                onClick={() =>
                  setVisibility((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))
                }
                className={cn(
                  'w-10 h-5 rounded-full p-0.5 transition-colors duration-200',
                  visibility[opt.key] ? 'bg-accent' : 'bg-[rgba(38,51,86,0.5)]',
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded-full bg-white transition-transform duration-200',
                    visibility[opt.key] ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Mural */}
      <motion.div
        variants={fadeUp}
        className="rounded-xl border border-[rgba(38,51,86,0.5)] bg-gradient-to-br from-[rgba(19,29,48,0.6)] to-[rgba(10,18,32,0.4)] p-6"
      >
        <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2 mb-5">
          <MessageCircle size={18} className="text-accent" /> Mural de Recados
        </h2>
        <ProfileMural targetUserId={authUser.uid} isOwner={true} />
      </motion.div>
    </motion.div>
  );
}
